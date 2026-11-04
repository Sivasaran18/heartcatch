package game

import (
	"math"
	"sync"
	"time"
)

// MatchEngine manages the authoritative state machine, turn progression, physics updates and scoring
type MatchEngine struct {
	mu           sync.Mutex
	RoomCode     string
	State        string
	PlayerOne    *Player
	PlayerTwo    *Player
	ActivePlayer *Player
	Config       RoomConfig
	TurnTimeLeft float64
	Objects      []*FallingObject
	Director     *SpawnDirector
	Physics      *BasketPhysics
	TurnNumber   int // 1 for PlayerOne, 2 for PlayerTwo
	Ticker       *time.Ticker
	StopChan     chan struct{}
	OnEvent      func(eventType string, payload interface{})
	LastTickTime time.Time
	Summary      *MatchSummary
	PlayDuration float64
	RematchVotes map[string]bool
}

// NewMatchEngine constructs an engine for a room
func NewMatchEngine(roomCode string, p1, p2 *Player, onEvent func(eventType string, payload interface{})) *MatchEngine {
	cfg := RoomConfig{
		TurnDuration: DefaultDuration,
		InitialLives: InitialLives,
	}

	p1.Lives = cfg.InitialLives
	p2.Lives = cfg.InitialLives
	p1.BasketX = 50.0
	p2.BasketX = 50.0
	p1.BasketInitialized = false
	p2.BasketInitialized = false

	return &MatchEngine{
		RoomCode:     roomCode,
		State:        StateLobbyReady,
		PlayerOne:    p1,
		PlayerTwo:    p2,
		Config:       cfg,
		Physics:      NewBasketPhysics(),
		OnEvent:      onEvent,
		RematchVotes: make(map[string]bool),
		StopChan:     make(chan struct{}),
	}
}

// StartMatch advances from ready to Player 1 intro and starts turn 1
func (me *MatchEngine) StartMatch() {
	me.mu.Lock()
	defer me.mu.Unlock()

	me.State = StatePlayerOneIntro
	me.TurnNumber = 1
	me.ActivePlayer = me.PlayerOne
	me.PlayerOne.Score = 0
	me.PlayerOne.Lives = me.Config.InitialLives
	me.PlayerOne.CurrentCombo = 0
	me.PlayerOne.MaxCombo = 0
	me.PlayerOne.HeartsCaught = 0
	me.PlayerOne.GoldCaught = 0
	me.PlayerOne.BombsHit = 0
	me.PlayerOne.BasketX = 50.0
	me.PlayerOne.BasketInitialized = false

	// Player 1 plays: Falling hearts display Player 2 (Sakhi's) name
	me.Director = NewSpawnDirector(time.Now().UnixNano(), me.PlayerTwo.Name)
	me.Objects = make([]*FallingObject, 0)
	me.TurnTimeLeft = me.Config.TurnDuration

	if me.OnEvent != nil {
		me.OnEvent(EventMatchStarted, me.GetStateSnapshotLocked())
	}

	// 2 second countdown before turn starts
	go func() {
		time.Sleep(2 * time.Second)
		me.beginActiveTurn()
	}()
}

// beginActiveTurn transitions to active game state and runs tick loop
func (me *MatchEngine) beginActiveTurn() {
	me.mu.Lock()
	if me.TurnNumber == 1 {
		me.State = StatePlayerOneActive
	} else {
		me.State = StatePlayerTwoActive
	}
	me.LastTickTime = time.Now()
	me.Objects = make([]*FallingObject, 0)

	if me.OnEvent != nil {
		me.OnEvent(EventTurnStarted, me.GetStateSnapshotLocked())
	}
	me.mu.Unlock()

	// 30 ticks per second (33.3ms) for authoritative server physics
	ticker := time.NewTicker(33 * time.Millisecond)
	for {
		select {
		case <-me.StopChan:
			ticker.Stop()
			return
		case now := <-ticker.C:
			done := me.tick(now)
			if done {
				ticker.Stop()
				return
			}
		}
	}
}

