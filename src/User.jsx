import React, { useState, useEffect } from 'react';
import { Modal, TextInput, Button, Group, Text, Loader, Paper, Stack, ActionIcon, Divider, Switch, Select } from '@mantine/core';
import { User as UserIcon, LogOut, Settings } from 'lucide-react';
import * as themesAll from '@uiw/codemirror-themes-all';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isIPAddress = /^\d+\.\d+\.\d+\.\d+$/.test(window.location.hostname);

const API_BASE = isLocalhost
    ? `${window.location.protocol}//${window.location.hostname}:8081`
    : isIPAddress
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/database`
    : `${window.location.protocol}//${window.location.hostname}:${window.location.port}/database`;

// Add CSS to override Mantine Select styles
const selectStyles = `
    /* Target all possible Select dropdown containers */
    .mantine-Select-dropdown,
    .mantine-Popover-dropdown,
    [data-mantine-select-dropdown],
    [data-mantine-popover-dropdown] {
        background-color: #23272f !important;
        border: 1px solid #4A5568 !important;
        color: white !important;
    }
    
    /* Target all possible Select items */
    .mantine-Select-item,
    .mantine-Popover-item,
    [data-mantine-select-item],
    [data-mantine-popover-item],
    .mantine-Select-dropdown .mantine-Select-item,
    .mantine-Popover-dropdown .mantine-Popover-item {
        color: white !important;
        background-color: transparent !important;
        border-bottom: 1px solid #36414C !important;
        padding: 6px 12px !important;
    }
    
    /* Hover states for all possible item selectors */
    .mantine-Select-item:hover,
    .mantine-Popover-item:hover,
    [data-mantine-select-item]:hover,
    [data-mantine-popover-item]:hover,
    .mantine-Select-item[data-hovered="true"],
    .mantine-Popover-item[data-hovered="true"],
    [data-mantine-select-item][data-hovered="true"],
    [data-mantine-popover-item][data-hovered="true"],
    .mantine-Select-item[data-hovered],
    .mantine-Popover-item[data-hovered],
    [data-mantine-select-item][data-hovered],
    [data-mantine-popover-item][data-hovered] {
        background-color: #1e40af !important;
        color: white !important;
    }
    
    /* Selected states */
    .mantine-Select-item[data-selected="true"],
    .mantine-Popover-item[data-selected="true"],
    [data-mantine-select-item][data-selected="true"],
    [data-mantine-popover-item][data-selected="true"],
    .mantine-Select-item[data-selected],
    .mantine-Popover-item[data-selected],
    [data-mantine-select-item][data-selected],
    [data-mantine-popover-item][data-selected] {
        background-color: #1e40af !important;
        color: white !important;
    }
    
    /* Selected and hovered states */
    .mantine-Select-item[data-selected="true"]:hover,
    .mantine-Popover-item[data-selected="true"]:hover,
    [data-mantine-select-item][data-selected="true"]:hover,
    [data-mantine-popover-item][data-selected="true"]:hover,
    .mantine-Select-item[data-selected]:hover,
    .mantine-Popover-item[data-selected]:hover,
    [data-mantine-select-item][data-selected]:hover,
    [data-mantine-popover-item][data-selected]:hover {
        background-color: #1e40af !important;
        color: white !important;
    }
    
    /* Force override with maximum specificity and target portal elements */
    body .mantine-Select-dropdown .mantine-Select-item[data-hovered],
    body .mantine-Popover-dropdown .mantine-Popover-item[data-hovered],
    body [data-mantine-select-dropdown] [data-mantine-select-item][data-hovered],
    body [data-mantine-popover-dropdown] [data-mantine-popover-item][data-hovered] {
        background-color: #1e40af !important;
        color: white !important;
    }
    
    /* Additional specificity for any remaining cases */
    .mantine-Select-dropdown .mantine-Select-item:hover,
    .mantine-Popover-dropdown .mantine-Popover-item:hover {
        background-color: #1e40af !important;
        color: white !important;
    }
    
    /* Target any element with data-hovered attribute */
    [data-hovered="true"] {
        background-color: #1e40af !important;
        color: white !important;
    }
    
    /* Nuclear option - target any dropdown item */
    div[role="option"]:hover,
    div[role="option"][data-hovered],
    div[role="option"][data-hovered="true"] {
        background-color: #1e40af !important;
        color: white !important;
    }
`;

