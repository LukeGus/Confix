const express = require('express');
const http = require('http');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const cors = require("cors");
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = 8081;

app.use(cors());
app.use(express.json());

const getReadableTimestamp = () => {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'UTC',
    }).format(new Date());
};

const logger = {
    info: (...args) => console.log(`💾 |  🔧 [${getReadableTimestamp()}] INFO:`, ...args),
    error: (...args) => console.error(`💾 | ❌ [${getReadableTimestamp()}] ERROR:`, ...args),
    warn: (...args) => console.warn(`💾 | ⚠️ [${getReadableTimestamp()}] WARN:`, ...args),
    debug: (...args) => console.debug(`💾 | 🔍 [${getReadableTimestamp()}] DEBUG:`, ...args)
};

const SALT = process.env.SALT || 'default_salt';
const JWT_SECRET = SALT + '_jwt_secret';
const DB_PATH = path.join(__dirname, 'users.db');

// Initialize DB
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT 0
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signup_enabled BOOLEAN DEFAULT 1
)`).run();

// Initialize settings if not exists
const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
if (settingsCount === 0) {
    db.prepare('INSERT INTO settings (signup_enabled) VALUES (1)').run();
}

function getKeyAndIV() {
    // 32 bytes key for aes-256-ctr, 16 bytes IV
    const key = crypto.createHash('sha256').update(SALT).digest();
    const iv = Buffer.alloc(16, 0); // Not secure for production, but fine for local dev
    return { key, iv };
}

function encrypt(text) {
    const { key, iv } = getKeyAndIV();
    const cipher = crypto.createCipheriv('aes-256-ctr', key, iv);
    let crypted = cipher.update(text, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

function decrypt(text) {
    const { key, iv } = getKeyAndIV();
    const decipher = crypto.createDecipheriv('aes-256-ctr', key, iv);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    return dec;
}

function generateToken(user) {
    return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).json({ error: 'No token provided' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Invalid token format' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// User registration
app.post('/database/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    // Check if signups are enabled
    const settings = db.prepare('SELECT signup_enabled FROM settings WHERE id = 1').get();
    if (!settings.signup_enabled) {
        return res.status(403).json({ error: 'Signups are currently disabled' });
    }

    try {
        // Check if this is the first user
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const isFirstUser = userCount === 0;

        const hash = await bcrypt.hash(password + SALT, 10);
        const stmt = db.prepare('INSERT INTO users (username, password, created_at, is_admin) VALUES (?, ?, ?, ?)');
        stmt.run(username, encrypt(hash), new Date().toISOString(), isFirstUser ? 1 : 0);

        // Immediately log in the user after registration
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        const token = generateToken(user);
        return res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username,
                isAdmin: user.is_admin === 1
            },
            isFirstUser
        });
    } catch (err) {
        if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Username already exists' });
        }
        logger.error('Registration error:', err);
        return res.status(500).json({ error: 'Registration failed' });
    }
});

// User login
app.post('/database/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(401).json({ error: 'Username and password required' });
    try {
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        const hash = decrypt(user.password);
        const valid = await bcrypt.compare(password + SALT, hash);
        if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
        const token = generateToken(user);
        return res.json({ 
            token, 
            user: { 
                id: user.id, 
                username: user.username,
                isAdmin: user.is_admin === 1
            }
        });
    } catch (err) {
        logger.error('Login error:', err);
        return res.status(500).json({ error: 'Login failed' });
    }
});

// Get current user profile
app.get('/database/profile', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT id, username, created_at, is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ 
        user: {
            id: user.id,
            username: user.username,
            created_at: user.created_at,
            isAdmin: user.is_admin === 1
        }
    });
});

// Check if this is the first user
app.get('/database/check-first-user', (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    return res.json({ isFirstUser: userCount === 0 });
});

// Get admin settings
app.get('/database/admin/settings', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const settings = db.prepare('SELECT signup_enabled FROM settings WHERE id = 1').get();
    return res.json({ settings });
});

// Update admin settings
app.post('/database/admin/settings', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const { signup_enabled } = req.body;
    if (typeof signup_enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid signup_enabled value' });
    }

    db.prepare('UPDATE settings SET signup_enabled = ? WHERE id = 1').run(signup_enabled ? 1 : 0);
    return res.json({ message: 'Settings updated successfully' });
});

// Protect all routes below this
app.use('/file', authMiddleware);
app.use('/files', authMiddleware);

app.listen(PORT, () => {
    logger.info(`Database API listening at http://localhost:${PORT}`);
});