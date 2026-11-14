import { describe, expect, it } from 'vitest';
import { createBlankBoard } from '@/lib/board';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { readBoard, readRoster, readSavedBoard, readSavedBoards, readSettings } from '@/lib/stored';
import { createSampleBoard, SAMPLE_TECHNICIANS } from '@/testing/sampleBoard';

/** A value as it comes back out of storage. */
function passThroughJson(value: unknown): unknown {
    return JSON.parse(JSON.stringify(value));
}

describe('stored', () => {
    it('reads a board back as it was saved', () => {
        const board = createSampleBoard();

        expect(readBoard(passThroughJson(board))).toEqual(board);
    });

    it('gives the blank board for anything that is no board', () => {
        const blank = createBlankBoard();

        expect(readBoard(undefined)).toEqual(blank);
        expect(readBoard('board')).toEqual(blank);
        expect(readBoard([1, 2])).toEqual(blank);
        expect(readBoard({ timeSlots: [], notes: 'none' })).toEqual(blank);
    });

    it('keeps what fits of a board and fills in the rest', () => {
        const board = readBoard({
            timeSlots: [
                { startTime: '08:00', endTime: 'late', assignments: { outWindow: [1, 1, '2', 2.5, 3], attic: [4] } },
                null,
            ],
            phlomometer: { F1: { under: 5, above: '15' } },
            ic3Calls: { FILL: { amount: '40', technicianIds: 'everyone' } },
            notes: [{ what: 'Inventory', isFixed: 'yes', technicianIds: [2] }],
        });

        expect(board.timeSlots).toHaveLength(2);
        expect(board.timeSlots[0]).toMatchObject({ startTime: '08:00', endTime: '' });
        expect(board.timeSlots[0].assignments.outWindow).toEqual([1, 3]);
        expect(board.timeSlots[0].assignments).not.toHaveProperty('attic');
        expect(board.timeSlots[1]).toEqual(createBlankBoard().timeSlots[0]);
        expect(board.phlomometer.F1).toEqual({ under: '', above: '15' });
        expect(board.phlomometer.REV).toEqual({ under: '', above: '' });
        expect(board.ic3Calls.FILL).toEqual({ amount: '40', technicianIds: [] });
        expect(board.notes).toEqual([{ what: 'Inventory', isFixed: false, when: '', technicianIds: [2] }]);
    });

    it('reads a saved board with the moment of its last change, and none where there is none', () => {
        const savedBoard = { updatedAt: '2026-11-12T20:05:00.000Z', board: createSampleBoard() };

        expect(readSavedBoard(passThroughJson(savedBoard))).toEqual(savedBoard);
        expect(readSavedBoard(undefined)).toBeNull();
        expect(readSavedBoard({ updatedAt: '2026-11-12T20:05:00.000Z' })).toBeNull();
    });

    it('reads the boards of a backup by their day, leaving out what is not filed under a date', () => {
        const savedBoard = { updatedAt: '', board: createBlankBoard() };
        const boards = readSavedBoards({
            '2026-11-12': savedBoard,
            '2026-02-30': savedBoard,
            yesterday: savedBoard,
            '2026-11-13': 'a board',
        });

        expect(Object.keys(boards)).toEqual(['2026-11-12']);
    });

    it('reads the roster back as it was saved', () => {
        const roster = { nextTechnicianId: 12, technicians: [...SAMPLE_TECHNICIANS] };

        expect(readRoster(passThroughJson(roster))).toEqual(roster);
        expect(readRoster(undefined)).toEqual({ nextTechnicianId: 1, technicians: [] });
    });

    it('leaves out a technician without an id or a name, and never hands out an id in use', () => {
        const roster = readRoster({
            nextTechnicianId: 2,
            technicians: [
                { id: 5, firstName: ' Jane ', lastName: 'Doe', role: '' },
                { id: 5, firstName: 'Twin', lastName: 'Doe' },
                { id: 6, firstName: '', lastName: 'Nameless' },
                { firstName: 'No', lastName: 'Id' },
                'someone',
            ],
        });

        expect(roster.technicians).toEqual([
            { id: 5, firstName: 'Jane', lastName: 'Doe', abbreviation: '', role: 'Tech', createdAt: '' },
        ]);
        expect(roster.nextTechnicianId).toBe(6);
    });

    it('reads the settings back as they were saved, and the defaults where there are none', () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            closeTime: '24:00',
            clockFormat: '24-hour',
            timeStepMinutes: 60,
            nameStyle: 'firstLast',
            hasNotes: false,
            hiddenZones: ['red', 'cpwLead'],
            exportStyle: 'pdf',
            hasShortPdfTimes: false,
        };

        expect(readSettings(passThroughJson(settings))).toEqual(settings);
        expect(readSettings(undefined)).toEqual(DEFAULT_SETTINGS);

        // The export once had a grid style. A pharmacy that still has it saved gets the list.
        expect(readSettings({ exportStyle: 'grid' })).toEqual(DEFAULT_SETTINGS);
    });

    it('takes the default for a setting that is not one of its choices', () => {
        const settings = readSettings({
            openTime: '7 AM',
            timeStepMinutes: 20,
            nameStyle: 'nickname',
            hasPhlomometer: 'no',
            hiddenZones: ['yellow', 'attic', 'purple'],
        });

        expect(settings).toEqual({ ...DEFAULT_SETTINGS, hiddenZones: ['purple', 'yellow'] });
    });
});
