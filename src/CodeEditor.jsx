import React, { useState, useEffect } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";

export function CodeEditor({ isNavbarOpen, content, onContentChange }) {
    const [dimensions, setDimensions] = useState({
        width: window.innerWidth - (isNavbarOpen ? 300 : 0) - 3,
        height: window.innerHeight - 60 - 3,
    });

    // Handle window resize
    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth - (isNavbarOpen ? 300 : 0) - 3,
                height: window.innerHeight - 60 - 3,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [isNavbarOpen]);

    // Handle navbar state changes
    useEffect(() => {
        setDimensions(prev => ({
            ...prev,
            width: window.innerWidth - (isNavbarOpen ? 300 : 0) - 3
        }));
    }, [isNavbarOpen]);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <CodeMirror
                value={content}
                height={`${dimensions.height}px`}
                width={`${dimensions.width}px`}
                theme="dark"
                extensions={[javascript({ jsx: true })]}
                onChange={onContentChange}
            />
        </div>
    );
}