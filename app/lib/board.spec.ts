import { describe, expect, it } from 'vitest';
import {
    addNote,
    addTimeSlot,
    assignTechnician,
    createBlankBoard,
    createNote,
    hasBoardContent,
    hasNoteContent,
    removeLastTimeSlot,
    removeNote,
    setIc3Amount,
    setNoteText,
    setPhlomometerThreshold,
    setSlotTime,
    STANDARD_NOTES,
    unassignTechnician,
    type AssignmentTarget,
} from '@/lib/board';
import { listOfferedTimes } from '@/lib/times';
import { ZONES } from '@/lib/zones';

const OUT_WINDOW: AssignmentTarget = { kind: 'zone', slotIndex: 0, zone: 'outWindow' };
const QUARTER_HOURS = {
    times: listOfferedTimes({ openTime: '08:00', closeTime: '22:00', isOpenAllDay: false, timeStepMinutes: 15 }),
    timeStepMinutes: 15,
};

describe('board', () => {
    it('starts as the printed sheet: eight empty slots, and the standard notes with a row to add to', () => {
        const board = createBlankBoard();

        expect(board.timeSlots).toHaveLength(8);
        for (const slot of board.timeSlots) {
            expect(slot.startTime).toBe('');
            expect(slot.endTime).toBe('');
            expect(Object.keys(slot.assignments)).toEqual(ZONES.map((zone) => zone.key));
        }
        expect(Object.keys(board.phlomometer)).toEqual(['F1', 'F4', 'FILL', 'REV']);
        expect(Object.keys(board.ic3Calls)).toEqual(['F1', 'FILL']);
        expect(board.notes.map((note) => note.what)).toEqual([...STANDARD_NOTES, '']);
        expect(board.notes.map((note) => note.isFixed)).toEqual([...STANDARD_NOTES.map(() => true), false]);
        expect(hasBoardContent(board)).toBe(false);
    });

    it('assigns technicians in the order they come, each once, and takes them off', () => {
        let board = createBlankBoard();
        board = assignTechnician(board, OUT_WINDOW, 2);
        board = assignTechnician(board, OUT_WINDOW, 1);
        const assignedTwice = assignTechnician(board, OUT_WINDOW, 2);

        expect(board.timeSlots[0].assignments.outWindow).toEqual([2, 1]);
        expect(assignedTwice).toBe(board);
        expect(unassignTechnician(board, OUT_WINDOW, 2).timeSlots[0].assignments.outWindow).toEqual([1]);
        expect(unassignTechnician(board, OUT_WINDOW, 7)).toBe(board);
    });

    it('assigns to a call for IC3 and to a note as it does to a station', () => {
        const call: AssignmentTarget = { kind: 'ic3Call', queue: 'FILL' };
        const note: AssignmentTarget = { kind: 'note', noteIndex: 4 };
        let board = createBlankBoard();
        board = assignTechnician(board, call, 3);
        board = assignTechnician(board, note, 1);

        expect(board.ic3Calls.FILL.technicianIds).toEqual([3]);
        expect(board.notes[4].technicianIds).toEqual([1]);
        expect(assignTechnician(board, { kind: 'note', noteIndex: 99 }, 1)).toBe(board);
        expect(assignTechnician(board, { kind: 'zone', slotIndex: 99, zone: 'red' }, 1)).toBe(board);
    });

    it('makes a new board with each change, sharing what did not change', () => {
        const board = createBlankBoard();
        const changed = assignTechnician(board, OUT_WINDOW, 1);

        expect(board.timeSlots[0].assignments.outWindow).toEqual([]);
        expect(changed).not.toBe(board);
        expect(changed.timeSlots[1]).toBe(board.timeSlots[1]);
        expect(changed.notes).toBe(board.notes);
    });

    it('ends a slot an hour after the start it is given, until the end is chosen', () => {
        let board = setSlotTime(createBlankBoard(), 0, 'startTime', '08:00', QUARTER_HOURS);
        expect(board.timeSlots[0]).toMatchObject({ startTime: '08:00', endTime: '09:00' });

        board = setSlotTime(board, 0, 'endTime', '10:30', QUARTER_HOURS);
        board = setSlotTime(board, 0, 'startTime', '09:00', QUARTER_HOURS);
        expect(board.timeSlots[0]).toMatchObject({ startTime: '09:00', endTime: '10:30' });
    });

    it('leaves the end empty when the pharmacy closes within the hour, and when the start is taken away', () => {
        const lateSlot = setSlotTime(createBlankBoard(), 1, 'startTime', '21:30', QUARTER_HOURS);
        const clearedSlot = setSlotTime(createBlankBoard(), 1, 'startTime', '', QUARTER_HOURS);

        expect(lateSlot.timeSlots[1]).toMatchObject({ startTime: '21:30', endTime: '' });
        expect(clearedSlot.timeSlots[1]).toMatchObject({ startTime: '', endTime: '' });
    });

    it('adds time slots under the last, and removes the last down to one', () => {
        let board = addTimeSlot(createBlankBoard());
        expect(board.timeSlots).toHaveLength(9);

        for (let count = 0; count < 12; count++) {
            board = removeLastTimeSlot(board);
        }
        expect(board.timeSlots).toHaveLength(1);
    });

    it('writes the Phlomometer thresholds and the amounts of the calls for IC3 as typed', () => {
        let board = setPhlomometerThreshold(createBlankBoard(), 'FILL', 'under', '5');
        board = setPhlomometerThreshold(board, 'FILL', 'above', '25+');
        board = setIc3Amount(board, 'F1', '30');

        expect(board.phlomometer.FILL).toEqual({ under: '5', above: '25+' });
        expect(board.phlomometer.F1).toEqual({ under: '', above: '' });
        expect(board.ic3Calls.F1.amount).toBe('30');
    });

    it("adds, writes and removes the pharmacy's own notes, and keeps the printed rows as the sheet has them", () => {
        let board = addNote(createBlankBoard());
        board = setNoteText(board, 11, 'what', 'Call the clinic');
        board = setNoteText(board, 11, 'when', '2 PM');
        board = setNoteText(board, 0, 'when', 'hourly');

        expect(board.notes).toHaveLength(12);
        expect(board.notes[11]).toMatchObject({ what: 'Call the clinic', when: '2 PM', isFixed: false });
        expect(board.notes[0]).toMatchObject({ what: 'Exception counts', when: 'hourly' });
        expect(setNoteText(board, 0, 'what', 'Renamed')).toBe(board);
        expect(removeNote(board, 0)).toBe(board);
        expect(
            removeNote(board, 10)
                .notes.map((note) => note.what)
                .slice(-2)
        ).toEqual(['Immunizer', 'Call the clinic']);
    });

    it('counts a board as written on once it has a time, someone assigned, a number or a note', () => {
        const blank = createBlankBoard();

        expect(hasBoardContent(setSlotTime(blank, 3, 'endTime', '12:00', QUARTER_HOURS))).toBe(true);
        expect(hasBoardContent(assignTechnician(blank, { kind: 'zone', slotIndex: 7, zone: 'cpwLead' }, 1))).toBe(true);
        expect(hasBoardContent(setPhlomometerThreshold(blank, 'REV', 'above', '9'))).toBe(true);
        expect(hasBoardContent(setIc3Amount(blank, 'FILL', '40'))).toBe(true);
        expect(hasBoardContent(assignTechnician(blank, { kind: 'ic3Call', queue: 'F1' }, 2))).toBe(true);
        expect(hasBoardContent(setNoteText(blank, 2, 'when', 'noon'))).toBe(true);
        expect(hasBoardContent(setNoteText(blank, 10, 'what', 'Inventory'))).toBe(true);
        expect(hasBoardContent(setNoteText(blank, 10, 'what', '   '))).toBe(false);
    });

    it('counts a note as saying something once it has a what, a when or a who, as a printed row always does', () => {
        const [printedNote] = createBlankBoard().notes;

        expect(hasNoteContent(printedNote)).toBe(true);
        expect(hasNoteContent(createNote())).toBe(false);
        expect(hasNoteContent({ ...createNote(), what: '  ', when: ' ' })).toBe(false);
        expect(hasNoteContent({ ...createNote(), when: 'noon' })).toBe(true);
        expect(hasNoteContent({ ...createNote(), technicianIds: [2] })).toBe(true);
    });
});
