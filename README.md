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

## Environment variables

- `PORT` (optional, default `3000`)
- `JWT_SECRET` (strong secret in production)
- `DB_PATH` (optional, default `data/diary.db`)

## Quality and operations

- CI pipeline: `.github/workflows/ci.yml`
- API tests: `tests/api.test.js`
- Product roadmap: `docs/ROADMAP.md`
- Changelog: `docs/CHANGELOG.md`
- Support workflow: `docs/SUPPORT.md`
- SLA policy: `docs/SLA.md`

## Legal

- Privacy policy: `/privacy.html`
- Terms of service: `/terms.html`
