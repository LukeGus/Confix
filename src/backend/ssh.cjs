const express = require('express');
const http = require('http');
const cors = require("cors");
const bcrypt = require("bcrypt");
const SSHClient = require("ssh2").Client;

const app = express();
const PORT = 8083;

let sshConnection = null;
let isConnected = false;

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
    info: (...args) => console.log(`💻 | 🔧 [${getReadableTimestamp()}] INFO:`, ...args),
    error: (...args) => console.error(`💻 | ❌ [${getReadableTimestamp()}] ERROR:`, ...args),
    warn: (...args) => console.warn(`💻 | ⚠️ [${getReadableTimestamp()}] WARN:`, ...args),
    debug: (...args) => console.debug(`💻 | 🔍 [${getReadableTimestamp()}] DEBUG:`, ...args)
};

const closeSSHConnection = () => {
    if (sshConnection && isConnected) {
        try {
            sshConnection.end();
            sshConnection = null;
            isConnected = false;
        } catch (err) {
            logger.error('Error closing SSH connection:', err.message);
        }
    }
};

const executeSSHCommand = (command) => {
    return new Promise((resolve, reject) => {
        if (!sshConnection || !isConnected) {
            return reject(new Error('SSH connection not established'));
        }

        sshConnection.exec(command, (err, stream) => {
            if (err) {
                logger.error('Error executing SSH command:', err.message);
                return reject(err);
            }

            let data = '';
            let error = '';

            stream.on('data', (chunk) => {
                data += chunk.toString();
            });

            stream.stderr.on('data', (chunk) => {
                error += chunk.toString();
            });

            stream.on('close', (code) => {
                if (code !== 0) {
                    logger.error(`SSH command failed with code ${code}:`, error);
                    return reject(new Error(`Command failed with code ${code}: ${error}`));
                }
                resolve(data.trim());
            });
        });
    });
};

app.post('/sshConnect', async (req, res) => {
    try {
        const hostConfig = req.body;
        
        if (!hostConfig || !hostConfig.ip || !hostConfig.user) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required host configuration (ip, user)'
            });
        }

        closeSSHConnection();

        sshConnection = new SSHClient();
        
        const connectionConfig = {
            host: hostConfig.ip,
            port: hostConfig.port || 22,
            username: hostConfig.user,
            readyTimeout: 20000,
            keepaliveInterval: 10000,
            keepaliveCountMax: 3
        };

        if (hostConfig.sshKey) {
            connectionConfig.privateKey = hostConfig.sshKey;
        } else if (hostConfig.password) {
            connectionConfig.password = hostConfig.password;
        } else {
            return res.status(400).json({
                status: 'error',
                message: 'Either password or SSH key must be provided'
            });
        }

        sshConnection.on('ready', () => {
            isConnected = true;
        });

        sshConnection.on('error', (err) => {
            logger.error('SSH connection error:', err.message);
            isConnected = false;
        });

        sshConnection.on('close', () => {
            isConnected = false;
        });

        sshConnection.on('end', () => {
            isConnected = false;
        });

        sshConnection.connect(connectionConfig);

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('SSH connection timeout'));
            }, 20000);

            sshConnection.once('ready', () => {
                clearTimeout(timeout);
                resolve();
            });

            sshConnection.once('error', (err) => {
                clearTimeout(timeout);
                reject(err);
            });
        });

        return res.status(200).json({
            status: 'success',
            message: 'SSH connection established successfully'
        });

    } catch (error) {
        logger.error('SSH connection failed:', error.message);
        closeSSHConnection();
        
        return res.status(500).json({
            status: 'error',
            message: `SSH connection failed: ${error.message}`
        });
    }
});

