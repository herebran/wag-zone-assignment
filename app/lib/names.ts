/**
 * How a technician's name is written: on the board, in the roster, in the assign list and in the export. A board saves
 * ids, not names, so a technician deleted since then shows as removed.
 */
import * as z from 'zod';
import type { NameStyle, RosterOrder, Technician } from '@/lib/records';

/** The roles a technician can have, in the order the roster lists them. */
export const ROLES: readonly string[] = ['Trainee', 'Tech', 'Senior Tech', 'RxOM', 'Intern', 'RPh', 'RXM', 'SM'];

/** The role a new technician starts with. */
export const DEFAULT_ROLE = 'Tech';

/** The longest abbreviation that fits a cell. */
export const ABBREVIATION_MAX_LENGTH = 8;

/**
 * A technician's names, as the forms collect them.
 */
export interface TechnicianNames {
    firstName: string;
    lastName: string;

    /** '' when there is none. */
    abbreviation: string;
}

/**
 * The rules for a technician's names: a first and a last name that are not blank, and an abbreviation, if any, short
 * enough for a cell. Spaces around each name are trimmed.
 */
export const technicianNamesSchema = z.object({
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    abbreviation: z.string().trim().max(ABBREVIATION_MAX_LENGTH),
}) satisfies z.ZodType<TechnicianNames, TechnicianNames>;

// Names that differ only by capitals or accents sort together, as on a printed roster.
const NAME_COLLATOR = new Intl.Collator('en', { sensitivity: 'base' });

/**
 * Finds a technician by id. Undefined when they are no longer on the roster.
 */
export function findTechnician(technicians: readonly Technician[], technicianId: number): Technician | undefined {
    return technicians.find((technician) => technician.id === technicianId);
}

/**
 * Sorts the roster the way the settings say: by first name then last, or by last name then first.
 */
export function sortTechnicians(technicians: readonly Technician[], rosterOrder: RosterOrder): Technician[] {
    return [...technicians].sort((a, b) => {
        const byFirstName = NAME_COLLATOR.compare(a.firstName, b.firstName);
        const byLastName = NAME_COLLATOR.compare(a.lastName, b.lastName);
        const byName = rosterOrder === 'lastName' ? byLastName || byFirstName : byFirstName || byLastName;

        // Two people with the same name stay in the order they were added.
        return byName || a.id - b.id;
    });
}

/**
 * A technician's name on the board, in the style the settings say.
 */
export function formatBoardName(technician: Technician | undefined, nameStyle: NameStyle): string {
    if (!technician) {
        return '(removed)';
    }

    switch (nameStyle) {
        case 'lastFirst':
            return `${technician.lastName}, ${technician.firstName}`;
        case 'firstLast':
            return `${technician.firstName} ${technician.lastName}`;
        case 'firstName':
            return technician.firstName;
        default:
            return technician.abbreviation || `${technician.firstName} ${technician.lastName.charAt(0)}.`;
    }
}

export function formatFullName(technician: Technician | undefined): string {
    return technician ? `${technician.firstName} ${technician.lastName}` : 'Removed technician';
}

/**
 * A technician's name in the text export, which always uses full names.
 */
export function formatExportName(technician: Technician | undefined): string {
    return technician ? formatFullName(technician) : '(removed)';
}

/**
 * A technician's initials, like "JD". The roster shows them when there is no abbreviation.
 */
export function formatInitials(technician: Technician): string {
    return (technician.firstName.charAt(0) + technician.lastName.charAt(0)).toUpperCase();
}

/**
 * A technician's name in the assign list, starting with the name the roster is sorted by: "Doe, Jane (JD)".
 */
export function formatRosterName(technician: Technician, rosterOrder: RosterOrder): string {
    const name =
        rosterOrder === 'lastName'
            ? `${technician.lastName}, ${technician.firstName}`
            : `${technician.firstName} ${technician.lastName}`;

    return technician.abbreviation ? `${name} (${technician.abbreviation})` : name;
}
