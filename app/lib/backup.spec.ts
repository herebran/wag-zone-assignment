import { describe, expect, it } from 'vitest';
import { BACKUP_VERSION, nameBackupFile, BackupError, createBackup, readBackup } from '@/lib/backup';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { createSampleBoard, SAMPLE_BOARD_DATE, SAMPLE_TECHNICIANS } from '@/testing/sampleBoard';

const CONTENT = {
    nextTechnicianId: 4,
    technicians: SAMPLE_TECHNICIANS,
    settings: { ...DEFAULT_SETTINGS, hiddenZones: ['red'] as const },
    boards: { [SAMPLE_BOARD_DATE]: { updatedAt: '2026-11-12T20:05:00.000Z', board: createSampleBoard() } },
};

describe('backup', () => {
    it('reads back everything a backup was made of', () => {
        const backup = createBackup(CONTENT, new Date('2026-11-12T21:00:00.000Z'));
        const restored = readBackup(JSON.stringify(backup));

        expect(restored).toEqual(backup);
        expect(restored).toMatchObject({ app: 'zone-assignment', version: 2, exportedAt: '2026-11-12T21:00:00.000Z' });
        expect(restored.technicians).toEqual(SAMPLE_TECHNICIANS);
        expect(restored.boards[SAMPLE_BOARD_DATE].board).toEqual(createSampleBoard());
    });

    it('refuses a file that is not JSON, or not a backup', () => {
        expect(() => readBackup('PRIORITY ZONE ASSIGNMENT')).toThrow(BackupError);
        expect(() => readBackup('PRIORITY ZONE ASSIGNMENT')).toThrow('it is not a JSON file');
        expect(() => readBackup('[1, 2, 3]')).toThrow('That file is not a Zone Assignment backup.');
        expect(() => readBackup('{"technicians": []}')).toThrow('That file is not a Zone Assignment backup.');
    });

    it('refuses a backup made by a later version, which may hold what this one cannot read', () => {
        const backup = { ...createBackup(CONTENT, new Date()), version: BACKUP_VERSION + 1 };

        expect(() => readBackup(JSON.stringify(backup))).toThrow('newer version');
    });

    it('restores what still fits of a backup edited by hand, or made by an earlier version', () => {
        const restored = readBackup(
            JSON.stringify({
                app: 'zone-assignment',
                version: 1,
                technicians: [
                    { id: 3, firstName: 'Maria', lastName: 'Garcia' },
                    { firstName: 'No', lastName: 'Id' },
                ],
                boards: { 'next week': {}, '2026-11-12': { board: {} } },
            })
        );

        expect(restored.technicians.map((technician) => technician.id)).toEqual([3]);
        expect(restored.nextTechnicianId).toBe(4);
        expect(restored.settings).toEqual(DEFAULT_SETTINGS);
        expect(Object.keys(restored.boards)).toEqual(['2026-11-12']);
        expect(restored.exportedAt).toBe('');
    });

    it('names the file after the day it was made', () => {
        expect(nameBackupFile('2026-11-12')).toBe('zone-assignment-backup-2026-11-12.json');
        expect(nameBackupFile('../today')).toBe('zone-assignment-backup-undated.json');
    });
});
