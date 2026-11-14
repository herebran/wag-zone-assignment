import { describe, expect, it } from 'vitest';
import { addTimeSlot, assignTechnician, createBlankBoard, createNote, setNoteText } from '@/lib/board';
import { listLeftOut, listSheetTexts, type SheetBox, type SheetSource, type SheetText } from '@/lib/originalSheet';
import type { Board, Settings } from '@/lib/records';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { ZONES } from '@/lib/zones';
import { createSampleBoard, SAMPLE_BOARD_DATE, SAMPLE_TECHNICIANS } from '@/testing/sampleBoard';

/**
 * A part of the page as its own drawing instructions have it: its left, bottom, right and top edges, in points.
 */
type PageArea = readonly [left: number, bottom: number, right: number, top: number];

const PAGE: PageArea = [0, 0, 540, 720];

// The cells the tests check, measured on the page.
const TIME_SLOT_1: PageArea = [31.85, 536.43, 80.79, 566.09];
const OUT_WINDOW_SLOT_1: PageArea = [80.79, 536.43, 135.43, 566.09];
const CPW_LEAD_SLOT_1: PageArea = [452.76, 536.43, 505.6, 566.09];
const RED_ZONE_SLOT_4: PageArea = [346.98, 447.46, 399.87, 477.12];
const F1_COUNTS: PageArea = [74.36, 246.21, 143.4, 297.18];
const F1_CALL_AMOUNT: PageArea = [89.36, 98.48, 123.5, 133.33];
const F1_CALL_WHO: PageArea = [123.5, 98.48, 191.8, 133.33];
const TPR_WHEN: PageArea = [363.03, 154.74, 437.3, 177.56];
const TPR_WHO: PageArea = [437.3, 154.74, 505.6, 177.56];
const OWN_NOTE_WHAT: PageArea = [279.9, 17.77, 363.03, 40.59];

function createSource(settings: Partial<Settings> = {}, board: Board = createSampleBoard()): SheetSource {
    return {
        board,
        boardDate: SAMPLE_BOARD_DATE,
        technicians: SAMPLE_TECHNICIANS,
        settings: { ...DEFAULT_SETTINGS, ...settings },
    };
}

/**
 * The texts in the order they are written, with no-break spaces turned into normal spaces.
 */
function readTexts(source: SheetSource): string[] {
    return listSheetTexts(source).map((sheetText) => sheetText.text.replaceAll('\u00A0', ' '));
}

/**
 * The first text that reads a certain way.
 */
function findText(texts: readonly SheetText[], text: string): SheetText {
    return texts.find((sheetText) => sheetText.text.replaceAll('\u00A0', ' ') === text)!;
}

function isInside({ left, bottom, width, height }: SheetBox, [areaLeft, areaBottom, areaRight, areaTop]: PageArea) {
    return left >= areaLeft && bottom >= areaBottom && left + width <= areaRight && bottom + height <= areaTop;
}

function isOverlapping(a: SheetBox, b: SheetBox): boolean {
    const isBeside = a.left + a.width <= b.left || b.left + b.width <= a.left;
    const isOverOrUnder = a.bottom + a.height <= b.bottom || b.bottom + b.height <= a.bottom;

    return !isBeside && !isOverOrUnder;
}

/**
 * A board with something in every box of the page.
 */
function createFullBoard(): Board {
    const blank = createBlankBoard();

    return {
        timeSlots: blank.timeSlots.map((slot) => ({
            startTime: '08:00',
            endTime: '09:00',
            assignments: { ...slot.assignments, ...Object.fromEntries(ZONES.map((zone) => [zone.key, [1]])) },
        })),
        phlomometer: {
            F1: { under: '1', above: '2' },
            F4: { under: '3', above: '4' },
            FILL: { under: '5', above: '6' },
            REV: { under: '7', above: '8' },
        },
        ic3Calls: { F1: { amount: '20', technicianIds: [1] }, FILL: { amount: '40', technicianIds: [2] } },
        notes: blank.notes.map((note) => ({
            ...note,
            what: note.what || 'Inventory',
            when: 'noon',
            technicianIds: [3],
        })),
    };
}

