/**
 * The original sheet: Walgreens's own Priority Zone Assignment page, which pharmacies print and fill in by hand
 * (assets/original-sheet.pdf). This file knows where the page's boxes are and which text goes in each. boardPdf.ts
 * writes those texts into the PDF.
 *
 * The page has room for eight time slots, its ten printed notes and one extra note. listLeftOut says what did not fit.
 *
 * All measurements are in points (1/72 inch) from the page's bottom left corner, read from the page's own drawing
 * instructions.
 */
import { hasNoteContent, IC3_QUEUES, PHLOMOMETER_QUEUES, STANDARD_NOTES } from '@/lib/board';
import { formatBoardDate } from '@/lib/dates';
import { findTechnician, formatBoardName } from '@/lib/names';
import type { Board, Ic3Queue, Note, PhlomometerQueue, Settings, Technician, TimeSlot } from '@/lib/records';
import { formatTimeRange } from '@/lib/times';
import { listVisibleZones, ZONES, type Zone } from '@/lib/zones';

/** How many time slots the page has rows for, and how many rows it has for the pharmacy's own notes. */
const SHEET_TIME_SLOT_COUNT = 8;
const SHEET_OWN_NOTE_COUNT = 1;

export interface SheetBox {
    left: number;
    bottom: number;
    width: number;
    height: number;
}

/**
 * Where a text sits in its box from side to side. From top to bottom it is always centred.
 */
export type SheetAlignment = 'left' | 'center' | 'right';

export interface SheetText {
    /** What to write. A line break starts a new line, and a no-break space keeps two words together. */
    text: string;
    box: SheetBox;
    alignment: SheetAlignment;

    /** The font size in points when the text fits its box. A longer text is written smaller. */
    fontSize: number;
}

export interface SheetSource {
    board: Board;
    boardDate: string;
    technicians: readonly Technician[];
    settings: Settings;
}

/**
 * What is on a board but does not fit on the page.
 */
export interface LeftOut {
    /** The numbers of the time slots past the page's last row that have something in them, counting from 1. */
    timeSlotNumbers: number[];

    /** How many of the pharmacy's own notes did not fit. */
    noteCount: number;
}

/**
 * The font sizes when the text fits, in points. Each table has one size, picked so its usual short texts ("JD", "150",
 * "by noon") fit a cell with room to spare. Longer texts come out smaller. For comparison, the page's own labels are 12
 * points.
 */
const DATE_FONT_SIZE = 16;
const TIME_FONT_SIZE = 11;
const STATION_FONT_SIZE = 18;
const SECTION_FONT_SIZE = 16;
const OWN_NOTE_FONT_SIZE = 12;

/** A space that keeps the words on both sides of it on the same line. */
const NO_BREAK_SPACE = '\u00A0';

/**
 * The room kept between a text and the edges of its cell: above and below, then at the sides. The narrow cells (the
 * zone grid, the IC3 amount) keep less at the sides than the wide ones.
 */
const END_PADDING = 2;
const NARROW_SIDE_PADDING = 3;
const SIDE_PADDING = 5;

/** How far into its cell one of the pharmacy's own notes starts. It lines up with the page's printed notes. */
const NOTE_LABEL_INDENT = 7.2;

/**
 * The box for the date, after the page's "Date:" label. It is placed so the date sits on the same line as the label.
 */
const DATE_BOX: SheetBox = { left: 77, bottom: 683.72, width: 424, height: 20 };

/**
 * The zone grid. First the left edge of each column (the Time Slot column, then each station in the sheet's order, see
 * lib/zones.ts), ending with the grid's right edge. Then the top of the first row, and the height of a row.
 */
const GRID_COLUMN_EDGES: readonly number[] = [
    31.85, 80.79, 135.43, 188.32, 241.2, 294.09, 346.98, 399.87, 452.76, 505.6,
];
const GRID_TOP = 566.09;
const GRID_ROW_HEIGHT = 29.6575;

/**
 * A Phlomometer cell, and the middle of the red stroke (the slash) the page draws between its two counts.
 */
interface PhlomometerCell {
    left: number;
    right: number;
    strokeX: number;
    strokeY: number;
}

