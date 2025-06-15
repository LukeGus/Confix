import React, { useState, useEffect } from 'react';
import { Modal, TextInput, Button, Group, Text, Loader, Paper, Stack, ActionIcon, Divider } from '@mantine/core';
import { IconUser, IconLogout, IconSettings } from '@tabler/icons-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:8081/database`
    : `${window.location.protocol}//${window.location.hostname}/database`;

export function User({ onAuth, user, setUser, setShowSettings }) {
    const [mode, setMode] = useState('login'); // 'login' or 'signup'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [autoLoginTried, setAutoLoginTried] = useState(false);
    const [profileModalOpen, setProfileModalOpen] = useState(false);

    // Auto-login on mount
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
            } else if (res.status === 409) {
                setError(data.error || 'Username already exists');
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
    };

    // Show login/signup modal if not authenticated
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

    // Profile/settings/logout button for top bar
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
                    <IconUser size={20} />
                </Button>
                <Modal
                    opened={profileModalOpen}
                    onClose={() => setProfileModalOpen(false)}
                    title={<Text color="white" weight={600}>Profile & Settings</Text>}
                    centered
                    overlayProps={{ background: 'rgba(40,44,52,0.7)', blur: 2 }}
                    styles={{
                        content: { background: '#23272f', color: 'white', borderRadius: 8, border: '1.5px solid #4A5568', boxShadow: '0 4px 32px #0008' },
                        header: { background: '#23272f', borderBottom: '1px solid #4A5568' },
                        title: { color: 'white' },
                        close: { color: '#A0AEC0' },
                    }}
                >
                    <Stack spacing="md">
                        <Group position="apart">
                            <Text size="md" color="white" weight={500}>Username</Text>
                            <Text size="md" color="white">{user.username}</Text>
                        </Group>
                        <Divider color="#4A5568" />
                        <Button
                            leftSection={<IconSettings size={16} />}
                            variant="filled"
                            color="teal"
                            style={{ backgroundColor: '#36414C', color: 'white', borderColor: '#4A5568', borderRadius: 4, fontWeight: 500, fontSize: 14 }}
                            onClick={() => {
                                setProfileModalOpen(false);
                                if (setShowSettings) setShowSettings(true);
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#2dd4bf'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#36414C'}
                        >
                            Settings
                        </Button>
                        <Button
                            leftSection={<IconLogout size={16} />}
                            variant="filled"
                            color="red"
                            style={{ backgroundColor: '#4A5568', color: 'white', borderColor: '#ff4d4f', borderRadius: 4, fontWeight: 500, fontSize: 14 }}
                            onClick={handleLogout}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#ff4d4f'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                        >
                            Log out
                        </Button>
                    </Stack>
                </Modal>
            </>
        );
    }

    // Profile/settings/logout menu for top bar
    return (
        <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
                <ActionIcon size={36} style={{ background: '#303444', color: 'white', border: '1px solid #4A5568', marginLeft: 8 }}>
                    <Avatar color="blue" radius="xl" size={28} style={{ marginRight: 4 }}>
                        <IconUser size={18} />
                    </Avatar>
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown style={{ background: '#23272f', color: 'white' }}>
                <Menu.Label>Signed in as</Menu.Label>
                <Menu.Item icon={<IconUser size={16} />}>
                    {user?.username}
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item icon={<IconSettings size={16} />} onClick={() => setShowSettings(true)}>
                    Settings
                </Menu.Item>
                <Menu.Item icon={<IconLogout size={16} />} color="red" onClick={handleLogout}>
                    Log out
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
} 