// tick executes one frame of physics, dynamic spawning, collision and time decrement
func (me *MatchEngine) tick(now time.Time) bool {
	me.mu.Lock()
	defer me.mu.Unlock()

	if me.State != StatePlayerOneActive && me.State != StatePlayerTwoActive {
		return true
	}

	dt := now.Sub(me.LastTickTime).Seconds()
	me.LastTickTime = now
	if dt > 0.1 {
		dt = 0.1 // clamp delta time for stability
	}

	me.TurnTimeLeft -= dt
	if me.TurnTimeLeft <= 0 {
		me.TurnTimeLeft = 0
		me.finishTurnLocked()
		return true
	}

	activePlayer := me.ActivePlayer
	progress := me.Director.ComputeProgression(me.TurnTimeLeft, me.Config.TurnDuration)

	// Physics and Collision step: only check collisions if active player basket is initialized and active
	var colRes CollisionResult
	if activePlayer.BasketInitialized {
		colRes = me.Physics.UpdateAndCheckCollisions(me.Objects, activePlayer.BasketX, dt)
	} else {
		// Just advance objects downwards without checking collisions against uninitialized basket
		for _, obj := range me.Objects {
			if !obj.Caught && !obj.Expired {
				obj.Y += obj.Speed * dt
				if obj.Y > 105.0 {
					obj.Expired = true
				}
			}
		}
	}

	// Process Caught Normal & Golden Hearts
	for _, caught := range colRes.CaughtObjects {
		activePlayer.CurrentCombo++
		if activePlayer.CurrentCombo > activePlayer.MaxCombo {
			activePlayer.MaxCombo = activePlayer.CurrentCombo
		}

		// Calculate combo bonus
		comboBonus := 0
		if activePlayer.CurrentCombo >= ComboThreshold {
			comboBonus = (activePlayer.CurrentCombo - ComboThreshold + 1) * 2
			if comboBonus > ComboBonusCap {
				comboBonus = ComboBonusCap
			}
		}

		if caught.Type == ObjGoldenHeart {
			activePlayer.GoldCaught++
			added := ScoreGoldenHeart + comboBonus
			activePlayer.Score += added
			if me.OnEvent != nil {
				me.OnEvent(EventGoldenHeartCaught, map[string]interface{}{
					"playerId":   activePlayer.ID,
					"objectId":   caught.ID,
					"addedScore": added,
					"combo":      activePlayer.CurrentCombo,
					"totalScore": activePlayer.Score,
				})
			}
		} else {
			activePlayer.HeartsCaught++
			added := ScoreNormalHeart + comboBonus
			activePlayer.Score += added
			if me.OnEvent != nil {
				me.OnEvent(EventHeartCaught, map[string]interface{}{
					"playerId":   activePlayer.ID,
					"objectId":   caught.ID,
					"nameTag":    caught.NameTag,
					"addedScore": added,
					"combo":      activePlayer.CurrentCombo,
					"totalScore": activePlayer.Score,
				})
			}
		}
	}

	// Process Bombs Hit
	for _, bomb := range colRes.BombsHit {
		activePlayer.BombsHit++
		activePlayer.CurrentCombo = 0 // Break streak
		activePlayer.Lives--
		if activePlayer.Lives < 0 {
			activePlayer.Lives = 0
		}

		if me.OnEvent != nil {
			me.OnEvent(EventBombCaught, map[string]interface{}{
				"playerId":       activePlayer.ID,
				"objectId":       bomb.ID,
				"remainingLives": activePlayer.Lives,
			})
			me.OnEvent(EventLifeLost, map[string]interface{}{
				"playerId":       activePlayer.ID,
				"remainingLives": activePlayer.Lives,
			})
		}

		if activePlayer.Lives <= 0 {
			me.finishTurnLocked()
			return true
		}
	}

	// Process Near Misses
	for _, nm := range colRes.NearMisses {
		if me.OnEvent != nil {
			me.OnEvent(EventNearMiss, map[string]interface{}{
				"objectId": nm.ID,
				"basketX":  activePlayer.BasketX,
			})
		}
	}

	// Clean up caught and expired objects from active slice
	surviving := make([]*FallingObject, 0, len(me.Objects))
	for _, o := range me.Objects {
		if !o.Caught && !o.Expired {
			surviving = append(surviving, o)
		}
	}
	me.Objects = surviving

	// Dynamic Spawning: calculate adaptive target concurrency
	elapsed := me.Config.TurnDuration - me.TurnTimeLeft
	targetCount := me.Director.TargetConcurrentObjects(progress, 800.0)
	if me.Director.ShouldSpawn(elapsed, len(me.Objects), targetCount) {
		newBatch := me.Director.GenerateWave(elapsed, progress, me.Objects)
		me.Objects = append(me.Objects, newBatch...)
		if me.OnEvent != nil && len(newBatch) > 0 {
			me.OnEvent(EventObjectsSpawned, newBatch)
		}
	}

	// Broadcast periodic authoritative game snapshot (every 33ms or on change)
	if me.OnEvent != nil {
		me.OnEvent(EventGameSnapshot, me.GetGameSnapshotLocked())
	}

	return false
}

