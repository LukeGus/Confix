import React from 'react';
import { Button } from '@mantine/core';
import { IconHome } from '@tabler/icons-react';

export function TabList({ tabs, activeTab, setActiveTab, closeTab, onHomeClick }) {
    return (
        <div style={{ 
            height: '40px',
            backgroundColor: '#2F3740',
            borderRadius: '4px',
            overflow: 'hidden',
            flex: 1,
            margin: '0 8px',
            display: 'flex',
            alignItems: 'center'
        }}>
            <div style={{ 
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                padding: '0 4px',
                overflowX: 'auto',
                width: '100%',
                scrollbarWidth: 'thin',
                scrollbarColor: '#4A5568 #2F3740',
                '&::-webkit-scrollbar': {
                    height: '6px'
                },
                '&::-webkit-scrollbar-track': {
                    background: '#2F3740'
                },
                '&::-webkit-scrollbar-thumb': {
                    background: '#4A5568',
                    borderRadius: '3px'
                }
            }}>
                <div 
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        backgroundColor: activeTab === 'home' ? '#36414C' : '#2F3740',
                        borderRadius: '4px',
                        height: '32px',
                        minWidth: '48px',
                        marginRight: '4px',
                        border: '1px solid #4A5568',
                        overflow: 'hidden',
                        flexShrink: 0
                    }}
                >
                    <Button
                        onClick={onHomeClick}
                        variant="subtle"
                        color="gray"
                        style={{
                            height: '100%',
                            padding: '0 8px',
                            backgroundColor: 'transparent',
                            color: 'white',
                            border: 'none',
                            minWidth: '48px',
                            borderRadius: 0,
                            transition: 'background 0.2s',
                        }}
                        onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                        onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                        <IconHome size={16} />
                    </Button>
                </div>
                {tabs.map((tab, i) => {
                    const isActive = tab.id === activeTab;
                    return (
                        <div 
                            key={tab.id} 
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: isActive ? '#36414C' : '#2F3740',
                                borderRadius: '4px',
                                height: '32px',
                                minWidth: '120px',
                                maxWidth: '200px',
                                marginRight: '4px',
                                border: '1px solid #4A5568',
                                overflow: 'hidden',
                                flexShrink: 0
                            }}
                        >
                            <Button
                                onClick={() => setActiveTab(tab.id)}
                                variant="subtle"
                                color="gray"
                                style={{
                                    flex: 1,
                                    height: '100%',
                                    padding: '0 8px',
                                    backgroundColor: 'transparent',
                                    color: 'white',
                                    border: 'none',
                                    textAlign: 'left',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    borderRadius: 0,
                                    transition: 'background 0.2s',
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                {tab.name}
                            </Button>
                            <div style={{
                                width: '1px',
                                height: '16px',
                                backgroundColor: '#4A5568',
                                margin: '0 4px'
                            }} />
                            <Button
                                onClick={() => closeTab(tab.id)}
                                variant="subtle"
                                color="gray"
                                style={{
                                    height: '100%',
                                    padding: '0 8px',
                                    backgroundColor: 'transparent',
                                    color: 'white',
                                    border: 'none',
                                    minWidth: '32px',
                                    borderRadius: 0,
                                    transition: 'background 0.2s',
                                }}
                                onMouseOver={e => e.currentTarget.style.backgroundColor = '#4A5568'}
                                onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                ×
                            </Button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
} 