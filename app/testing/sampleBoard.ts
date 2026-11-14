/**
 * A roster and a day's board for the tests: three technicians, four time slots in use (one with no end, one with no
 * times, one ending at midnight), a deleted technician (id 9) who is still assigned, and each section under the grid
 * partly filled in.
 */
import { createBlankBoard, createNote } from '@/lib/board';
import type { Board, Technician, TimeSlot, ZoneKey } from '@/lib/records';

export const SAMPLE_BOARD_DATE = '2026-11-12';

/** A technician who is still assigned on a board but no longer on the roster. */
export const REMOVED_TECHNICIAN_ID = 9;

// id, first name, last name, abbreviation
export const SAMPLE_TECHNICIANS: readonly Technician[] = [
    createTechnician(1, 'Jane', 'Doe', 'JD'),
    createTechnician(2, 'Sam', 'Lee', ''),
    createTechnician(3, 'Maria', 'Garcia-Lopez', 'MGL'),
];

function createTechnician(id: number, firstName: string, lastName: string, abbreviation: string): Technician {
    return { id, firstName, lastName, abbreviation, role: 'Tech', createdAt: '2026-11-01T14:00:00.000Z' };
}

export function createSampleBoard(): Board {
    const blank = createBlankBoard();
    const timeSlots = [...blank.timeSlots];
    timeSlots[0] = fillSlot(timeSlots[0], '08:00', '09:00', {
        outWindow: [1, 2],
        driveThru: [3],
        fill2: [REMOVED_TECHNICIAN_ID],
        purple: [1],
        cpwLead: [2],
    });
    timeSlots[1] = fillSlot(timeSlots[1], '09:00', '', { fill1: [3] });
    timeSlots[2] = fillSlot(timeSlots[2], '', '', { driveThru: [1] });
    timeSlots[3] = fillSlot(timeSlots[3], '22:00', '24:00', { red: [2] });

    // The printed rows, then the pharmacy's own notes: one with a what, one with only a when, one left empty.
    const notes = blank.notes.slice(0, -1);
    notes[4] = { ...notes[4], when: 'by noon', technicianIds: [2] };
    notes[6] = { ...notes[6], technicianIds: [1, REMOVED_TECHNICIAN_ID] };
    notes.push({ ...createNote(), what: 'Order supplies for the week ahead' });
    notes.push({ ...createNote(), when: 'after lunch' });
    notes.push(createNote());

    return {
        timeSlots,
        phlomometer: {
            F1: { under: '5', above: '15' },
            F4: { under: '', above: '10' },
            FILL: { under: '', above: '' },
            REV: { under: '3', above: '' },
        },
        ic3Calls: {
            F1: { amount: '20', technicianIds: [1, 3] },
            FILL: { amount: '', technicianIds: [] },
        },
        notes,
    };
}

function fillSlot(
    slot: TimeSlot,
    startTime: string,
    endTime: string,
    assignments: Partial<Record<ZoneKey, number[]>>
): TimeSlot {
    return { startTime, endTime, assignments: { ...slot.assignments, ...assignments } };
}
