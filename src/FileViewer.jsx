import React, {useState, useEffect, useRef} from 'react';
import {Button, Divider, Text, TextInput, Group, ScrollArea, Paper, Stack, ActionIcon, Modal, Loader} from "@mantine/core";
import { ArrowUp, Folder, File, FolderOpen, Star, Server, Plus, Monitor, Edit } from 'lucide-react';
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

const CONFIG_FILE_EXTENSIONS = [
    '.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.config',
    '.toml', '.env', '.properties', '.cfg', '.txt', '.md', '.log'
];

const LOCAL_SERVER = {
    name: 'Local Container',
    ip: 'local',
    port: null,
    user: null,
    defaultPath: navigator.platform.includes('Win') ? 'C:/' : '/',
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
    const pathInputRef = useRef(null);

    const handleBack = async () => {
        const defaultPath = currentServerState?.defaultPath || LOCAL_SERVER.defaultPath;
        // Normalize both paths for comparison
        const normalize = p => (p || '').replace(/\\/g, '/').replace(/\/+/g, '/').replace(/\/$/, '').toLowerCase();
        const normalizedFolder = normalize(folder);
        // Determine if at root
        let atRoot = false;
        if (currentServerState?.isLocal && navigator.platform.includes('Win')) {
            // Windows: root is like 'C:/'
            const driveRoot = (folder.split('/')[0] || 'C') + '/';
            atRoot = normalize(folder) === normalize(driveRoot);
        } else {
            // Linux/SSH: root is '/'
            atRoot = normalizedFolder === '' || normalizedFolder === '/';
        }
        console.log('Back button:', { folder, defaultPath, normalizedFolder, atRoot });
        // If at root, go back to server list
        if (atRoot) {
            setIsSSHMode(false);
            setCurrentServerState(null);
            setFolder('/');
            if (setCurrentServer) {
                setCurrentServer(null);
            }
            // Close all tabs if setTabState is provided
            if (setTabState) {
                setTabState({ tabs: [], activeTab: 'home' });
            }
            // Disconnect from SSH if needed
            if (!currentServerState?.isLocal) {
                await fetch(`${SSH_API_BASE}/sshDisconnect`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                    }
                });
            }
            return;
        }
        // Otherwise, go up one directory
        if (folder && folder !== '/') {
        const normalizedPath = folder.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
                let newPath;
                if (currentServerState?.isLocal && navigator.platform.includes('Win')) {
                    // For Windows local, ensure drive letter format
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
            // Test the connection first
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

            // Disconnect after testing
            await fetch(`${SSH_API_BASE}/sshDisconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                }
            });

            // Add to servers list
            setSSHServers(prev => [...prev, serverConfig]);
        } catch (error) {
            throw error;
        }
    };

    const handleEditSSHServer = async (oldServer, newServerConfig) => {
        try {
            // Test the connection first
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

            // Disconnect after testing
            await fetch(`${SSH_API_BASE}/sshDisconnect`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
                }
            });

            // Update server in list
            setSSHServers(prev => prev.map(server => 
                server.name === oldServer.name ? newServerConfig : server
            ));
        } catch (error) {
            throw error;
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

            // Use the passed onSSHConnect function if available, otherwise use local implementation
            let connected = false;
            if (onSSHConnect) {
                connected = await onSSHConnect(server);
            } else {
                // Local implementation
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

            // Only set current server after successful connection
            if (setCurrentServer) {
                setCurrentServer(server);
            }
            setConnectingToServer(null);
            
            // Load files from default path
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
        setCurrentServerState(LOCAL_SERVER);
        if (setCurrentServer) {
            setCurrentServer(LOCAL_SERVER);
        }
        const defaultPath = LOCAL_SERVER.defaultPath;
        setFolder(defaultPath);
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
                // Filter out . and .. directories
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
                // Save to SSH server
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
                // Save to local filesystem
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
                // Handle SSH file selection
                const filePath = `${folder}/${name}`.replace(/\\/g, '/').replace(/\/+/g, '/');
                onFileSelect(name, folder, currentServerState, filePath);
            } else {
                // Handle local file selection
            onFileSelect(name, folder);
            }
        } else {
            // Directory navigation
            const newPath = folder.endsWith('/') ? folder + name : folder + '/' + name;
            setFolder(newPath);
        }
        setMessage('');
    };

    // Function to auto-connect to SSH server when loading files from recent/starred/shortcuts
    const connectToSSHServer = async (server) => {
        try {
            setIsLoading(true);
            setMessage('Connecting to server...');
            setCurrentServerState(server);
            setIsSSHMode(true);

            // Use the passed onSSHConnect function if available, otherwise use local implementation
            let connected = false;
            if (onSSHConnect) {
                connected = await onSSHConnect(server);
            } else {
                // Local implementation
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

    // Show server list if not in SSH mode and no folder is selected
    if (!isSSHMode && (!folder || folder === '/')) {
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
                                    }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                                    onClick={handleLocalContainerClick}
                                >
                                    <Monitor size={16} color="#4299E1" />
                                    <Text
                                        size="sm"
                                        color="white"
                                        style={{
                                            flex: 1,
                                            marginLeft: 8,
                                            userSelect: 'none',
                                        }}
                                    >
                                        Local Container
                                    </Text>
                                </Paper>

                                {/* SSH Servers */}
                                {sshServers
                                    .sort((a, b) => {
                                        // Sort by starred status first, then alphabetically
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
                                                    marginRight: 60,
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
                                                    width: 56,
                                                    gap: 4,
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
                            <Paper
                                p="xs"
                                onClick={handleBack}
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
                                    <ArrowUp size={16} color="#A0AEC0" style={{ userSelect: 'none' }} />
                                    <Text size="sm" color="white" style={{ userSelect: 'none' }}>Go Back</Text>
                                </Group>
                            </Paper>
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