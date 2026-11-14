/**
 * The app's entry point: React draws the App into #root. The two fonts ship with the app instead of coming from a font
 * service, so it looks the same without a connection (theme.ts says which font is used where).
 *
 * Source Serif 4 is loaded with its optical sizes (opsz.css), which gives the title the finer letter shapes meant for
 * large text.
 */
import '@fontsource-variable/inter';
import '@fontsource-variable/source-serif-4/opsz.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/components/App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
