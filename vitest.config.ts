import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

/**
 * The unit tests (in app/, each next to the file it tests): React in jsdom, with Testing Library's DOM checks
 * (setup-tests.ts). They use the app's Vite config, so `@/` works the same way.
 */
export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            include: ['app/**/*.spec.{ts,tsx}'],
            setupFiles: ['./app/setup-tests.ts'],
        },
    })
);
