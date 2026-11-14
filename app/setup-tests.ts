import type { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { afterEach, expect } from 'vitest';

// Adds Testing Library's DOM checks (toBeInTheDocument, toHaveTextContent...) to Vitest's expect, and clears the page
// after every test. Testing Library only does that by itself when Vitest's globals are on.
expect.extend(matchers);
afterEach(() => cleanup());

// jsdom answers no media query. The date picker asks whether the pointer is a mouse ('(pointer: fine)') to choose
// between a pop-up calendar and the full-screen one for phones. Answer yes, so the tests get the pop-up, like the
// pharmacy's computers.
window.matchMedia = (query: string) =>
    ({
        matches: query.includes('pointer: fine'),
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
    }) as MediaQueryList;

// jest-dom 7.0.1 declares its matchers for Vitest 4's types, which Vitest 5 changed, so they are declared again here.
// Remove this once jest-dom fixes it (testing-library/jest-dom#738).
declare module 'vitest' {
    // oxlint-disable-next-line typescript/no-empty-object-type -- empty on purpose: it only adds jest-dom's matchers to Vitest's own type
    interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {}
}
