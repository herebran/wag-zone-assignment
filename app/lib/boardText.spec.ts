import { describe, expect, it } from 'vitest';
import { createBlankBoard, createNote } from '@/lib/board';
import { formatBoardText, type BoardTextSource } from '@/lib/boardText';
import type { Settings } from '@/lib/records';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { createSampleBoard, SAMPLE_BOARD_DATE, SAMPLE_TECHNICIANS } from '@/testing/sampleBoard';

function createSource(settings: Partial<Settings> = {}): BoardTextSource {
    return {
        board: createSampleBoard(),
        boardDate: SAMPLE_BOARD_DATE,
        technicians: SAMPLE_TECHNICIANS,
        settings: { ...DEFAULT_SETTINGS, ...settings },
        now: new Date(2026, 10, 12, 14, 5, 9),
    };
}

// Each text must match its saved file exactly. Text pasted into another board must not shift by even a space.
describe('boardText', () => {
    it('writes the board as a list, a time slot after another, with whole names', async () => {
        const text = formatBoardText(createSource());

        await expect(`${text}\n`).toMatchFileSnapshot('./__snapshots__/boardText.list.txt');
    });

    it('leaves out the zones and the sections turned off, and reads the times on the 24-hour clock', async () => {
        const source = createSource({ clockFormat: '24-hour', hiddenZones: ['red', 'yellow'], hasPhlomometer: false });

        await expect(`${formatBoardText(source)}\n`).toMatchFileSnapshot('./__snapshots__/boardText.list-24-hour.txt');
    });

    it('says so when a board has no assignments and no notes', async () => {
        const board = { ...createBlankBoard(), notes: [createNote()] };
        const source = { ...createSource(), board };

        await expect(`${formatBoardText(source)}\n`).toMatchFileSnapshot('./__snapshots__/boardText.list-blank.txt');
    });

    it('states the moment it was made in plain characters', () => {
        const morning = { ...createSource(), now: new Date(2026, 0, 2, 0, 30, 0) };

        expect(formatBoardText(morning).split('\n').at(-1)).toBe('Generated 1/2/2026, 12:30:00 AM');
    });
});