// finishTurnLocked handles completion of turn 1 or turn 2
func (me *MatchEngine) finishTurnLocked() {
	if me.TurnNumber == 1 {
		me.State = StatePlayerOneDone
		if me.OnEvent != nil {
			me.OnEvent(EventTurnEnded, map[string]interface{}{
				"turn":       1,
				"player":     me.PlayerOne.Name,
				"finalScore": me.PlayerOne.Score,
				"stats":      me.PlayerOne,
			})
		}

		// Schedule transition to Player 2
		go func() {
			time.Sleep(1500 * time.Millisecond)
			me.startTurnTwo()
		}()
	} else {
		me.State = StatePlayerTwoDone
		if me.OnEvent != nil {
			me.OnEvent(EventTurnEnded, map[string]interface{}{
				"turn":       2,
				"player":     me.PlayerTwo.Name,
				"finalScore": me.PlayerTwo.Score,
				"stats":      me.PlayerTwo,
			})
		}

		// Calculate Winner and Final Results
		go func() {
			time.Sleep(1500 * time.Millisecond)
			me.calculateResults()
		}()
	}
}

// startTurnTwo switches to Player 2 (Sakhi)
func (me *MatchEngine) startTurnTwo() {
	me.mu.Lock()
	me.State = StateTurnTransition
	me.TurnNumber = 2
	me.ActivePlayer = me.PlayerTwo
	me.PlayerTwo.Score = 0
	me.PlayerTwo.Lives = me.Config.InitialLives
	me.PlayerTwo.CurrentCombo = 0
	me.PlayerTwo.MaxCombo = 0
	me.PlayerTwo.HeartsCaught = 0
	me.PlayerTwo.GoldCaught = 0
	me.PlayerTwo.BombsHit = 0
	me.PlayerTwo.BasketX = 50.0
	me.PlayerTwo.BasketInitialized = false

	// Player 2 plays: Falling hearts display Player 1 (Male User's) name
	me.Director = NewSpawnDirector(time.Now().UnixNano()+999, me.PlayerOne.Name)
	me.Objects = make([]*FallingObject, 0)
	me.TurnTimeLeft = me.Config.TurnDuration

	if me.OnEvent != nil {
		me.OnEvent(EventTurnTransition, map[string]interface{}{
			"nextPlayer":   me.PlayerTwo.Name,
			"opponentName": me.PlayerOne.Name,
			"message":      "Now " + me.PlayerTwo.Name + "'s turn! Catch hearts with " + me.PlayerOne.Name + "'s name!",
		})
	}
	me.mu.Unlock()

	time.Sleep(3 * time.Second)
	me.beginActiveTurn()
}

