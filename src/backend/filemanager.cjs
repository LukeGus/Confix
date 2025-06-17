const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8082;

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
    info: (...args) => console.log(`📁 |  🔧 [${getReadableTimestamp()}] INFO:`, ...args),
    error: (...args) => console.error(`📁 | ❌ [${getReadableTimestamp()}] ERROR:`, ...args),
    warn: (...args) => console.warn(`📁 | ⚠️ [${getReadableTimestamp()}] WARN:`, ...args),
    debug: (...args) => console.debug(`📁 | 🔍 [${getReadableTimestamp()}] DEBUG:`, ...args)
};

function normalizeFilePath(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new Error('Invalid path');
    }

    let normalizedPath = inputPath.replace(/\\/g, '/');

    const windowsAbsPath = /^[a-zA-Z]:\//;
    if (windowsAbsPath.test(normalizedPath)) {
        return path.resolve(normalizedPath);
    }

    if (normalizedPath.startsWith('/')) {
        return path.resolve(normalizedPath);
    }

    return path.resolve(process.cwd(), normalizedPath);
}

function isDirectory(path) {
    try {
        return fs.statSync(path).isDirectory();
    } catch (e) {
        return false;
    }
}

app.get('/files', (req, res) => {
    try {
        const folderParam = req.query.folder || '';
        const folderPath = normalizeFilePath(folderParam);

        if (!fs.existsSync(folderPath) || !isDirectory(folderPath)) {
            return res.status(404).json({ error: 'Directory not found' });
        }

        fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
            if (err) {
                logger.error('Error reading directory:', err);
                return res.status(500).json({ error: err.message });
            }

            const result = files.map(f => ({
                name: f.name,
                type: f.isDirectory() ? 'directory' : 'file',
            }));

            res.json(result);
        });
    } catch (err) {
        logger.error('Error in /files endpoint:', err);
        res.status(400).json({ error: err.message });
    }
});

app.get('/file', (req, res) => {
    try {
        const folderParam = req.query.folder || '';
        const fileName = req.query.name;
        if (!fileName) return res.status(400).json({ error: 'Missing "name" parameter' });

        const folderPath = normalizeFilePath(folderParam);
        const filePath = path.join(folderPath, fileName);

        if (!fs.existsSync(filePath)) {
            logger.error(`File not found: ${filePath}`);
            return res.status(404).json({ error: 'File not found' });
        }

        if (isDirectory(filePath)) {
            logger.error(`Path is a directory: ${filePath}`);
            return res.status(400).json({ error: 'Path is a directory' });
        }

        const content = fs.readFileSync(filePath, 'utf8');
        res.setHeader('Content-Type', 'text/plain');
        res.send(content);
    } catch (err) {
        logger.error('Error in /file GET endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/file', (req, res) => {
    try {
        const folderParam = req.query.folder || '';
        const fileName = req.query.name;
        const content = req.body.content;

        if (!fileName) return res.status(400).json({ error: 'Missing "name" parameter' });
        if (content === undefined) return res.status(400).json({ error: 'Missing "content" in request body' });

        const folderPath = normalizeFilePath(folderParam);
        const filePath = path.join(folderPath, fileName);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        fs.writeFileSync(filePath, content, 'utf8');
        res.json({ message: 'File written successfully' });
    } catch (err) {
        logger.error('Error in /file POST endpoint:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    logger.info(`File manager API listening at http://localhost:${PORT}`);
});