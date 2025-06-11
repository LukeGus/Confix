import React from 'react';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import { Extension } from '@tiptap/core';

// Languages
import javascript from 'highlight.js/lib/languages/javascript';

const lowlight = createLowlight();
lowlight.register('javascript', javascript);

const PreventCodeBlockExit = Extension.create({
    name: 'preventCodeBlockExit',
    addKeyboardShortcuts() {
        return {
            Enter: ({ editor }) => {
                if (editor.isActive('codeBlock')) {
                    editor.commands.insertContent('\n');
                    return true;
                }
                return false;
            },
        };
    },
});

const content = {
    type: 'doc',
    content: [
        {
            type: 'codeBlock',
            attrs: { language: 'javascript' },
            content: [{ type: 'text', text: 'console.log("Hello, world!")' }],
        },
    ],
};

export function TiptapEditor() {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                codeBlock: false,
                heading: false,
                blockquote: false,
                paragraph: false,
                bold: false,
                italic: false,
                strike: false,
                code: false,
                bulletList: false,
                orderedList: false,
                listItem: false,
                horizontalRule: false,
                hardBreak: false,
            }),
            CodeBlockLowlight.configure({ 
                lowlight,
                defaultLanguage: 'javascript',
                HTMLAttributes: {
                    class: 'code-block',
                },
            }),
            PreventCodeBlockExit,
        ],
        content,
        onUpdate: ({ editor }) => {
            // Force all content to be in code blocks
            const content = editor.getHTML();
            if (!content.includes('<pre')) {
                editor.commands.setContent({
                    type: 'doc',
                    content: [{
                        type: 'codeBlock',
                        attrs: { language: 'javascript' },
                        content: [{ type: 'text', text: editor.getText() }],
                    }],
                });
            }
        },
        editorProps: {
            handlePaste: (view, event) => {
                const text = event.clipboardData.getData('text/plain');
                // Normalize line endings but preserve indentation
                const normalizedText = text
                    .replace(/\r\n/g, '\n')  // Convert Windows line endings
                    .replace(/\r/g, '\n')     // Convert old Mac line endings
                    .replace(/\n{3,}/g, '\n\n')  // Replace 3+ newlines with 2
                    .replace(/[ \t]+$/gm, '')    // Remove trailing spaces/tabs on each line
                    .replace(/^[ \t]+/gm, match => match)  // Preserve leading spaces/tabs
                    .trim();                      // Remove leading/trailing whitespace

                // Insert the normalized text
                const { state } = view;
                const { tr } = state;
                tr.insertText(normalizedText);
                view.dispatch(tr);
                return true;
            },
        },
    });

    return (
        <div style={{ 
            height: '100%', 
            width: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            <RichTextEditor 
                editor={editor} 
                style={{ 
                    flex: 1, 
                    display: 'flex', 
                    flexDirection: 'column',
                    border: 'none',
                    backgroundColor: 'transparent'
                }}
            >
                <RichTextEditor.Toolbar style={{ 
                    borderBottom: '1px solid #2e2e2e',
                    padding: '8px',
                    backgroundColor: '#141414',
                    display: 'flex',
                    justifyContent: 'flex-start'
                }}>
                    <RichTextEditor.ControlsGroup>
                        <RichTextEditor.Undo />
                        <RichTextEditor.Redo />
                    </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>

                <RichTextEditor.Content
                    style={{
                        flex: 1,
                        padding: 0,
                        margin: 0,
                        height: '100%',
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: 14,
                        backgroundColor: '#141414',
                    }}
                />
            </RichTextEditor>

            <style>
                {`
                    .ProseMirror {
                        padding: 0 !important;
                        margin: 0 !important;
                        height: 100% !important;
                        background-color: #141414 !important;
                    }
                    
                    .ProseMirror pre {
                        margin: 0 !important;
                        padding: 16px !important;
                        background-color: #141414 !important;
                        border-radius: 0 !important;
                    }

                    .ProseMirror p {
                        margin: 0 !important;
                        padding: 8px 16px !important;
                        background-color: #141414 !important;
                    }

                    .mantine-RichTextEditor-root {
                        border: none !important;
                        background-color: #141414 !important;
                    }

                    .mantine-RichTextEditor-toolbar {
                        border: none !important;
                        background-color: #141414 !important;
                    }

                    .mantine-RichTextEditor-control {
                        color: #C9C9C9 !important;
                        background-color: #4d4d4d !important;
                    }

                    .mantine-RichTextEditor-control:hover {
                        background-color: #404040 !important;
                        color: #ffffff !important;
                    }

                    .mantine-RichTextEditor-control svg {
                        color: #C9C9C9 !important;
                    }

                    .mantine-RichTextEditor-control:hover svg {
                        color: #ffffff !important;
                    }

                    .mantine-RichTextEditor-content {
                        background-color: #141414 !important;
                    }

                    .code-block {
                        margin: 0 !important;
                        padding: 16px !important;
                        background-color: #141414 !important;
                    }
                `}
            </style>
        </div>
    );
}
