import {useState} from 'react'
import '@mantine/core/styles.css';
import {MantineProvider, AppShell, Burger, createTheme, Button, Group} from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import {CodeEditor} from "./CodeEditor.jsx";
import {FileViewer} from "./FileViewer.jsx";
import {TabList} from "./TabList.jsx";
import { IconDeviceFloppy } from '@tabler/icons-react';

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
    const [tabs, setTabs] = useState([]);
    const [activeTab, setActiveTab] = useState(null);
    const [currentFolder, setCurrentFolder] = useState('');

    const handleFileSelect = (file, folder) => {
        // Check if file is already open
        const existingTab = tabs.find(tab => tab.path === `${folder}/${file}`);
        if (existingTab) {
            setActiveTab(existingTab.id);
            return;
        }

        // Create new tab
        const newTab = {
            id: Date.now(),
            name: file,
            path: `${folder}/${file}`,
            content: '',
            isDirty: false,
            savedContent: ''
        };

        // Load file content
        fetch(`${API_BASE}/file?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(file)}`)
            .then(res => {
                if (!res.ok) throw new Error(res.statusText);
                return res.text();
            })
            .then(content => {
                setTabs(prevTabs => prevTabs.map(tab => 
                    tab.id === newTab.id 
                        ? { ...tab, content, savedContent: content }
                        : tab
                ));
            })
            .catch(e => console.error('Error loading file:', e));

        setTabs([...tabs, newTab]);
        setActiveTab(newTab.id);
        setCurrentFolder(folder);
    };

    const handleContentChange = (newContent) => {
        setTabs(tabs.map(tab => {
            if (tab.id === activeTab) {
                return { 
                    ...tab, 
                    content: newContent,
                    isDirty: newContent !== tab.savedContent
                };
            }
            return tab;
        }));
    };

    const handleCloseTab = (tabId) => {
        const newTabs = tabs.filter(tab => tab.id !== tabId);
        setTabs(newTabs);
        
        // If we closed the active tab, set a new active tab
        if (tabId === activeTab && newTabs.length > 0) {
            setActiveTab(newTabs[newTabs.length - 1].id);
        } else if (newTabs.length === 0) {
            setActiveTab(null);
        }
    };

    const handleSave = () => {
        if (!activeTab) return;
        const activeTabData = tabs.find(tab => tab.id === activeTab);
        if (!activeTabData) return;

        const saveEvent = new CustomEvent('saveFile', {
            detail: {
                content: activeTabData.content,
                folder: currentFolder,
                filename: activeTabData.name
            }
        });
        window.dispatchEvent(saveEvent);

        // Update the saved content and clear dirty state
        setTabs(tabs.map(tab => 
            tab.id === activeTab 
                ? { ...tab, savedContent: tab.content, isDirty: false }
                : tab
        ));
    };

    const activeTabData = tabs.find(tab => tab.id === activeTab);
    const hasUnsavedChanges = activeTabData?.isDirty;

    return (
        <MantineProvider theme={theme}>
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
                        setActiveTab={setActiveTab}
                        closeTab={handleCloseTab}
                    />
                    <Button 
                        onClick={handleSave}
                        variant="filled"
                        color="blue"
                        disabled={!activeTab || !hasUnsavedChanges}
                        leftSection={<IconDeviceFloppy size={16} />}
                        style={{ flexShrink: 0 }}
                    >
                        Save
                    </Button>
                </AppShell.Header>

                <AppShell.Navbar p="md" style={{ 
                    backgroundColor: '#36414C',
                    color: 'white'
                }}>
                    <FileViewer onFileSelect={handleFileSelect}/>
                </AppShell.Navbar>

                <AppShell.Main className="h-full w-full" style={{ backgroundColor: '#282c34' }}>
                    {activeTabData ? (
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
        </MantineProvider>
    );
}

export default App