// queue: the cell's left and right edges, then the middle of its stroke
const PHLOMOMETER_CELLS: Readonly<Record<PhlomometerQueue, PhlomometerCell>> = {
    F1: { left: 74.36, right: 143.4, strokeX: 107.27, strokeY: 272.3 },
    F4: { left: 183.99, right: 260.1, strokeX: 219.23, strokeY: 270.63 },
    FILL: { left: 74.36, right: 143.4, strokeX: 107.27, strokeY: 220.83 },
    REV: { left: 183.99, right: 260.1, strokeX: 219.23, strokeY: 220.83 },
};

/**
 * How a count sits next to its stroke: its line height, the room kept from the cell's edge, the gap between the count
 * and the middle of the stroke, and how far past that middle the count may reach sideways. The stroke leans right, so a
 * count can reach past its middle without touching it.
 */
const PHLOMOMETER_LINE_HEIGHT = 19;
const PHLOMOMETER_SIDE_PADDING = 3;
const PHLOMOMETER_STROKE_GAP = 1;
const PHLOMOMETER_STROKE_REACH = 1;

/**
 * The calls for IC3. First the amount box after each queue's label ("F1 >") and the "Who:" box beside it, each as a
 * left edge and a width. Then the bottom of each queue's row, and the height of a row.
 */
const IC3_AMOUNT_COLUMN = { left: 89.36, width: 34.14 };
const IC3_WHO_COLUMN = { left: 123.5, width: 68.3 };
const IC3_ROW_BOTTOMS: Readonly<Record<Ic3Queue, number>> = { F1: 98.48, FILL: 63.64 };
const IC3_ROW_HEIGHT = 34.85;

/**
 * The notes. First each column as a left edge and a width, then the row edges from the top down. The rows are the ten
 * printed notes in the sheet's order (the first is two lines tall), then one row for the pharmacy's own note.
 */
const NOTE_COLUMNS = {
    what: { left: 279.9, width: 83.13 },
    when: { left: 363.03, width: 74.27 },
    who: { left: 437.3, width: 68.3 },
};
const NOTE_ROW_EDGES: readonly number[] = [
    278.58, 246.05, 223.22, 200.39, 177.56, 154.74, 131.91, 109.08, 86.25, 63.42, 40.59, 17.77,
];

/**
 * Everything the board writes on the page, each text with its box. Empty texts are left out. So are the zones and
 * sections that are turned off, and their boxes stay as the page prints them.
 */
export function listSheetTexts(source: SheetSource): SheetText[] {
    const { settings } = source;
    const texts: SheetText[] = [
        { text: formatBoardDate(source.boardDate), box: DATE_BOX, alignment: 'left', fontSize: DATE_FONT_SIZE },
        ...listGridTexts(source),
    ];

    if (settings.hasPhlomometer) {
        texts.push(...listPhlomometerTexts(source.board));
    }
    if (settings.hasIc3Calls) {
        texts.push(...listIc3Texts(source));
    }
    if (settings.hasNotes) {
        texts.push(...listNoteTexts(source));
    }

    return texts.filter((sheetText) => sheetText.text !== '');
}

/**
 * What is on the board but does not fit on the page: time slots past the eighth row, and the pharmacy's own notes past
 * the one row the page has for them.
 */
export function listLeftOut({ board, settings }: SheetSource): LeftOut {
    const zones = listVisibleZones(settings.hiddenZones);
    const timeSlotNumbers = board.timeSlots
        .map((slot, slotIndex) => ({ slot, slotNumber: slotIndex + 1 }))
        .filter(({ slot, slotNumber }) => slotNumber > SHEET_TIME_SLOT_COUNT && hasSlotContent(slot, zones))
        .map(({ slotNumber }) => slotNumber);
    const ownNoteCount = settings.hasNotes ? sortNotes(board.notes).ownNotes.length : 0;

    return { timeSlotNumbers, noteCount: Math.max(0, ownNoteCount - SHEET_OWN_NOTE_COUNT) };
}

/**
 * The zone grid: each time slot's times, and who works each station.
 */