// calculateResults computes final winner and issues summary
func (me *MatchEngine) calculateResults() {
	me.mu.Lock()
	defer me.mu.Unlock()

	me.State = StateMatchResults
	summary := &MatchSummary{
		PlayerOneScore: me.PlayerOne.Score,
		PlayerTwoScore: me.PlayerTwo.Score,
		PlayerOneStats: *me.PlayerOne,
		PlayerTwoStats: *me.PlayerTwo,
		DurationSec:    int(me.Config.TurnDuration * 2),
	}

	if me.PlayerOne.Score > me.PlayerTwo.Score {
		summary.WinnerID = me.PlayerOne.ID
		summary.WinnerName = me.PlayerOne.Name
		summary.IsTie = false
	} else if me.PlayerTwo.Score > me.PlayerOne.Score {
		summary.WinnerID = me.PlayerTwo.ID
		summary.WinnerName = me.PlayerTwo.Name
		summary.IsTie = false
	} else {
		summary.IsTie = true
		summary.WinnerName = "Tie Game"
	}

	me.Summary = summary
	me.RematchVotes = make(map[string]bool)

	if me.OnEvent != nil {
		me.OnEvent(EventMatchCompleted, summary)
	}
}

// UpdateBasketPosition safely sets active player's horizontal coordinate (0.0 to 100.0)
func (me *MatchEngine) UpdateBasketPosition(playerID string, x float64) bool {
	me.mu.Lock()
	defer me.mu.Unlock()

	if me.ActivePlayer == nil || me.ActivePlayer.ID != playerID {
		return false // Non-active player or observer cannot move the basket
	}

	// Clamp boundaries
	halfBasket := me.Physics.BasketWidth / 2.0
	if x < halfBasket {
		x = halfBasket
	}
	if x > (100.0 - halfBasket) {
		x = 100.0 - halfBasket
	}

	me.ActivePlayer.BasketX = x
	me.ActivePlayer.BasketInitialized = true
	return true
}

// RequestRematch handles rematch vote from either player
func (me *MatchEngine) RequestRematch(playerID string) bool {
	me.mu.Lock()
	defer me.mu.Unlock()

	me.RematchVotes[playerID] = true
	if me.OnEvent != nil {
		me.OnEvent(EventRematchRequested, map[string]interface{}{
			"playerId": playerID,
			"votes":    len(me.RematchVotes),
		})
	}

	// When both players have agreed, start a fresh match
	if len(me.RematchVotes) >= 2 {
		me.mu.Unlock()
		me.StartMatch()
		me.mu.Lock()
		if me.OnEvent != nil {
			me.OnEvent(EventRematchStarted, me.GetStateSnapshotLocked())
		}
		return true
	}
	return false
}

// GetGameSnapshotLocked returns minimal real-time frame data
func (me *MatchEngine) GetGameSnapshotLocked() map[string]interface{} {
	activeID := ""
	activeName := ""
	activeScore := 0
	activeLives := 0
	activeCombo := 0
	basketX := 50.0

	if me.ActivePlayer != nil {
		activeID = me.ActivePlayer.ID
		activeName = me.ActivePlayer.Name
		activeScore = me.ActivePlayer.Score
		activeLives = me.ActivePlayer.Lives
		activeCombo = me.ActivePlayer.CurrentCombo
		basketX = me.ActivePlayer.BasketX
	}

	return map[string]interface{}{
		"state":        me.State,
		"turn":         me.TurnNumber,
		"activePlayer": activeName,
		"activeId":     activeID,
		"timeLeft":     math.Round(me.TurnTimeLeft*10) / 10,
		"score":        activeScore,
		"lives":        activeLives,
		"combo":        activeCombo,
		"basketX":      basketX,
		"objects":      me.Objects,
	}
}

// GetStateSnapshotLocked returns full room and players snapshot
func (me *MatchEngine) GetStateSnapshotLocked() map[string]interface{} {
	return map[string]interface{}{
		"roomCode":     me.RoomCode,
		"state":        me.State,
		"turnNumber":   me.TurnNumber,
		"playerOne":    me.PlayerOne,
		"playerTwo":    me.PlayerTwo,
		"activePlayer": me.ActivePlayer,
		"timeLeft":     me.TurnTimeLeft,
		"summary":      me.Summary,
	}
}
