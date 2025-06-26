import React, {useState, useEffect, useRef} from 'react';
import {Button, Divider, Text, TextInput, Group, ScrollArea, Paper, Stack, ActionIcon, Modal, Loader} from "@mantine/core";
import { ArrowUp, Folder, File, FolderOpen, Star, Server, Plus, Monitor, Edit, Trash2 } from 'lucide-react';
import { SSHServerModal } from './SSHServerModal.jsx';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

const API_BASE = isLocalhost 
    ? `${window.location.protocol}//${window.location.hostname}:8082`
    : isIPAddress
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/fileviewer`
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port}/fileviewer`;

const SSH_API_BASE = isLocalhost 
    ? `${window.location.protocol}//${window.location.hostname}:8083`
    : isIPAddress
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/ssh`
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port}/ssh`;

const DB_API_BASE = isLocalhost 
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : isIPAddress
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/database`
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port}/database`;

const CONFIG_FILE_EXTENSIONS = [
    '.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.config',
    '.toml', '.env', '.properties', '.cfg', '.txt', '.md', '.log'
];

const LOCAL_SERVER = {
    name: 'Local Container',
    ip: 'local',
    port: null,
    user: null,
    defaultPath: '/',
    isLocal: true
};

export function FileViewer(props) {
    const { onFileSelect, starredFiles, setStarredFiles, folder, setFolder, tabs, sshServers, setSSHServers, onSSHConnect, setCurrentServer, setTabState, setConnectingToServer, connectingToServer } = props;
    const [files, setFiles] = useState([]);
    const [message, setMessage] = useState('');
    const [configFiles, setConfigFiles] = useState([]);
    const [currentServerState, setCurrentServerState] = useState(null);
    const [isSSHMode, setIsSSHMode] = useState(false);
    const [showSSHModal, setShowSSHModal] = useState(false);
    const [editingServer, setEditingServer] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [localDefaultPath, setLocalDefaultPath] = useState('/');
    const [localContainerName, setLocalContainerName] = useState(LOCAL_SERVER.name);
    const pathInputRef = useRef(null);

    // Create a dynamic LOCAL_SERVER that uses the current localDefaultPath and name
    const getLocalServer = () => ({
        ...LOCAL_SERVER,
        name: localContainerName,
        defaultPath: localDefaultPath
    });

    const handleBack = async () => {
        const defaultPath = currentServerState?.defaultPath || localDefaultPath;
        const normalize = p => (p || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '').toLowerCase();
        const normalizedFolder = normalize(folder);
        let atRoot = false;
        if (currentServerState?.isLocal && navigator.platform.includes('Win')) {
            const driveRoot = (folder.split('/')[0] || 'C') + '/';
            atRoot = normalize(folder) === normalize(driveRoot);
        } else {
            atRoot = normalizedFolder === '' || normalizedFolder === '/';
        }
        if (atRoot) {
            return;
        }
        if (folder && folder !== '/') {
        const normalizedPath = folder.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
                let newPath;
                if (currentServerState?.isLocal && navigator.platform.includes('Win')) {
                    let drive = parts[0] || 'C';
                    if (drive.endsWith(':')) drive = drive.slice(0, -1);
                    newPath = parts.length > 0 ? drive + ':/' : (folder.split('/')[0] + '/');
                } else {
                    newPath = parts.length > 0 ? '/' + parts.join('/') : '/';
                }
                setFolder(newPath);
            }
        }
    };

    const handleAddSSHServer = async (serverConfig) => {
        try {
            const connectResponse = await fetch(`${SSH_API_BASE}/sshConnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                },
                body: JSON.stringify({
                    ip: serverConfig.ip,
                    port: serverConfig.port,
                    user: serverConfig.user,
                    password: serverConfig.password,
                    sshKey: serverConfig.sshKey
                })
            });

            if (!connectResponse.ok) {
                const errorData = await connectResponse.json();
                throw new Error(errorData.message || 'Failed to connect to server');
            }

            await fetch(`${SSH_API_BASE}/sshDisconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                }
            });

            setSSHServers(prev => [...prev, serverConfig]);
        } catch (error) {
            throw error;
        }
    };

    const handleEditSSHServer = async (oldServer, newServerConfig) => {
        try {
            if (oldServer.isLocal) {
                setLocalDefaultPath(newServerConfig.defaultPath || '/');
                setLocalContainerName(newServerConfig.name || 'Local Container');
                // Save the local settings to localStorage for persistence
                localStorage.setItem('localDefaultPath', newServerConfig.defaultPath || '/');
                localStorage.setItem('localContainerName', newServerConfig.name || 'Local Container');
                return;
            }
            
            const connectResponse = await fetch(`${SSH_API_BASE}/sshConnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                },
                body: JSON.stringify({
                    ip: newServerConfig.ip,
                    port: newServerConfig.port,
                    user: newServerConfig.user,
                    password: newServerConfig.password,
                    sshKey: newServerConfig.sshKey
                })
            });

            if (!connectResponse.ok) {
                const errorData = await connectResponse.json();
                throw new Error(errorData.message || 'Failed to connect to server');
            }

            await fetch(`${SSH_API_BASE}/sshDisconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                }
            });

            setSSHServers(prev => prev.map(server => 
                server.name === oldServer.name ? newServerConfig : server
            ));
        } catch (error) {
            throw error;
        }
    };

    const handleDeleteSSHServer = async (server) => {
        try {
            // Update the database first, then update local state only on success
            const updatedServers = sshServers.filter(s => s.name !== server.name);
            
            const response = await fetch(`${DB_API_BASE}/user/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                },
                body: JSON.stringify({
                    sshServers: updatedServers
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete server');
            }

            // Only update local state after successful API call
            setSSHServers(updatedServers);
            setMessage('Server deleted successfully');
        } catch (error) {
            setMessage(`Error deleting server: ${error.message}`);
        }
    };

    const handleServerClick = async (server) => {
        try {
            setIsLoading(true);
            setMessage('Connecting to server...');
            setConnectingToServer(server);
            setCurrentServerState(server);
            setIsSSHMode(true);
            setFolder(server.defaultPath || '/');

            let connected = false;
            if (onSSHConnect) {
                connected = await onSSHConnect(server);
            } else {
                const connectResponse = await fetch(`${SSH_API_BASE}/sshConnect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                    },
                    body: JSON.stringify({
                        ip: server.ip,
                        port: server.port,
                        user: server.user,
                        password: server.password,
                        sshKey: server.sshKey
                    })
                });

                if (!connectResponse.ok) {
                    const errorData = await connectResponse.json();
                    setMessage(`Failed to connect: ${errorData.message}`);
                    setIsSSHMode(false);
                    setCurrentServerState(null);
                    setConnectingToServer(null);
                    setIsLoading(false);
                    return;
                }
                connected = true;
            }

            if (!connected) {
                setMessage('Failed to connect to server');
                setIsSSHMode(false);
                setCurrentServerState(null);
                setConnectingToServer(null);
                setIsLoading(false);
                return;
            }

            if (setCurrentServer) {
                setCurrentServer(server);
            }
            setConnectingToServer(null);

            await loadSSHFiles(server.defaultPath || '/');
            setIsLoading(false);
        } catch (error) {
            setMessage(`Error connecting to server: ${error.message}`);
            setIsSSHMode(false);
            setCurrentServerState(null);
            setConnectingToServer(null);
            setIsLoading(false);
        }
    };

    const handleLocalContainerClick = () => {
        setIsSSHMode(false);
        const localServer = getLocalServer();
        setCurrentServerState(localServer);
        if (setCurrentServer) {
            setCurrentServer(localServer);
        }
        const defaultPath = localDefaultPath;
        setFolder(defaultPath);
        
        // Always try to load files, even if path doesn't exist
        fetch(`${API_BASE}/files?folder=${encodeURIComponent(defaultPath)}`, {
            headers: localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setMessage(data.error);
                    setFiles([]);
                } else {
                    setFiles(data);
                    setMessage('');
                }
            })
            .catch(e => {
                setMessage('Error loading folder: ' + e.message);
                setFiles([]);
            });
    };

    const loadSSHFiles = async (path) => {
        try {
            setIsLoading(true);
            const response = await fetch(`${SSH_API_BASE}/listFiles?path=${encodeURIComponent(path)}`, {
                headers: localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to list files');
            }

            const data = await response.json();
            if (data.status === 'success') {
                const filteredFiles = data.files.filter(file => file.name !== '.' && file.name !== '..');
                setFiles(filteredFiles);
                setMessage('');
            } else {
                throw new Error(data.message || 'Failed to list files');
            }
            setIsLoading(false);
        } catch (error) {
            setMessage(`Error loading files: ${error.message}`);
            setFiles([]);
            setIsLoading(false);
        }
    };

    const scanFolderForConfigs = async (folderPath) => {
        try {
            const response = await fetch(`${API_BASE}/files?folder=${encodeURIComponent(folderPath)}`);
            const data = await response.json();
            
            if (data.error) {
                setMessage(data.error);
                return;
            }

            const configs = [];
            for (const item of data) {
                if (item.type === 'directory') {
                    const subConfigs = await scanFolderForConfigs(`${folderPath}/${item.name}`);
                    configs.push(...subConfigs);
                } else if (CONFIG_FILE_EXTENSIONS.some(ext => item.name.toLowerCase().endsWith(ext))) {
                    configs.push({
                        name: item.name,
                        path: `${folderPath}/${item.name}`,
                        type: 'file'
                    });
                }
            }
            return configs;
        } catch (error) {
            return [];
        }
    };

    useEffect(() => {
        setIsLoading(true);
        setMessage('');
        if (isSSHMode && currentServerState) {
            loadSSHFiles(folder);
        } else if (!isSSHMode && folder) {
        fetch(`${API_BASE}/files?folder=${encodeURIComponent(folder)}`, {
            headers: localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {}
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setMessage(data.error);
                    setFiles([]);
                } else {
                    setFiles(data);
                    setMessage('');
                }
                    setIsLoading(false);
            })
            .catch(e => {
                setMessage('Error loading folder: ' + e.message);
                setFiles([]);
                    setIsLoading(false);
                });
        } else {
            setFiles([]);
            setIsLoading(false);
        }
    }, [folder, isSSHMode, currentServerState]);

    useEffect(() => {
        const handleSaveFile = async (event) => {
            const {content, folder, filename} = event.detail;
            
            if (isSSHMode && currentServerState) {
                try {
                    const filePath = `${folder}/${filename}`.replace(/\\/g, '/').replace(/\/+/g, '/');
                    const response = await fetch(`${SSH_API_BASE}/writeFile`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                        },
                        body: JSON.stringify({
                            path: filePath,
                            content: content
                        })
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        setMessage(errorData.message || 'Failed to save file');
                    } else {
                        setMessage('File saved successfully');
                    }
                } catch (error) {
                    setMessage('Error saving file: ' + error.message);
                }
            } else {
            fetch(`${API_BASE}/file?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(filename)}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                },
                body: JSON.stringify({content}),
            })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        setMessage(data.error);
                    } else {
                        setMessage(data.message || 'File saved successfully');
                    }
                })
                .catch(e => setMessage('Error writing file: ' + e.message));
            }
        };

        window.addEventListener('saveFile', handleSaveFile);
        return () => window.removeEventListener('saveFile', handleSaveFile);
    }, [isSSHMode, currentServerState]);

    const handleFileClick = async (name, type) => {
        if (type === 'file') {
            if (isSSHMode && currentServerState) {
                const filePath = `${folder}/${name}`.replace(/\\/g, '/').replace(/\/+/g, '/');
                onFileSelect(name, folder, currentServerState, filePath);
            } else {
            onFileSelect(name, folder);
            }
        } else {
            const newPath = folder.endsWith('/') ? folder + name : folder + '/' + name;
            setFolder(newPath);
        }
        setMessage('');
    };

    const connectToSSHServer = async (server) => {
        try {
            setIsLoading(true);
            setMessage('Connecting to server...');
            setCurrentServerState(server);
            setIsSSHMode(true);

            let connected = false;
            if (onSSHConnect) {
                connected = await onSSHConnect(server);
            } else {
                const connectResponse = await fetch(`${SSH_API_BASE}/sshConnect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                    },
                    body: JSON.stringify({
                        ip: server.ip,
                        port: server.port,
                        user: server.user,
                        password: server.password,
                        sshKey: server.sshKey
                    })
                });

                if (!connectResponse.ok) {
                    const errorData = await connectResponse.json();
                    throw new Error(errorData.message || 'Failed to connect to server');
                }
                connected = true;
            }

            if (!connected) {
                throw new Error('Failed to connect to server');
            }

            setIsLoading(false);
            return true;
        } catch (error) {
            setMessage(`Error connecting to server: ${error.message}`);
            setIsSSHMode(false);
            setCurrentServerState(null);
            setIsLoading(false);
            return false;
        }
    };

    const handleStarFile = (file) => {
        const filePath = file.path || `${folder}/${file.name}`.replace(/\\/g, '/').replace(/\/+/g, '/');
        const fileInfo = {
            name: file.name,
            path: filePath,
            lastOpened: new Date().toISOString(),
            server: currentServerState ? {
                name: currentServerState.name,
                ip: currentServerState.ip,
                port: currentServerState.port,
                user: currentServerState.user
            } : null
        };
        const isStarred = starredFiles.some(f => f.path === filePath);
        if (isStarred) {
            setStarredFiles(starredFiles.filter(f => f.path !== filePath));
        } else {
            setStarredFiles([...starredFiles, fileInfo]);
        }
    };

    useEffect(() => {
        if (pathInputRef.current) {
            const input = pathInputRef.current;
            input.scrollLeft = input.scrollWidth;
        }
    }, [folder]);

    useEffect(() => {
        // Load local settings from localStorage on component mount
        const savedPath = localStorage.getItem('localDefaultPath');
        const savedName = localStorage.getItem('localContainerName');
        if (savedPath) {
            setLocalDefaultPath(savedPath);
        } else {
            // Set default path if none exists
            setLocalDefaultPath('/');
        }
        if (savedName) {
            setLocalContainerName(savedName);
        }
    }, []);

    if (!isSSHMode && !currentServerState && (!folder || folder === '/')) {
        return (
            <Stack h="100%" spacing="xs" style={{ padding: '2px' }}>
                <Paper p="xs" style={{ backgroundColor: '#2F3740', flex: 1 }}>
                    <Stack spacing="xs" h="100%">
                        <Text size="sm" weight={500} color="white">Available Servers</Text>

                        <ScrollArea
                            h="calc(100vh - 251px)"
                            type="auto"
                            offsetScrollbars
                            scrollbarSize={8}
                            styles={{
                                scrollbar: {
                                    '&:hover': {
                                        backgroundColor: '#4A5568'
                                    }
                                },
                                thumb: {
                                    backgroundColor: '#4A5568',
                                    '&:hover': {
                                        backgroundColor: '#718096'
                                    }
                                },
                                viewport: {
                                    display: 'flex',
                                    justifyContent: 'center'
                                }
                            }}
                        >
                            <Stack spacing={2} pr={2} style={{
                                width: '100%',
                                alignItems: 'stretch'
                            }}>
                                {/* Local Container */}
                                <Paper
                                    p="xs"
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: '#36414C',
                                        border: '1px solid #4A5568',
                                        transition: 'background 0.2s',
                                        userSelect: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        width: '100%',
                                        position: 'relative',
                                        paddingRight: 0,
                                    }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                                    onClick={handleLocalContainerClick}
                                >
                                    <Monitor size={16} color="#4299E1" />
                                    <div style={{ 
                                        flex: 1, 
                                        marginLeft: 8, 
                                        marginRight: 76,
                                        minWidth: 0 
                                    }}>
                                        <Text
                                            size="sm"
                                            color="white"
                                            style={{
                                                userSelect: 'none',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {localContainerName}
                                        </Text>
                                        <Text 
                                            size="xs" 
                                            color="dimmed" 
                                            style={{ 
                                                userSelect: 'none',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {localDefaultPath}
                                        </Text>
                                    </div>
                                    <div style={{
                                        position: 'absolute',
                                        right: 4,
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: 28,
                                    }}>
                                        <ActionIcon
                                            variant="subtle"
                                            color="blue"
                                            style={{ borderRadius: '50%', marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                            onClick={e => {
                                                e.stopPropagation();
                                                setEditingServer(getLocalServer());
                                                setShowSSHModal(true);
                                            }}
                                        >
                                            <Edit size={16} />
                                        </ActionIcon>
                                    </div>
                                </Paper>

                                {/* SSH Servers */}
                                {sshServers
                                    .sort((a, b) => {
                                        const aStarred = starredFiles.some(f => f.path === `ssh://${a.name}`);
                                        const bStarred = starredFiles.some(f => f.path === `ssh://${b.name}`);
                                        if (aStarred && !bStarred) return -1;
                                        if (!aStarred && bStarred) return 1;
                                        return a.name.localeCompare(b.name);
                                    })
                                    .map((server, index) => {
                                        const isStarred = starredFiles.some(f => f.path === `ssh://${server.name}`);
                                        return (
                                            <Paper
                                                key={index}
                                                p="xs"
                                                style={{
                                                    cursor: 'pointer',
                                                    backgroundColor: '#36414C',
                                                    border: '1px solid #4A5568',
                                                    transition: 'background 0.2s',
                                                    userSelect: 'none',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    position: 'relative',
                                                    paddingRight: 0,
                                                    width: '100%',
                                                }}
                                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                                                onClick={() => handleServerClick(server)}
                                            >
                                                <Server size={16} color="#4299E1" />
                                                <div style={{ 
                                                    flex: 1, 
                                                    marginLeft: 8, 
                                                    marginRight: 76,
                                                    minWidth: 0 
                                                }}>
                                                    <Text 
                                                        size="sm" 
                                                        color="white" 
                                                        style={{ 
                                                            userSelect: 'none',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {server.name}
                                                    </Text>
                                                    <Text 
                                                        size="xs" 
                                                        color="dimmed" 
                                                        style={{ 
                                                            userSelect: 'none',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap'
                                                        }}
                                                    >
                                                        {server.user}@{server.ip}:{server.port}
                                                    </Text>
                                                </div>
                                                <div style={{
                                                    position: 'absolute',
                                                    right: 4,
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 72,
                                                    gap: 0,
                                                }}>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="blue"
                                                        style={{ borderRadius: '50%', marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            setEditingServer(server);
                                                            setShowSSHModal(true);
                                                        }}
                                                    >
                                                        <Edit size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        style={{ borderRadius: '50%', marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            handleDeleteSSHServer(server);
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="yellow"
                                                        style={{ borderRadius: '50%', marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                        onClick={e => {
                                                            e.stopPropagation();
                                                            const serverPath = `ssh://${server.name}`;
                                                            const serverInfo = {
                                                                name: server.name,
                                                                path: serverPath,
                                                                lastOpened: new Date().toISOString(),
                                                                server: server
                                                            };
                                                            const isCurrentlyStarred = starredFiles.some(f => f.path === serverPath);
                                                            if (isCurrentlyStarred) {
                                                                setStarredFiles(starredFiles.filter(f => f.path !== serverPath));
                                                            } else {
                                                                setStarredFiles([...starredFiles, serverInfo]);
                                                            }
                                                        }}
                                                    >
                                                        {isStarred ? (
                                                            <Star size={16} fill="currentColor" />
                                                        ) : (
                                                            <Star size={16} />
                                                        )}
                                                    </ActionIcon>
                                                </div>
                                            </Paper>
                                        );
                                    })}

                                {sshServers.length === 0 && (
                                    <Text color="dimmed" size="sm" align="center" py="md" style={{ userSelect: 'none' }}>
                                        No SSH servers added yet
                                    </Text>
                                )}
                            </Stack>
                        </ScrollArea>

                        <Divider my="xs" color="#4A5568" />
                        <Paper
                            p="xs"
                            onClick={() => setShowSSHModal(true)}
                            style={{
                                cursor: 'pointer',
                                backgroundColor: '#36414C',
                                border: '1px solid #4A5568',
                                userSelect: 'none',
                                transition: 'background 0.2s',
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                        >
                            <Group spacing="xs">
                                <Plus size={16} color="#A0AEC0" style={{ userSelect: 'none' }} />
                                <Text size="sm" color="white" style={{ userSelect: 'none' }}>Add SSH Server</Text>
                            </Group>
                        </Paper>
                    </Stack>
                </Paper>

                <SSHServerModal
                    opened={showSSHModal}
                    onClose={() => {
                        setShowSSHModal(false);
                        setEditingServer(null);
                    }}
                    onAddServer={handleAddSSHServer}
                    onEditServer={handleEditSSHServer}
                    editingServer={editingServer}
                />
            </Stack>
        );
    }

    return (
        <Stack h="100%" spacing="xs" style={{ padding: '2px' }}>
            <Paper p="xs" style={{ backgroundColor: '#2F3740' }}>
                <Stack spacing="xs">
                    <Text size="sm" weight={500} color="white">
                        {isSSHMode ? `SSH Path` : 'Local Machine Path'}
                    </Text>
                    <TextInput
                        ref={pathInputRef}
                        value={folder}
                        onChange={e => {
                            setFolder(e.target.value);
                        }}
                        placeholder={isSSHMode ? "Enter SSH path e.g. /home/user" : "Enter folder path e.g. C:\\Users\\Luke or /Users/luke"}
                        styles={{
                            input: {
                                backgroundColor: '#36414C',
                                borderColor: '#4A5568',
                                color: 'white',
                                '&::placeholder': {
                                    color: '#A0AEC0'
                                }
                            }
                        }}
                    />
                </Stack>
            </Paper>

            <Paper p="xs" style={{ backgroundColor: '#2F3740', flex: 1 }}>
                <Stack spacing="xs" h="100%">
                    <Text size="sm" weight={500} color="white">
                        {isSSHMode ? 'SSH File Manager' : 'File Manager'}
                    </Text>
                    
                    <ScrollArea 
                        h="calc(100vh - 360px)" 
                        type="auto"
                        offsetScrollbars
                        scrollbarSize={8}
                        styles={{
                            scrollbar: {
                                '&:hover': {
                                    backgroundColor: '#4A5568'
                                }
                            },
                            thumb: {
                                backgroundColor: '#4A5568',
                                '&:hover': {
                                    backgroundColor: '#718096'
                                }
                            }
                        }}
                    >
                        <Stack spacing={2} pr={2}>
                            {(isLoading || connectingToServer) && (
                                <Group justify="center" spacing="sm" py="md">
                                    <Loader size="sm" color="#4299E1" />
                                    <Text color="dimmed" size="sm" style={{ userSelect: 'none' }}>
                                        {connectingToServer ? 'Loading...' : 'Loading...'}
                                    </Text>
                                </Group>
                            )}
                            {!isLoading && !connectingToServer && files.length === 0 && !isSSHMode && (
                                <Text color="dimmed" size="sm" align="center" py="md" style={{ userSelect: 'none' }}>
                                    No files found
                                </Text>
                            )}
                            {!isLoading && !connectingToServer && files.length === 0 && isSSHMode && (
                                <Text color="dimmed" size="sm" align="center" py="md" style={{ userSelect: 'none' }}>
                                    No files found in SSH directory
                                </Text>
                            )}
                            {!isLoading && !connectingToServer && files.map(({name, type}) => {
                                const normalizedPath = `${folder}/${name}`.replace(/\\/g, '/').replace(/\/+/g, '/');
                                const isOpen = type === 'file' && tabs.some(tab => tab.path === normalizedPath);
                                const isStarred = starredFiles.some(f => f.path === normalizedPath);
                                return (
                                    <Paper
                                        key={name}
                                        p="xs"
                                        style={{
                                            cursor: isOpen ? 'not-allowed' : 'pointer',
                                            backgroundColor: isOpen ? '#23272f' : '#36414C',
                                            border: '1px solid #4A5568',
                                            transition: 'background 0.2s',
                                            userSelect: 'none',
                                            opacity: isOpen ? 0.7 : 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            position: 'relative',
                                            paddingRight: 0,
                                        }}
                                        onMouseOver={e => e.currentTarget.style.backgroundColor = isOpen ? '#23272f' : '#4A5568'}
                                        onMouseOut={e => e.currentTarget.style.backgroundColor = isOpen ? '#23272f' : '#36414C'}
                                        onClick={() => !isOpen && handleFileClick(name, type)}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            flex: 1,
                                            minWidth: 0,
                                            maxWidth: 'calc(100% - 40px)',
                                            overflow: 'hidden',
                                        }}>
                                            {type === 'directory' ? (
                                                <FolderOpen size={16} color="#4299E1" />
                                            ) : (
                                                <File size={16} color="#A0AEC0" />
                                            )}
                                            <Text 
                                                size="sm" 
                                                color="white" 
                                                style={{ 
                                                    flex: 1,
                                                    wordBreak: 'break-word',
                                                    whiteSpace: 'normal',
                                                    userSelect: 'none',
                                                    marginLeft: 8,
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                }}
                                            >
                                                {name}
                                            </Text>
                                        </div>
                                        {type === 'file' && (
                                            <div style={{
                                                position: 'absolute',
                                                right: 4,
                                                top: 0,
                                                height: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 28,
                                            }}>
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="yellow"
                                                    style={{ borderRadius: '50%', marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        handleStarFile({ name, type, path: normalizedPath });
                                                    }}
                                                >
                                                    {isStarred ? (
                                                        <Star size={16} fill="currentColor" />
                                                    ) : (
                                                        <Star size={16} />
                                                    )}
                                                </ActionIcon>
                                            </div>
                                        )}
                                    </Paper>
                                );
                            })}
                        </Stack>
                    </ScrollArea>

                    {folder && (
                        <>
                            <Divider my="xs" color="#4A5568" />
                            <Group spacing="xs">
                            <Paper
                                p="xs"
                                onClick={handleBack}
                                style={{
                                    cursor: 'pointer',
                                    backgroundColor: '#36414C',
                                    border: '1px solid #4A5568',
                                    userSelect: 'none',
                                    transition: 'background 0.2s',
                                        flex: 1,
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                            >
                                <Group spacing="xs">
                                    <ArrowUp size={16} color="#A0AEC0" style={{ userSelect: 'none' }} />
                                        <Text size="sm" color="white" style={{ userSelect: 'none' }}>Back</Text>
                                    </Group>
                                </Paper>
                                <Paper
                                    p="xs"
                                    onClick={() => {
                                        setIsSSHMode(false);
                                        setCurrentServerState(null);
                                        setFolder('/');
                                        if (setCurrentServer) {
                                            setCurrentServer(null);
                                        }
                                        if (setTabState) {
                                            setTabState({ tabs: [], activeTab: 'home' });
                                        }
                                        if (!currentServerState?.isLocal) {
                                            fetch(`${SSH_API_BASE}/sshDisconnect`, {
                                                method: 'POST',
                                                headers: {
                                                    'Content-Type': 'application/json',
                                                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                                                }
                                            });
                                        }
                                    }}
                                    style={{
                                        cursor: 'pointer',
                                        backgroundColor: '#36414C',
                                        border: '1px solid #4A5568',
                                        userSelect: 'none',
                                        transition: 'background 0.2s',
                                        flex: 1,
                                    }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                                >
                                    <Group spacing="xs">
                                        <Server size={16} color="#A0AEC0" style={{ userSelect: 'none' }} />
                                        <Text size="sm" color="white" style={{ userSelect: 'none' }}>Servers</Text>
                                </Group>
                            </Paper>
                            </Group>
                        </>
                    )}
                </Stack>
            </Paper>
        </Stack>
    );
}

function StarHoverableIcon(props) {
    const [hover, setHover] = useState(false);
    return (
        <span
            className="star-icon"
            data-hover={hover ? 'true' : undefined}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}
        >
            {hover ? <Star size={16} fill="currentColor" /> : <Star size={16} />}
        </span>
    );
}

export { StarHoverableIcon };