export function User({ onAuth, user, setUser, setShowSettings, userTheme, setUserTheme }) {
    const [mode, setMode] = useState('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoLoginTried, setAutoLoginTried] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [adminModalOpen, setAdminModalOpen] = useState(false);
    const [signupEnabled, setSignupEnabled] = useState(true);
    const [isFirstUser, setIsFirstUser] = useState(false);
    const [theme, setTheme] = useState('dark');
    const [themeOptions, setThemeOptions] = useState([]);
    const [themeDropdownOpen, setThemeDropdownOpen] = useState(false);

    useEffect(() => {
        if (mode === 'signup') {
            fetch(`${API_BASE}/check-first-user`)
                .then(res => res.json())
                .then(data => {
                    setIsFirstUser(data.isFirstUser);
                })
        }
    }, [mode]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && !autoLoginTried) {
            setLoading(true);
            fetch(`${API_BASE}/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.user) {
                        setUser(data.user);
                        onAuth(token, data.user);
                    } else {
                        setUser(null);
                        localStorage.removeItem('token');
                    }
                })
                .catch(() => {
                    setUser(null);
                    localStorage.removeItem('token');
                })
                .finally(() => {
                    setLoading(false);
                    setAutoLoginTried(true);
                });
        } else if (!token && !autoLoginTried) {
            setLoading(false);
            setAutoLoginTried(true);
        }
    }, [setUser, onAuth, autoLoginTried]);

    useEffect(() => {
        if (adminModalOpen && user?.isAdmin) {
            fetch(`${API_BASE}/admin/settings`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.settings) {
                        setSignupEnabled(data.settings.signup_enabled);
                    }
                })
        }
    }, [adminModalOpen, user]);

    useEffect(() => {
        // Populate theme options from @uiw/codemirror-themes-all
        let themeNames = Object.keys(themesAll)
            .filter(key => key.endsWith('Init'))
            .map(key => key.replace('Init', ''));
        // Ensure 'dark' and 'light' are present and at the top
        themeNames = [
            ...['dark', 'light'].filter(n => !themeNames.map(t => t.toLowerCase()).includes(n)),
            ...themeNames.filter(n => n.toLowerCase() !== 'dark' && n.toLowerCase() !== 'light')
        ];
        // Capitalize and space theme names
        const formatThemeName = (name) => name
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
            .replace(/^./, str => str.toUpperCase());
        const options = themeNames.map((name) => ({
            value: name.toLowerCase(),
            label: formatThemeName(name)
        }));
        setThemeOptions(options);
        // Default to dark if not set
        if (!theme || !themeNames.map(n => n.toLowerCase()).includes(theme)) {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        if (userTheme) setTheme(userTheme);
        else setTheme('dark');
    }, [userTheme]);

    // Inject CSS styles for Select dropdown
    useEffect(() => {
        // Check if styles already exist
        if (!document.getElementById('theme-select-styles')) {
            const styleElement = document.createElement('style');
            styleElement.id = 'theme-select-styles';
            styleElement.textContent = selectStyles;
            document.head.appendChild(styleElement);
        }
        
        // Create a MutationObserver to watch for dropdown elements being added to the DOM
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Check if this is a Select dropdown
                        const selectItems = node.querySelectorAll && node.querySelectorAll('.mantine-Select-item, [data-mantine-select-item], div[role="option"]');
                        if (selectItems.length > 0) {
                            // Apply styles to each item
                            selectItems.forEach((item) => {
                                item.style.color = 'white';
                                item.style.backgroundColor = 'transparent';
                                item.style.borderBottom = '1px solid #36414C';
                                item.style.padding = '6px 12px';
                                
                                // Add hover event listeners
                                item.addEventListener('mouseenter', () => {
                                    item.style.backgroundColor = '#1e40af';
                                    item.style.color = 'white';
                                });
                                
                                item.addEventListener('mouseleave', () => {
                                    if (!item.hasAttribute('data-selected')) {
                                        item.style.backgroundColor = 'transparent';
                                        item.style.color = 'white';
                                    }
                                });
                            });
                        }
                        
                        // Also check if the node itself is a Select item
                        if (node.classList && (node.classList.contains('mantine-Select-item') || node.hasAttribute('data-mantine-select-item') || node.getAttribute('role') === 'option')) {
                            node.style.color = 'white';
                            node.style.backgroundColor = 'transparent';
                            node.style.borderBottom = '1px solid #36414C';
                            node.style.padding = '6px 12px';
                            
                            node.addEventListener('mouseenter', () => {
                                node.style.backgroundColor = '#1e40af';
                                node.style.color = 'white';
                            });
                            
                            node.addEventListener('mouseleave', () => {
                                if (!node.hasAttribute('data-selected')) {
                                    node.style.backgroundColor = 'transparent';
                                    node.style.color = 'white';
                                }
                            });
                        }
                    }
                });
            });
        });
        
        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        // Cleanup function
        return () => {
            observer.disconnect();
            const existingStyle = document.getElementById('theme-select-styles');
            if (existingStyle) {
                existingStyle.remove();
            }
        };
    }, []);

    // Handle clicking outside the theme dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if the click is outside the theme dropdown
            const themeDropdown = event.target.closest('[data-theme-dropdown]');
            if (!themeDropdown && themeDropdownOpen) {
                setThemeDropdownOpen(false);
            }
        };

        if (themeDropdownOpen) {
            document.addEventListener('click', handleClickOutside);
        }

        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, [themeDropdownOpen]);

    const handleAuth = async () => {
        setLoading(true);
        setError('');
        const endpoint = mode === 'login' ? 'login' : 'register';
        try {
            const res = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (res.ok && data.token) {
                localStorage.setItem('token', data.token);
                setUser(data.user);
                onAuth(data.token, data.user);
                setUsername('');
                setPassword('');
                setError('');
                setMode('login');
            } else {
                setError(data.error || 'Authentication failed');
            }
        } catch (e) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setProfileModalOpen(false);
        if (setShowSettings) setShowSettings(false);
        window.location.href = window.location.href;
    };

    const handleSignupToggle = async (checked) => {
        try {
            const res = await fetch(`${API_BASE}/admin/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ signup_enabled: checked })
            });
            if (res.ok) {
                setSignupEnabled(checked);
            }
        } catch (error) {}
    };

    const handleThemeChange = async (value) => {
        const newTheme = value || 'dark';
        setTheme(newTheme);
        setUserTheme && setUserTheme(newTheme);
        // Save to backend
        try {
            await fetch(`${API_BASE}/user/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ theme: newTheme })
            });
        } catch (e) {}
    };

    if (!user) {
        return (
            <div style={{
                position: 'fixed',
                top: 0, left: 0, right: 0, bottom: 0,
                zIndex: 9999,
                backdropFilter: 'blur(2px)',
                background: 'rgba(40,44,52,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                outline: 'none',
                border: 'none',
                boxShadow: 'none',
            }}>
                <Paper p="xl" radius="md" style={{ background: 'rgba(35,39,47,0.85)', minWidth: 340, boxShadow: '0 4px 32px #0008', border: '1.5px solid #4A5568', backdropFilter: 'blur(2px)' }}>
                    <Stack spacing="md">
                        <Text align="center" size="lg" weight={700} color="white">
                            {mode === 'login' ? 'Log In' : 'Sign Up'}
                        </Text>
                        {mode === 'signup' && isFirstUser && (
                            <Text align="center" size="sm" color="yellow" weight={500}>
                                You are the first user! You will be made an administrator.
                            </Text>
                        )}
                        <TextInput
                            label="Username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            autoFocus
                            styles={{ input: { background: '#36414C', color: 'white', borderColor: '#4A5568' }, label: { color: 'white' } }}
                        />
                        <TextInput
                            label="Password"
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            styles={{ input: { background: '#36414C', color: 'white', borderColor: '#4A5568' }, label: { color: 'white' } }}
                        />
                        {error && <Text color="red" size="sm">{error}</Text>}
                        <Group grow>
                            <Button
                                onClick={handleAuth}
                                loading={loading}
                                color="blue"
                                style={{ background: '#36414C', borderColor: '#4A5568', color: 'white' }}
                            >
                                {mode === 'login' ? 'Log In' : 'Sign Up'}
                            </Button>
                        </Group>
                        <Group position="apart">
                            <Button
                                variant="subtle"
                                color="gray"
                                size="xs"
                                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                                style={{ color: '#A0AEC0' }}
                            >
                                {mode === 'login' ? 'Need an account? Sign Up' : 'Already have an account? Log In'}
                            </Button>
                        </Group>
                    </Stack>
                </Paper>
            </div>
        );
    }

    if (user && !loading) {
        return (
            <>
                <Button
                    variant="filled"
                    color="blue"
                    style={{
                        backgroundColor: '#2f3740',
                        color: 'white',
                        borderColor: '#4A5568',
                        borderRadius: 4,
                        height: 36,
                        width: 36,
                        marginLeft: 8,
                        boxShadow: 'none',
                        transition: 'background 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onClick={() => setProfileModalOpen(true)}
                    onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                    onMouseOut={e => e.currentTarget.style.backgroundColor = '#2f3740'}
                >
                    <UserIcon size={20} />
                </Button>
                <Modal
                    opened={profileModalOpen}
                    onClose={() => setProfileModalOpen(false)}
                    title={<Text color="white" weight={600} fw={700}>Profile</Text>}
                    centered
                    overlayProps={{ background: 'rgba(40,44,52,0.7)', blur: 2 }}
                    styles={{
                        content: { background: '#23272f', color: 'white', borderRadius: 4, border: '1px solid #4A5568', boxShadow: '0 4px 32px #0008' },
                        header: { background: '#23272f', borderBottom: '1px solid #4A5568' },
                        title: { color: 'white' },
                        close: {
                            backgroundColor: '#2f3740',
                            border: '1px solid #4A5568',
                            color: 'white',
                            borderRadius: 4,
                            boxShadow: 'none',
                            transition: 'background 0.2s',
                        },
                    }}
                    classNames={{ close: 'profile-modal-close' }}
                >
                    <Stack spacing="md">
                        <div/>
                        <Text size="md" color="white" weight={500}>
                            User: {user.username}
                        </Text>
                        <div style={{ position: 'relative' }} data-theme-dropdown>
                            <Text size="sm" color="white" style={{ marginBottom: 4 }}>Editor Theme</Text>
                            <div
                                style={{
                                    backgroundColor: '#36414C',
                                    border: '1px solid #4A5568',
                                    borderRadius: 4,
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    color: 'white',
                                    position: 'relative',
                                    userSelect: 'none',
                                }}
                                onClick={() => setThemeDropdownOpen(!themeDropdownOpen)}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                            >
                                {themeOptions.find(opt => opt.value === theme)?.label || 'Dark'}
                                <div style={{ 
                                    position: 'absolute', 
                                    right: 8, 
                                    top: '50%', 
                                    transform: 'translateY(-50%)',
                                    transition: 'transform 0.2s',
                                    transform: themeDropdownOpen ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%) rotate(0deg)'
                                }}>
                                    ▼
                                </div>
                            </div>
                            {themeDropdownOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: 0,
                                        right: 0,
                                        backgroundColor: '#23272f',
                                        border: '1px solid #4A5568',
                                        borderRadius: 4,
                                        marginTop: 2,
                                        zIndex: 9999,
                                        maxHeight: '200px',
                                        overflowY: 'auto',
                                    }}
                                >
                                    {themeOptions.map((option) => (
                                        <div
                                            key={option.value}
                                            style={{
                                                padding: '6px 12px',
                                                cursor: 'pointer',
                                                color: 'white',
                                                backgroundColor: theme === option.value ? '#4A5568' : 'transparent',
                                                borderBottom: '1px solid #36414C',
                                                transition: 'background-color 0.2s',
                                            }}
                                            onMouseOver={e => {
                                                if (theme !== option.value) {
                                                    e.currentTarget.style.backgroundColor = '#4A5568';
                                                }
                                            }}
                                            onMouseOut={e => {
                                                if (theme !== option.value) {
                                                    e.currentTarget.style.backgroundColor = 'transparent';
                                                }
                                            }}
                                            onClick={() => {
                                                handleThemeChange(option.value);
                                                setThemeDropdownOpen(false);
                                            }}
                                        >
                                            {option.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <a
                            href="https://uiwjs.github.io/react-codemirror/#/theme/home"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                color: '#4299E1',
                                fontSize: 12,
                                marginTop: -8,
                                marginBottom: 4,
                                padding: 0,
                                display: 'block',
                                textDecoration: 'underline',
                                textAlign: 'left',
                                width: 'fit-content'
                            }}
                        >
                            Preview all themes here
                        </a>
                        <Divider my="xs" color="#4A5568" />
                        {user.isAdmin && (
                            <Button
                                leftSection={<Settings size={16} />}
                                variant="filled"
                                color="blue"
                                style={{ backgroundColor: '#2f3740', color: 'white', borderColor: '#4A5568', borderRadius: 4, fontWeight: 500, fontSize: 14 }}
                                onClick={() => {
                                    setProfileModalOpen(false);
                                    setAdminModalOpen(true);
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = '#2f3740'}
                            >
                                Admin Settings
                            </Button>
                        )}
                        <Button
                            leftSection={<LogOut size={16} />}
                            variant="filled"
                            color="blue"
                            style={{ backgroundColor: '#2f3740', color: 'white', borderColor: '#ff4d4f', borderRadius: 4, fontWeight: 500, fontSize: 14 }}
                            onClick={handleLogout}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#2f3740'}
                        >
                            Log out
                        </Button>
                    </Stack>
                </Modal>

                {/* Admin Settings Modal */}
                <Modal
                    opened={adminModalOpen}
                    onClose={() => setAdminModalOpen(false)}
                    title={<Text color="white" weight={600} fw={700}>Admin Settings</Text>}
                    centered
                    overlayProps={{ background: 'rgba(40,44,52,0.7)', blur: 2 }}
                    styles={{
                        content: { background: '#23272f', color: 'white', borderRadius: 4, border: '1px solid #4A5568', boxShadow: '0 4px 32px #0008' },
                        header: { background: '#23272f', borderBottom: '1px solid #4A5568' },
                        title: { color: 'white' },
                        close: {
                            backgroundColor: '#2f3740',
                            border: '1px solid #4A5568',
                            color: 'white',
                            borderRadius: 4,
                            boxShadow: 'none',
                            transition: 'background 0.2s',
                        },
                    }}
                    classNames={{ close: 'profile-modal-close' }}
                >
                    <Stack spacing="md">
                        <div/>
                        <Group position="apart">
                            <Text size="md" color="white">Allow New Signups</Text>
                            <Switch
                                checked={signupEnabled}
                                onChange={e => handleSignupToggle(e.currentTarget.checked)}
                                color="blue"
                                styles={{
                                    track: {
                                        backgroundColor: signupEnabled ? '#36414C' : '#2f3740',
                                        borderColor: '#4A5568',
                                    },
                                    thumb: {
                                        backgroundColor: signupEnabled ? '#4299E1' : '#A0AEC0',
                                    }
                                }}
                            />
                        </Group>
                    </Stack>
                </Modal>
            </>
        );
    }

    return null;
} 