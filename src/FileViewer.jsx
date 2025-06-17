import React, {useState, useEffect, useRef} from 'react';
import {Button, Divider, Text, TextInput, Group, ScrollArea, Paper, Stack, ActionIcon} from "@mantine/core";
import { IconArrowUp, IconFolder, IconFile, IconFolderOpen, IconStar, IconStarFilled } from '@tabler/icons-react';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost 
    ? `${window.location.protocol}//${window.location.hostname}:8082`
    : `${window.location.protocol}//${window.location.hostname}/fileviewer`;

const CONFIG_FILE_EXTENSIONS = [
    '.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.config',
    '.toml', '.env', '.properties', '.cfg', '.txt', '.md', '.log'
];

export function FileViewer(props) {
    const { onFileSelect, starredFiles, setStarredFiles, folder, setFolder, tabs } = props;
    const [files, setFiles] = useState([]);
    const [message, setMessage] = useState('');
    const [configFiles, setConfigFiles] = useState([]);
    const pathInputRef = useRef(null);

    const handleBack = () => {
        if (!folder) return;
        const normalizedPath = folder.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);
        if (parts.length > 0) {
            parts.pop();
            if (navigator.appVersion.indexOf('Win') !== -1 && parts[0]?.endsWith(':')) {
                setFolder(parts.join('/'));
            } else {
                setFolder(parts.length > 0 ? '/' + parts.join('/') : '/');
            }
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
        if (!folder) {
            setFiles([]);
            return;
        }
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
            })
            .catch(e => {
                setMessage('Error loading folder: ' + e.message);
                setFiles([]);
            });
    }, [folder]);

    useEffect(() => {
        const handleSaveFile = (event) => {
            const {content, folder, filename} = event.detail;
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
        };

        window.addEventListener('saveFile', handleSaveFile);
        return () => window.removeEventListener('saveFile', handleSaveFile);
    }, []);

    useEffect(() => {
        if (!folder) return;
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
            })
            .catch(e => {
                setMessage('Error loading folder: ' + e.message);
                setFiles([]);
            });
    }, [folder]);

    const handleFileClick = (name, type) => {
        if (type === 'file') {
            onFileSelect(name, folder);
        } else {
            const newPath = folder.endsWith('/') ? folder + name : folder + '/' + name;
            setFolder(newPath);
        }
        setMessage('');
    };

    const handleStarFile = (file) => {
        const filePath = file.path || `${folder}/${file.name}`.replace(/\\/g, '/').replace(/\/+/g, '/');
        const fileInfo = {
            name: file.name,
            path: filePath,
            lastOpened: new Date().toISOString()
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

    return (
        <Stack h="100%" spacing="xs" style={{ padding: '2px' }}>
            <Paper p="xs" style={{ backgroundColor: '#2F3740' }}>
                <Stack spacing="xs">
                    <Text size="sm" weight={500} color="white">Current Path</Text>
                    <TextInput
                        ref={pathInputRef}
                        value={folder}
                        onChange={e => {
                            setFolder(e.target.value);
                        }}
                        placeholder="Enter folder path e.g. C:\\Users\\Luke or /Users/luke"
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
                    <Text size="sm" weight={500} color="white">File Manager</Text>
                    
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
                            {files.length === 0 && (
                                <Text color="dimmed" size="sm" align="center" py="md" style={{ userSelect: 'none' }}>
                                    No files found
                                </Text>
                            )}
                            {files.map(({name, type}) => {
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
                                                <IconFolder size={16} color="#4299E1" style={{ userSelect: 'none', flexShrink: 0 }} />
                                            ) : (
                                                <IconFile size={16} color="#A0AEC0" style={{ userSelect: 'none', flexShrink: 0 }} />
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
                                                    onMouseEnter={e => {
                                                        const icon = e.currentTarget.querySelector('.star-icon');
                                                        if (icon) icon.setAttribute('data-hover', 'true');
                                                    }}
                                                    onMouseLeave={e => {
                                                        const icon = e.currentTarget.querySelector('.star-icon');
                                                        if (icon) icon.removeAttribute('data-hover');
                                                    }}
                                                >
                                                    {isStarred ? (
                                                        <IconStarFilled size={16} className="star-icon" />
                                                    ) : (
                                                        <StarHoverableIcon size={16} />
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
                                    <IconArrowUp size={16} color="#A0AEC0" style={{ userSelect: 'none' }} />
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
            {hover ? <IconStarFilled size={16} /> : <IconStar size={16} />}
        </span>
    );
}

export { StarHoverableIcon };