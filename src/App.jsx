import {useState, useEffect} from 'react'
import '@mantine/core/styles.css';
import {MantineProvider, AppShell, Burger, createTheme, Button, Group, ActionIcon} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {CodeEditor} from "./CodeEditor.jsx";
import {FileViewer} from "./FileViewer.jsx";
import {TabList} from "./TabList.jsx";
import {HomeView} from "./HomeView.jsx";
import { IconDeviceFloppy } from '@tabler/icons-react';
import { v4 as uuidv4 } from 'uuid';
import {User} from "./User.jsx";

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:8082`
    : `${window.location.protocol}//${window.location.hostname}/fileviewer`;

const DB_API_BASE = isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : `${window.location.protocol}//${window.location.hostname}/database`;

const theme = createTheme({
    colors: {
        'dark': ['#C9C9C9', '#b8b8b8', '#828282', '#696969', '#424242', '#3b3b3b', '#2e2e2e', '#242424', '#1f1f1f', '#141414'],
    },
});

function App() {
    const [opened, {toggle}] = useDisclosure(true);
    const [tabState, setTabState] = useState({ tabs: [], activeTab: 'home' });
    const tabs = tabState.tabs;
    const activeTab = tabState.activeTab;
    const [folder, setFolder] = useState('/');
    const [recentFiles, setRecentFiles] = useState([]);
    const [starredFiles, setStarredFiles] = useState([]);
    const [folderShortcuts, setFolderShortcuts] = useState([]);
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [authReady, setAuthReady] = useState(false);

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

    const createTab = (file, folderPath) => {
        const normalizedPath = `${folderPath}/${file}`.replace(/\\/g, '/').replace(/\/+/g, '/');
        const newTab = {
            id: uuidv4(),
            name: file,
            path: normalizedPath,
            content: '',
            isDirty: false,
            savedContent: ''
        };

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

        return newTab;
    };

    const handleFileSelect = (file, folderPath) => {
        if (!file) {
            setFolder(folderPath);
            setTabState(prev => ({ ...prev, activeTab: 'fileviewer' }));
            return;
        }
        setTabState(prev => {
            const normalizedPath = `${folderPath}/${file}`.replace(/\\/g, '/').replace(/\/+/g, '/');

            const existingTab = prev.tabs.find(tab => tab.path === normalizedPath);
            if (existingTab) {
                return { ...prev, activeTab: existingTab.id };
            }

            const newTab = createTab(file, folderPath);

            const fileInfo = {
                name: file,
                path: normalizedPath,
                lastOpened: new Date().toISOString()
            };
            setRecentFiles(prev => {
                const filtered = prev.filter(f => f.path !== fileInfo.path);
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
            setFolder('/');
            setTabState({ tabs: [], activeTab: 'home' });

            if (Array.isArray(data.recentFiles)) {
                setRecentFiles(data.recentFiles);
            }

            if (Array.isArray(data.starredFiles)) {
                setStarredFiles(data.starredFiles);
            }

            if (Array.isArray(data.folderShortcuts)) {
                setFolderShortcuts(data.folderShortcuts);
            }

            if (typeof data.currentPath === 'string') {
                setFolder(data.currentPath);
            }

            if (Array.isArray(data.openTabs) && data.openTabs.length > 0) {
                setPendingTabs(data.openTabs);
            }
        } catch (error) {
            throw error;
        }
    };

    const restoreTabs = async (tabsToRestore) => {
        const newTabs = [];
        
        for (const tab of tabsToRestore) {
            const pathParts = tab.path.split('/').filter(Boolean);
            const fileName = pathParts.pop() || '';
            const folderPath = '/' + pathParts.join('/');
            
            try {
                const fileCheckResponse = await fetch(`${API_BASE}/files?folder=${encodeURIComponent(folderPath)}`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                
                if (!fileCheckResponse.ok) {
                    continue;
                }

                const files = await fileCheckResponse.json();
                const fileExists = files.some(f => f.name === fileName && f.type === 'file');
                
                if (!fileExists) {
                    continue;
                }

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
                        isDirty: false
                    };
                    newTabs.push(newTab);
                } else {}
            } catch (error) {}
        }
        
        if (newTabs.length > 0) {
            setTabState(prev => ({
                ...prev,
                tabs: newTabs,
                activeTab: 'home'
            }));
        } else {
        }

        setPendingTabs([]);
    };

    useEffect(() => {
        if (user && !isInitialLoad && !isLoading && pendingTabs.length === 0) {
            saveUserData();
        }
    }, [tabState.tabs, tabState.activeTab, recentFiles, starredFiles, folderShortcuts, folder, user, isInitialLoad, isLoading, pendingTabs]);

    const saveUserData = async () => {
        if (!user || isLoading) return;
        const dataToSave = {
            recentFiles,
            starredFiles,
            folderShortcuts,
            openTabs: tabState.tabs.map(tab => ({
                id: tab.id,
                name: tab.name,
                path: tab.path,
                content: tab.content,
                savedContent: tab.savedContent,
                isDirty: tab.isDirty
            })),
            currentPath: folder
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
                        variant="filled"
                        color="blue"
                        disabled={!activeTab || activeTab === 'home' || !hasUnsavedChanges}
                        leftSection={<IconDeviceFloppy size={16} />}
                        style={{ 
                            flexShrink: 0,
                                backgroundColor: !activeTab || activeTab === 'home' || !hasUnsavedChanges ? '#2f3740' : '#4A5568',
                            color: 'white',
                            borderColor: '#4A5568',
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={e => {
                            if (!(!activeTab || activeTab === 'home' || !hasUnsavedChanges)) e.currentTarget.style.backgroundColor = '#36414C';
                        }}
                        onMouseOut={e => {
                                e.currentTarget.style.backgroundColor = !activeTab || activeTab === 'home' || !hasUnsavedChanges ? '#2f3740' : '#4A5568';
                        }}
                    >
                        Save
                    </Button>
                        <User onAuth={handleAuth} user={user} setUser={setUser} setShowSettings={setShowSettings} />
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
                        />
                    ) : activeTabData ? (
                        <CodeEditor
                            isNavbarOpen={opened}
                            content={activeTabData.content}
                            onContentChange={handleContentChange}
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
                    <User onAuth={handleAuth} user={user} setUser={setUser} setShowSettings={setShowSettings} />
                )}
            </div>
        </MantineProvider>
    );
}

export default App
