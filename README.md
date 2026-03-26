# Personal Journal (Full-Stack)

A production-oriented personal diary web app with:
- account authentication
- JWT sessions
- backend API + SQLite storage
- cloud-ready architecture
- legal pages and operational docs
- automated API tests + CI

## Features

- Register/login with email + password
- Email verification token flow
- Password reset token flow
- Journal CRUD (draft/final)
- JSON export
- Rate limiting and secure headers
- Data schema versioning table

## Tech Stack

- Frontend: HTML + Tailwind + Vanilla JS (`public/index.html`)
- Backend: Node.js + Express (`server.js`)
- Database: SQLite (`better-sqlite3`)
- Validation: Zod
- Auth: JWT + bcrypt
- Testing: Vitest + Supertest

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:3000`.

## Deployment (important)

- This is a **full-stack** app; GitHub Pages alone is not enough because API routes (`/api/*`) require a Node server.
- Deploy backend on Render/Railway/Fly.io (or your VPS), then host frontend either:
  - on the same origin, or
  - separately and configure API base URL from login screen.

### Render + GitHub Pages (recommended for your setup)

1. **Deploy API on Render**
   - Connect this repo on Render as a Web Service (or use `render.yaml`).
   - Ensure env vars are set (`JWT_SECRET`, `DB_PATH`, `CLIENT_ORIGIN`).
   - Set `CLIENT_ORIGIN` to your Pages URL (e.g., `https://<username>.github.io`).

2. **Deploy frontend on GitHub Pages**
   - Use the included workflow `.github/workflows/deploy-pages.yml`.
   - It publishes the `public/` folder to Pages on pushes to `main`.

3. **Connect frontend to backend**
   - In your Pages site, paste your Render backend URL in “Set backend API URL”, then click **Save**.
   - Optional: pass it in URL query once: `?apiBase=https://your-render-app.onrender.com`
   - Current default backend URL in `public/index.html` is set to: `https://personal-diary-website-qqh1.onrender.com`

## Environment variables

- `PORT` (optional, default `3000`)
- `JWT_SECRET` (strong secret in production)
- `DB_PATH` (optional, default `data/diary.db`)

## Quality and operations

- CI pipeline: `.github/workflows/ci.yml`
- API tests: `tests/api.test.mjs`
- Product roadmap: `docs/ROADMAP.md`
- Changelog: `docs/CHANGELOG.md`
- Support workflow: `docs/SUPPORT.md`
- SLA policy: `docs/SLA.md`

## Legal

- Privacy policy: `/privacy.html`
- Terms of service: `/terms.html`
