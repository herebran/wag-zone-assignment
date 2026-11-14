/**
 * A day's board and the changes made to it: picking a time, assigning a technician, adding a time slot or a note,
 * typing a number.
 *
 * A change never edits the board it is given. It returns a new board, so the undo history can keep the old ones
 * (state/history.ts). The changes are written with Immer: each one edits a draft, and Immer builds the new board. A
 * change that changes nothing returns the same board.
 */
import { castDraft, produce, type Draft } from 'immer';
import type { Board, Ic3Queue, Note, PhlomometerQueue, TimeSlot, ZoneKey } from '@/lib/records';
import { findHourAfter, type ClockTime } from '@/lib/times';
import { ZONES } from '@/lib/zones';

/** The Phlomometer's queues, in the order the sheet prints them. */
export const PHLOMOMETER_QUEUES: readonly PhlomometerQueue[] = ['F1', 'F4', 'FILL', 'REV'];

/** The queues that can have a call for IC3, and the sheet's label for each. */
export const IC3_QUEUES: readonly Ic3Queue[] = ['F1', 'FILL'];
export const IC3_LABELS: Readonly<Record<Ic3Queue, string>> = { F1: 'F1 >', FILL: 'FILL >' };

/** The rows the sheet prints under "Other notes and priorities". */
export const STANDARD_NOTES: readonly string[] = [
    'Exception counts',
    'WCB/CMD',
    'PCP',
    'OOS/PFL',
    'TPR',
    'Deletes',
    'MQ',
    'MSC',
    'DUR',
    'Immunizer',
];

/** A new board starts with as many time slots as the printed sheet has. */
const DEFAULT_TIME_SLOT_COUNT = 8;

/**
 * Where a technician can be assigned: a station in a time slot, a call for IC3, or a note.
 */
export type AssignmentTarget =
    | { kind: 'zone'; slotIndex: number; zone: ZoneKey }
    | { kind: 'ic3Call'; queue: Ic3Queue }
    | { kind: 'note'; noteIndex: number };

export function createTimeSlot(): TimeSlot {
    const assignments = Object.fromEntries(ZONES.map((zone) => [zone.key, []])) as unknown as TimeSlot['assignments'];

    return { startTime: '', endTime: '', assignments };
}

export function createNote(): Note {
    return { what: '', isFixed: false, when: '', technicianIds: [] };
}

/**
 * The sheet before anyone writes on it: eight time slots, an empty Phlomometer and calls for IC3, and the printed notes
 * plus one empty row.
 */
export function createBlankBoard(): Board {
    return {
        timeSlots: Array.from({ length: DEFAULT_TIME_SLOT_COUNT }, createTimeSlot),
        phlomometer: {
            F1: { under: '', above: '' },
            F4: { under: '', above: '' },
            FILL: { under: '', above: '' },
            REV: { under: '', above: '' },
        },
        ic3Calls: {
            F1: { amount: '', technicianIds: [] },
            FILL: { amount: '', technicianIds: [] },
        },
        notes: [...STANDARD_NOTES.map((what) => ({ ...createNote(), what, isFixed: true })), createNote()],
    };
}

/**
 * Assigns a technician after those already there. Someone already assigned there is not added twice.
 */
export function assignTechnician(board: Board, target: AssignmentTarget, technicianId: number): Board {
    return produce(board, (draft) => {
        const technicianIds = findAssignedIds(draft, target);
        if (technicianIds && !technicianIds.includes(technicianId)) {
            technicianIds.push(technicianId);
        }
    });
}

export function unassignTechnician(board: Board, target: AssignmentTarget, technicianId: number): Board {
    return produce(board, (draft) => {
        const technicianIds = findAssignedIds(draft, target);
        if (technicianIds?.includes(technicianId)) {
            technicianIds.splice(technicianIds.indexOf(technicianId), 1);
        }
    });
}

/**
 * The list of assigned ids at a target, on a board being changed. Undefined when the time slot or the note no longer
 * exists.
 */
