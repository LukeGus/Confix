import React, { useState, useEffect } from 'react';
import { 
    Modal, 
    TextInput, 
    Button, 
    Stack, 
    Text, 
    Group, 
    Switch,
    PasswordInput,
    Textarea,
    Alert
} from '@mantine/core';
import { Server, Key, Lock } from 'lucide-react';

export function SSHServerModal({ opened, onClose, onAddServer, onEditServer, editingServer }) {
    const [serverName, setServerName] = useState('');
    const [serverIP, setServerIP] = useState('');
    const [serverPort, setServerPort] = useState('22');
    const [username, setUsername] = useState('');
    const [defaultPath, setDefaultPath] = useState('/');
    const [useSSHKey, setUseSSHKey] = useState(false);
    const [password, setPassword] = useState('');
    const [sshKey, setSSHKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (editingServer) {
            setServerName(editingServer.name || '');
            setServerIP(editingServer.ip || '');
            setServerPort(editingServer.port?.toString() || '22');
            setUsername(editingServer.user || '');
            setDefaultPath(editingServer.defaultPath || '/');
            setUseSSHKey(!!editingServer.sshKey);
            setPassword(editingServer.password || '');
            setSSHKey(editingServer.sshKey || '');
        } else {
            setServerName('');
            setServerIP('');
            setServerPort('22');
            setUsername('');
            setDefaultPath('/');
            setUseSSHKey(false);
            setPassword('');
            setSSHKey('');
        }
        setError('');
    }, [editingServer]);

    const handleSubmit = async () => {
        if (!serverName.trim() || !serverIP.trim() || !username.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        if (!useSSHKey && !password.trim()) {
            setError('Please provide either a password or SSH key');
            return;
        }

        if (useSSHKey && !sshKey.trim()) {
            setError('Please provide an SSH key');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const serverConfig = {
                name: serverName.trim(),
                ip: serverIP.trim(),
                port: parseInt(serverPort) || 22,
                user: username.trim(),
                defaultPath: defaultPath.trim() || '/',
                password: useSSHKey ? null : password,
                sshKey: useSSHKey ? sshKey : null,
                createdAt: editingServer?.createdAt || new Date().toISOString()
            };

            if (editingServer && onEditServer) {
                await onEditServer(editingServer, serverConfig);
            } else {
                await onAddServer(serverConfig);
            }

            setServerName('');
            setServerIP('');
            setServerPort('22');
            setUsername('');
            setDefaultPath('/');
            setUseSSHKey(false);
            setPassword('');
            setSSHKey('');
            setError('');
            
            onClose();
        } catch (err) {
            setError(err.message || 'Failed to save server');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        if (!isLoading) {
            setServerName('');
            setServerIP('');
            setServerPort('22');
            setUsername('');
            setDefaultPath('/');
            setUseSSHKey(false);
            setPassword('');
            setSSHKey('');
            setError('');
            onClose();
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={<Text color="white" weight={600} fw={700}>{editingServer ? 'Edit SSH Server' : 'Add SSH Server'}</Text>}
            size="md"
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
                {error && (
                    <Text color="red" size="sm" style={{ marginBottom: 8 }}>
                        {error}
                    </Text>
                )}

                <TextInput
                    label="Server Name"
                    placeholder="My Server"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    required
                    icon={<Server size={16} />}
                    styles={{
                        label: { color: 'white' },
                        input: {
                            background: '#36414C',
                            color: 'white',
                            borderColor: '#4A5568',
                            '&::placeholder': { color: '#A0AEC0' }
                        }
                    }}
                />

                <TextInput
                    label="Server IP"
                    placeholder="192.168.1.100"
                    value={serverIP}
                    onChange={(e) => setServerIP(e.target.value)}
                    required
                    icon={<Server size={16} />}
                    styles={{
                        label: { color: 'white' },
                        input: {
                            background: '#36414C',
                            color: 'white',
                            borderColor: '#4A5568',
                            '&::placeholder': { color: '#A0AEC0' }
                        }
                    }}
                />

                <TextInput
                    label="Port"
                    placeholder="22"
                    value={serverPort}
                    onChange={(e) => setServerPort(e.target.value)}
                    required
                    icon={<Server size={16} />}
                    styles={{
                        label: { color: 'white' },
                        input: {
                            background: '#36414C',
                            color: 'white',
                            borderColor: '#4A5568',
                            '&::placeholder': { color: '#A0AEC0' }
                        }
                    }}
                />

                <TextInput
                    label="Username"
                    placeholder="root"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    icon={<Server size={16} />}
                    styles={{
                        label: { color: 'white' },
                        input: {
                            background: '#36414C',
                            color: 'white',
                            borderColor: '#4A5568',
                            '&::placeholder': { color: '#A0AEC0' }
                        }
                    }}
                />

                <TextInput
                    label="Default Path"
                    placeholder="/home/user"
                    value={defaultPath}
                    onChange={(e) => setDefaultPath(e.target.value)}
                    description="Path to navigate to when connecting to this server"
                    icon={<Server size={16} />}
                    styles={{
                        label: { color: 'white' },
                        description: { color: '#A0AEC0' },
                        input: {
                            background: '#36414C',
                            color: 'white',
                            borderColor: '#4A5568',
                            '&::placeholder': { color: '#A0AEC0' }
                        }
                    }}
                />

                <Group position="apart">
                    <Text size="sm" color="white">Authentication Method</Text>
                    <Switch
                        checked={useSSHKey}
                        onChange={(event) => setUseSSHKey(event.currentTarget.checked)}
                        label={useSSHKey ? "SSH Key" : "Password"}
                        color="blue"
                        styles={{
                            label: { color: 'white' },
                            track: {
                                backgroundColor: useSSHKey ? '#36414C' : '#2f3740',
                                borderColor: '#4A5568',
                            },
                            thumb: {
                                backgroundColor: useSSHKey ? '#4299E1' : '#A0AEC0',
                            }
                        }}
                    />
                </Group>

                {!useSSHKey ? (
                    <PasswordInput
                        label="Password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        icon={<Lock size={16} />}
                        styles={{
                            label: { color: 'white' },
                            input: {
                                background: '#36414C',
                                color: 'white',
                                borderColor: '#4A5568',
                                '&::placeholder': { color: '#A0AEC0' }
                            },
                            innerInput: {
                                background: '#36414C',
                                color: 'white',
                                '&::placeholder': { color: '#A0AEC0' }
                            }
                        }}
                    />
                ) : (
                    <Textarea
                        label="SSH Private Key"
                        placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                        value={sshKey}
                        onChange={(e) => setSSHKey(e.target.value)}
                        required
                        minRows={4}
                        icon={<Key size={16} />}
                        styles={{
                            label: { color: 'white' },
                            input: {
                                background: '#36414C',
                                color: 'white',
                                borderColor: '#4A5568',
                                '&::placeholder': { color: '#A0AEC0' }
                            }
                        }}
                    />
                )}

                <Group position="right" mt="md">
                    <Button
                        variant="subtle"
                        onClick={handleClose}
                        disabled={isLoading}
                        style={{
                            backgroundColor: '#2f3740',
                            color: 'white',
                            borderColor: '#4A5568',
                            borderRadius: 4,
                            '&:hover': { backgroundColor: '#4A5568' }
                        }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        loading={isLoading}
                        style={{
                            backgroundColor: '#36414C',
                            color: 'white',
                            borderColor: '#4A5568',
                            borderRadius: 4,
                            '&:hover': { backgroundColor: '#4A5568' }
                        }}
                    >
                        {editingServer ? 'Save Changes' : 'Add Server'}
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
} 