import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './i18n';
import { ThemeProvider } from './components/providers/ThemeProvider';

const rootElement = document.getElementById('root');

if (rootElement) {
    createRoot(rootElement).render(
        <React.StrictMode>
            <ThemeProvider>
                <App />
            </ThemeProvider>
        </React.StrictMode>
    );
}
