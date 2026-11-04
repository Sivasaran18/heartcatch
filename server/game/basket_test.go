package game

import (
	"testing"
)

// Test Basket Catch Boundary & Edge Cases
func TestBasketCatchCoverage(t *testing.T) {
	physics := NewBasketPhysics()
	// Basket is at Y: 88.0%, Width: 18.0%, Height: 8.0%
	// Horizontal coverage: [basketX - 9.0%, basketX + 9.0%]
	// Vertical coverage: [84.0% - radius, 92.0% + radius]

	basketX := 50.0

	// Case 1: Exact center catch
	objCenter := &FallingObject{ID: "c1", Type: ObjNormalHeart, X: 50.0, Y: 87.0, Size: 6.0}
	res1 := physics.UpdateAndCheckCollisions([]*FallingObject{objCenter}, basketX, 0.0)
	if len(res1.CaughtObjects) != 1 {
		t.Errorf("Failed to catch heart in exact center of basket")
	}

	// Case 2: Near left lip of basket (42.0%, within 41.0 - 59.0% range)
	objLeft := &FallingObject{ID: "l1", Type: ObjNormalHeart, X: 42.0, Y: 87.0, Size: 6.0}
	res2 := physics.UpdateAndCheckCollisions([]*FallingObject{objLeft}, basketX, 0.0)
	if len(res2.CaughtObjects) != 1 {
		t.Errorf("Failed to catch heart near left rim of basket")
	}

	// Case 3: Near right lip of basket (58.0%, within 41.0 - 59.0% range)
	objRight := &FallingObject{ID: "r1", Type: ObjNormalHeart, X: 58.0, Y: 87.0, Size: 6.0}
	res3 := physics.UpdateAndCheckCollisions([]*FallingObject{objRight}, basketX, 0.0)
	if len(res3.CaughtObjects) != 1 {
		t.Errorf("Failed to catch heart near right rim of basket")
	}

	// Case 4: Complete miss (X: 30.0%)
	objMiss := &FallingObject{ID: "m1", Type: ObjNormalHeart, X: 30.0, Y: 87.0, Size: 6.0}
	res4 := physics.UpdateAndCheckCollisions([]*FallingObject{objMiss}, basketX, 0.0)
	if len(res4.CaughtObjects) != 0 {
		t.Errorf("Should NOT catch heart outside horizontal range")
	}

	// Case 5: Golden Heart catch
	objGold := &FallingObject{ID: "g1", Type: ObjGoldenHeart, X: 50.0, Y: 87.0, Size: 6.0}
	res5 := physics.UpdateAndCheckCollisions([]*FallingObject{objGold}, basketX, 0.0)
	if len(res5.CaughtObjects) != 1 || res5.CaughtObjects[0].Type != ObjGoldenHeart {
		t.Errorf("Failed to catch golden heart")
	}

	// Case 6: Bomb hit
	objBomb := &FallingObject{ID: "b1", Type: ObjBomb, X: 50.0, Y: 87.0, Size: 6.0}
	res6 := physics.UpdateAndCheckCollisions([]*FallingObject{objBomb}, basketX, 0.0)
	if len(res6.BombsHit) != 1 {
		t.Errorf("Failed to detect bomb hit on basket")
	}
}

// Test Screen Boundary Clamping for Basket
func TestBasketBoundaryClamping(t *testing.T) {
	p1 := &Player{ID: "p1", Name: "Rohan"}
	p2 := &Player{ID: "p2", Name: "Ananya"}
	engine := NewMatchEngine("BOUND1", p1, p2, nil)
	engine.ActivePlayer = p1

	// Attempt move beyond left edge (negative or < 9%)
	engine.UpdateBasketPosition("p1", -15.0)
	if engine.ActivePlayer.BasketX < 9.0 {
		t.Errorf("Basket moved outside left boundary: %f", engine.ActivePlayer.BasketX)
	}

	// Attempt move beyond right edge (> 91%)
	engine.UpdateBasketPosition("p1", 120.0)
	if engine.ActivePlayer.BasketX > 91.0 {
		t.Errorf("Basket moved outside right boundary: %f", engine.ActivePlayer.BasketX)
	}
}

