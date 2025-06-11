import {useState} from 'react'
import '@mantine/core/styles.css';
import {MantineProvider, AppShell, Burger, createTheme } from '@mantine/core';
import {useDisclosure} from '@mantine/hooks';
import '@mantine/tiptap/styles.css';
import { TiptapEditor } from './TiptapEditor.jsx';

const theme = createTheme({
    colors: {
        'dark': ['#C9C9C9', '#b8b8b8', '#828282', '#696969', '#424242', '#3b3b3b', '#2e2e2e', '#242424', '#1f1f1f', '#141414'],
    },
});

function App() {
    const [opened, {toggle}] = useDisclosure(true);

    return (
        <MantineProvider theme={theme}>
            <AppShell
                header={{height: 60}}
                navbar={{
                    width: 300,
                    breakpoint: 'sm',
                    collapsed: {desktop: !opened},
                }}
                padding="md"
                color="dark"
                styles={{
                    main: {
                        borderLeft: opened ? '3px solid #2e2e2e' : 'none',
                    },
                    header: {
                        borderBottom: '3px solid #2e2e2e',
                    },
                    navbar: {
                        borderRight: opened ? '3px solid #2e2e2e' : 'none',
                    }
                }}
            >
                <AppShell.Header style={{ 
                    backgroundColor: '#404040',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 16px'
                }}>
                    <Burger
                        opened={opened}
                        onClick={toggle}
                        size="sm"
                        color="white"
                    />
                </AppShell.Header>

                <AppShell.Navbar p="md" style={{ 
                    backgroundColor: '#404040',
                    color: 'white'
                }}>
                    Navbar
                </AppShell.Navbar>

                <AppShell.Main className="h-full w-full" style={{ backgroundColor: '#141414' }}>
                    <TiptapEditor/>
                </AppShell.Main>
            </AppShell>
        </MantineProvider>
    );
}

export default App
