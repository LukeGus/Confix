import React, { useState } from 'react';
import { 
    Stack, 
    Paper, 
    Text, 
    Group, 
    Button, 
    ActionIcon, 
    ScrollArea,
    TextInput,
    Divider,
    SimpleGrid,
    Loader
} from '@mantine/core';
import { 
    Star, 
    Folder, 
    File, 
    Trash2,
    Plus,
    History,
    Bookmark,
    Folders
} from 'lucide-react';
import { StarHoverableIcon } from './FileViewer.jsx';

// Helper to compare two server objects (including local)
function compareServers(a, b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    if (a.isLocal && b.isLocal) return true;
    return a.name === b.name && a.ip === b.ip && a.port === b.port && a.user === b.user;
}

export function HomeView({ onFileSelect, recentFiles, starredFiles, setStarredFiles, folderShortcuts, setFolderShortcuts, setFolder, setActiveTab, handleRemoveRecent, onSSHConnect, currentServer, isSSHConnecting }) {
    const [newFolderPath, setNewFolderPath] = useState('');
    const [activeSection, setActiveSection] = useState('recent');

    const handleStarFile = (file) => {
        const isStarred = starredFiles.some(f => f.path === file.path);
        if (isStarred) {
            setStarredFiles(starredFiles.filter(f => f.path !== file.path));
        } else {
            setStarredFiles([...starredFiles, file]);
        }
    };

    const handleRemoveStarred = (file) => {
        setStarredFiles(starredFiles.filter(f => f.path !== file.path));
    };

    const handleRemoveFolder = (folder) => {
        setFolderShortcuts(folderShortcuts.filter(f => f.path !== folder.path));
    };

    const handleAddFolder = () => {
        if (!newFolderPath) return;
        setFolderShortcuts([...folderShortcuts, { path: newFolderPath, name: newFolderPath.split('/').pop(), server: currentServer }]);
        setNewFolderPath('');
    };

    const getServerSpecificData = (data) => {
        if (!currentServer) return [];
        return data.filter(item => compareServers(item.server, currentServer));
    };

    const serverRecentFiles = getServerSpecificData(recentFiles);
    const serverStarredFiles = getServerSpecificData(starredFiles);
    const serverFolderShortcuts = getServerSpecificData(folderShortcuts);

    const handleFileClick = async (file) => {
        if (file.server && !file.server.isLocal) {
            // SSH file - only connect if not already connected to this server
            if (onSSHConnect && (!currentServer || !compareServers(currentServer, file.server))) {
                const connected = await onSSHConnect(file.server);
                if (!connected) {
                    return; // Don't proceed if connection failed
                }
            }
            const pathParts = file.path.split('/').filter(Boolean);
            const fileName = pathParts.pop() || '';
            const folderPath = '/' + pathParts.join('/');
            onFileSelect(fileName, folderPath, file.server, file.path);
        } else {
            // Local file - handle Windows and Unix paths properly
            let parentFolder;
            if (navigator.platform.includes('Win') && file.path.includes(':')) {
                // Windows path with drive letter
                const lastSlashIndex = file.path.lastIndexOf('/');
                if (lastSlashIndex === -1) {
                    // File is in root of drive (e.g., C:RHDSetup.log)
                    const driveLetter = file.path.substring(0, file.path.indexOf(':') + 1);
                    parentFolder = driveLetter + '/';
                } else {
                    // File is in a folder
                    parentFolder = file.path.substring(0, lastSlashIndex + 1);
                }
            } else {
                // Unix path
                const lastSlashIndex = file.path.lastIndexOf('/');
                parentFolder = lastSlashIndex === -1 ? '/' : file.path.substring(0, lastSlashIndex + 1);
            }
            onFileSelect(file.name, parentFolder);
        }
    };

    const FileItem = ({ file, onStar, onRemove, showRemove }) => {
        const parentFolder = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
        const isSSHFile = file.server;
        
        return (
            <Paper
                p="xs"
                style={{
                    backgroundColor: '#36414C',
                    border: '1px solid #4A5568',
                    cursor: 'pointer',
                    height: '100%',
                    maxWidth: '100%',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    paddingRight: 0,
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                onClick={() => handleFileClick(file)}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0,
                    maxWidth: 'calc(100% - 40px)',
                    overflow: 'hidden',
                }}>
                    <File size={16} color={isSSHFile ? "#4299E1" : "#A0AEC0"} style={{ userSelect: 'none', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0, marginLeft: 8 }}>
                        <Text size="sm" color="white" style={{ lineHeight: 1.2, wordBreak: 'break-word', whiteSpace: 'normal', userSelect: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {file.name}
                        </Text>
                        <Text size="xs" color="dimmed" style={{ lineHeight: 1.2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</Text>
                    </div>
                </div>
                <div style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    paddingLeft: 4
                }}>
                    <ActionIcon
                        variant="subtle"
                        color="yellow"
                        style={{ borderRadius: '50%', marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        onClick={e => {
                            e.stopPropagation();
                            onStar(file);
                        }}
                    >
                        {starredFiles.some(f => f.path === file.path) ? (
                            <Star size={16} fill="currentColor" />
                        ) : (
                            <StarHoverableIcon size={16} />
                        )}
                    </ActionIcon>
                    {showRemove && (
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            style={{ borderRadius: '50%', marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            onClick={e => {
                                e.stopPropagation();
                                onRemove(file);
                            }}
                        >
                            <Trash2 size={16} />
                        </ActionIcon>
                    )}
                </div>
            </Paper>
        );
    };

    const FolderItem = ({ folder, onRemove }) => (
        <Paper
            p="xs"
            style={{
                backgroundColor: '#36414C',
                border: '1px solid #4A5568',
                cursor: 'pointer',
                height: '100%',
                maxWidth: '100%',
                transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
            onClick={() => {
                setFolder(folder.path);
            }}
        >
            <Group spacing={4} align="flex-start" noWrap>
                <Folder size={16} color="#4299E1" style={{ marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" color="white" style={{ lineHeight: 1.2, wordBreak: 'break-word', whiteSpace: 'normal', userSelect: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</Text>
                    <Text size="xs" color="dimmed" style={{ lineHeight: 1.2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.path}</Text>
                </div>
                <ActionIcon
                    variant="subtle"
                    color="red"
                    style={{ borderRadius: '50%', marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                    onClick={e => {
                        e.stopPropagation();
                        onRemove(folder);
                    }}
                >
                    <Trash2 size={16} />
                </ActionIcon>
            </Group>
        </Paper>
    );

    return (
        <Stack
            h="100%"
            spacing="md"
            p="md"
            style={{
                color: 'white'
            }}
        >
            {!currentServer && (
                <Paper p="md" style={{ backgroundColor: '#2F3740', border: '1px solid #4A5568' }}>
                    <Text color="dimmed" align="center" size="lg">
                        Please select a server from the sidebar to view your files
                    </Text>
                </Paper>
            )}
            {currentServer && (
                <>
                    <Paper p="xs" style={{ backgroundColor: '#2F3740', border: '1px solid #4A5568' }}>
                        <Text color="white" size="sm" weight={500}>
                            Connected to: {currentServer.name} ({currentServer.user}@{currentServer.ip}:{currentServer.port})
                        </Text>
                    </Paper>
                    {isSSHConnecting ? (
                        <Paper p="md" style={{ backgroundColor: '#2F3740', border: '1px solid #4A5568' }}>
                            <Group justify="center" spacing="md">
                                <Loader size="sm" color="#4299E1" />
                                <Text color="dimmed" align="center" size="lg">
                                    Connecting to SSH server...
                                </Text>
                            </Group>
                        </Paper>
                    ) : (
                        <>
                            <Group spacing="md" mb="md">
                                <Button
                                    variant="filled"
                                    color="blue"
                                    leftSection={<History size={18} />}
                                    onClick={() => setActiveSection('recent')}
                                    style={{ backgroundColor: activeSection === 'recent' ? '#36414C' : '#4A5568', color: 'white', borderColor: '#4A5568', transition: 'background 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = activeSection === 'recent' ? '#36414C' : '#36414C'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = activeSection === 'recent' ? '#36414C' : '#4A5568'}
                                >
                                    Recent
                                </Button>
                                <Button
                                    variant="filled"
                                    color="yellow"
                                    leftSection={<Bookmark size={18} />}
                                    onClick={() => setActiveSection('starred')}
                                    style={{ backgroundColor: activeSection === 'starred' ? '#36414C' : '#4A5568', color: 'white', borderColor: '#4A5568', transition: 'background 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = activeSection === 'starred' ? '#36414C' : '#36414C'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = activeSection === 'starred' ? '#36414C' : '#4A5568'}
                                >
                                    Starred
                                </Button>
                                <Button
                                    variant="filled"
                                    color="teal"
                                    leftSection={<Folders size={18} />}
                                    onClick={() => setActiveSection('folders')}
                                    style={{ backgroundColor: activeSection === 'folders' ? '#36414C' : '#4A5568', color: 'white', borderColor: '#4A5568', transition: 'background 0.2s' }}
                                    onMouseOver={e => e.currentTarget.style.backgroundColor = activeSection === 'folders' ? '#36414C' : '#36414C'}
                                    onMouseOut={e => e.currentTarget.style.backgroundColor = activeSection === 'folders' ? '#36414C' : '#4A5568'}
                                >
                                    Folder Shortcuts
                                </Button>
                            </Group>
                            {activeSection === 'recent' && (
                                <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                                    <SimpleGrid cols={3} spacing="md">
                                        {serverRecentFiles.length === 0 ? (
                                            <Text color="dimmed" align="center" style={{ gridColumn: '1 / -1', padding: '2rem' }}>No recent files</Text>
                                        ) : (
                                            serverRecentFiles.map(file => (
                                                <FileItem
                                                    key={file.path}
                                                    file={file}
                                                    onStar={handleStarFile}
                                                    onRemove={handleRemoveRecent}
                                                    showRemove={true}
                                                />
                                            ))
                                        )}
                                    </SimpleGrid>
                                </div>
                            )}
                            {activeSection === 'starred' && (
                                <div style={{ height: 'calc(100vh - 200px)', overflow: 'hidden' }}>
                                    <SimpleGrid cols={3} spacing="md">
                                        {serverStarredFiles.length === 0 ? (
                                            <Text color="dimmed" align="center" style={{ gridColumn: '1 / -1', padding: '2rem' }}>No starred files</Text>
                                        ) : (
                                            serverStarredFiles.map(file => (
                                                <FileItem
                                                    key={file.path}
                                                    file={file}
                                                    onStar={handleStarFile}
                                                    showRemove={false}
                                                />
                                            ))
                                        )}
                                    </SimpleGrid>
                                </div>
                            )}
                            {activeSection === 'folders' && (
                                <Stack spacing="md">
                                    <Group>
                                        <TextInput
                                            placeholder="Enter folder path"
                                            value={newFolderPath}
                                            onChange={(e) => setNewFolderPath(e.target.value)}
                                            style={{ flex: 1 }}
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
                                        <Button
                                            leftSection={<Plus size={16} />}
                                            onClick={handleAddFolder}
                                            variant="filled"
                                            color="blue"
                                            style={{
                                                backgroundColor: '#36414C',
                                                border: '1px solid #4A5568',
                                                '&:hover': {
                                                    backgroundColor: '#4A5568'
                                                }
                                            }}
                                        >
                                            Add
                                        </Button>
                                    </Group>
                                    <Divider color="#4A5568" />
                                    <div style={{ height: 'calc(100vh - 280px)', overflow: 'hidden' }}>
                                        <SimpleGrid cols={3} spacing="md">
                                            {serverFolderShortcuts.length === 0 ? (
                                                <Text color="dimmed" align="center" style={{ gridColumn: '1 / -1', padding: '2rem' }}>No folder shortcuts</Text>
                                            ) : (
                                                serverFolderShortcuts.map(folder => (
                                                    <FolderItem
                                                        key={folder.path}
                                                        folder={folder}
                                                        onRemove={handleRemoveFolder}
                                                    />
                                                ))
                                            )}
                                        </SimpleGrid>
                                    </div>
                                </Stack>
                            )}
                        </>
                    )}
                </>
            )}
        </Stack>
    );
} 