app.get('/listFiles', async (req, res) => {
    try {
        const { path = '/' } = req.query;

        if (!sshConnection || !isConnected) {
            return res.status(400).json({
                status: 'error',
                message: 'SSH connection not established. Please connect first.'
            });
        }

        const lsCommand = `ls -la "${path}"`;
        const result = await executeSSHCommand(lsCommand);

        const lines = result.split('\n').filter(line => line.trim());
        const files = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            const parts = line.split(/\s+/);
            
            if (parts.length >= 9) {
                const permissions = parts[0];
                const links = parseInt(parts[1]) || 0;
                const owner = parts[2];
                const group = parts[3];
                const size = parseInt(parts[4]) || 0;
                const month = parts[5];
                const day = parseInt(parts[6]) || 0;
                const timeOrYear = parts[7];
                const name = parts.slice(8).join(' ');

                const isDirectory = permissions.startsWith('d');
                const isLink = permissions.startsWith('l');

                files.push({
                    name: name,
                    type: isDirectory ? 'directory' : (isLink ? 'link' : 'file'),
                    size: size,
                    permissions: permissions,
                    owner: owner,
                    group: group,
                    modified: `${month} ${day} ${timeOrYear}`,
                    isDirectory: isDirectory,
                    isLink: isLink
                });
            }
        }

        return res.status(200).json({
            status: 'success',
            path: path,
            files: files,
            totalCount: files.length
        });

    } catch (error) {
        logger.error('Error listing files:', error.message);
        
        return res.status(500).json({
            status: 'error',
            message: `Failed to list files: ${error.message}`
        });
    }
});

app.post('/sshDisconnect', async (req, res) => {
    try {
        closeSSHConnection();
        
        return res.status(200).json({
            status: 'success',
            message: 'SSH connection disconnected successfully'
        });
    } catch (error) {
        logger.error('Error disconnecting SSH:', error.message);
        
        return res.status(500).json({
            status: 'error',
            message: `Failed to disconnect: ${error.message}`
        });
    }
});

app.get('/sshStatus', async (req, res) => {
    return res.status(200).json({
        status: 'success',
        connected: isConnected,
        hasConnection: !!sshConnection
    });
});

app.get('/readFile', async (req, res) => {
    try {
        const { path: filePath } = req.query;

        if (!sshConnection || !isConnected) {
            return res.status(400).json({
                status: 'error',
                message: 'SSH connection not established. Please connect first.'
            });
        }

        if (!filePath) {
            return res.status(400).json({
                status: 'error',
                message: 'File path is required'
            });
        }

        const catCommand = `cat "${filePath}"`;
        const result = await executeSSHCommand(catCommand);

        return res.status(200).json({
            status: 'success',
            content: result,
            path: filePath
        });

    } catch (error) {
        logger.error('Error reading file:', error.message);
        
        return res.status(500).json({
            status: 'error',
            message: `Failed to read file: ${error.message}`
        });
    }
});

app.post('/writeFile', async (req, res) => {
    try {
        const { path: filePath, content } = req.body;

        if (!sshConnection || !isConnected) {
            return res.status(400).json({
                status: 'error',
                message: 'SSH connection not established. Please connect first.'
            });
        }

        if (!filePath) {
            return res.status(400).json({
                status: 'error',
                message: 'File path is required'
            });
        }

        if (content === undefined) {
            return res.status(400).json({
                status: 'error',
                message: 'File content is required'
            });
        }

        const tempFile = `/tmp/temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const echoCommand = `echo '${content.replace(/'/g, "'\"'\"'")}' > "${tempFile}"`;
        await executeSSHCommand(echoCommand);

        const mvCommand = `mv "${tempFile}" "${filePath}"`;
        await executeSSHCommand(mvCommand);

        return res.status(200).json({
            status: 'success',
            message: 'File written successfully',
            path: filePath
        });

    } catch (error) {
        logger.error('Error writing file:', error.message);
        
        return res.status(500).json({
            status: 'error',
            message: `Failed to write file: ${error.message}`
        });
    }
});

process.on('SIGINT', () => {
    closeSSHConnection();
    process.exit(0);
});

process.on('SIGTERM', () => {
    closeSSHConnection();
    process.exit(0);
});

app.listen(PORT, () => {
    logger.info(`SSH API listening at http://localhost:${PORT}`);
});