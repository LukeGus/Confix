import React, { useState, useEffect } from 'react';
import { Modal, TextInput, Button, Group, Text, Loader, Paper, Stack, ActionIcon, Divider, Switch } from '@mantine/core';
import { IconUser, IconLogout, IconSettings } from '@tabler/icons-react';

const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `${window.location.protocol}//${window.location.hostname}:8081/database`
    : `${window.location.protocol}//${window.location.hostname}/database`;

export function User({ onAuth, user, setUser, setShowSettings }) {
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
                    <IconUser size={20} />
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
                        {user.isAdmin && (
                            <Button
                                leftSection={<IconSettings size={16} />}
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
                            leftSection={<IconLogout size={16} />}
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