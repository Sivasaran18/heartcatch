package game

// Game and turn states
const (
	StateWaitingForPlayers = "WAITING_FOR_PLAYERS"
	StateLobbyReady        = "LOBBY_READY"
	StateMatchReady        = "MATCH_READY"
	StatePlayerOneIntro    = "PLAYER_ONE_INTRO"
	StatePlayerOneActive   = "PLAYER_ONE_ACTIVE"
	StatePlayerOneDone     = "PLAYER_ONE_COMPLETED"
	StateTurnTransition    = "TURN_TRANSITION"
	StatePlayerTwoIntro    = "PLAYER_TWO_INTRO"
	StatePlayerTwoActive   = "PLAYER_TWO_ACTIVE"
	StatePlayerTwoDone     = "PLAYER_TWO_COMPLETED"
	StateMatchResults      = "MATCH_RESULTS"
	StateRematchPending    = "REMATCH_PENDING"
)

// Object types
const (
	ObjNormalHeart = "NORMAL_HEART"
	ObjGoldenHeart = "GOLDEN_HEART"
	ObjBomb        = "BOMB"
)

// Scoring constants
const (
	ScoreNormalHeart = 10
	ScoreGoldenHeart = 25
	InitialLives     = 3
	DefaultDuration  = 45.0 // seconds
	ComboThreshold   = 5
	ComboBonusCap    = 15 // points per catch bonus cap at combo
)

// Player role
const (
	RoleMaleUser = "MALE_USER"
	RoleSakhi    = "SAKHI"
)

// Player holds info and live score for a participant
type Player struct {
	ID           string  `json:"id"`
	Name         string  `json:"name"`
	Role         string  `json:"role"` // MALE_USER or SAKHI
	Avatar       string  `json:"avatar"`
	Ready        bool    `json:"ready"`
	Connected    bool    `json:"connected"`
	Score        int     `json:"score"`
	Lives        int     `json:"lives"`
	HeartsCaught int     `json:"heartsCaught"`
	GoldCaught   int     `json:"goldCaught"`
	BombsHit     int     `json:"bombsHit"`
	CurrentCombo int     `json:"currentCombo"`
	MaxCombo          int     `json:"maxCombo"`
	BasketX           float64 `json:"basketX"`           // Normalized 0.0 - 100.0 (percentage of width)
	BasketInitialized bool    `json:"basketInitialized"` // True once active player has connected and initialized basket
}

// FallingObject represents a heart or bomb falling from the top
type FallingObject struct {
	ID       string  `json:"id"`
	Type     string  `json:"type"`    // NORMAL_HEART, GOLDEN_HEART, BOMB
	NameTag  string  `json:"nameTag"` // Opponent name displayed on heart
	X        float64 `json:"x"`       // Normalized 0.0 - 100.0 (percentage across width)
	Y        float64 `json:"y"`       // Normalized 0.0 - 100.0 (percentage down height)
	Speed    float64 `json:"speed"`   // Percentage points per second
	Size     float64 `json:"size"`    // Collision radius or width/height scale
	Caught   bool    `json:"caught"`
	Expired  bool    `json:"expired"`
	NearMiss bool    `json:"nearMiss"`
}

// MatchSummary contains final results
type MatchSummary struct {
	WinnerID       string `json:"winnerId"`
	WinnerName     string `json:"winnerName"`
	IsTie          bool   `json:"isTie"`
	PlayerOneScore int    `json:"playerOneScore"`
	PlayerTwoScore int    `json:"playerTwoScore"`
	PlayerOneStats Player `json:"playerOneStats"`
	PlayerTwoStats Player `json:"playerTwoStats"`
	DurationSec    int    `json:"durationSec"`
}

// RoomConfig contains configurable match options
type RoomConfig struct {
	TurnDuration float64 `json:"turnDuration"`
	InitialLives int     `json:"initialLives"`
}

// WebSocket Message Types
const (
	// Room Events
	EventRoomCreate  = "CATCH_HEARTS_ROOM_CREATE"
	EventRoomCreated = "CATCH_HEARTS_ROOM_CREATED"
	EventRoomJoin    = "CATCH_HEARTS_ROOM_JOIN"
	EventRoomJoined  = "CATCH_HEARTS_ROOM_JOINED"
	EventRoomState   = "CATCH_HEARTS_ROOM_STATE"

	// Player Events
	EventPlayerReady  = "CATCH_HEARTS_PLAYER_READY"
	EventMatchStarted = "CATCH_HEARTS_MATCH_STARTED"

	// Gameplay Events
	EventTurnStarted       = "CATCH_HEARTS_TURN_STARTED"
	EventObjectsSpawned    = "CATCH_HEARTS_OBJECTS_SPAWNED"
	EventGameSnapshot      = "CATCH_HEARTS_GAME_SNAPSHOT"
	EventBucketMoved       = "CATCH_HEARTS_BUCKET_MOVED"
	EventHeartCaught       = "CATCH_HEARTS_HEART_CAUGHT"
	EventGoldenHeartCaught = "CATCH_HEARTS_GOLDEN_HEART_CAUGHT"
	EventBombCaught        = "CATCH_HEARTS_BOMB_CAUGHT"
	EventLifeLost          = "CATCH_HEARTS_LIFE_LOST"
	EventComboUpdated      = "CATCH_HEARTS_COMBO_UPDATED"
	EventNearMiss          = "CATCH_HEARTS_NEAR_MISS"

	// Match Events
	EventTurnEnded        = "CATCH_HEARTS_TURN_ENDED"
	EventTurnTransition   = "CATCH_HEARTS_TURN_TRANSITION"
	EventMatchCompleted   = "CATCH_HEARTS_MATCH_COMPLETED"
	EventRematchRequested = "CATCH_HEARTS_REMATCH_REQUESTED"
	EventRematchStarted   = "CATCH_HEARTS_REMATCH_STARTED"

	// Connection Events
	EventPlayerDisconnected = "CATCH_HEARTS_PLAYER_DISCONNECTED"
	EventPlayerReconnected  = "CATCH_HEARTS_PLAYER_RECONNECTED"
	EventStateSync          = "CATCH_HEARTS_STATE_SYNC"
	EventError              = "CATCH_HEARTS_ERROR"
)

// WSMessage is the envelope for all WS communication
type WSMessage struct {
	Type      string      `json:"type"`
	RoomCode  string      `json:"roomCode,omitempty"`
	PlayerID  string      `json:"playerId,omitempty"`
	Seq       int64       `json:"seq,omitempty"`
	Timestamp int64       `json:"timestamp,omitempty"`
	Payload   interface{} `json:"payload,omitempty"`
}
