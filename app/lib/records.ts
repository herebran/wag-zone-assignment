/**
 * The shapes of the data the app saves: technicians, a day's board and the settings. The browser's storage and the
 * backup file both hold these shapes. If one changes, raise the backup's version (backup.ts) and teach stored.ts to
 * read the old shape.
 */

/**
 * The stations of the zone grid. Each is a column.
 */
export type ZoneKey = 'outWindow' | 'driveThru' | 'fill1' | 'fill2' | 'purple' | 'red' | 'yellow' | 'cpwLead';

export type PhlomometerQueue = 'F1' | 'F4' | 'FILL' | 'REV';

export type Ic3Queue = 'F1' | 'FILL';

export interface Technician {
    /** Never reused, so a saved board always points at the same person. */
    id: number;
    firstName: string;
    lastName: string;

    /** Shown on the board instead of the name. '' when there is none. */
    abbreviation: string;
    role: string;
    createdAt: string;
}

/**
 * A row of the zone grid: a time range and who works each station during it.
 */
export interface TimeSlot {
    /** 'HH:MM' on the 24-hour clock. '' until a time is chosen. */
    startTime: string;
    endTime: string;

    /** The technician ids at each station, in the order they were assigned. */
    assignments: Readonly<Record<ZoneKey, readonly number[]>>;
}

/**
 * The two counts a Phlomometer queue should stay between, as typed.
 */
export interface PhlomometerThreshold {
    under: string;
    above: string;
}

/**
 * The amount at which a queue calls for IC3, as typed, and who makes the call.
 */
export interface Ic3Call {
    amount: string;
    technicianIds: readonly number[];
}

/**
 * A row of "Other notes and priorities".
 */
export interface Note {
    what: string;

    /** True for the sheet's printed rows. Their "what" cannot be changed and the row cannot be removed. */
    isFixed: boolean;
    when: string;
    technicianIds: readonly number[];
}

/**
 * A day's Priority Zone Assignment sheet.
 */
export interface Board {
    timeSlots: readonly TimeSlot[];
    phlomometer: Readonly<Record<PhlomometerQueue, PhlomometerThreshold>>;
    ic3Calls: Readonly<Record<Ic3Queue, Ic3Call>>;
    notes: readonly Note[];
}

export interface SavedBoard {
    updatedAt: string;
    board: Board;
}

/**
 * How the board writes a technician: the abbreviation ("First L." when there is none), "Last, First", "First Last", or
 * the first name only.
 */
export type NameStyle = 'abbreviation' | 'lastFirst' | 'firstLast' | 'firstName';

/**
 * Which name the roster and the assign list are sorted by.
 */
export type RosterOrder = 'firstName' | 'lastName';

/**
 * Whether times read 1:30 PM or 13:30.
 */
export type ClockFormat = '12-hour' | '24-hour';

/**
 * How far apart the times in the lists are.
 */
export type TimeStepMinutes = 15 | 30 | 60;

/**
 * What the export produces: the board as a plain text list, or as a PDF written on the original sheet.
 */
export type ExportStyle = 'list' | 'pdf';

/**
 * How the pharmacy uses the board. The settings apply to every day's board.
 */
export interface Settings {
    /** The pharmacy's hours, 'HH:MM' on the 24-hour clock. The time lists run between them. */
    openTime: string;
    closeTime: string;

    /** A 24-hour pharmacy. Every time of the day can be picked. */
    isOpenAllDay: boolean;
    clockFormat: ClockFormat;
    timeStepMinutes: TimeStepMinutes;
    nameStyle: NameStyle;
    rosterOrder: RosterOrder;

    /** The sections under the zone grid. One that is off is left out of the board, the print and the export. */
    hasPhlomometer: boolean;
    hasIc3Calls: boolean;
    hasNotes: boolean;

    /** The zones that are turned off. Their assignments are kept and come back with the zone. */
    hiddenZones: readonly ZoneKey[];
    exportStyle: ExportStyle;

    /**
     * Whether the PDF writes a time on the hour without its minutes: "5 PM" for "5:00 PM". Only on the 12-hour clock,
     * because "17" does not read as a time.
     */
    hasShortPdfTimes: boolean;
}
