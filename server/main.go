package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"catchhearts-server/game"
	"catchhearts-server/room"
	"github.com/gorilla/websocket"
)

var (
	roomManager = room.NewRoomManager()
	upgrader    = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			return true // Allow all origins for seamless web/mobile testing
		},
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
)

func enableCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// Health check endpoint
func handleHealth(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status":  "healthy",
		"service": "HeySakhi Catch Hearts Backend",
		"time":    time.Now().UTC().Format(time.RFC3339),
	})
}

// REST: Create Room
func handleCreateRoom(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Name   string `json:"name"`
		Role   string `json:"role"`
		Avatar string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Name == "" {
		http.Error(w, "Invalid name or role", http.StatusBadRequest)
		return
	}

	if req.Role == "" {
		req.Role = game.RoleMaleUser
	}

	rm, player := roomManager.CreateRoom(req.Name, req.Role, req.Avatar)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"roomCode": rm.Code,
		"player":   player,
	})
}

// REST: Join Room
func handleJoinRoom(w http.ResponseWriter, r *http.Request) {
	enableCORS(&w)
	if r.Method == "OPTIONS" {
		return
	}
	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RoomCode string `json:"roomCode"`
		Name     string `json:"name"`
		Role     string `json:"role"`
		Avatar   string `json:"avatar"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RoomCode == "" || req.Name == "" {
		http.Error(w, "Invalid room code or name", http.StatusBadRequest)
		return
	}

	if req.Role == "" {
		req.Role = game.RoleSakhi
	}

	rm, player, err := roomManager.JoinRoom(req.RoomCode, req.Name, req.Role, req.Avatar)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{"error": err.Error()})
		return
	}

	// Notify both participants that room is now ready
	engine := rm.EnsureEngine()

	rm.Broadcast(game.WSMessage{
		Type:      game.EventPlayerReady,
		RoomCode:  rm.Code,
		Timestamp: time.Now().UnixMilli(),
		Payload: map[string]interface{}{
			"playerOne": rm.PlayerOne,
			"playerTwo": rm.PlayerTwo,
		},
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"roomCode": rm.Code,
		"player":   player,
		"engine":   engine.GetStateSnapshotLocked(),
	})
}

// WebSocket handler
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
	roomCode := r.URL.Query().Get("roomCode")
	playerID := r.URL.Query().Get("playerId")

	if roomCode == "" || playerID == "" {
		http.Error(w, "Missing roomCode or playerId query param", http.StatusBadRequest)
		return
	}

	targetRoom, ok := roomManager.GetRoom(roomCode)
	if !ok {
		http.Error(w, "Room not found", http.StatusNotFound)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("[WS] Upgrade error: %v", err)
		return
	}

	sess := targetRoom.RegisterClient(playerID, conn)
	defer func() {
		targetRoom.UnregisterClient(playerID)
		conn.Close()
		targetRoom.Broadcast(game.WSMessage{
			Type:      game.EventPlayerDisconnected,
			RoomCode:  roomCode,
			PlayerID:  playerID,
			Timestamp: time.Now().UnixMilli(),
		})
	}()

	// Send current room state on connection
	var p1, p2 *game.Player
	if targetRoom.PlayerOne != nil {
		p1 = targetRoom.PlayerOne
	}
	if targetRoom.PlayerTwo != nil {
		p2 = targetRoom.PlayerTwo
	}

	initialState := map[string]interface{}{
		"roomCode":  roomCode,
		"playerOne": p1,
		"playerTwo": p2,
	}
	if targetRoom.Engine != nil {
		initialState["game"] = targetRoom.Engine.GetGameSnapshotLocked()
		initialState["match"] = targetRoom.Engine.GetStateSnapshotLocked()
	}

	sess.Conn.WriteJSON(game.WSMessage{
		Type:      game.EventStateSync,
		RoomCode:  roomCode,
		PlayerID:  playerID,
		Timestamp: time.Now().UnixMilli(),
		Payload:   initialState,
	})

	targetRoom.Broadcast(game.WSMessage{
		Type:      game.EventPlayerReconnected,
		RoomCode:  roomCode,
		PlayerID:  playerID,
		Timestamp: time.Now().UnixMilli(),
	})

	// Message pump
	for {
		var msg game.WSMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] Error reading message: %v", err)
			}
			break
		}

		engine := targetRoom.EnsureEngine()

		switch msg.Type {
		case game.EventMatchStarted:
			// Host or either confirmed player starts the match
			if engine != nil && (targetRoom.PlayerOne != nil && targetRoom.PlayerTwo != nil) {
				go engine.StartMatch()
			}

		case game.EventBucketMoved:
			// Move payload: { "x": float64 }
			if payloadMap, ok := msg.Payload.(map[string]interface{}); ok {
				if xVal, exists := payloadMap["x"]; exists {
					var x float64
					switch v := xVal.(type) {
					case float64:
						x = v
					case float32:
						x = float64(v)
					case int:
						x = float64(v)
					}
					if engine != nil {
						engine.UpdateBasketPosition(playerID, x)
					}
				}
			}

		case game.EventRematchRequested:
			if engine != nil {
				engine.RequestRematch(playerID)
			}

		default:
			// Relay or ignore
		}
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}

	http.HandleFunc("/health", handleHealth)
	http.HandleFunc("/api/room/create", handleCreateRoom)
	http.HandleFunc("/api/room/join", handleJoinRoom)
	http.HandleFunc("/ws", handleWebSocket)

	server := &http.Server{
		Addr:         ":" + port,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	log.Printf("=====================================================")
	log.Printf("  ❤️  HEYSAKHI: CATCH HEARTS SERVER RUNNING ON :%s", port)
	log.Printf("=====================================================")

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Server failed to start: %v", err)
	}
}