function listGridTexts({ board, technicians, settings }: SheetSource): SheetText[] {
    const zones = listVisibleZones(settings.hiddenZones);
    const texts: SheetText[] = [];

    board.timeSlots.slice(0, SHEET_TIME_SLOT_COUNT).forEach((slot, rowIndex) => {
        texts.push({
            text: formatSheetTimes(slot, settings),
            box: findGridCell(rowIndex, 0),
            alignment: 'center',
            fontSize: TIME_FONT_SIZE,
        });

        for (const zone of zones) {
            texts.push({
                text: formatSheetNames(slot.assignments[zone.key], technicians),
                box: findGridCell(rowIndex, ZONES.indexOf(zone) + 1),
                alignment: 'center',
                fontSize: STATION_FONT_SIZE,
            });
        }
    });

    return texts;
}

/**
 * The Phlomometer's counts. The page draws a stroke between a queue's two counts, leaning right. The "under" count goes
 * above its left end and the "above" count below its right end, the way a fraction is written by hand.
 */
function listPhlomometerTexts(board: Board): SheetText[] {
    return PHLOMOMETER_QUEUES.flatMap((queue) => {
        const cell = PHLOMOMETER_CELLS[queue];
        const underLeft = cell.left + PHLOMOMETER_SIDE_PADDING;
        const aboveLeft = cell.strokeX - PHLOMOMETER_STROKE_REACH;
        const underBox: SheetBox = {
            left: underLeft,
            bottom: cell.strokeY + PHLOMOMETER_STROKE_GAP,
            width: cell.strokeX + PHLOMOMETER_STROKE_REACH - underLeft,
            height: PHLOMOMETER_LINE_HEIGHT,
        };
        const aboveBox: SheetBox = {
            left: aboveLeft,
            bottom: cell.strokeY - PHLOMOMETER_STROKE_GAP - PHLOMOMETER_LINE_HEIGHT,
            width: cell.right - PHLOMOMETER_SIDE_PADDING - aboveLeft,
            height: PHLOMOMETER_LINE_HEIGHT,
        };
        const threshold = board.phlomometer[queue];

        return [
            { text: threshold.under.trim(), box: underBox, alignment: 'right', fontSize: SECTION_FONT_SIZE },
            { text: threshold.above.trim(), box: aboveBox, alignment: 'left', fontSize: SECTION_FONT_SIZE },
        ] satisfies SheetText[];
    });
}

/**
 * The calls for IC3: each queue's amount after its label, and who makes the call.
 */
function listIc3Texts({ board, technicians }: SheetSource): SheetText[] {
    return IC3_QUEUES.flatMap((queue) => {
        const call = board.ic3Calls[queue];
        const row = { bottom: IC3_ROW_BOTTOMS[queue], height: IC3_ROW_HEIGHT };

        return [
            {
                text: call.amount.trim(),
                box: padBox({ ...IC3_AMOUNT_COLUMN, ...row }, NARROW_SIDE_PADDING),
                alignment: 'center',
                fontSize: SECTION_FONT_SIZE,
            },
            {
                text: formatSheetNames(call.technicianIds, technicians),
                box: padBox({ ...IC3_WHO_COLUMN, ...row }, SIDE_PADDING),
                alignment: 'center',
                fontSize: SECTION_FONT_SIZE,
            },
        ] satisfies SheetText[];
    });
}

/**
 * The notes: the "when" and "who" of each printed row, then the pharmacy's own notes in the rows left for them, with
 * their "what".
 */
function listNoteTexts({ board, technicians }: SheetSource): SheetText[] {
    const { printedNotes, ownNotes } = sortNotes(board.notes);
    const texts: SheetText[] = [];

    const addNote = (note: Note, rowIndex: number) => {
        texts.push(
            {
                text: note.when.trim(),
                box: findNoteCell('when', rowIndex),
                alignment: 'center',
                fontSize: SECTION_FONT_SIZE,
            },
            {
                text: formatSheetNames(note.technicianIds, technicians),
                box: findNoteCell('who', rowIndex),
                alignment: 'center',
                fontSize: SECTION_FONT_SIZE,
            }
        );
    };

    printedNotes.forEach((note, rowIndex) => {
        if (note) {
            addNote(note, rowIndex);
        }
    });
    ownNotes.slice(0, SHEET_OWN_NOTE_COUNT).forEach((note, ownIndex) => {
        const rowIndex = STANDARD_NOTES.length + ownIndex;
        const cell = findNoteCell('what', rowIndex);
        const indent = NOTE_LABEL_INDENT - SIDE_PADDING;

        texts.push({
            text: note.what.trim(),
            box: { ...cell, left: cell.left + indent, width: cell.width - indent },
            alignment: 'left',
            fontSize: OWN_NOTE_FONT_SIZE,
        });
        addNote(note, rowIndex);
    });

    return texts;
}

