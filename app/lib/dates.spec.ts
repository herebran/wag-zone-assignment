import { describe, expect, it } from 'vitest';
import { formatBoardDate, formatMoment, isIsoDate, parseIsoDate, toIsoDate } from '@/lib/dates';

describe('dates', () => {
    it('keeps a calendar date as YYYY-MM-DD, in local time', () => {
        expect(toIsoDate(new Date(2026, 10, 12, 23, 59))).toBe('2026-11-12');
        expect(toIsoDate(new Date(2026, 0, 2, 0, 0))).toBe('2026-01-02');
        expect(toIsoDate(parseIsoDate('2024-02-29'))).toBe('2024-02-29');
    });

    it('tells a real date from a text that only looks like one', () => {
        expect(isIsoDate('2026-11-12')).toBe(true);
        expect(isIsoDate('2026-02-30')).toBe(false);
        expect(isIsoDate('2026-13-01')).toBe(false);
        expect(isIsoDate('2026-1-2')).toBe(false);
        expect(isIsoDate('tomorrow')).toBe(false);
        expect(isIsoDate('')).toBe(false);
    });

    it("writes a board's day with its weekday", () => {
        expect(formatBoardDate('2026-11-12')).toBe('Thu, Nov 12, 2026');
        expect(formatBoardDate('2027-01-01')).toBe('Fri, Jan 1, 2027');
    });

    it('writes a moment with its day and its time, and nothing for a text that is no moment', () => {
        expect(formatMoment(new Date(2026, 10, 11, 17, 30).toISOString())).toBe('Nov 11, 2026, 5:30 PM');
        expect(formatMoment(new Date(2027, 0, 2, 0, 5).toISOString())).toBe('Jan 2, 2027, 12:05 AM');
        expect(formatMoment('last week')).toBe('');
        expect(formatMoment('')).toBe('');
    });
});
