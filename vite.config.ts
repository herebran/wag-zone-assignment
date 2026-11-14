import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * The Vite config. `pnpm dev` serves the app with hot reload, and `pnpm build` writes dist/ for any static host. The
 * code is in app/, which `@/` points to.
 *
 * The build also writes a service worker (dist/sw.js, by Workbox). It keeps a copy of every file in the browser, so the
 * app works without a connection after the first visit. Browsers only run a service worker on https or on localhost.
 */
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'prompt',
            manifest: {
                name: 'Zone Assignment',
                short_name: 'Zone Assignment',
                description: 'The Walgreens Priority Zone Assignment board for pharmacy operations managers.',
                theme_color: '#1e5ba5',
                background_color: '#f4f2ef',
                display: 'standalone',
                icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
            },
            workbox: {
                // Everything the build writes: the page, its scripts, the icon and the fonts.
                globPatterns: ['**/*.{html,js,css,svg,woff2}'],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./app', import.meta.url)),
        },
    },
    build: {
        // The app is one script, and the service worker keeps it in the browser, so splitting it gains nothing. This
        // raises the size warning to fit it (about a megabyte). Only the PDF code is a separate script, loaded when a
        // PDF is first asked for.
        chunkSizeWarningLimit: 1500,
    },
});
