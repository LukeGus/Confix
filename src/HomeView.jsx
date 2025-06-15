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
    SimpleGrid
} from '@mantine/core';
import { 
    IconStar, 
    IconStarFilled, 
    IconFolder, 
    IconFile, 
    IconTrash,
    IconPlus,
    IconHistory,
    IconBookmark,
    IconFolders
} from '@tabler/icons-react';
import { StarHoverableIcon } from './FileViewer.jsx';

export function HomeView({ onFileSelect, recentFiles, starredFiles, setStarredFiles, folderShortcuts, setFolderShortcuts, setFolder, setActiveTab, handleRemoveRecent }) {
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
        setFolderShortcuts([...folderShortcuts, { path: newFolderPath, name: newFolderPath.split('/').pop() }]);
        setNewFolderPath('');
    };

    const FileItem = ({ file, onStar, onRemove, showRemove }) => {
        // Extract parent folder from file.path
        const parentFolder = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
        return (
            <Paper
                p="xs"
                style={{
                    backgroundColor: '#36414C',
                    border: '1px solid #4A5568',
                    cursor: 'pointer',
                    height: '100%',
                    transition: 'background 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    paddingRight: 0,
                }}
                onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                onClick={() => onFileSelect(file.name, parentFolder)}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    minWidth: 0,
                    maxWidth: 'calc(100% - 40px)',
                    overflow: 'hidden',
                }}>
                    <IconFile size={16} color="#A0AEC0" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" color="white" style={{ wordBreak: 'break-word', whiteSpace: 'normal', userSelect: 'none', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</Text>
                        <Text size="xs" color="dimmed" style={{ lineHeight: 1.2, marginTop: 2, marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.path}</Text>
                    </div>
                </div>
                <div style={{
                    position: 'relative',
                    right: 0,
                    top: 0,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                }}>
                    <ActionIcon
                        variant="subtle"
                        color="yellow"
                        style={{ borderRadius: 0, marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        onClick={e => {
                            e.stopPropagation();
                            onStar(file);
                        }}
                        onMouseEnter={e => {
                            const icon = e.currentTarget.querySelector('.star-icon');
                            if (icon) icon.setAttribute('data-hover', 'true');
                        }}
                        onMouseLeave={e => {
                            const icon = e.currentTarget.querySelector('.star-icon');
                            if (icon) icon.removeAttribute('data-hover');
                        }}
                    >
                        {starredFiles.some(f => f.path === file.path)
                            ? <IconStarFilled size={16} className="star-icon" />
                            : <StarHoverableIcon size={16} />
                        }
                    </ActionIcon>
                    {showRemove && (
                        <ActionIcon
                            variant="subtle"
                            color="red"
                            style={{ borderRadius: 0, marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                            onClick={e => {
                                e.stopPropagation();
                                if (onRemove) onRemove(file);
                            }}
                            onMouseOver={e => {
                                e.currentTarget.querySelector('svg').style.color = '#ff4d4f';
                            }}
                            onMouseOut={e => {
                                e.currentTarget.querySelector('svg').style.color = '';
                            }}
                        >
                            <IconTrash size={16} />
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
                transition: 'background 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
            onClick={() => {
                setFolder(folder.path);
            }}
        >
            <Group spacing={4} align="flex-start" noWrap>
                <IconFolder size={16} color="#4299E1" style={{ marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" color="white" style={{ lineHeight: 1.2, wordBreak: 'break-word', whiteSpace: 'normal', userSelect: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</Text>
                    <Text size="xs" color="dimmed" style={{ lineHeight: 1.2, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.path}</Text>
                </div>
                <div style={{ 
                    display: 'flex',
                    alignItems: 'center'
                }}>
                    <ActionIcon
                        variant="subtle"
                        color="red"
                        style={{ borderRadius: 0, marginLeft: 0, background: 'none', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                        onClick={e => {
                            e.stopPropagation();
                            onRemove(folder);
                        }}
                        onMouseOver={e => {
                            e.currentTarget.querySelector('svg').style.color = '#ff4d4f';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.querySelector('svg').style.color = '';
                        }}
                    >
                        <IconTrash size={16} />
                    </ActionIcon>
                </div>
            </Group>
        </Paper>
    );

    return (
        <Stack h="100%" spacing="md" p="md" style={{ color: 'white' }}>
            <Group spacing="md" mb="md">
                <Button
                    variant="filled"
                    color="blue"
                    leftSection={<IconHistory size={18} />}
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
                    leftSection={<IconBookmark size={18} />}
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
                    leftSection={<IconFolders size={18} />}
                    onClick={() => setActiveSection('folders')}
                    style={{ backgroundColor: activeSection === 'folders' ? '#36414C' : '#4A5568', color: 'white', borderColor: '#4A5568', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = activeSection === 'folders' ? '#36414C' : '#36414C'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = activeSection === 'folders' ? '#36414C' : '#4A5568'}
                >
                    Folder Shortcuts
                </Button>
            </Group>
            {activeSection === 'recent' && (
                <ScrollArea h="calc(100vh - 200px)">
                    <SimpleGrid cols={3} spacing="md">
                        {recentFiles.length === 0 ? (
                            <Text color="dimmed" align="center" style={{ gridColumn: '1 / -1', padding: '2rem' }}>No recent files</Text>
                        ) : (
                            recentFiles.map(file => (
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
                </ScrollArea>
            )}
            {activeSection === 'starred' && (
                <ScrollArea h="calc(100vh - 200px)">
                    <SimpleGrid cols={3} spacing="md">
                        {starredFiles.length === 0 ? (
                            <Text color="dimmed" align="center" style={{ gridColumn: '1 / -1', padding: '2rem' }}>No starred files</Text>
                        ) : (
                            starredFiles.map(file => (
                                <FileItem
                                    key={file.path}
                                    file={file}
                                    onStar={handleStarFile}
                                    showRemove={false}
                                />
                            ))
                        )}
                    </SimpleGrid>
                </ScrollArea>
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
                            leftIcon={<IconPlus size={16} />}
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
                    <ScrollArea h="calc(100vh - 280px)">
                        <SimpleGrid cols={3} spacing="md">
                            {folderShortcuts.length === 0 ? (
                                <Text color="dimmed" align="center" style={{ gridColumn: '1 / -1', padding: '2rem' }}>No folder shortcuts</Text>
                            ) : (
                                folderShortcuts.map(folder => (
                                    <FolderItem
                                        key={folder.path}
                                        folder={folder}
                                        onRemove={handleRemoveFolder}
                                    />
                                ))
                            )}
                        </SimpleGrid>
                    </ScrollArea>
                </Stack>
            )}
        </Stack>
    );
} 