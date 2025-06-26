import {useState, useEffect} from 'react'
import '@mantine/core/styles.css';
import {MantineProvider, AppShell, Burger, createTheme, Button, Group, ActionIcon} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {CodeEditor} from "./CodeEditor.jsx";
import {FileViewer} from "./FileViewer.jsx";
import {TabList} from "./TabList.jsx";
import {HomeView} from "./HomeView.jsx";
import { Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import {User} from "./User.jsx";
import * as themesAll from '@uiw/codemirror-themes-all';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

const API_BASE = isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:8082`
    : isIPAddress
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/fileviewer`
    : `${window.location.protocol}//${window.location.hostname}/fileviewer`;

const SSH_API_BASE = isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:8083`
    : isIPAddress
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/ssh`
    : `${window.location.protocol}//${window.location.hostname}/ssh`;

const DB_API_BASE = isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : isIPAddress
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/database`
    : `${window.location.protocol}//${window.location.hostname}/database`;

const theme = createTheme({
    colors: {
        'dark': ['#C9C9C9', '#b8b8b8', '#828282', '#696969', '#424242', '#3b3b3b', '#2e2e2e', '#242424', '#1f1f1f', '#141414'],
    },
});

const LOCAL_SERVER = {
    name: 'Local Container',
    ip: 'local',
    port: null,
    user: null,
    defaultPath: navigator.platform.includes('Win') ? 'C:/' : '/',
    isLocal: true
};

function App() {
    const [opened, {toggle}] = useDisclosure(true);
    const [tabState, setTabState] = useState({ tabs: [], activeTab: 'home' });
    const tabs = tabState.tabs;
    const activeTab = tabState.activeTab;
    const [folder, setFolder] = useState('/');
    const [recentFiles, setRecentFiles] = useState([]);
    const [starredFiles, setStarredFiles] = useState([]);
    const [folderShortcuts, setFolderShortcuts] = useState([]);
    const [sshServers, setSSHServers] = useState([]);
    const [currentServer, setCurrentServer] = useState(null);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [authReady, setAuthReady] = useState(false);
    const [userTheme, setUserTheme] = useState('vscode');
    const [isSSHConnecting, setIsSSHConnecting] = useState(false);
    const [connectingToServer, setConnectingToServer] = useState(null);

    const handleCloseTab = (tabId) => {
        setTabState(prev => {
            const idx = prev.tabs.findIndex(tab => tab.id === tabId);
            const newTabs = prev.tabs.filter(tab => tab.id !== tabId);
            let newActiveTab = prev.activeTab;
            if (tabId === prev.activeTab) {
                if (newTabs.length === 0) {
                    newActiveTab = 'home';
                } else if (idx > 0) {
                    newActiveTab = newTabs[idx - 1].id;
                } else {
                    newActiveTab = newTabs[0].id;
                }
            }
            return { tabs: newTabs, activeTab: newActiveTab };
        });
    };

    const createTab = (file, folderPath, server = null, filePath = null) => {
        const normalizedPath = filePath || `${folderPath}/${file}`.replace(/\\/g, '/').replace(/\/+/g, '/');
        const newTab = {
            id: uuidv4(),
            name: file,
            path: normalizedPath,
            content: '',
            isDirty: false,
            savedContent: '',
            server: server
        };

        if (server && !server.isLocal) {
            fetch(`${SSH_API_BASE}/readFile?path=${encodeURIComponent(normalizedPath)}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : (localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
            })
                .then(res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.json();
                })
                .then(data => {
                    if (data.status === 'success') {
                        setTabState(prev2 => ({
                            ...prev2,
                            tabs: prev2.tabs.map(tab =>
                                tab.id === newTab.id
                                    ? { ...tab, content: data.content, savedContent: data.content }
                                    : tab
                            )
                        }));
                    } else {
                        throw new Error(data.message || 'Failed to read file');
                    }
                })
                .catch(error => {
                });
        } else {
            fetch(`${API_BASE}/file?folder=${encodeURIComponent(folderPath)}&name=${encodeURIComponent(file)}`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : (localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
            })
                .then(res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.text();
                })
                .then(content => {
                    setTabState(prev2 => ({
                        ...prev2,
                        tabs: prev2.tabs.map(tab =>
                            tab.id === newTab.id
                                ? { ...tab, content, savedContent: content }
                                : tab
                        )
                    }));
                })
                .catch(error => {
                });
        }

        return newTab;
    };

    const handleFileSelect = (file, folderPath, server = null, filePath = null) => {
        let effectiveServer = server;
        if (!effectiveServer) {
            effectiveServer = currentServer || LOCAL_SERVER;
        }
        
        if (!file) {
            setFolder(folderPath);
            setTabState(prev => ({ ...prev, activeTab: 'fileviewer' }));
            return;
        }
        setTabState(prev => {
            const normalizedPath = filePath || `${folderPath}/${file}`.replace(/\\/g, '/').replace(/\/+/g, '/');
            const existingTab = prev.tabs.find(tab => tab.path === normalizedPath);
            if (existingTab) {
                return { ...prev, activeTab: existingTab.id };
            }
            const newTab = createTab(file, folderPath, effectiveServer, filePath);
            const fileInfo = {
                name: file,
                path: normalizedPath,
                lastOpened: new Date().toISOString(),
                server: effectiveServer
            };
            setRecentFiles(prev => {
                const filtered = prev.filter(f => f.path !== fileInfo.path || !compareServers(f.server, effectiveServer));
                return [fileInfo, ...filtered].slice(0, 10);
            });
            return { tabs: [...prev.tabs, newTab], activeTab: newTab.id };
        });
    };

    const handleContentChange = (newContent) => {
        setTabState(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab => {
                if (tab.id === prev.activeTab) {
                    return {
                        ...tab,
                        content: newContent,
                        isDirty: newContent !== tab.savedContent
                    };
                }
                return tab;
            })
        }));
    };

    const handleSave = () => {
        if (!activeTab || activeTab === 'home') return;
        const activeTabData = tabs.find(tab => tab.id === activeTab);
        if (!activeTabData) return;

        const saveEvent = new CustomEvent('saveFile', {
            detail: {
                content: activeTabData.content,
                folder: folder,
                filename: activeTabData.name
            }
        });
        window.dispatchEvent(saveEvent);

        setTabState(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab =>
                tab.id === prev.activeTab
                    ? { ...tab, savedContent: tab.content, isDirty: false }
                    : tab
            )
        }));
    };

    const handleHomeClick = () => {
        setTabState(prev => ({ ...prev, activeTab: 'home' }));
    };

    const handleRemoveRecent = (file) => {
        setRecentFiles(recentFiles.filter(f => f.path !== file.path));
    };

    const activeTabData = tabs.find(tab => tab.id === activeTab);
    const hasUnsavedChanges = activeTabData?.isDirty;

    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [pendingTabs, setPendingTabs] = useState([]);

    useEffect(() => {
        if (user && authReady && isInitialLoad && !isLoading) {
            setIsLoading(true);
            loadBasicUserData().then(() => {
                setIsInitialLoad(false);
                setIsLoading(false);
            }).catch(error => {
                setIsLoading(false);
            });
        }
    }, [user, authReady]);

    useEffect(() => {
        if (pendingTabs.length > 0 && !isLoading) {
            restoreTabs(pendingTabs);
        }
    }, [pendingTabs, isLoading]);

    useEffect(() => {
        if (!isInitialLoad && !isLoading && pendingTabs.length === 0 && user && currentServer) {
            if (!currentServer.isLocal) {
                handleSSHConnect(currentServer).then(connected => {
                    if (connected) {
                        setFolder(currentServer.defaultPath || '/');
                    }
                });
            } else {
                setFolder(currentServer.defaultPath);
            }
        }
    }, [isInitialLoad, isLoading, pendingTabs, user, currentServer]);

    const loadBasicUserData = async () => {
        if (!user) return;
        try {
            const response = await fetch(`${DB_API_BASE}/user/data`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to load user data: ${errorData.error || response.statusText}`);
            }
            const data = await response.json();

            setRecentFiles([]);
            setStarredFiles([]);
            setFolderShortcuts([]);
            setSSHServers([]);
            setCurrentServer(null);
            setFolder('/');
            setTabState({ tabs: [], activeTab: 'home' });

            if (Array.isArray(data.recentFiles)) {
                const recentFilesWithServers = data.recentFiles.map(file => ({
                    ...file,
                    server: file.serverName ? 
                        (file.serverName === LOCAL_SERVER.name && file.serverIp === LOCAL_SERVER.ip) ? 
                            LOCAL_SERVER : 
                            {
                                name: file.serverName,
                                ip: file.serverIp,
                                port: file.serverPort,
                                user: file.serverUser,
                                defaultPath: file.serverDefaultPath
                            }
                        : null
                }));
                setRecentFiles(recentFilesWithServers);
            }

            if (Array.isArray(data.starredFiles)) {
                const starredFilesWithServers = data.starredFiles.map(file => ({
                    ...file,
                    server: file.serverName ? 
                        (file.serverName === LOCAL_SERVER.name && file.serverIp === LOCAL_SERVER.ip) ? 
                            LOCAL_SERVER : 
                            {
                                name: file.serverName,
                                ip: file.serverIp,
                                port: file.serverPort,
                                user: file.serverUser,
                                defaultPath: file.serverDefaultPath
                            }
                        : null
                }));
                setStarredFiles(starredFilesWithServers);
            }

            if (Array.isArray(data.folderShortcuts)) {
                const folderShortcutsWithServers = data.folderShortcuts.map(folder => ({
                    ...folder,
                    server: folder.serverName ? 
                        (folder.serverName === LOCAL_SERVER.name && folder.serverIp === LOCAL_SERVER.ip) ? 
                            LOCAL_SERVER : 
                            {
                                name: folder.serverName,
                                ip: folder.serverIp,
                                port: folder.serverPort,
                                user: folder.serverUser,
                                defaultPath: folder.serverDefaultPath
                            }
                        : null
                }));
                setFolderShortcuts(folderShortcutsWithServers);
            }

            if (Array.isArray(data.sshServers)) {
                setSSHServers(data.sshServers);
            }

            if (data.theme) setUserTheme(data.theme);
        } catch (error) {
            throw error;
        }
    };

    const restoreTabs = async (tabsToRestore) => {
        if (!tabsToRestore || tabsToRestore.length === 0) {
            setPendingTabs([]);
            return;
        }
        const firstTab = tabsToRestore[0];
        let server = null;

        if (firstTab.serverName === LOCAL_SERVER.name && firstTab.serverIp === LOCAL_SERVER.ip) {
            server = LOCAL_SERVER;
        } else if (firstTab.serverName && firstTab.serverIp && firstTab.serverUser) {
            server = {
                name: firstTab.serverName,
                ip: firstTab.serverIp,
                port: firstTab.serverPort,
                user: firstTab.serverUser,
                defaultPath: firstTab.serverDefaultPath
            };
        }
        
        if (server && !server.isLocal) {
            const connected = await handleSSHConnect(server);
            if (!connected) {
                setPendingTabs([]);
                return;
            }
            setCurrentServer(server);
            setFolder(server.defaultPath || '/');
        } else {
            setCurrentServer(LOCAL_SERVER);
            setFolder(LOCAL_SERVER.defaultPath);
        }
        const newTabs = [];
        for (const tab of tabsToRestore) {
            const pathParts = tab.path.split('/').filter(Boolean);
            const fileName = pathParts.pop() || '';
            const folderPath = '/' + pathParts.join('/');
            try {
                if (server && !server.isLocal) {
                    const fileCheckResponse = await fetch(`${SSH_API_BASE}/listFiles?path=${encodeURIComponent(folderPath)}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (!fileCheckResponse.ok) continue;
                    const data = await fileCheckResponse.json();
                    if (data.status === 'success') {
                        const fileExists = data.files.some(f => f.name === fileName && f.type === 'file');
                        if (!fileExists) continue;
                        const contentResponse = await fetch(`${SSH_API_BASE}/readFile?path=${encodeURIComponent(tab.path)}`, {
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        if (contentResponse.ok) {
                            const contentData = await contentResponse.json();
                            if (contentData.status === 'success') {
                                const newTab = {
                                    id: uuidv4(),
                                    name: fileName,
                                    path: tab.path,
                                    content: contentData.content,
                                    savedContent: contentData.content,
                                    isDirty: false,
                                    server: server
                                };
                                newTabs.push(newTab);
                            }
                        }
                    }
                } else {
                    const fileCheckResponse = await fetch(`${API_BASE}/files?folder=${encodeURIComponent(folderPath)}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (!fileCheckResponse.ok) continue;
                    const files = await fileCheckResponse.json();
                    const fileExists = files.some(f => f.name === fileName && f.type === 'file');
                    if (!fileExists) continue;
                    const contentResponse = await fetch(`${API_BASE}/file?folder=${encodeURIComponent(folderPath)}&name=${encodeURIComponent(fileName)}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    if (contentResponse.ok) {
                        const content = await contentResponse.text();
                        const newTab = {
                            id: uuidv4(),
                            name: fileName,
                            path: tab.path,
                            content: content,
                            savedContent: content,
                            isDirty: false,
                            server: LOCAL_SERVER
                        };
                        newTabs.push(newTab);
                    }
                }
            } catch (error) {
            }
        }
        if (newTabs.length > 0) {
            setTabState(prev => ({
                ...prev,
                tabs: newTabs,
                activeTab: 'home'
            }));
        }
        setPendingTabs([]);
    };

    useEffect(() => {
        if (user && !isInitialLoad && !isLoading && pendingTabs.length === 0) {
            saveUserData();
        }
    }, [tabState.tabs, tabState.activeTab, recentFiles, starredFiles, folderShortcuts, sshServers, folder, user, isInitialLoad, isLoading, pendingTabs]);

    const saveUserData = async () => {
        if (!user || isLoading) return;
        const dataToSave = {
            recentFiles: recentFiles.map(file => ({
                name: file.name,
                path: file.path,
                lastOpened: file.lastOpened,
                serverName: file.server?.name || null,
                serverIp: file.server?.ip || null,
                serverPort: file.server?.port || null,
                serverUser: file.server?.user || null,
                serverDefaultPath: file.server?.defaultPath || null
            })),
            starredFiles: starredFiles.map(file => ({
                name: file.name,
                path: file.path,
                lastOpened: file.lastOpened,
                serverName: file.server?.name || null,
                serverIp: file.server?.ip || null,
                serverPort: file.server?.port || null,
                serverUser: file.server?.user || null,
                serverDefaultPath: file.server?.defaultPath || null
            })),
            folderShortcuts: folderShortcuts.map(folder => ({
                path: folder.path,
                name: folder.name,
                serverName: folder.server?.name || null,
                serverIp: folder.server?.ip || null,
                serverPort: folder.server?.port || null,
                serverUser: folder.server?.user || null,
                serverDefaultPath: folder.server?.defaultPath || null
            })),
            sshServers,
            openTabs: tabState.tabs.map(tab => ({
                id: tab.id,
                name: tab.name,
                path: tab.path,
                content: tab.content,
                savedContent: tab.savedContent,
                isDirty: tab.isDirty,
                serverName: tab.server?.name || null,
                serverIp: tab.server?.ip || null,
                serverPort: tab.server?.port || null,
                serverUser: tab.server?.user || null,
                serverDefaultPath: tab.server?.defaultPath || null
            })),
            currentPath: folder,
            theme: userTheme,
        };
        try {
            const response = await fetch(`${DB_API_BASE}/user/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(dataToSave)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Failed to save user data: ${errorData.error || response.statusText}`);
            }
        } catch (error) {
        }
    };

    const handleAuth = (token, user) => {
        setToken(token);
        setUser(user);
        setAuthReady(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = window.location.href;
    };

    const handleSSHConnect = async (server) => {
        try {
            setIsSSHConnecting(true);
            setConnectingToServer(server);
            if (currentServer && compareServers(currentServer, server)) {
                return true;
            }

            if (!server.ip || !server.user) {
                throw new Error('Missing required host configuration (ip, user)');
            }

            if (!server.password && !server.sshKey) {
                throw new Error('Either password or SSH key must be provided');
            }

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

            return true;
        } catch (error) {
            return false;
        } finally {
            setIsSSHConnecting(false);
            setConnectingToServer(null);
        }
    };

    function compareServers(a, b) {
        if (!a && !b) return true;
        if (!a || !b) return false;
        if (a.isLocal && b.isLocal) return true;
        return a.name === b.name && a.ip === b.ip && a.port === b.port && a.user === b.user;
    }

    return (
        <MantineProvider theme={theme}>
            <div style={{ position: 'relative', minHeight: '100vh' }}>
            <AppShell
                header={{height: 60}}
                navbar={{
                    width: 300,
                    breakpoint: 'sm',
                    collapsed: {desktop: !opened},
                }}
                padding={0}
                color="dark"
                styles={{
                    main: {
                        borderLeft: opened ? '3px solid #2F3740' : 'none',
                            position: 'relative',
                            overflow: 'hidden',
                    },
                    header: {
                        borderBottom: '3px solid #2F3740',
                    },
                    navbar: {
                        borderRight: opened ? '3px solid #2F3740' : 'none',
                    }
                }}
            >
                <AppShell.Header style={{ 
                    backgroundColor: '#36414C',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 8px',
                    gap: '8px'
                }}>
                    <Burger
                        opened={opened}
                        size="sm"
                        color="white"
                        lineSize={2}
                        onClick={toggle}
                        styles={{
                            root: {
                                backgroundColor: '#2f3740',
                                border: '1px solid #4A5568',
                                color: 'white',
                                borderRadius: 4,
                                height: 36,
                                width: 36,
                                marginLeft: 0,
                                boxShadow: 'none',
                                transition: 'background 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 0,
                                padding: 0,
                            }
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = '#2f3740'}
                    />
                    <TabList
                        tabs={tabs}
                        activeTab={activeTab}
                        setActiveTab={id => setTabState(prev => ({ ...prev, activeTab: id }))}
                        closeTab={handleCloseTab}
                        onHomeClick={handleHomeClick}
                    />
                    <Button
                        onClick={handleSave}
                        disabled={!hasUnsavedChanges}
                        leftSection={<Save size={16} />}
                        style={{
                            backgroundColor: hasUnsavedChanges ? '#4a5568' : '#2f3740',
                            color: 'white',
                            borderColor: '#4A5568',
                            borderRadius: 4,
                            fontWeight: 500,
                            fontSize: 14,
                            transition: 'background 0.2s'
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = hasUnsavedChanges ? '#2f3740' : '#4a5568'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = hasUnsavedChanges ? '#4a5568' : '#2f3740'}
                    >
                        Save
                    </Button>
                    <User onAuth={handleAuth} user={user} setUser={setUser} setShowSettings={setShowSettings} userTheme={userTheme} setUserTheme={setUserTheme} />
                </AppShell.Header>
                <AppShell.Navbar p="md" style={{ 
                    backgroundColor: '#36414C',
                    color: 'white',
                    position: 'relative',
                    overflow: 'hidden',
                }}>
                    {!user && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 10,
                                background: '#282c34',
                                opacity: 1,
                                backdropFilter: 'blur(2px)',
                                WebkitBackdropFilter: 'blur(2px)',
                                pointerEvents: 'none',
                            }}
                        />
                    )}
                    <FileViewer 
                        onFileSelect={handleFileSelect}
                        starredFiles={starredFiles}
                        setStarredFiles={setStarredFiles}
                        folder={folder}
                        setFolder={setFolder}
                        tabs={tabs}
                        sshServers={sshServers}
                        setSSHServers={setSSHServers}
                        onSSHConnect={handleSSHConnect}
                        setCurrentServer={setCurrentServer}
                        setTabState={setTabState}
                        setConnectingToServer={setConnectingToServer}
                        connectingToServer={connectingToServer}
                    />
                </AppShell.Navbar>
                <AppShell.Main 
                    className="h-full w-full" 
                    style={{ 
                        backgroundColor: '#282c34', 
                        position: 'absolute',
                        top: 60,
                        left: opened ? 300 : 0,
                        right: 0,
                        bottom: 0,
                        overflow: 'hidden',
                        margin: 0,
                        padding: 0,
                        width: opened ? 'calc(100% - 300px)' : '100%',
                        transition: 'width 0.2s, left 0.2s'
                    }}
                >
                    {!user && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 10,
                                background: '#282c34',
                                opacity: 1,
                                backdropFilter: 'blur(2px)',
                                WebkitBackdropFilter: 'blur(2px)',
                                pointerEvents: 'none',
                            }}
                        />
                    )}
                    {activeTab === 'home' ? (
                        <HomeView 
                            onFileSelect={handleFileSelect}
                            recentFiles={recentFiles}
                            starredFiles={starredFiles}
                            setStarredFiles={setStarredFiles}
                            folderShortcuts={folderShortcuts}
                            setFolderShortcuts={setFolderShortcuts}
                            setFolder={setFolder}
                            setActiveTab={id => setTabState(prev => ({ ...prev, activeTab: id }))}
                            handleRemoveRecent={handleRemoveRecent}
                            onSSHConnect={handleSSHConnect}
                            currentServer={currentServer}
                            isSSHConnecting={isSSHConnecting || connectingToServer}
                        />
                    ) : activeTabData ? (
                        <CodeEditor
                            isNavbarOpen={opened}
                            content={activeTabData.content}
                            fileName={activeTabData.name}
                            onContentChange={handleContentChange}
                            theme={userTheme}
                        />
                    ) : (
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            height: '100%',
                            color: 'white'
                        }}>
                        </div>
                    )}
                </AppShell.Main>
            </AppShell>
                {!user && (
                    <User onAuth={handleAuth} user={user} setUser={setUser} setShowSettings={setShowSettings} userTheme={userTheme} setUserTheme={setUserTheme} />
                )}
            </div>
        </MantineProvider>
    );
}

export default App
