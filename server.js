const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { z } = require('zod');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'diary.db');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS verification_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT DEFAULT '',
      text TEXT NOT NULL,
      draft INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user ON entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_entries_user_draft ON entries(user_id, draft);
  `);

  const existing = db.prepare('SELECT COUNT(*) AS count FROM schema_version').get();
  if (existing.count === 0) {
    db.prepare('INSERT INTO schema_version (version, applied_at) VALUES (?, ?)').run(1, new Date().toISOString());
  }
}

runMigrations();

app.use(helmet());
app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api', rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  displayName: z.string().min(2).max(60)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});

const entrySchema = z.object({
  title: z.string().max(120).optional().default(''),
  text: z.string().min(1).max(5000),
  draft: z.boolean().default(true)
});

const updateEntrySchema = z.object({
  title: z.string().max(120).optional(),
  text: z.string().min(1).max(5000).optional(),
  draft: z.boolean().optional()
}).refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, displayName: user.display_name, emailVerified: !!user.email_verified },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function generateToken() {
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function authRequired(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = auth.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

app.get('/api/health', (_req, res) => {
  const version = db.prepare('SELECT MAX(version) AS version FROM schema_version').get();
  res.json({ status: 'ok', timestamp: new Date().toISOString(), schemaVersion: version.version });
});

app.post('/api/auth/register', authLimiter, async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, displayName } = parsed.data;
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 10);
  const createdAt = new Date().toISOString();

  const info = db.prepare(
    'INSERT INTO users (email, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)'
  ).run(email.toLowerCase(), passwordHash, displayName, createdAt);

  const verifyToken = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO verification_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)'
  ).run(info.lastInsertRowid, verifyToken, expiresAt, createdAt);

  const user = db.prepare('SELECT id, email, display_name, email_verified FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, email: user.email, displayName: user.display_name, emailVerified: !!user.email_verified }, verificationToken: verifyToken });
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = signToken(user);
  res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name, emailVerified: !!user.email_verified } });
});

app.post('/api/auth/verify-email', authLimiter, (req, res) => {
  const token = req.body?.token;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const record = db.prepare('SELECT * FROM verification_tokens WHERE token = ?').get(token);
  if (!record) return res.status(404).json({ error: 'Invalid verification token' });
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });

  db.prepare('UPDATE users SET email_verified = 1 WHERE id = ?').run(record.user_id);
  db.prepare('DELETE FROM verification_tokens WHERE user_id = ?').run(record.user_id);
  res.json({ success: true });
});

app.post('/api/auth/request-password-reset', authLimiter, (req, res) => {
  const email = req.body?.email;
  if (!email) return res.status(400).json({ error: 'Email required' });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(String(email).toLowerCase());
  if (!user) return res.json({ success: true });

  const resetToken = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
  db.prepare('INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at) VALUES (?, ?, ?, ?)').run(
    user.id,
    resetToken,
    expiresAt,
    new Date().toISOString()
  );

  res.json({ success: true, resetToken });
});

app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const token = req.body?.token;
  const password = req.body?.password;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  if (String(password).length < 8) return res.status(400).json({ error: 'Password too short' });

  const record = db.prepare('SELECT * FROM password_reset_tokens WHERE token = ?').get(token);
  if (!record) return res.status(404).json({ error: 'Invalid token' });
  if (new Date(record.expires_at) < new Date()) return res.status(400).json({ error: 'Token expired' });

  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, record.user_id);
  db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(record.user_id);

  res.json({ success: true });
});

app.get('/api/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, email, display_name, email_verified, created_at FROM users WHERE id = ?').get(req.user.sub);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ id: user.id, email: user.email, displayName: user.display_name, emailVerified: !!user.email_verified, createdAt: user.created_at });
});

app.get('/api/entries', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM entries WHERE user_id = ? ORDER BY datetime(updated_at) DESC').all(req.user.sub);
  res.json(rows.map((r) => ({ id: r.id, title: r.title, text: r.text, draft: !!r.draft, createdAt: r.created_at, updatedAt: r.updated_at })));
});

app.post('/api/entries', authRequired, (req, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const now = new Date().toISOString();
  const info = db.prepare(
    'INSERT INTO entries (user_id, title, text, draft, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(req.user.sub, parsed.data.title, parsed.data.text, parsed.data.draft ? 1 : 0, now, now);

  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ id: row.id, title: row.title, text: row.text, draft: !!row.draft, createdAt: row.created_at, updatedAt: row.updated_at });
});

app.patch('/api/entries/:id', authRequired, (req, res) => {
  const entryId = Number(req.params.id);
  if (!Number.isInteger(entryId)) return res.status(400).json({ error: 'Invalid entry id' });

  const existing = db.prepare('SELECT * FROM entries WHERE id = ? AND user_id = ?').get(entryId, req.user.sub);
  if (!existing) return res.status(404).json({ error: 'Entry not found' });

  const parsed = updateEntrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const next = {
    title: parsed.data.title ?? existing.title,
    text: parsed.data.text ?? existing.text,
    draft: parsed.data.draft ?? !!existing.draft
  };

  const updatedAt = new Date().toISOString();
  db.prepare('UPDATE entries SET title = ?, text = ?, draft = ?, updated_at = ? WHERE id = ? AND user_id = ?').run(
    next.title,
    next.text,
    next.draft ? 1 : 0,
    updatedAt,
    entryId,
    req.user.sub
  );

  const row = db.prepare('SELECT * FROM entries WHERE id = ?').get(entryId);
  res.json({ id: row.id, title: row.title, text: row.text, draft: !!row.draft, createdAt: row.created_at, updatedAt: row.updated_at });
});

app.delete('/api/entries/:id', authRequired, (req, res) => {
  const entryId = Number(req.params.id);
  const result = db.prepare('DELETE FROM entries WHERE id = ? AND user_id = ?').run(entryId, req.user.sub);
  if (!result.changes) return res.status(404).json({ error: 'Entry not found' });
  res.status(204).send();
});

app.delete('/api/entries', authRequired, (req, res) => {
  db.prepare('DELETE FROM entries WHERE user_id = ?').run(req.user.sub);
  res.status(204).send();
});

app.get('/api/export', authRequired, (req, res) => {
  const user = db.prepare('SELECT id, email, display_name, email_verified, created_at FROM users WHERE id = ?').get(req.user.sub);
  const entries = db.prepare('SELECT id, title, text, draft, created_at, updated_at FROM entries WHERE user_id = ?').all(req.user.sub);
  res.json({ exportedAt: new Date().toISOString(), user: { id: user.id, email: user.email, displayName: user.display_name, emailVerified: !!user.email_verified, createdAt: user.created_at }, entries: entries.map((e) => ({ ...e, draft: !!e.draft })) });
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = { app, db };