describe('originalSheet', () => {
    it('writes the day, each time slot with who works its stations, and the sections under the grid', () => {
        expect(readTexts(createSource())).toEqual([
            'Thu, Nov 12, 2026',
            '8 AM - 9 AM',
            'JD, Sam L.',
            'MGL',
            '(removed)',
            'JD',
            'Sam L.',
            '9 AM - ?',
            'MGL',
            'JD',
            '10 PM - 12 AM',
            'Sam L.',
            '5',
            '15',
            '10',
            '3',
            '20',
            'JD, MGL',
            'by noon',
            'Sam L.',
            'JD, (removed)',
            'Order supplies for the week ahead',
        ]);
    });

    it('writes each text in its own box of the page', () => {
        const texts = listSheetTexts(createSource());

        // The date goes after the page's "Date:" label, which ends 71 points in, and above the title.
        expect(findText(texts, 'Thu, Nov 12, 2026').box).toMatchObject({ left: 77 });
        expect(isInside(findText(texts, 'Thu, Nov 12, 2026').box, [71, 670, 540, 710])).toBe(true);

        expect(isInside(findText(texts, '8 AM - 9 AM').box, TIME_SLOT_1)).toBe(true);
        expect(isInside(findText(texts, 'JD, Sam L.').box, OUT_WINDOW_SLOT_1)).toBe(true);
        expect(isInside(findText(texts, 'Sam L.').box, CPW_LEAD_SLOT_1)).toBe(true);
        expect(isInside(texts[11].box, RED_ZONE_SLOT_4)).toBe(true);
        expect(isInside(findText(texts, '20').box, F1_CALL_AMOUNT)).toBe(true);
        expect(isInside(findText(texts, 'JD, MGL').box, F1_CALL_WHO)).toBe(true);
        expect(isInside(findText(texts, 'by noon').box, TPR_WHEN)).toBe(true);
        expect(isInside(texts[19].box, TPR_WHO)).toBe(true);
        expect(isInside(findText(texts, 'Order supplies for the week ahead').box, OWN_NOTE_WHAT)).toBe(true);
    });

    it('writes what fills a box in the middle of it, at the size of its table', () => {
        const texts = listSheetTexts(createSource());

        // A station of the zone grid, then the amount and the who of a call for IC3, then a note's when and who.
        expect(findText(texts, 'MGL')).toMatchObject({ alignment: 'center', fontSize: 18 });
        expect(findText(texts, '20')).toMatchObject({ alignment: 'center', fontSize: 16 });
        expect(findText(texts, 'JD, MGL')).toMatchObject({ alignment: 'center', fontSize: 16 });
        expect(findText(texts, 'by noon')).toMatchObject({ alignment: 'center', fontSize: 16 });
        expect(texts[19]).toMatchObject({ alignment: 'center', fontSize: 16 });

        // The date follows its label, and the pharmacy's own note starts where the printed ones do.
        expect(findText(texts, 'Thu, Nov 12, 2026')).toMatchObject({ alignment: 'left', fontSize: 16 });
        expect(findText(texts, 'Order supplies for the week ahead')).toMatchObject({ alignment: 'left', fontSize: 12 });
    });

    it("writes a Phlomometer queue's two counts on either side of its stroke, the one to stay under higher up", () => {
        const texts = listSheetTexts(createSource());
        const under = findText(texts, '5');
        const above = findText(texts, '15');

        expect(isInside(under.box, F1_COUNTS)).toBe(true);
        expect(isInside(above.box, F1_COUNTS)).toBe(true);
        expect(under).toMatchObject({ alignment: 'right', fontSize: 16 });
        expect(above).toMatchObject({ alignment: 'left', fontSize: 16 });
        expect(under.box.left).toBeLessThan(above.box.left);
        expect(under.box.bottom).toBeGreaterThanOrEqual(above.box.bottom + above.box.height);
    });

    it('keeps every box on the page, and clear of every other', () => {
        const texts = listSheetTexts(createSource({}, createFullBoard()));

        // The date, 8 time slots of 9 cells, 8 counts, 2 calls of 2 cells, 10 notes of 2 cells and one of 3.
        expect(texts).toHaveLength(1 + 8 * 9 + 8 + 2 * 2 + 10 * 2 + 3);
        for (const [index, sheetText] of texts.entries()) {
            expect(isInside(sheetText.box, PAGE)).toBe(true);
            expect(sheetText.box.width).toBeGreaterThan(0);
            expect(sheetText.box.height).toBeGreaterThan(0);
            expect(texts.slice(index + 1).filter((other) => isOverlapping(sheetText.box, other.box))).toEqual([]);
        }
    });

    it('keeps a time and a name whole on their line, and the dash with the first of two times', () => {
        const texts = listSheetTexts(createSource()).map((sheetText) => sheetText.text);

        // A line may only end at the space after the dash, or at the space between two names.
        expect(texts[1]).toBe('8\u00A0AM\u00A0- 9\u00A0AM');
        expect(texts[2]).toBe('JD, Sam\u00A0L.');
    });

    it('writes the times on the hour short, a time off the hour whole, and all of them whole when told to', () => {
        const sample = createSampleBoard();
        const timeSlots = sample.timeSlots.map((slot, index) => (index === 1 ? { ...slot, endTime: '10:30' } : slot));
        const board = { ...sample, timeSlots };

        expect(readTexts(createSource({}, board))).toEqual(
            expect.arrayContaining(['8 AM - 9 AM', '9 AM - 10:30 AM', '10 PM - 12 AM'])
        );
        expect(readTexts(createSource({ hasShortPdfTimes: false }, board))).toEqual(
            expect.arrayContaining(['8:00 AM - 9:00 AM', '9:00 AM - 10:30 AM', '10:00 PM - 12:00 AM'])
        );
    });

    it("writes the technicians by abbreviation, whatever the board's cells show", () => {
        expect(readTexts(createSource({ nameStyle: 'firstLast' }))).toContain('JD, Sam L.');
        expect(readTexts(createSource({ nameStyle: 'lastFirst' }))).not.toContain('Doe, Jane');
    });

    it('leaves the zones and the sections turned off as the page prints them, and writes the 24-hour clock whole', () => {
        const source = createSource({
            clockFormat: '24-hour',
            hiddenZones: ['purple', 'cpwLead'],
            hasPhlomometer: false,
            hasNotes: false,
        });

        expect(readTexts(source)).toEqual([
            'Thu, Nov 12, 2026',
            '08:00 - 09:00',
            'JD, Sam L.',
            'MGL',
            '(removed)',
            '09:00 - ?',
            'MGL',
            'JD',
            '22:00 - 24:00',
            'Sam L.',
            '20',
            'JD, MGL',
        ]);
        expect(readTexts(createSource({ hasIc3Calls: false }))).not.toContain('20');
    });

    it("finds each printed row's note wherever the board has it, and gives its last row to the pharmacy's own", () => {
        const sample = createSampleBoard();
        const board = { ...sample, notes: [createNote(), ...sample.notes].reverse() };
        const texts = listSheetTexts(createSource({}, board));

        expect(isInside(findText(texts, 'by noon').box, TPR_WHEN)).toBe(true);

        // Of the pharmacy's own notes, the first one with something in it is written. Here that is the one with only a
        // when.
        expect(texts.at(-1)).toMatchObject({ text: 'after lunch' });
        expect(texts.at(-1)!.box.bottom).toBeLessThan(OWN_NOTE_WHAT[3]);
        expect(readTexts(createSource({}, board))).not.toContain('Order supplies for the week ahead');
    });

    it('says which time slots and how many notes the page had no room for', () => {
        let board = createSampleBoard();
        expect(listLeftOut(createSource({}, board))).toEqual({ timeSlotNumbers: [], noteCount: 1 });

        // Four more slots: one left empty, one with a time, one with someone assigned, and one with someone in a zone
        // that is turned off.
        for (let slotNumber = 9; slotNumber <= 12; slotNumber++) {
            board = addTimeSlot(board);
        }
        board = {
            ...board,
            timeSlots: board.timeSlots.map((slot, index) => (index === 9 ? { ...slot, endTime: '12:00' } : slot)),
        };
        board = assignTechnician(board, { kind: 'zone', slotIndex: 10, zone: 'fill1' }, 1);
        board = assignTechnician(board, { kind: 'zone', slotIndex: 11, zone: 'red' }, 2);
        board = setNoteText(board, 12, 'what', 'Inventory');

        expect(listLeftOut(createSource({ hiddenZones: ['red'] }, board))).toEqual({
            timeSlotNumbers: [10, 11],
            noteCount: 2,
        });
        expect(listLeftOut(createSource({ hasNotes: false }, board))).toEqual({
            timeSlotNumbers: [10, 11, 12],
            noteCount: 0,
        });
        expect(listLeftOut(createSource({}, createBlankBoard()))).toEqual({ timeSlotNumbers: [], noteCount: 0 });
    });
});
