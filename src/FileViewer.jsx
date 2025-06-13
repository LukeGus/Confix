import React, {useState, useEffect} from 'react';
import {Button, Divider, Text, TextInput, Group} from "@mantine/core";

const API_BASE = `${window.location.protocol}//${window.location.hostname}:8082`;

export function FileViewer({onFileSelect, onFileContent}) {
    const [folder, setFolder] = useState(''); // e.g. 'C:\\Users\\Luke\\Downloads' or '/Users/luke'
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('');

    const handleBack = () => {
        if (!folder) return;
        
        const separator = pathSeparator();
        const parts = folder.split(separator).filter(Boolean);
        if (parts.length > 0) {
            parts.pop(); // Remove last directory
            // If we're on Windows and the path starts with a drive letter (e.g. C:)
            if (navigator.appVersion.indexOf('Win') !== -1 && parts[0]?.endsWith(':')) {
                setFolder(parts.join(separator));
            } else {
                // For Unix paths or non-drive Windows paths
                setFolder(parts.length > 0 ? separator + parts.join(separator) : '');
            }
        }
    };

    // Load file list whenever folder changes
    useEffect(() => {
        if (!folder) return setFiles([]);
        console.log('Loading folder:', folder);
        fetch(`${API_BASE}/files?folder=${encodeURIComponent(folder)}`)
            .then(res => res.json())
            .then(data => {
                console.log('Files returned:', data);
                setFiles(data);
            })
            .catch(e => {
                setMessage('Error loading folder: ' + e.message);
                setFiles([]);
            });
    }, [folder]);

    // Handle save file event
    useEffect(() => {
        const handleSaveFile = (event) => {
            const {content, folder, filename} = event.detail;
            fetch(`${API_BASE}/file?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(filename)}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({content}),
            })
                .then(res => {
                    if (!res.ok) throw new Error(res.statusText);
                    return res.text();
                })
                .then(msg => setMessage(msg))
                .catch(e => setMessage('Error writing file: ' + e.message));
        };

        window.addEventListener('saveFile', handleSaveFile);
        return () => window.removeEventListener('saveFile', handleSaveFile);
    }, []);

    // Load selected file content
    useEffect(() => {
        if (!selectedFile) return;
        fetch(`${API_BASE}/file?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(selectedFile)}`)
            .then(res => {
                if (!res.ok) throw new Error(res.statusText);
                return res.text();
            })
            .then(data => {
                onFileContent(data);
                setMessage('');
            })
            .catch(e => setMessage('Error loading file: ' + e.message));
    }, [selectedFile, folder, onFileContent]);

    return (
        <div>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                <TextInput
                    label="Folder Path"
                    value={folder}
                    onChange={e => setFolder(e.target.value)}
                    placeholder="Enter folder path e.g. C:\\Users\\Luke or /Users/luke"
                />
            </div>

            <Divider my="md"/>

            <h3>Files:</h3>
            <ul style={{maxHeight: 200, overflowY: 'auto', border: '1px solid #ccc', padding: 10, color: 'white'}}>
                {folder && (
                    <li
                        style={{cursor: 'pointer', color: 'lightblue'}}
                        onClick={handleBack}
                    >
                        ↑
                    </li>
                )}
                {files.length === 0 && <li>No files found</li>}
                {files.map(({name, type}) => (
                    <li
                        key={name}
                        style={{cursor: 'pointer', color: type === 'directory' ? 'lightblue' : 'white'}}
                        onClick={() => {
                            if (type === 'file') {
                                setSelectedFile(name);
                                onFileSelect(name, folder);
                            } else {
                                setFolder(folder.endsWith('/') || folder.endsWith('\\') ? folder + name : folder + pathSeparator() + name);
                            }
                            setMessage('');
                        }}
                    >
                        {name} {type === 'directory' ? '(dir)' : ''}
                    </li>
                ))}
            </ul>

            {message && <p>{message}</p>}
        </div>
    );
}

function pathSeparator() {
    if (navigator.appVersion.indexOf('Win') !== -1) return '\\';
    return '/';
}