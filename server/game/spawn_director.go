package game

import (
	"fmt"
	"math"
	"math/rand"
	"time"
)

// SpawnDirector manages fair, dynamic, and adaptive generation of falling hearts and bombs.
// It avoids fixed 4-object patterns and adapts concurrency smoothly based on game phase and playfield.
type SpawnDirector struct {
	rng           *rand.Rand
	lastSpawnTime float64
	spawnInterval float64
	nextObjectID  int64
	opponentName  string
}

// NewSpawnDirector initializes a director with an independent seed
func NewSpawnDirector(seed int64, opponentName string) *SpawnDirector {
	if seed == 0 {
		seed = time.Now().UnixNano()
	}
	return &SpawnDirector{
		rng:           rand.New(rand.NewSource(seed)),
		lastSpawnTime: -1.0,
		spawnInterval: 0.8,
		nextObjectID:  1,
		opponentName:  opponentName,
	}
}

// SetOpponentName updates the name tagged on the hearts for the active turn
func (sd *SpawnDirector) SetOpponentName(name string) {
	sd.opponentName = name
}

// ComputeDifficulty calculates progression multiplier from remaining time (45s -> 0s)
// 0.0 at start, 1.0 at end
func (sd *SpawnDirector) ComputeProgression(timeRemaining, totalDuration float64) float64 {
	if totalDuration <= 0 {
		return 0.5
	}
	progress := 1.0 - (timeRemaining / totalDuration)
	if progress < 0 {
		return 0
	}
	if progress > 1 {
		return 1
	}
	return progress
}

// TargetConcurrentObjects calculates how many objects can be active concurrently
// Small viewport or opening: 4-6
// Middle stage: 6-9
// Final stage: 8-12
func (sd *SpawnDirector) TargetConcurrentObjects(progress float64, playfieldWidth float64) int {
	// Base capacity scales with playfield width (normalized or real)
	base := 4
	if playfieldWidth > 600 {
		base = 5
	}
	if playfieldWidth > 900 {
		base = 6
	}

	// Add dynamic wave concurrency based on progress
	additional := int(math.Floor(progress * 5.0)) // 0 to 5
	target := base + additional
	if target < 3 {
		target = 3
	}
	if target > 12 {
		target = 12
	}
	return target
}

// ShouldSpawn checks if a new spawn is due based on elapsed time and current object count
func (sd *SpawnDirector) ShouldSpawn(currentTime float64, activeCount int, targetCount int) bool {
	if activeCount >= targetCount {
		return false
	}
	if sd.lastSpawnTime < 0 || (currentTime-sd.lastSpawnTime) >= sd.spawnInterval {
		return true
	}
	return false
}

// GenerateWave spawns 1 to 3 objects in a coordinated wave that guarantees fair play (no impossible bomb walls)
func (sd *SpawnDirector) GenerateWave(currentTime, progress float64, existingObjects []*FallingObject) []*FallingObject {
	sd.lastSpawnTime = currentTime

	// Adjust next spawn interval: decreases from 1.0s to 0.45s as progress grows
	sd.spawnInterval = 0.95 - (progress * 0.45) + (sd.rng.Float64()*0.2 - 0.1)
	if sd.spawnInterval < 0.35 {
		sd.spawnInterval = 0.35
	}

	// Determine wave count (1, 2 or rarely 3 during Heart Rush in late game)
	count := 1
	roll := sd.rng.Float64()
	if progress > 0.4 && roll > 0.65 {
		count = 2
	}
	if progress > 0.75 && roll > 0.90 {
		count = 3
	}

	// Speed ranges: 18% to 38% screen height per second
	baseSpeed := 20.0 + (progress * 14.0)

	var newObjects []*FallingObject
	occupiedLanes := make([]float64, 0, len(existingObjects)+count)
	for _, obj := range existingObjects {
		if obj.Y < 20.0 { // objects near top
			occupiedLanes = append(occupiedLanes, obj.X)
		}
	}

	bombCountThisWave := 0

	for i := 0; i < count; i++ {
		// Find horizontal position with separation
		x := sd.findSafeSpawnX(occupiedLanes)
		occupiedLanes = append(occupiedLanes, x)

		// Determine object type
		// Bombs: 15% opening -> 28% endgame, never 2 bombs in the same immediate wave
		bombChance := 0.15 + (progress * 0.13)
		goldenChance := 0.10 // 10% chance for special golden heart

		objType := ObjNormalHeart
		rollType := sd.rng.Float64()

		if bombCountThisWave == 0 && rollType < bombChance {
			objType = ObjBomb
			bombCountThisWave++
		} else if rollType < (bombChance + goldenChance) {
			objType = ObjGoldenHeart
		}

		speed := baseSpeed + (sd.rng.Float64()*6.0 - 3.0)
		if speed < 16.0 {
			speed = 16.0
		}

		// Initial Y is slightly staggered above screen so they glide in gracefully
		initialY := -(float64(i) * 5.0)

		obj := &FallingObject{
			ID:       fmt.Sprintf("obj_%d_%d", time.Now().UnixNano(), sd.nextObjectID),
			Type:     objType,
			NameTag:  sd.opponentName,
			X:        x,
			Y:        initialY,
			Speed:    speed,
			Size:     6.5, // ~6.5% of width radius
			Caught:   false,
			Expired:  false,
			NearMiss: false,
		}
		sd.nextObjectID++

		if objType == ObjBomb {
			obj.NameTag = "" // Bombs do not display player names
		}

		newObjects = append(newObjects, obj)
	}

	return newObjects
}

// findSafeSpawnX picks a lane between 8% and 92% screen width, maintaining at least 14% gap from others near top
func (sd *SpawnDirector) findSafeSpawnX(occupied []float64) float64 {
	bestX := 10.0 + sd.rng.Float64()*80.0
	minSeparation := 15.0

	// Try up to 8 random placements to find an unoccupied lane
	for attempt := 0; attempt < 8; attempt++ {
		candidate := 8.0 + sd.rng.Float64()*84.0
		safe := true
		for _, occ := range occupied {
			if math.Abs(candidate-occ) < minSeparation {
				safe = false
				break
			}
		}
		if safe {
			return candidate
		}
	}
	return bestX
}
