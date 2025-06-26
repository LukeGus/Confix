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

app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const getReadableTimestamp = () => {
    return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'UTC',
    }).format(new Date());
};

const logger = {
    info: (...args) => console.log(`💾 | 🔧 [${getReadableTimestamp()}] INFO:`, ...args),
    error: (...args) => console.error(`💾 | ❌ [${getReadableTimestamp()}] ERROR:`, ...args),
    warn: (...args) => console.warn(`💾 | ⚠️ [${getReadableTimestamp()}] WARN:`, ...args),
    debug: (...args) => console.debug(`💾 | 🔍 [${getReadableTimestamp()}] DEBUG:`, ...args)
};

const SALT = process.env.SALT || 'default_salt';
const JWT_SECRET = SALT + '_jwt_secret';
const DB_PATH = path.join(__dirname, 'users.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.prepare(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT 0,
    theme TEXT DEFAULT 'vscode'
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    signup_enabled BOOLEAN DEFAULT 1
)`).run();

const settingsCount = db.prepare('SELECT COUNT(*) as count FROM settings').get().count;
if (settingsCount === 0) {
    db.prepare('INSERT INTO settings (signup_enabled) VALUES (1)').run();
}

db.prepare(`CREATE TABLE IF NOT EXISTS user_recent_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    last_opened TEXT NOT NULL,
    server_name TEXT,
    server_ip TEXT,
    server_port INTEGER,
    server_user TEXT,
    server_default_path TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS user_starred_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    last_opened TEXT NOT NULL,
    server_name TEXT,
    server_ip TEXT,
    server_port INTEGER,
    server_user TEXT,
    server_default_path TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS user_folder_shortcuts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    folder_path TEXT NOT NULL,
    folder_name TEXT NOT NULL,
    server_name TEXT,
    server_ip TEXT,
    server_port INTEGER,
    server_user TEXT,
    server_default_path TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS user_open_tabs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    tab_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content TEXT,
    saved_content TEXT,
    is_dirty BOOLEAN DEFAULT 0,
    server_name TEXT,
    server_ip TEXT,
    server_port INTEGER,
    server_user TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS user_current_path (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    current_path TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS user_ssh_servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    server_name TEXT NOT NULL,
    server_ip TEXT NOT NULL,
    server_port INTEGER DEFAULT 22,
    username TEXT NOT NULL,
    password TEXT,
    ssh_key TEXT,
    default_path TEXT DEFAULT '/',
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
)`).run();

function getKeyAndIV() {
    const key = crypto.createHash('sha256').update(SALT).digest();
    const iv = Buffer.alloc(16, 0);
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

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const settings = db.prepare('SELECT signup_enabled FROM settings WHERE id = 1').get();
    if (!settings.signup_enabled) {
        return res.status(403).json({ error: 'Signups are currently disabled' });
    }

    try {
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
        const isFirstUser = userCount === 0;

        const hash = await bcrypt.hash(password + SALT, 10);
        const stmt = db.prepare('INSERT INTO users (username, password, created_at, is_admin) VALUES (?, ?, ?, ?)');
        stmt.run(username, encrypt(hash), new Date().toISOString(), isFirstUser ? 1 : 0);

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

app.post('/login', async (req, res) => {
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

app.get('/profile', authMiddleware, (req, res) => {
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

app.get('/check-first-user', (req, res) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    return res.json({ isFirstUser: userCount === 0 });
});

app.get('/admin/settings', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const settings = db.prepare('SELECT signup_enabled FROM settings WHERE id = 1').get();
    return res.json({ settings });
});

app.post('/admin/settings', authMiddleware, (req, res) => {
    const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
    if (!user || !user.is_admin) return res.status(403).json({ error: 'Admin access required' });

    const { signup_enabled } = req.body;
    if (typeof signup_enabled !== 'boolean') {
        return res.status(400).json({ error: 'Invalid signup_enabled value' });
    }

    db.prepare('UPDATE settings SET signup_enabled = ? WHERE id = 1').run(signup_enabled ? 1 : 0);
    return res.json({ message: 'Settings updated successfully' });
});

app.use('/file', authMiddleware);
app.use('/files', authMiddleware);

app.post('/user/data', authMiddleware, (req, res) => {
    const { recentFiles, starredFiles, folderShortcuts, openTabs, currentPath, sshServers, theme } = req.body;
    const userId = req.user.id;

    try {
        db.prepare('BEGIN').run();

        if (recentFiles) {
            db.prepare('DELETE FROM user_recent_files WHERE user_id = ?').run(userId);
            const stmt = db.prepare('INSERT INTO user_recent_files (user_id, file_path, file_name, last_opened, server_name, server_ip, server_port, server_user, server_default_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            recentFiles.forEach(file => {
                stmt.run(userId, file.path, file.name, file.lastOpened, file.serverName, file.serverIp, file.serverPort, file.serverUser, file.serverDefaultPath);
            });
        }

        if (starredFiles) {
            db.prepare('DELETE FROM user_starred_files WHERE user_id = ?').run(userId);
            const stmt = db.prepare('INSERT INTO user_starred_files (user_id, file_path, file_name, last_opened, server_name, server_ip, server_port, server_user, server_default_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            starredFiles.forEach(file => {
                stmt.run(userId, file.path, file.name, file.lastOpened, file.serverName, file.serverIp, file.serverPort, file.serverUser, file.serverDefaultPath);
            });
        }

        if (folderShortcuts) {
            db.prepare('DELETE FROM user_folder_shortcuts WHERE user_id = ?').run(userId);
            const stmt = db.prepare('INSERT INTO user_folder_shortcuts (user_id, folder_path, folder_name, server_name, server_ip, server_port, server_user, server_default_path) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
            folderShortcuts.forEach(folder => {
                stmt.run(userId, folder.path, folder.name, folder.serverName, folder.serverIp, folder.serverPort, folder.serverUser, folder.serverDefaultPath);
            });
        }

        if (openTabs) {
            db.prepare('DELETE FROM user_open_tabs WHERE user_id = ?').run(userId);
            const stmt = db.prepare('INSERT INTO user_open_tabs (user_id, tab_id, file_name, file_path, content, saved_content, is_dirty, server_name, server_ip, server_port, server_user) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
            openTabs.forEach(tab => {
                stmt.run(userId, tab.id, tab.name, tab.path, tab.content || '', tab.savedContent || '', tab.isDirty ? 1 : 0, tab.serverName, tab.serverIp, tab.serverPort, tab.serverUser);
            });
        }

        if (currentPath) {
            db.prepare('INSERT OR REPLACE INTO user_current_path (user_id, current_path) VALUES (?, ?)').run(userId, currentPath);
        }

        if (sshServers) {
            db.prepare('DELETE FROM user_ssh_servers WHERE user_id = ?').run(userId);
            const stmt = db.prepare('INSERT INTO user_ssh_servers (user_id, server_name, server_ip, server_port, username, password, ssh_key, default_path, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
            sshServers.forEach(server => {
                stmt.run(userId, server.name, server.ip, server.port || 22, server.user, server.password ? encrypt(server.password) : null, server.sshKey ? encrypt(server.sshKey) : null, server.defaultPath || '/', server.createdAt || new Date().toISOString());
            });
        }

        if (theme) {
            db.prepare('UPDATE users SET theme = ? WHERE id = ?').run(theme, userId);
        }

        db.prepare('COMMIT').run();
        res.json({ message: 'User data saved successfully' });
    } catch (err) {
        db.prepare('ROLLBACK').run();
        logger.error('Error saving user data:', err);
        res.status(500).json({ error: 'Failed to save user data' });
    }
});

app.get('/user/data', authMiddleware, (req, res) => {
    const userId = req.user.id;

    try {
        const recentFiles = db.prepare('SELECT file_path as path, file_name as name, last_opened as lastOpened, server_name as serverName, server_ip as serverIp, server_port as serverPort, server_user as serverUser, server_default_path as serverDefaultPath FROM user_recent_files WHERE user_id = ?').all(userId);

        const starredFiles = db.prepare('SELECT file_path as path, file_name as name, last_opened as lastOpened, server_name as serverName, server_ip as serverIp, server_port as serverPort, server_user as serverUser, server_default_path as serverDefaultPath FROM user_starred_files WHERE user_id = ?').all(userId);

        const folderShortcuts = db.prepare('SELECT folder_path as path, folder_name as name, server_name as serverName, server_ip as serverIp, server_port as serverPort, server_user as serverUser, server_default_path as serverDefaultPath FROM user_folder_shortcuts WHERE user_id = ?').all(userId);

        const openTabs = db.prepare('SELECT tab_id as id, file_name as name, file_path as path, content, saved_content as savedContent, is_dirty as isDirty, server_name as serverName, server_ip as serverIp, server_port as serverPort, server_user as serverUser FROM user_open_tabs WHERE user_id = ?').all(userId);

        const currentPath = db.prepare('SELECT current_path FROM user_current_path WHERE user_id = ?').get(userId);

        const sshServers = db.prepare('SELECT server_name as name, server_ip as ip, server_port as port, username as user, password, ssh_key as sshKey, default_path as defaultPath, created_at as createdAt FROM user_ssh_servers WHERE user_id = ?').all(userId);

        const decryptedServers = sshServers.map(server => ({
            ...server,
            password: server.password ? decrypt(server.password) : null,
            sshKey: server.sshKey ? decrypt(server.sshKey) : null
        }));

        const userTheme = db.prepare('SELECT theme FROM users WHERE id = ?').get(userId)?.theme || 'vscode';

        const data = {
            recentFiles,
            starredFiles,
            folderShortcuts,
            openTabs,
            currentPath: currentPath?.current_path || '/',
            sshServers: decryptedServers,
            theme: userTheme
        };
        res.json(data);
    } catch (err) {
        logger.error('Error loading user data:', err);
        res.status(500).json({ error: 'Failed to load user data' });
    }
});

try {
    db.prepare('ALTER TABLE users ADD COLUMN theme TEXT DEFAULT "vscode"').run();
} catch (e) {
    if (!e.message.includes('duplicate column')) throw e;
}

app.listen(PORT, () => {
    logger.info(`Database API listening at http://localhost:${PORT}`);
});