import { describe, expect, it } from 'vitest';
import {
    findTechnician,
    formatBoardName,
    formatExportName,
    formatFullName,
    formatInitials,
    formatRosterName,
    sortTechnicians,
    technicianNamesSchema,
} from '@/lib/names';
import type { Technician } from '@/lib/records';
import { SAMPLE_TECHNICIANS } from '@/testing/sampleBoard';

const [jane, sam, maria] = SAMPLE_TECHNICIANS;

function createTechnician(id: number, firstName: string, lastName: string): Technician {
    return { ...jane, id, firstName, lastName };
}

describe('names', () => {
    it('finds a technician by id, and no one for an id the roster no longer has', () => {
        expect(findTechnician(SAMPLE_TECHNICIANS, 2)).toBe(sam);
        expect(findTechnician(SAMPLE_TECHNICIANS, 9)).toBeUndefined();
    });

    it('sorts the roster by first name or by last name, capitals and accents aside', () => {
        const technicians = [
            createTechnician(1, 'zoe', 'Adams'),
            createTechnician(2, 'Álvaro', 'Zimmer'),
            createTechnician(3, 'Bea', 'adams'),
        ];

        expect(sortTechnicians(technicians, 'firstName').map((technician) => technician.id)).toEqual([2, 3, 1]);
        expect(sortTechnicians(technicians, 'lastName').map((technician) => technician.id)).toEqual([3, 1, 2]);
    });

    it('keeps two people of one name in the order they joined, and leaves the roster given as it was', () => {
        const technicians = [
            createTechnician(7, 'Sam', 'Lee'),
            createTechnician(4, 'Sam', 'Lee'),
            createTechnician(5, 'Ann', 'Lee'),
        ];

        expect(sortTechnicians(technicians, 'lastName').map((technician) => technician.id)).toEqual([5, 4, 7]);
        expect(technicians.map((technician) => technician.id)).toEqual([7, 4, 5]);
    });

    it("writes a technician in a cell in each of the board's styles", () => {
        expect(formatBoardName(jane, 'abbreviation')).toBe('JD');
        expect(formatBoardName(sam, 'abbreviation')).toBe('Sam L.');
        expect(formatBoardName(maria, 'lastFirst')).toBe('Garcia-Lopez, Maria');
        expect(formatBoardName(maria, 'firstLast')).toBe('Maria Garcia-Lopez');
        expect(formatBoardName(maria, 'firstName')).toBe('Maria');
    });

    it('writes someone deleted from the roster as removed', () => {
        expect(formatBoardName(undefined, 'abbreviation')).toBe('(removed)');
        expect(formatBoardName(undefined, 'firstLast')).toBe('(removed)');
        expect(formatFullName(undefined)).toBe('Removed technician');
        expect(formatExportName(undefined)).toBe('(removed)');
    });

    it('takes the names a form sends without the spaces around them', () => {
        const names = technicianNamesSchema.parse({ firstName: ' Jane ', lastName: 'Doe ', abbreviation: ' JD' });

        expect(names).toEqual({ firstName: 'Jane', lastName: 'Doe', abbreviation: 'JD' });
        expect(technicianNamesSchema.parse({ firstName: 'Sam', lastName: 'Lee', abbreviation: '' }).abbreviation).toBe(
            ''
        );
    });

    it('refuses a name that says nothing, and an abbreviation too long for a cell', () => {
        const isTaken = (names: object) => technicianNamesSchema.safeParse(names).success;

        expect(isTaken({ firstName: '   ', lastName: 'Doe', abbreviation: '' })).toBe(false);
        expect(isTaken({ firstName: 'Jane', lastName: '', abbreviation: '' })).toBe(false);
        expect(isTaken({ firstName: 'Jane', lastName: 'Doe', abbreviation: 'ABCDEFGHI' })).toBe(false);
        expect(isTaken({ firstName: 'Jane', lastName: 'Doe', abbreviation: 'ABCDEFGH' })).toBe(true);
    });

    it('writes whole names, initials and the names of the list to assign from', () => {
        expect(formatFullName(jane)).toBe('Jane Doe');
        expect(formatExportName(jane)).toBe('Jane Doe');
        expect(formatInitials(createTechnician(1, 'maria', 'garcia'))).toBe('MG');
        expect(formatRosterName(jane, 'firstName')).toBe('Jane Doe (JD)');
        expect(formatRosterName(jane, 'lastName')).toBe('Doe, Jane (JD)');
        expect(formatRosterName(sam, 'lastName')).toBe('Lee, Sam');
    });
});
