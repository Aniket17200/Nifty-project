import React, { useEffect } from 'react';

// Extract theme logic that was previously inline in index.html to ensure 
// clean structure and proper React lifecycle management.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        try {
            const t = localStorage.getItem('worldmonitor-theme');
            let v = localStorage.getItem('worldmonitor-variant');

            if (!v) {
                const h = window.location.hostname;
                if (h.startsWith('happy.')) v = 'happy';
                else if (h.startsWith('tech.')) v = 'tech';
                else if (h.startsWith('finance.')) v = 'finance';
            }

            if (v) {
                document.documentElement.dataset.variant = v;
            }

            if (t === 'dark' || t === 'light') {
                document.documentElement.dataset.theme = t;
            } else if (v === 'happy') {
                document.documentElement.dataset.theme = 'light';
            } else {
                document.documentElement.dataset.theme = 'dark'; // Default fallback
            }
        } catch (e) {
            console.warn("Could not parse theme variables: ", e);
        }
    }, []);

    return <>{children}</>;
}