/**
 * Splits a board's notes for the page: the note for each printed row, in the page's order (undefined when the board has
 * none), and the pharmacy's own notes that have something in them. A note counts as a printed row's when it is the
 * first one marked as printed with that row's name.
 */
function sortNotes(notes: readonly Note[]): { printedNotes: (Note | undefined)[]; ownNotes: Note[] } {
    const printedNotes = STANDARD_NOTES.map((what) => notes.find((note) => note.isFixed && note.what === what));
    const ownNotes = notes.filter((note) => !printedNotes.includes(note) && hasNoteContent(note));

    return { printedNotes, ownNotes };
}

/**
 * Whether a time slot has anything to write: a time, or someone at a station that is turned on.
 */
function hasSlotContent(slot: TimeSlot, zones: readonly Zone[]): boolean {
    return slot.startTime !== '' || slot.endTime !== '' || zones.some((zone) => slot.assignments[zone.key].length > 0);
}

/**
 * A time slot's times as the page writes them, like "8 AM - 10 AM". Times on the hour are short when the settings say
 * so. The column is narrow, so they usually take two lines, "8 AM -" over "10 AM". Each time stays whole, and the dash
 * stays with the first one.
 */
function formatSheetTimes(slot: TimeSlot, settings: Settings): string {
    const times = formatTimeRange(slot.startTime, slot.endTime, settings.clockFormat, settings.hasShortPdfTimes);

    // Only the space after the dash may end a line.
    return keepTogether(times).replace(`-${NO_BREAK_SPACE}`, '- ');
}

/**
 * The given technicians as the page writes them: by abbreviation, separated by commas, each kept whole on its line.
 */
function formatSheetNames(technicianIds: readonly number[], technicians: readonly Technician[]): string {
    return technicianIds
        .map((id) => keepTogether(formatBoardName(findTechnician(technicians, id), 'abbreviation')))
        .join(', ');
}

/**
 * Keeps a text's words on one line: "Sam L." is never split after "Sam", nor "9 AM" after "9".
 */
function keepTogether(text: string): string {
    return text.replaceAll(' ', NO_BREAK_SPACE);
}

/**
 * The inside of a cell of the zone grid.
 *
 * @param rowIndex the time slot, counting from 0
 * @param columnIndex 0 for the Time Slot column, then the stations in the sheet's order
 */
function findGridCell(rowIndex: number, columnIndex: number): SheetBox {
    const cell: SheetBox = {
        left: GRID_COLUMN_EDGES[columnIndex],
        bottom: GRID_TOP - (rowIndex + 1) * GRID_ROW_HEIGHT,
        width: GRID_COLUMN_EDGES[columnIndex + 1] - GRID_COLUMN_EDGES[columnIndex],
        height: GRID_ROW_HEIGHT,
    };

    return padBox(cell, NARROW_SIDE_PADDING);
}

/**
 * The inside of a cell of the notes.
 *
 * @param rowIndex the row, counting from 0: the printed notes first, then the pharmacy's own
 */
function findNoteCell(column: keyof typeof NOTE_COLUMNS, rowIndex: number): SheetBox {
    const cell: SheetBox = {
        ...NOTE_COLUMNS[column],
        bottom: NOTE_ROW_EDGES[rowIndex + 1],
        height: NOTE_ROW_EDGES[rowIndex] - NOTE_ROW_EDGES[rowIndex + 1],
    };

    return padBox(cell, SIDE_PADDING);
}

/**
 * The inside of a cell: the cell minus the room kept clear along its edges.
 *
 * @param sidePadding the room kept at the left and at the right
 */
function padBox(cell: SheetBox, sidePadding: number): SheetBox {
    return {
        left: cell.left + sidePadding,
        bottom: cell.bottom + END_PADDING,
        width: cell.width - 2 * sidePadding,
        height: cell.height - 2 * END_PADDING,
    };
}
