/**
 * Reads saved data. JSON from the browser's storage or a backup file can be anything: from an older version, cut short,
 * or edited by hand. Each Zod schema here keeps what is valid and fills in the rest, so the app never shows a board
 * with a part missing.
 *
 * Each schema is tied to its type in lib/records.ts, so the two cannot drift apart.
 */
import * as z from 'zod';
import { createBlankBoard } from '@/lib/board';
import { isIsoDate } from '@/lib/dates';
import { DEFAULT_ROLE, technicianNamesSchema } from '@/lib/names';
import type { Board, SavedBoard, Settings, Technician } from '@/lib/records';
import {
    CLOCK_FORMATS,
    DEFAULT_SETTINGS,
    EXPORT_STYLES,
    NAME_STYLES,
    ROSTER_ORDERS,
    TIME_STEPS,
    type SettingChoice,
} from '@/lib/settings';
import { findTime } from '@/lib/times';
import { ZONES } from '@/lib/zones';

/**
 * The roster as it is saved: the technicians in the order they were added, and the id the next one will get.
 */
export interface StoredRoster {
    nextTechnicianId: number;
    technicians: Technician[];
}

/**
 * A record read field by field. Anything that is not a record (nothing, text, a list) is read as an empty one, so every
 * field gets its fallback.
 */
function createRecordSchema<Shape extends z.ZodRawShape>(shape: Shape) {
    return z.preprocess((value) => (isRecord(value) ? value : {}), z.object(shape));
}

