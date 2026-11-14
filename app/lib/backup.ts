/**
 * The backup file: everything saved in the browser (the roster, the settings and every board) as one JSON file, to keep
 * safe or to move to another computer. Restoring one replaces what the browser has.
 */
import * as z from 'zod';
import { isIsoDate } from '@/lib/dates';
import type { SavedBoard, Settings, Technician } from '@/lib/records';
import { readRoster, readSavedBoards, readSettings } from '@/lib/stored';

/** Marks a file as a Zone Assignment backup, so another app's JSON is not mistaken for one. */
const BACKUP_APP = 'zone-assignment';

/**
 * The version of the shapes a backup holds (lib/records.ts). It is not the app's own version number. Raise it when a
 * shape changes, and keep lib/stored.ts able to read the older versions:
 *
 * - 2: the settings gained hasShortPdfTimes.
 */
export const BACKUP_VERSION = 2;

export interface Backup {
    app: typeof BACKUP_APP;
    version: number;
    exportedAt: string;
    nextTechnicianId: number;
    technicians: Technician[];
    settings: Settings;

    /** The saved boards, keyed by day ('YYYY-MM-DD'). */
    boards: Record<string, SavedBoard>;
}

export interface BackupContent {
    nextTechnicianId: number;
    technicians: readonly Technician[];
    settings: Settings;
    boards: Record<string, SavedBoard>;
}

/**
 * The first check on a file: it must say it is a backup, and of which version. The rest is read piece by piece
 * (lib/stored.ts).
 */
const backupFileSchema = z.looseObject({
    app: z.literal(BACKUP_APP),
    version: z.number(),
    exportedAt: z.string().catch(''),
});

/**
 * A file that cannot be restored. The message is shown to the user.
 */
export class BackupError extends Error {}

export function createBackup(content: BackupContent, now: Date): Backup {
    return {
        app: BACKUP_APP,
        version: BACKUP_VERSION,
        exportedAt: now.toISOString(),
        nextTechnicianId: content.nextTechnicianId,
        technicians: [...content.technicians],
        settings: content.settings,
        boards: content.boards,
    };
}

/**
 * Reads a backup file's text. Each piece is checked on its own (lib/stored.ts), so a file edited by hand still restores
 * whatever is valid.
 *
 * @throws BackupError when the file is not a backup, or was made by a newer version of the app
 */
export function readBackup(text: string): Backup {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch (error) {
        throw new BackupError('That file is not a Zone Assignment backup: it is not a JSON file.', { cause: error });
    }

    const result = backupFileSchema.safeParse(parsed);
    if (!result.success) {
        throw new BackupError('That file is not a Zone Assignment backup.');
    }

    const file = result.data;
    if (file.version > BACKUP_VERSION) {
        throw new BackupError(
            'That backup was made by a newer version of Zone Assignment. Reload this page to get the latest version, then try again.'
        );
    }

    const roster = readRoster(file);

    return {
        app: BACKUP_APP,
        version: BACKUP_VERSION,
        exportedAt: file.exportedAt,
        nextTechnicianId: roster.nextTechnicianId,
        technicians: roster.technicians,
        settings: readSettings(file.settings),
        boards: readSavedBoards(file.boards),
    };
}

export function nameBackupFile(isoDate: string): string {
    return `zone-assignment-backup-${isIsoDate(isoDate) ? isoDate : 'undated'}.json`;
}
