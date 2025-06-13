import React, {useState, useEffect} from 'react';
import {Button, Divider, Text, TextInput, Group} from "@mantine/core";
import path from 'path-browserify';

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = isLocalhost 
    ? `${window.location.protocol}//${window.location.hostname}:8082`
    : `${window.location.protocol}//${window.location.hostname}/fileviewer`;

export function FileViewer({onFileSelect, onFileContent}) {
    const [folder, setFolder] = useState(''); // e.g. 'C:\\Users\\Luke\\Downloads' or '/Users/luke'
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [message, setMessage] = useState('');

    const handleBack = () => {
        if (!folder) return;
        
        // Normalize the path first
        const normalizedPath = folder.replace(/\\/g, '/');
        const parts = normalizedPath.split('/').filter(Boolean);
        
        if (parts.length > 0) {
            parts.pop(); // Remove last directory
            // Handle Windows drive letter case
            if (navigator.appVersion.indexOf('Win') !== -1 && parts[0]?.endsWith(':')) {
                setFolder(parts.join('/'));
            } else {
                // For Unix paths or non-drive Windows paths
                setFolder(parts.length > 0 ? '/' + parts.join('/') : '/');
            }
        }
    };

    // Load file list whenever folder changes
    useEffect(() => {
        if (!folder) {
            setFiles([]);
            return;
        }

        console.log('Loading folder:', folder);
        fetch(`${API_BASE}/files?folder=${encodeURIComponent(folder)}`)
            .then(res => res.json())
            .then(data => {
                console.log('Files returned:', data);
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

    // Handle save file event
    useEffect(() => {
        const handleSaveFile = (event) => {
            const {content, folder, filename} = event.detail;
            fetch(`${API_BASE}/file?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(filename)}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
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

    // Load selected file content only when a file is actually selected
    useEffect(() => {
        if (!selectedFile || !folder) return;
        
        fetch(`${API_BASE}/file?folder=${encodeURIComponent(folder)}&name=${encodeURIComponent(selectedFile)}`)
            .then(async res => {
                const contentType = res.headers.get('content-type');
                if (contentType && contentType.includes('application/json')) {
                    const data = await res.json();
                    if (data.error) {
                        throw new Error(data.error);
                    }
                    return data;
                } else {
                    return res.text();
                }
            })
            .then(data => {
                onFileContent(data);
                setMessage('');
            })
            .catch(e => {
                // Only show error if we're actually trying to read a file
                if (selectedFile) {
                    setMessage('Error loading file: ' + e.message);
                }
            });
    }, [selectedFile, folder, onFileContent]);

    const handleFileClick = (name, type) => {
        if (type === 'file') {
            setSelectedFile(name);
            onFileSelect(name, folder);
        } else {
            // Normalize the path by using forward slashes
            const newPath = folder.endsWith('/') ? folder + name : folder + '/' + name;
            setFolder(newPath);
            setSelectedFile(null); // Clear selected file when changing directories
        }
        setMessage('');
    };

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
                        onClick={() => handleFileClick(name, type)}
                    >
                        {name} {type === 'directory' ? '(dir)' : ''}
                    </li>
                ))}
            </ul>

            {message && <p style={{color: 'red'}}>{message}</p>}
        </div>
    );
}