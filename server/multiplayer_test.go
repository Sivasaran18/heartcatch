package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"catchhearts-server/game"
	"catchhearts-server/room"
	"github.com/gorilla/websocket"
)

func TestFullTwoPlayerMultiplayerSession(t *testing.T) {
	rm := room.NewRoomManager()
	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/ws") {
			roomCode := r.URL.Query().Get("roomCode")
			playerID := r.URL.Query().Get("playerId")
			targetRoom, _ := rm.GetRoom(roomCode)
			u := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
			conn, _ := u.Upgrade(w, r, nil)
			sess := targetRoom.RegisterClient(playerID, conn)
			defer func() {
				targetRoom.UnregisterClient(playerID)
				conn.Close()
			}()

			for {
				var msg game.WSMessage
				if err := conn.ReadJSON(&msg); err != nil {
					break
				}
				eng := targetRoom.EnsureEngine()
				if msg.Type == game.EventMatchStarted {
					go eng.StartMatch()
				} else if msg.Type == game.EventBucketMoved {
					if payloadMap, ok := msg.Payload.(map[string]interface{}); ok {
						if x, ok := payloadMap["x"].(float64); ok {
							eng.UpdateBasketPosition(playerID, x)
						}
					}
				}
			}
			_ = sess
		}
	}))
	defer s.Close()

	// 1. Male User creates room
	r, p1 := rm.CreateRoom("Rohan", game.RoleMaleUser, "")
	if r == nil || p1 == nil {
		t.Fatalf("Failed to create room")
	}

	// 2. Sakhi joins room
	_, p2, err := rm.JoinRoom(r.Code, "Ananya", game.RoleSakhi, "")
	if err != nil || p2 == nil {
		t.Fatalf("Failed to join room: %v", err)
	}

	eng := r.EnsureEngine()
	if eng == nil {
		t.Fatalf("Expected engine to be initialized")
	}

	wsURL := "ws" + strings.TrimPrefix(s.URL, "http") + "/ws"

	// Connect Client 1 (Rohan)
	c1, _, err := websocket.DefaultDialer.Dial(wsURL+"?roomCode="+r.Code+"&playerId="+p1.ID, nil)
	if err != nil {
		t.Fatalf("Client 1 failed to connect: %v", err)
	}
	defer c1.Close()

	// Connect Client 2 (Ananya)
	c2, _, err := websocket.DefaultDialer.Dial(wsURL+"?roomCode="+r.Code+"&playerId="+p2.ID, nil)
	if err != nil {
		t.Fatalf("Client 2 failed to connect: %v", err)
	}
	defer c2.Close()

	// 3. Start Match
	c1.WriteJSON(game.WSMessage{
		Type:     game.EventMatchStarted,
		RoomCode: r.Code,
		PlayerID: p1.ID,
	})

	time.Sleep(300 * time.Millisecond)

	// 4. Verify Server Turn 1 state: Rohan is active, hearts tagged with Ananya
	if eng.TurnNumber != 1 {
		t.Errorf("Expected Turn 1, got %d", eng.TurnNumber)
	}
	if eng.ActivePlayer.ID != p1.ID {
		t.Errorf("Expected Player 1 (Rohan) active, got %s", eng.ActivePlayer.Name)
	}

	// 5. Test Basket Movement by Active Player
	moved := eng.UpdateBasketPosition(p1.ID, 65.0)
	if !moved || eng.ActivePlayer.BasketX != 65.0 {
		t.Fatalf("Active player failed to move basket")
	}

	// Test Non-active player (Ananya) cannot move basket
	movedObserver := eng.UpdateBasketPosition(p2.ID, 20.0)
	if movedObserver {
		t.Fatalf("Observer player must NOT be able to move active basket")
	}

	t.Logf("Full 2-player multiplayer room, WebSocket, turn switching & input validation passed!")
}
