package room

import (
	"crypto/rand"
	"encoding/hex"
	"math/big"
	"sync"
	"time"

	"catchhearts-server/game"
	"github.com/gorilla/websocket"
)

// ClientSession wraps a connected websocket client
type ClientSession struct {
	Conn     *websocket.Conn
	PlayerID string
	SendChan chan []byte
	mu       sync.Mutex
}

// Room represents a 2-player Catch Hearts session
type Room struct {
	mu        sync.RWMutex
	Code      string
	HostID    string
	PlayerOne *game.Player
	PlayerTwo *game.Player
	Clients   map[string]*ClientSession
	Engine    *game.MatchEngine
	CreatedAt time.Time
}

// RoomManager coordinates all active rooms
type RoomManager struct {
	mu    sync.RWMutex
	rooms map[string]*Room
}

func NewRoomManager() *RoomManager {
	return &RoomManager{
		rooms: make(map[string]*Room),
	}
}

// GenerateRoomCode returns a clean, memorable 4-6 letter code
func GenerateRoomCode() string {
	const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 5)
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		b[i] = charset[n.Int64()]
	}
	return string(b)
}

func GeneratePlayerID() string {
	b := make([]byte, 4)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// CreateRoom builds a fresh room with the initial participant
func (rm *RoomManager) CreateRoom(playerName, playerRole, avatar string) (*Room, *game.Player) {
	rm.mu.Lock()
	defer rm.mu.Unlock()

	code := GenerateRoomCode()
	playerID := GeneratePlayerID()

	p := &game.Player{
		ID:        playerID,
		Name:      playerName,
		Role:      playerRole,
		Avatar:    avatar,
		Ready:     true,
		Connected: true,
		Lives:     game.InitialLives,
		BasketX:   50.0,
	}

	r := &Room{
		Code:      code,
		HostID:    playerID,
		PlayerOne: p,
		Clients:   make(map[string]*ClientSession),
		CreatedAt: time.Now(),
	}

	rm.rooms[code] = r
	return r, p
}

// JoinRoom admits the second player to the room
func (rm *RoomManager) JoinRoom(code, playerName, playerRole, avatar string) (*Room, *game.Player, error) {
	rm.mu.Lock()
	r, exists := rm.rooms[code]
	rm.mu.Unlock()

	if !exists {
		return nil, nil, ErrRoomNotFound
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if r.PlayerTwo != nil && r.PlayerTwo.Connected {
		return nil, nil, ErrRoomFull
	}

	playerID := GeneratePlayerID()
	p := &game.Player{
		ID:        playerID,
		Name:      playerName,
		Role:      playerRole,
		Avatar:    avatar,
		Ready:     true,
		Connected: true,
		Lives:     game.InitialLives,
		BasketX:   50.0,
	}

	r.PlayerTwo = p
	return r, p, nil
}

// GetRoom retrieves a room by code
func (rm *RoomManager) GetRoom(code string) (*Room, bool) {
	rm.mu.RLock()
	defer rm.mu.RUnlock()
	r, ok := rm.rooms[code]
	return r, ok
}

// Broadcast sends a message to all connected clients in the room
func (r *Room) Broadcast(msg game.WSMessage) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	for _, client := range r.Clients {
		if client != nil {
			client.mu.Lock()
			if client.Conn != nil {
				client.Conn.WriteJSON(msg)
			}
			client.mu.Unlock()
		}
	}
}

// RegisterClient attaches a websocket connection to a player session
func (r *Room) RegisterClient(playerID string, conn *websocket.Conn) *ClientSession {
	r.mu.Lock()
	defer r.mu.Unlock()

	sess := &ClientSession{
		Conn:     conn,
		PlayerID: playerID,
		SendChan: make(chan []byte, 64),
	}
	r.Clients[playerID] = sess

	if r.PlayerOne != nil && r.PlayerOne.ID == playerID {
		r.PlayerOne.Connected = true
	}
	if r.PlayerTwo != nil && r.PlayerTwo.ID == playerID {
		r.PlayerTwo.Connected = true
	}

	return sess
}

// UnregisterClient removes a connection
func (r *Room) UnregisterClient(playerID string) {
	r.mu.Lock()
	defer r.mu.Unlock()

	delete(r.Clients, playerID)
	if r.PlayerOne != nil && r.PlayerOne.ID == playerID {
		r.PlayerOne.Connected = false
	}
	if r.PlayerTwo != nil && r.PlayerTwo.ID == playerID {
		r.PlayerTwo.Connected = false
	}
}

// EnsureEngine creates or gets the MatchEngine
func (r *Room) EnsureEngine() *game.MatchEngine {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.Engine == nil && r.PlayerOne != nil && r.PlayerTwo != nil {
		r.Engine = game.NewMatchEngine(r.Code, r.PlayerOne, r.PlayerTwo, func(eventType string, payload interface{}) {
			r.Broadcast(game.WSMessage{
				Type:      eventType,
				RoomCode:  r.Code,
				Timestamp: time.Now().UnixMilli(),
				Payload:   payload,
			})
		})
	}
	return r.Engine
}

var (
	ErrRoomNotFound = &roomError{"ROOM_NOT_FOUND", "The requested room code does not exist"}
	ErrRoomFull     = &roomError{"ROOM_FULL", "This room already has 2 participants"}
)

type roomError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *roomError) Error() string {
	return e.Message
}
