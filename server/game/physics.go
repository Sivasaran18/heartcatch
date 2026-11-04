package game

import (
	"math"
)

// CollisionResult holds outcome of single physics step collision
type CollisionResult struct {
	CaughtObjects []*FallingObject
	BombsHit      []*FallingObject
	NearMisses    []*FallingObject
	ExpiredCount  int
}

// BasketPhysics represents basket position and collision geometry
type BasketPhysics struct {
	// Basket is located around Y: 85.0% - 92.0%
	BasketY      float64 // 88.0 default
	BasketWidth  float64 // normalized percentage e.g. 18.0%
	BasketHeight float64 // normalized percentage e.g. 8.0%
}

func NewBasketPhysics() *BasketPhysics {
	return &BasketPhysics{
		BasketY:      88.0,
		BasketWidth:  18.0,
		BasketHeight: 8.0,
	}
}

// UpdateAndCheckCollisions advances objects by delta time and detects catches, bomb hits and near misses
func (bp *BasketPhysics) UpdateAndCheckCollisions(objects []*FallingObject, basketX float64, dt float64) CollisionResult {
	res := CollisionResult{}

	basketHalfWidth := bp.BasketWidth / 2.0
	basketLeft := basketX - basketHalfWidth
	basketRight := basketX + basketHalfWidth
	basketTop := bp.BasketY - (bp.BasketHeight / 2.0)
	basketBottom := bp.BasketY + (bp.BasketHeight / 2.0)

	for _, obj := range objects {
		if obj.Caught || obj.Expired {
			continue
		}

		// Update position frame-rate independently
		obj.Y += obj.Speed * dt

		// Check collision with basket
		// Object hitbox: center (obj.X, obj.Y) with radius obj.Size/2
		objRadius := obj.Size / 2.0

		// Y overlap test: heart entering top zone of basket
		inVerticalRange := (obj.Y+objRadius >= basketTop) && (obj.Y-objRadius <= basketBottom)
		// X overlap test: heart within horizontal basket bounds
		inHorizontalRange := (obj.X+objRadius >= basketLeft) && (obj.X-objRadius <= basketRight)

		if inVerticalRange && inHorizontalRange {
			obj.Caught = true
			if obj.Type == ObjBomb {
				res.BombsHit = append(res.BombsHit, obj)
			} else {
				res.CaughtObjects = append(res.CaughtObjects, obj)
			}
			continue
		}

		// Near-miss check for bomb:
		// Bomb passed basket level (Y between basketTop and basketBottom+5) but horizontally missed by a small margin (< 8%)
		if obj.Type == ObjBomb && !obj.NearMiss && inVerticalRange {
			distLeft := math.Abs(obj.X - basketLeft)
			distRight := math.Abs(obj.X - basketRight)
			if (distLeft < 7.0 || distRight < 7.0) && !inHorizontalRange {
				obj.NearMiss = true
				res.NearMisses = append(res.NearMisses, obj)
			}
		}

		// Check if object left the playfield (beyond 105%)
		if obj.Y > 105.0 {
			obj.Expired = true
			res.ExpiredCount++
		}
	}

	return res
}
