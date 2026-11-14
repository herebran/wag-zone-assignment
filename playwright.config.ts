import { defineConfig, devices } from '@playwright/test';

/**
 * The end-to-end tests (tests/*.spec.ts), in Chromium, against the built app as `vite preview` serves it. Only the
 * build has the service worker. `pnpm test` builds the app first.
 */
export default defineConfig({
    testDir: './tests',
    reporter: 'list',
    use: {
        baseURL: 'http://localhost:4173',
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: 'pnpm exec vite preview --port 4173 --strictPort',
        url: 'http://localhost:4173',
    },
});
