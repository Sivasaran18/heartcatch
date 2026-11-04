# Catch Hearts ❤️ (HeySakhi Arcade)

Catch Hearts is an independent, high-performance two-player arcade multiplayer game built from scratch with an authoritative Go backend, WebSocket event protocol, and dynamic Canvas 2D mobile-first frontend.

---

## 🎮 Game Rules & Concept

- **Two Participants**: Male User and Sakhi.
- **Name-Based Hearts**:
  - When **Male User** plays, falling hearts carry **Sakhi's** confirmed name tag.
  - When **Sakhi** plays, falling hearts carry **Male User's** confirmed name tag.
  - Bombs fall randomly among hearts and do not carry names.
- **Scoring**:
  - Normal Heart: **+10 points**
  - Golden Heart: **+25 points**
  - Bomb: **-1 life** (Players start with 3 lives; 3 bombs lost ends the turn)
  - 5-Catch Streak activates **Combo multiplier** bonus (broken on bomb catch)
- **Turn-based Arcade**:
  - 45s turn per participant.
  - The highest score wins; ties are cleanly handled with instant rematching.

---

## 🚀 Running Locally

### 1. Go Authoritative Backend
```bash
cd server
go run .
```
Backend runs on `http://localhost:8090` with WebSocket endpoint at `ws://localhost:8090/ws`.

### 2. Frontend Web & Mobile Client
```bash
cd client
npm install
npm run dev
```

---

## 🧪 Automated Test Suite

- **Game Rules & Physics Tests**:
```bash
cd server
go test -v ./game
```
- **Two-Player WebSocket Multiplayer Tests**:
```bash
cd server
go test -v .
```
- **Client Production Build**:
```bash
cd client
npm run build
```

---

## 🌐 Production Deployment (Zero-Cost Free-Tier)

- **Backend (Go WebSocket Server)**:
  - Deployable on Render / Railway / Fly.io free tiers.
  - Port is set dynamically via `PORT` environment variable.
- **Frontend (Vite React Client)**:
  - Deployable on Vercel or Cloudflare Pages.
  - Set `VITE_BACKEND_HTTP` and `VITE_BACKEND_WS` environment variables to your deployed backend URL.

