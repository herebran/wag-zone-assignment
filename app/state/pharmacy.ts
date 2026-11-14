/**
 * The pharmacy's data: the roster, the settings, the open day's board and the list of saved boards. Every change is
 * saved to the browser right away (state/storage.ts), then the screen updates.
 *
 * The storage and the clock are passed in, so tests can use their own.
 */
import { createBackup, type Backup } from '@/lib/backup';
import { createBlankBoard } from '@/lib/board';
import { toIsoDate } from '@/lib/dates';
import { DEFAULT_ROLE, sortTechnicians, type TechnicianNames } from '@/lib/names';
import type { Board, SavedBoard, Settings, Technician } from '@/lib/records';
import { readRoster, readSavedBoard, readSettings, type StoredRoster } from '@/lib/stored';
import { canRedo, canUndo, createHistory, getCurrentStep, recordStep, redoStep, undoStep } from '@/state/history';
import {
    findBoardDate,
    getBoardKey,
    createMemoryStorage,
    findLocalStorage,
    isOwnKey,
    listBoardDates,
    listOwnKeys,
    readStoredJson,
    removeStored,
    ROSTER_KEY,
    SETTINGS_KEY,
    writeStoredJson,
} from '@/state/storage';

/**
 * Whether changes are being saved. 'blocked' means the browser gives the page no storage, so the data lasts only until
 * the page closes. 'failed' means the browser refused a change, usually because its storage is full.
 */
export type StorageStatus = 'saved' | 'blocked' | 'failed';

/**
 * What the screen shows. Every change makes a new state object. Parts that did not change stay the same objects, so
 * React can skip them.
 */
export interface PharmacyState {
    /** The roster, sorted the way the settings say. */
    technicians: readonly Technician[];
    settings: Settings;

    /** The open day, as 'YYYY-MM-DD'. */
    boardDate: string;
    board: Board;

    /** Whether the open day has a saved board. A board is first saved when it is changed. */
    isBoardSaved: boolean;

    /** The days with a saved board, newest first. */
    savedBoardDates: readonly string[];
    canUndo: boolean;
    canRedo: boolean;
    storageStatus: StorageStatus;
}

export interface PharmacyOptions {
    /** Where the data is saved. The default is the browser's localStorage. Null keeps it in memory only. */
    storage?: Storage | null;

    /** Returns the current time. Tests pass their own. */
    now?: () => Date;
}

export interface Pharmacy {
    /** Calls the listener after every change. Returns a function that stops it. */
    subscribe: (listener: () => void) => () => void;
    getState: () => PharmacyState;
    now: () => Date;

    addTechnician: (names: TechnicianNames) => Technician;
    updateTechnician: (technicianId: number, names: TechnicianNames) => void;
    setTechnicianRole: (technicianId: number, role: string) => void;

    /** Removes a technician from the roster. Boards that had them assigned show them as removed. */
    deleteTechnician: (technicianId: number) => void;

    updateSettings: (changes: Partial<Settings>) => void;

    /** Opens a day's saved board, or a blank one. The undo history starts over. */
    openBoard: (boardDate: string) => void;

    /**
     * Changes the open board and saves it. The changes themselves are in lib/board.ts.
     *
     * @param typedField the field being typed in, so that a run of typing is one undo step (state/history.ts)
     */
    changeBoard: (change: (board: Board) => Board, typedField?: string) => void;
    undo: () => void;
    redo: () => void;

    /** Replaces the open board with a blank one. Undo brings it back. */
    clearBoard: () => void;

    /** Deletes the open day's saved board. Undo cannot bring it back. */
    deleteBoard: () => void;

    /**
     * Copies another day's board over the open one. Undo brings the old one back.
     *
     * @returns false when that day has no saved board
     */
    copyBoardFrom: (sourceDate: string) => boolean;

    createBackup: () => Backup;

    /** Replaces everything saved in the browser with what the backup holds. */
    restoreBackup: (backup: Backup) => void;

    /**
     * Reloads what another browser tab just saved, so two tabs never overwrite each other.
     *
     * @param key the storage key the other tab changed, or null when it cleared the storage
     */
    readChangeFromStorage: (key: string | null) => void;
}

