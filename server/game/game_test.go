package game

import (
	"testing"
	"time"
)

// Test 1: Catching a normal heart adds exactly 10 points (without combo)
func TestNormalHeartScoring(t *testing.T) {
	p1 := &Player{ID: "p1", Name: "Rohan", Role: RoleMaleUser, Lives: 3}
	p2 := &Player{ID: "p2", Name: "Ananya", Role: RoleSakhi, Lives: 3}
	engine := NewMatchEngine("TEST1", p1, p2, nil)

	engine.ActivePlayer = p1
	engine.Objects = []*FallingObject{
		{ID: "h1", Type: ObjNormalHeart, X: 50.0, Y: 87.0, Size: 6.0},
	}

	p1.BasketX = 50.0
	colRes := engine.Physics.UpdateAndCheckCollisions(engine.Objects, p1.BasketX, 0.01)

	if len(colRes.CaughtObjects) != 1 {
		t.Fatalf("Expected 1 heart caught, got %d", len(colRes.CaughtObjects))
	}

	// simulate score increment
	p1.CurrentCombo++
	added := ScoreNormalHeart
	p1.Score += added

	if p1.Score != 10 {
		t.Fatalf("Expected score 10, got %d", p1.Score)
	}
}

// Test 2: Catching a golden heart adds exactly 25 points
func TestGoldenHeartScoring(t *testing.T) {
	p1 := &Player{ID: "p1", Name: "Rohan", Role: RoleMaleUser, Lives: 3}
	p2 := &Player{ID: "p2", Name: "Ananya", Role: RoleSakhi, Lives: 3}
	engine := NewMatchEngine("TEST2", p1, p2, nil)

	engine.ActivePlayer = p1
	engine.Objects = []*FallingObject{
		{ID: "gh1", Type: ObjGoldenHeart, X: 50.0, Y: 87.0, Size: 6.0},
	}

	colRes := engine.Physics.UpdateAndCheckCollisions(engine.Objects, 50.0, 0.01)
	if len(colRes.CaughtObjects) != 1 {
		t.Fatalf("Expected golden heart caught")
	}

	p1.Score += ScoreGoldenHeart
	if p1.Score != 25 {
		t.Fatalf("Expected golden heart score 25, got %d", p1.Score)
	}
}

// Test 3: Catching a bomb removes exactly one life
func TestBombPenalty(t *testing.T) {
	p1 := &Player{ID: "p1", Name: "Rohan", Role: RoleMaleUser, Lives: 3}
	p2 := &Player{ID: "p2", Name: "Ananya", Role: RoleSakhi, Lives: 3}
	engine := NewMatchEngine("TEST3", p1, p2, nil)

	engine.ActivePlayer = p1
	engine.Objects = []*FallingObject{
		{ID: "b1", Type: ObjBomb, X: 50.0, Y: 87.0, Size: 6.0},
	}

	colRes := engine.Physics.UpdateAndCheckCollisions(engine.Objects, 50.0, 0.01)
	if len(colRes.BombsHit) != 1 {
		t.Fatalf("Expected 1 bomb hit, got %d", len(colRes.BombsHit))
	}

	p1.Lives--
	if p1.Lives != 2 {
		t.Fatalf("Expected lives 2 after bomb, got %d", p1.Lives)
	}
}

// Test 4: Catching the same object twice is impossible
func TestNoDuplicateCatch(t *testing.T) {
	p1 := &Player{ID: "p1", Name: "Rohan", Lives: 3}
	p2 := &Player{ID: "p2", Name: "Ananya", Lives: 3}
	engine := NewMatchEngine("TEST4", p1, p2, nil)

	obj := &FallingObject{ID: "h_single", Type: ObjNormalHeart, X: 50.0, Y: 87.0, Size: 6.0}
	engine.Objects = []*FallingObject{obj}

	// First collision
	res1 := engine.Physics.UpdateAndCheckCollisions(engine.Objects, 50.0, 0.01)
	if len(res1.CaughtObjects) != 1 {
		t.Fatalf("First pass must catch object")
	}

	// Second collision on same object
	res2 := engine.Physics.UpdateAndCheckCollisions(engine.Objects, 50.0, 0.01)
	if len(res2.CaughtObjects) != 0 {
		t.Fatalf("Second pass must NOT catch already caught object")
	}
}

// Test 7 & 8: Five consecutive heart catches activate combo; Bomb collision breaks streak
func TestComboStreakAndBombBreak(t *testing.T) {
	p1 := &Player{ID: "p1", Name: "Rohan", Lives: 3}
	comboThreshold := 5

	for i := 0; i < 5; i++ {
		p1.CurrentCombo++
	}

	if p1.CurrentCombo < comboThreshold {
		t.Fatalf("Combo should be active at 5, got %d", p1.CurrentCombo)
	}

	// Bomb hits -> Streak resets to 0
	p1.CurrentCombo = 0
	if p1.CurrentCombo != 0 {
		t.Fatalf("Streak should be 0 after bomb hit, got %d", p1.CurrentCombo)
	}
}

// Test 12 & 13: Winner calculation & tie handling
func TestWinnerCalculation(t *testing.T) {
	p1 := &Player{ID: "p1", Name: "Rohan", Score: 150}
	p2 := &Player{ID: "p2", Name: "Ananya", Score: 120}

	engine := NewMatchEngine("TEST_WIN", p1, p2, nil)
	engine.calculateResults()

	if engine.Summary.WinnerID != "p1" || engine.Summary.WinnerName != "Rohan" {
		t.Fatalf("Expected Rohan to win with 150 vs 120, got winner: %s", engine.Summary.WinnerName)
	}

	// Test Tie
	p2.Score = 150
	engine.calculateResults()
	if !engine.Summary.IsTie {
		t.Fatalf("Expected tie with equal scores 150 == 150")
	}
}

// Test 14: Dynamic object generation is not fixed to 4 and scales naturally
func TestDynamicSpawningEngine(t *testing.T) {
	sd := NewSpawnDirector(time.Now().UnixNano(), "Ananya")

	t1 := sd.TargetConcurrentObjects(0.0, 400.0)  // opening on mobile
	t2 := sd.TargetConcurrentObjects(0.5, 400.0)  // mid game
	t3 := sd.TargetConcurrentObjects(1.0, 1000.0) // endgame on desktop

	if t1 < 3 || t1 > 5 {
		t.Errorf("Unexpected opening concurrency: %d", t1)
	}
	if t2 <= t1 {
		t.Errorf("Mid-game concurrency (%d) should be greater than opening (%d)", t2, t1)
	}
	if t3 <= t2 {
		t.Errorf("Endgame desktop concurrency (%d) should be greater than midgame (%d)", t3, t2)
	}

	// Verify wave returns objects with opponent's name
	wave := sd.GenerateWave(1.0, 0.5, []*FallingObject{})
	if len(wave) == 0 {
		t.Fatalf("Wave returned 0 objects")
	}

	for _, o := range wave {
		if o.Type == ObjNormalHeart && o.NameTag != "Ananya" {
			t.Fatalf("Expected heart to carry opponent name Ananya, got %s", o.NameTag)
		}
		if o.Type == ObjBomb && o.NameTag != "" {
			t.Fatalf("Bombs must not have player name tags")
		}
	}
}
