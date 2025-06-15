import {useState, useEffect} from 'react'
import '@mantine/core/styles.css';
import {MantineProvider, AppShell, Burger, createTheme, Button, Group} from '@mantine/core';
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

    const handleFileSelect = (file, folderPath) => {
        if (!file) {
            setFolder(folderPath);
            setTabState(prev => ({ ...prev, activeTab: 'fileviewer' }));
            return;
        }
        const normalizedPath = `${folderPath}/${file}`.replace(/\\/g, '/').replace(/\/+/g, '/');
        setTabState(prev => {
            const existingTab = prev.tabs.find(tab => tab.path === normalizedPath);
            if (existingTab) {
                return { ...prev, activeTab: existingTab.id };
            }
            const newTab = {
                id: uuidv4(),
                name: file,
                path: normalizedPath,
                content: '',
                isDirty: false,
                savedContent: ''
            };
            if (folderPath === folder) {
                setFolder(folderPath);
            }
            // Load file content asynchronously
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
                .catch(e => console.error('Error loading file:', e));
            // Add to recent files
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

        // Update the saved content and clear dirty state
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

    // Called by User.jsx when authenticated
    const handleAuth = (token, user) => {
        setToken(token);
        setUser(user);
        setAuthReady(true);
    };

    return (
        <MantineProvider theme={theme}>
            <div style={{ position: 'relative', minHeight: '100vh' }}>
                <div
                    className={!user || !authReady ? 'blurred' : ''}
                    style={{
                        filter: !user || !authReady ? 'blur(2px)' : 'none',
                        pointerEvents: !user || !authReady ? 'none' : 'auto',
                        transition: 'filter 0.2s',
                    }}
                >
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
                                onClick={toggle}
                                size="sm"
                                color="white"
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
                            {/* User profile/settings/logout menu */}
                            <User onAuth={handleAuth} user={user} setUser={setUser} setShowSettings={setShowSettings} />
                        </AppShell.Header>
                        <AppShell.Navbar p="md" style={{ 
                            backgroundColor: '#36414C',
                            color: 'white'
                        }}>
                            <FileViewer 
                                onFileSelect={handleFileSelect}
                                starredFiles={starredFiles}
                                setStarredFiles={setStarredFiles}
                                folder={folder}
                                setFolder={setFolder}
                                tabs={tabs}
                            />
                        </AppShell.Navbar>
                        <AppShell.Main className="h-full w-full" style={{ backgroundColor: '#282c34' }}>
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
                </div>
                {/* Login/signup modal overlay, always rendered */}
                {(!user || !authReady) && (
                    <User onAuth={handleAuth} user={user} setUser={setUser} setShowSettings={setShowSettings} />
                )}
            </div>
        </MantineProvider>
    );
}

export default App