/**
 * Loads the pharmacy's data from what the browser has saved.
 */
export function createPharmacy({
    storage = findLocalStorage(),
    now = () => new Date(),
}: PharmacyOptions = {}): Pharmacy {
    // With no storage from the browser, the data is kept in memory until the page closes.
    const isBlocked = storage === null;
    const dataStorage = storage ?? createMemoryStorage();
    const listeners = new Set<() => void>();

    // The keys the browser refused to save. While there are any, something on the screen is not saved.
    const unsavedKeys = new Set<string>();

    let roster = readRoster(readStoredJson(dataStorage, ROSTER_KEY));
    let settings = readSettings(readStoredJson(dataStorage, SETTINGS_KEY));
    let technicians = sortTechnicians(roster.technicians, settings.rosterOrder);
    let savedBoardDates = listBoardDates(dataStorage);
    let boardDate = toIsoDate(now());
    let isBoardSaved = false;
    let history = createHistory(createBlankBoard());
    loadBoard(boardDate);

    let state = createState();

    function createState(): PharmacyState {
        return {
            technicians,
            settings,
            boardDate,
            board: getCurrentStep(history),
            isBoardSaved,
            savedBoardDates,
            canUndo: canUndo(history),
            canRedo: canRedo(history),
            storageStatus: findStorageStatus(),
        };
    }

    function findStorageStatus(): StorageStatus {
        if (isBlocked) {
            return 'blocked';
        }

        return unsavedKeys.size > 0 ? 'failed' : 'saved';
    }

    function publish(): void {
        state = createState();
        for (const listener of listeners) {
            listener();
        }
    }

    function write(key: string, value: unknown): boolean {
        const isSaved = writeStoredJson(dataStorage, key, value);
        noteSaved(key, isSaved);

        return isSaved;
    }

    function remove(key: string): void {
        noteSaved(key, removeStored(dataStorage, key));
    }

    function noteSaved(key: string, isSaved: boolean): void {
        if (isSaved) {
            unsavedKeys.delete(key);
        } else {
            unsavedKeys.add(key);
        }
    }

    function readSaved(date: string): SavedBoard | null {
        return readSavedBoard(readStoredJson(dataStorage, getBoardKey(date)));
    }

    /**
     * Loads a day's saved board, or a blank one, and starts a new undo history.
     */
    function loadBoard(date: string): void {
        // If the browser refused to save the board being closed, that board is lost now. Stop counting it as unsaved.
        unsavedKeys.delete(getBoardKey(boardDate));

        const savedBoard = readSaved(date);

        boardDate = date;
        isBoardSaved = savedBoard !== null;
        history = createHistory(savedBoard ? savedBoard.board : createBlankBoard());
    }

    function saveBoard(changedAt: Date): void {
        const savedBoard: SavedBoard = { updatedAt: changedAt.toISOString(), board: getCurrentStep(history) };
        const isSaved = write(getBoardKey(boardDate), savedBoard);

        // Add the day to the saved list only once the browser has accepted the board.
        if (isSaved && !isBoardSaved) {
            isBoardSaved = true;
            savedBoardDates = [...savedBoardDates, boardDate].sort().reverse();
        }
    }

    function saveRoster(changed: StoredRoster): void {
        roster = changed;
        technicians = sortTechnicians(roster.technicians, settings.rosterOrder);
        write(ROSTER_KEY, roster);
        publish();
    }

    function changeTechnician(technicianId: number, change: (technician: Technician) => Technician): void {
        saveRoster({
            ...roster,
            technicians: roster.technicians.map((technician) =>
                technician.id === technicianId ? change(technician) : technician
            ),
        });
    }

    function changeBoard(change: (board: Board) => Board, typedField?: string): void {
        const board = getCurrentStep(history);
        const changed = change(board);
        if (changed === board) {
            return;
        }

        const changedAt = now();
        history = recordStep(history, changed, typedField ?? null, changedAt.getTime());
        saveBoard(changedAt);
        publish();
    }

    return {
        subscribe(listener) {
            listeners.add(listener);

            return () => {
                listeners.delete(listener);
            };
        },

        getState: () => state,

        now,

        addTechnician(names) {
            const technician: Technician = {
                id: roster.nextTechnicianId,
                ...trimNames(names),
                role: DEFAULT_ROLE,
                createdAt: now().toISOString(),
            };
            saveRoster({
                nextTechnicianId: roster.nextTechnicianId + 1,
                technicians: [...roster.technicians, technician],
            });

            return technician;
        },

        updateTechnician(technicianId, names) {
            changeTechnician(technicianId, (technician) => ({ ...technician, ...trimNames(names) }));
        },

        setTechnicianRole(technicianId, role) {
            changeTechnician(technicianId, (technician) => ({ ...technician, role }));
        },

        deleteTechnician(technicianId) {
            saveRoster({
                ...roster,
                technicians: roster.technicians.filter((technician) => technician.id !== technicianId),
            });
        },

        updateSettings(changes) {
            settings = { ...settings, ...changes };
            technicians = sortTechnicians(roster.technicians, settings.rosterOrder);
            write(SETTINGS_KEY, settings);
            publish();
        },

        openBoard(date) {
            loadBoard(date);
            publish();
        },

        changeBoard,

        undo() {
            if (!canUndo(history)) {
                return;
            }

            history = undoStep(history);
            saveBoard(now());
            publish();
        },

        redo() {
            if (!canRedo(history)) {
                return;
            }

            history = redoStep(history);
            saveBoard(now());
            publish();
        },

        clearBoard() {
            changeBoard(() => createBlankBoard());
        },

        deleteBoard() {
            remove(getBoardKey(boardDate));
            savedBoardDates = savedBoardDates.filter((date) => date !== boardDate);
            loadBoard(boardDate);
            publish();
        },

        copyBoardFrom(sourceDate) {
            const source = readSaved(sourceDate);
            if (!source) {
                return false;
            }

            changeBoard(() => source.board);
            return true;
        },

        createBackup() {
            const boards: Record<string, SavedBoard> = {};
            for (const date of listBoardDates(dataStorage)) {
                const savedBoard = readSaved(date);
                if (savedBoard) {
                    boards[date] = savedBoard;
                }
            }

            return createBackup({ ...roster, settings, boards }, now());
        },

        restoreBackup(backup) {
            for (const key of listOwnKeys(dataStorage)) {
                remove(key);
            }

            roster = { nextTechnicianId: backup.nextTechnicianId, technicians: backup.technicians };
            settings = backup.settings;
            technicians = sortTechnicians(roster.technicians, settings.rosterOrder);
            write(ROSTER_KEY, roster);
            write(SETTINGS_KEY, settings);
            for (const [date, savedBoard] of Object.entries(backup.boards)) {
                write(getBoardKey(date), savedBoard);
            }

            savedBoardDates = listBoardDates(dataStorage);
            loadBoard(boardDate);
            publish();
        },

        readChangeFromStorage(key) {
            if (key !== null && !isOwnKey(key)) {
                return;
            }

            const isEverything = key === null;
            const changedBoardDate = key === null ? null : findBoardDate(key);
            if (isEverything || key === SETTINGS_KEY) {
                settings = readSettings(readStoredJson(dataStorage, SETTINGS_KEY));
            }
            if (isEverything || key === ROSTER_KEY) {
                roster = readRoster(readStoredJson(dataStorage, ROSTER_KEY));
            }
            if (isEverything || changedBoardDate) {
                savedBoardDates = listBoardDates(dataStorage);
            }

            // The other tab changed the board that is open here. Show its version and start a new undo history, because
            // the old steps no longer apply.
            if (isEverything || changedBoardDate === boardDate) {
                loadBoard(boardDate);
            }

            technicians = sortTechnicians(roster.technicians, settings.rosterOrder);
            publish();
        },
    };
}

function trimNames({ firstName, lastName, abbreviation }: TechnicianNames): TechnicianNames {
    return { firstName: firstName.trim(), lastName: lastName.trim(), abbreviation: abbreviation.trim() };
}
