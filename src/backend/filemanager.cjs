const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 8082;

app.use(cors());
app.use(express.json());

function normalizeFilePath(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') {
        throw new Error('Invalid path');
    }

    const windowsAbsPath = /^[a-zA-Z]:[\\/]/;

    if (windowsAbsPath.test(inputPath)) {
        return path.resolve(inputPath);
    } else if (inputPath.startsWith('/')) {
        return path.resolve(inputPath);
    } else {
        return path.resolve(process.cwd(), inputPath);
    }
}

app.get('/files', (req, res) => {
    try {
        const folderParam = req.query.folder || '';
        const folderPath = normalizeFilePath(folderParam);

        fs.readdir(folderPath, { withFileTypes: true }, (err, files) => {
            if (err) return res.status(500).send(err.message);

            const result = files.map(f => ({
                name: f.name,
                type: f.isDirectory() ? 'directory' : 'file',
            }));

            res.json(result);
        });
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.get('/file', (req, res) => {
    try {
        const folderParam = req.query.folder || '';
        const fileName = req.query.name;
        if (!fileName) return res.status(400).send('Missing "name" parameter');

        const folderPath = normalizeFilePath(folderParam);
        const filePath = path.join(folderPath, fileName);

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) return res.status(500).send(err.message);
            res.send(data);
        });
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.post('/file', (req, res) => {
    try {
        const folderParam = req.query.folder || '';
        const fileName = req.query.name;
        const content = req.body.content;

        if (!fileName) return res.status(400).send('Missing "name" parameter');
        if (content === undefined) return res.status(400).send('Missing "content" in request body');

        const folderPath = normalizeFilePath(folderParam);
        const filePath = path.join(folderPath, fileName);

        fs.writeFile(filePath, content, 'utf8', (err) => {
            if (err) return res.status(500).send(err.message);
            res.send('File written successfully');
        });
    } catch (err) {
        res.status(400).send(err.message);
    }
});

app.listen(PORT, () => {
    console.log(`File manager API listening at http://localhost:${PORT}`);
});