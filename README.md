# Personal Journal (Render Deployment)

A full-stack personal diary app with account auth, cloud API, and persistent SQLite storage.

## Stack
- Frontend: `public/index.html` (served by Express)
- Backend: `server.js` (Express API)
- Database: SQLite (`better-sqlite3`)
- Auth: JWT + bcrypt
- Tests: Vitest + Supertest

## Run locally
```bash
npm install
npm start
```
Open `http://localhost:3000`.

## Deploy to Render (your target)
This project is now configured to run directly on Render at:
`https://personal-diary-website-qqh1.onrender.com`

### 1) Create/Update Render service
- Use this repo and `render.yaml`.
- Build command: `npm install`
- Start command: `npm start`
- Ensure persistent disk is mounted at `/var/data`.

### 2) Set Render environment variables
- `NODE_ENV=production`
- `JWT_SECRET=<strong-random-secret>`
- `DB_PATH=/var/data/diary.db`
- `CLIENT_ORIGIN=https://personal-diary-website-qqh1.onrender.com`

### 3) Redeploy
- Trigger manual deploy in Render dashboard after updating env vars.

## API + UI notes
- The app serves frontend and API from the same origin on Render.
- Main app URL: `https://personal-diary-website-qqh1.onrender.com`
- Health check: `https://personal-diary-website-qqh1.onrender.com/api/health`

## Test
```bash
npm test
```
