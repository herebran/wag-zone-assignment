/**
 * A board's day: a calendar date saved as 'YYYY-MM-DD'. That form sorts as text and has no time zone. Dates are read
 * and written with date-fns, in local time.
 */
import { format, isValid, parseISO } from 'date-fns';

/** The saved form of a date ('2026-11-12'), written the way date-fns expects. */
const ISO_DATE_FORMAT = 'yyyy-MM-dd';

/**
 * A Date as 'YYYY-MM-DD', in local time.
 */
export function toIsoDate(date: Date): string {
    return format(date, ISO_DATE_FORMAT);
}

/**
 * A 'YYYY-MM-DD' date as a Date at local midnight.
 */
export function parseIsoDate(isoDate: string): Date {
    return parseISO(isoDate);
}

/**
 * Whether a text is a real calendar date written 'YYYY-MM-DD'.
 */
export function isIsoDate(text: string): boolean {
    // Only the date part is allowed. parseISO would also accept a time of day, which a board's day never has.
    return /^\d{4}-\d{2}-\d{2}$/.test(text) && isValid(parseISO(text));
}

/**
 * A board's day as the sheet and the export show it: "Thu, Nov 12, 2026".
 */
export function formatBoardDate(isoDate: string): string {
    return format(parseISO(isoDate), 'EEE, MMM d, yyyy');
}

/**
 * An ISO timestamp as a message shows it: "Nov 11, 2026, 5:30 PM". '' when it cannot be read.
 */
export function formatMoment(timestamp: string): string {
    const moment = parseISO(timestamp);

    return isValid(moment) ? format(moment, 'MMM d, yyyy, h:mm a') : '';
}