function findAssignedIds(draft: Draft<Board>, target: AssignmentTarget): number[] | undefined {
    switch (target.kind) {
        case 'zone':
            return draft.timeSlots[target.slotIndex]?.assignments[target.zone];
        case 'ic3Call':
            return draft.ic3Calls[target.queue].technicianIds;
        default:
            return draft.notes[target.noteIndex]?.technicianIds;
    }
}

/**
 * The times a slot can pick from, and the step between them (lib/times.ts).
 */
export interface TimeChoices {
    times: readonly ClockTime[];
    timeStepMinutes: number;
}

/**
 * Sets a time slot's start or end ('' for no time). When a start is set and the slot has no end yet, the end becomes an
 * hour later, because most slots last an hour.
 */
export function setSlotTime(
    board: Board,
    slotIndex: number,
    edge: 'startTime' | 'endTime',
    time: string,
    { times, timeStepMinutes }: TimeChoices
): Board {
    return produce(board, (draft) => {
        const slot = draft.timeSlots[slotIndex];
        if (!slot) {
            return;
        }

        if (edge === 'startTime' && !slot.endTime) {
            slot.endTime = findHourAfter(time, times, timeStepMinutes) ?? '';
        }
        slot[edge] = time;
    });
}

export function addTimeSlot(board: Board): Board {
    return produce(board, (draft) => {
        draft.timeSlots.push(castDraft(createTimeSlot()));
    });
}

/**
 * Removes the last time slot and its assignments. A board always keeps at least one.
 */
export function removeLastTimeSlot(board: Board): Board {
    return produce(board, (draft) => {
        if (draft.timeSlots.length > 1) {
            draft.timeSlots.pop();
        }
    });
}

export function setPhlomometerThreshold(
    board: Board,
    queue: PhlomometerQueue,
    side: 'under' | 'above',
    text: string
): Board {
    return produce(board, (draft) => {
        draft.phlomometer[queue][side] = text;
    });
}

export function setIc3Amount(board: Board, queue: Ic3Queue, amount: string): Board {
    return produce(board, (draft) => {
        draft.ic3Calls[queue].amount = amount;
    });
}

export function addNote(board: Board): Board {
    return produce(board, (draft) => {
        draft.notes.push(castDraft(createNote()));
    });
}

/**
 * Removes one of the pharmacy's own notes. The sheet's printed rows cannot be removed.
 */
export function removeNote(board: Board, noteIndex: number): Board {
    return produce(board, (draft) => {
        const note = draft.notes[noteIndex];
        if (note && !note.isFixed) {
            draft.notes.splice(noteIndex, 1);
        }
    });
}

/**
 * Sets a note's "what" or "when", as typed. The "what" of a printed row cannot be changed.
 */
export function setNoteText(board: Board, noteIndex: number, field: 'what' | 'when', text: string): Board {
    return produce(board, (draft) => {
        const note = draft.notes[noteIndex];
        const isPrinted = field === 'what' && note?.isFixed;
        if (note && !isPrinted) {
            note[field] = text;
        }
    });
}

/**
 * Whether a note has anything in it. A printed row always does, because of its "what".
 */
export function hasNoteContent(note: Note): boolean {
    return note.what.trim() !== '' || note.when.trim() !== '' || note.technicianIds.length > 0;
}

/**
 * Whether anything has been written on the board. If so, copying another day over it would lose that.
 */
export function hasBoardContent(board: Board): boolean {
    const hasTimeSlots = board.timeSlots.some(
        (slot) =>
            slot.startTime !== '' || slot.endTime !== '' || ZONES.some((zone) => slot.assignments[zone.key].length > 0)
    );
    const hasPhlomometer = PHLOMOMETER_QUEUES.some(
        (queue) => board.phlomometer[queue].under !== '' || board.phlomometer[queue].above !== ''
    );
    const hasIc3Calls = IC3_QUEUES.some(
        (queue) => board.ic3Calls[queue].amount !== '' || board.ic3Calls[queue].technicianIds.length > 0
    );

    // A printed row's "what" is on every board, so only what the pharmacy added to the row counts.
    const hasNotes = board.notes.some(
        (note) => (!note.isFixed && note.what.trim() !== '') || note.when.trim() !== '' || note.technicianIds.length > 0
    );

    return hasTimeSlots || hasPhlomometer || hasIc3Calls || hasNotes;
}
