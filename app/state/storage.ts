/**
 * Where the app's data lives in the browser: localStorage, as JSON. The roster, the settings and each day's board have
 * their own keys, so a change only rewrites what changed. The shapes are in lib/records.ts.
 */
import { isIsoDate } from '@/lib/dates';

/** Every key starts with this, so the app's data never mixes with another site's on the same address. */
const KEY_PREFIX = 'zoneAssignment.';

export const ROSTER_KEY = `${KEY_PREFIX}roster`;
export const SETTINGS_KEY = `${KEY_PREFIX}settings`;

const BOARD_KEY_PREFIX = `${KEY_PREFIX}board.`;

/**
 * Whether a key belongs to the app. Other pages on the same address share the browser's storage.
 */
export function isOwnKey(key: string): boolean {
    return key.startsWith(KEY_PREFIX);
}

export function getBoardKey(boardDate: string): string {
    return BOARD_KEY_PREFIX + boardDate;
}

/**
 * The day a board key is for, or null when the key is not a board's.
 */
export function findBoardDate(key: string): string | null {
    if (!key.startsWith(BOARD_KEY_PREFIX)) {
        return null;
    }

    const boardDate = key.slice(BOARD_KEY_PREFIX.length);
    return isIsoDate(boardDate) ? boardDate : null;
}

/**
 * The browser's localStorage, or null when the browser blocks it.
 */
export function findLocalStorage(): Storage | null {
    try {
        const storage = globalThis.localStorage;
        storage.getItem(ROSTER_KEY);
        return storage;
    } catch {
        return null;
    }
}

/**
 * Storage that lasts only as long as the page. Used when the browser blocks localStorage, and by the tests.
 */
export function createMemoryStorage(): Storage {
    const items = new Map<string, string>();

    return {
        get length() {
            return items.size;
        },
        key: (index) => [...items.keys()][index] ?? null,
        getItem: (key) => items.get(key) ?? null,
        setItem: (key, value) => {
            items.set(key, String(value));
        },
        removeItem: (key) => {
            items.delete(key);
        },
        clear: () => items.clear(),
    };
}

/**
 * Reads and parses what is saved under a key. Returns undefined when nothing is saved or it cannot be read.
 */
export function readStoredJson(storage: Storage, key: string): unknown {
    try {
        const saved = storage.getItem(key);
        return saved === null ? undefined : (JSON.parse(saved) as unknown);
    } catch {
        return undefined;
    }
}

/**
 * Saves a value under a key.
 *
 * @returns false when the browser refused, because its storage is full or blocked
 */
export function writeStoredJson(storage: Storage, key: string, value: unknown): boolean {
    try {
        storage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

/**
 * Removes what is saved under a key.
 *
 * @returns false when the browser refused
 */
export function removeStored(storage: Storage, key: string): boolean {
    try {
        storage.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

/**
 * The days with a saved board, newest first.
 */
export function listBoardDates(storage: Storage): string[] {
    const boardDates: string[] = [];
    try {
        for (let index = 0; index < storage.length; index++) {
            const boardDate = findBoardDate(storage.key(index) ?? '');
            if (boardDate) {
                boardDates.push(boardDate);
            }
        }
    } catch {
        return [];
    }

    return boardDates.sort().reverse();
}

export function listOwnKeys(storage: Storage): string[] {
    const keys: string[] = [];
    try {
        for (let index = 0; index < storage.length; index++) {
            const key = storage.key(index);
            if (key !== null && isOwnKey(key)) {
                keys.push(key);
            }
        }
    } catch {
        return [];
    }

    return keys;
}
