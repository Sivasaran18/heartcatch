# HeySakhi: Catch Hearts ❤️ — Render Deployment Guide

This project is configured for deployment on **Render** using a native **Infrastructure-as-Code Blueprint** (`render.yaml`).

---

## 🏗️ Architecture on Render

| Service | Type | Plan | Root Directory | Build Command | Start / Publish Path |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`heysakhi-catchhearts-backend`** | Web Service (Go) | **Free** | `server` | `go build -o catchhearts-server .` | `./catchhearts-server` |
| **`heysakhi-catchhearts-frontend`** | Static Site (Vite React) | **Free** | `client` | `npm install && npm run build` | `./dist` |

---

## 🚀 One-Click Deployment via Render Blueprint

### Step 1: Push Code to Your GitHub Repository
If you haven't linked your remote GitHub repository yet, run:
```bash
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Render
1. Open your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** in the top navigation bar and select **Blueprint**.
3. Connect your GitHub account and choose your repository.
4. Render will automatically parse [`render.yaml`](./render.yaml) and configure both services:
   - **Backend Web Service**: Go runtime on port `10000` with health check endpoint at `/health`.
   - **Frontend Static Site**: Node runtime building with Vite React, routing fallback `/*` -> `/index.html`.
   - **Dynamic Environment Variables**: Render automatically maps the backend HTTPS and WSS URLs directly to the frontend (`VITE_BACKEND_HTTP` and `VITE_BACKEND_WS`).
5. Click **Apply Blueprint**.

---

## 🧪 Post-Deployment Verification Checklist

1. **Backend Health Check**:
   - Visit: `https://<your-backend-name>.onrender.com/health`
   - Expected JSON response:
     ```json
     {
       "status": "healthy",
       "service": "HeySakhi Catch Hearts Backend"
     }
     ```
2. **Frontend Loading**:
   - Visit: `https://<your-frontend-name>.onrender.com`
   - Lobby screen should load with smooth animations and room creation options.
3. **Multiplayer Room & WebSocket Check**:
   - Create a room on Device 1.
   - Join with the generated 5-letter code on Device 2.
   - Start match and confirm live real-time heart catching and scoreboard synchronization.