function isRecord(value: unknown): boolean {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * A list that keeps the valid items and drops the rest. Anything that is not a list becomes [].
 */
function createListSchema<Item>(itemSchema: z.ZodType<Item>) {
    return z
        .array(z.unknown())
        .catch([])
        .transform((items) =>
            items.flatMap((item) => {
                const result = itemSchema.safeParse(item);

                return result.success ? [result.data] : [];
            })
        );
}

/**
 * One of a setting's choices (lib/settings.ts), or the fallback for anything else.
 */
function createChoiceSchema<Value>(choices: readonly SettingChoice<Value>[], fallback: Value) {
    return z.custom<Value>((value) => choices.some((choice) => choice.value === value)).catch(fallback);
}

/**
 * A saved time like '13:30', or the fallback for anything that is not a time.
 */
function createTimeSchema(fallback: string) {
    return z
        .string()
        .refine((value) => findTime(value) !== undefined)
        .catch(fallback);
}

/** Text as typed. Anything else becomes ''. */
const textSchema = z.string().catch('');

/** A list of technician ids, without repeats. */
const technicianIdsSchema = createListSchema(z.int()).transform((ids) => [...new Set(ids)]);

const timeSlotSchema = createRecordSchema({
    startTime: createTimeSchema(''),
    endTime: createTimeSchema(''),
    assignments: createRecordSchema({
        outWindow: technicianIdsSchema,
        driveThru: technicianIdsSchema,
        fill1: technicianIdsSchema,
        fill2: technicianIdsSchema,
        purple: technicianIdsSchema,
        red: technicianIdsSchema,
        yellow: technicianIdsSchema,
        cpwLead: technicianIdsSchema,
    }),
});

const thresholdSchema = createRecordSchema({ under: textSchema, above: textSchema });

const ic3CallSchema = createRecordSchema({ amount: textSchema, technicianIds: technicianIdsSchema });

const noteSchema = createRecordSchema({
    what: textSchema,
    isFixed: z.boolean().catch(false),
    when: textSchema,
    technicianIds: technicianIdsSchema,
});

/**
 * A board. One with no time slots or no notes gets the blank board's, because the sheet always has its grid and its
 * printed rows.
 */
const boardSchema: z.ZodType<Board> = createRecordSchema({
    timeSlots: z.array(timeSlotSchema).catch([]),
    phlomometer: createRecordSchema({
        F1: thresholdSchema,
        F4: thresholdSchema,
        FILL: thresholdSchema,
        REV: thresholdSchema,
    }),
    ic3Calls: createRecordSchema({ F1: ic3CallSchema, FILL: ic3CallSchema }),
    notes: z.array(noteSchema).catch([]),
}).transform((board) => {
    const blank = createBlankBoard();

    return {
        ...board,
        timeSlots: board.timeSlots.length > 0 ? board.timeSlots : blank.timeSlots,
        notes: board.notes.length > 0 ? board.notes : blank.notes,
    };
});

/**
 * A saved board. Data with no board in it is not a saved board, so it is rejected instead of read as a blank one.
 */
const savedBoardSchema: z.ZodType<SavedBoard> = z.object({
    updatedAt: textSchema,
    board: z.record(z.string(), z.unknown()).transform((board) => boardSchema.parse(board)),
});

/**
 * A technician. One without an id or a name is dropped from the roster. Names follow the same rules as the forms
 * (lib/names.ts). An abbreviation is kept as saved, whatever its length.
 */
const technicianSchema = z.object({
    id: z.int().min(1),
    firstName: technicianNamesSchema.shape.firstName,
    lastName: technicianNamesSchema.shape.lastName,
    abbreviation: z.string().trim().catch(''),
    role: z.string().trim().min(1).catch(DEFAULT_ROLE),
    createdAt: textSchema,
});

/**
 * The roster. If two technicians share an id, the first keeps it. The next id is always higher than every id in use, so
 * nobody gets an id that a saved board uses for someone else.
 */
const rosterSchema: z.ZodType<StoredRoster> = createRecordSchema({
    nextTechnicianId: z.int().catch(1),
    technicians: createListSchema(technicianSchema),
}).transform((roster) => {
    const technicians = roster.technicians.filter(
        (technician, index) => roster.technicians.findIndex((other) => other.id === technician.id) === index
    );
    const highestId = Math.max(0, ...technicians.map((technician) => technician.id));

    return { nextTechnicianId: Math.max(roster.nextTechnicianId, highestId + 1), technicians };
});

/**
 * The settings. One that is missing or not a valid choice gets its default.
 */
const settingsSchema: z.ZodType<Settings> = createRecordSchema({
    openTime: createTimeSchema(DEFAULT_SETTINGS.openTime),
    closeTime: createTimeSchema(DEFAULT_SETTINGS.closeTime),
    isOpenAllDay: z.boolean().catch(DEFAULT_SETTINGS.isOpenAllDay),
    clockFormat: createChoiceSchema(CLOCK_FORMATS, DEFAULT_SETTINGS.clockFormat),
    timeStepMinutes: createChoiceSchema(TIME_STEPS, DEFAULT_SETTINGS.timeStepMinutes),
    nameStyle: createChoiceSchema(NAME_STYLES, DEFAULT_SETTINGS.nameStyle),
    rosterOrder: createChoiceSchema(ROSTER_ORDERS, DEFAULT_SETTINGS.rosterOrder),
    hasPhlomometer: z.boolean().catch(DEFAULT_SETTINGS.hasPhlomometer),
    hasIc3Calls: z.boolean().catch(DEFAULT_SETTINGS.hasIc3Calls),
    hasNotes: z.boolean().catch(DEFAULT_SETTINGS.hasNotes),

    // The zones that are off, without repeats, in the sheet's order.
    hiddenZones: z
        .array(z.unknown())
        .catch([])
        .transform((listed) => ZONES.map((zone) => zone.key).filter((key) => listed.includes(key))),
    exportStyle: createChoiceSchema(EXPORT_STYLES, DEFAULT_SETTINGS.exportStyle),
    hasShortPdfTimes: z.boolean().catch(DEFAULT_SETTINGS.hasShortPdfTimes),
});

export function readBoard(value: unknown): Board {
    return boardSchema.parse(value);
}

/**
 * Reads a saved board, or returns null when the data has no board in it.
 */
export function readSavedBoard(value: unknown): SavedBoard | null {
    const result = savedBoardSchema.safeParse(value);

    return result.success ? result.data : null;
}

/**
 * Reads a backup's boards, keyed by day. Entries whose key is not a date are dropped.
 */
export function readSavedBoards(value: unknown): Record<string, SavedBoard> {
    const entries = z.record(z.string(), z.unknown()).catch({}).parse(value);
    const boards: Record<string, SavedBoard> = {};
    for (const [boardDate, entry] of Object.entries(entries)) {
        const savedBoard = readSavedBoard(entry);
        if (savedBoard && isIsoDate(boardDate)) {
            boards[boardDate] = savedBoard;
        }
    }

    return boards;
}

export function readRoster(value: unknown): StoredRoster {
    return rosterSchema.parse(value);
}

export function readSettings(value: unknown): Settings {
    return settingsSchema.parse(value);
}
