import { describe, expect, it } from 'vitest';
import {
    listOfferedTimes,
    ALL_TIMES,
    findHourAfter,
    formatShortTime,
    formatTime,
    formatTimeRange,
    OPENING_TIMES,
} from '@/lib/times';

const DAY = { openTime: '08:00', closeTime: '22:00', isOpenAllDay: false, timeStepMinutes: 15 } as const;

describe('times', () => {
    it('has every quarter hour from one midnight to the next', () => {
        expect(ALL_TIMES).toHaveLength(97);
        expect(ALL_TIMES[0]).toEqual({ value: '00:00', minutes: 0 });
        expect(ALL_TIMES[1].value).toBe('00:15');
        expect(ALL_TIMES.at(-1)).toEqual({ value: '24:00', minutes: 1440 });
        expect(OPENING_TIMES.at(-1)?.value).toBe('23:45');
    });

    it('writes a time on the 12-hour clock, midnight and noon as 12', () => {
        expect(formatTime('00:00', '12-hour')).toBe('12:00 AM');
        expect(formatTime('08:05', '12-hour')).toBe('');
        expect(formatTime('08:15', '12-hour')).toBe('8:15 AM');
        expect(formatTime('12:00', '12-hour')).toBe('12:00 PM');
        expect(formatTime('13:30', '12-hour')).toBe('1:30 PM');
        expect(formatTime('24:00', '12-hour')).toBe('12:00 AM');
    });

    it('writes a time on the 24-hour clock as it is kept, and nothing for what is no time', () => {
        expect(formatTime('08:15', '24-hour')).toBe('08:15');
        expect(formatTime('13:30', '24-hour')).toBe('13:30');
        expect(formatTime('24:00', '24-hour')).toBe('24:00');
        expect(formatTime('', '24-hour')).toBe('');
        expect(formatTime('noon', '12-hour')).toBe('');
    });

    it("writes a slot's two times as one text, with a ? for the one not chosen and nothing for neither", () => {
        expect(formatTimeRange('08:00', '09:00', '12-hour')).toBe('8:00 AM - 9:00 AM');
        expect(formatTimeRange('22:00', '24:00', '24-hour')).toBe('22:00 - 24:00');
        expect(formatTimeRange('09:00', '', '12-hour')).toBe('9:00 AM - ?');
        expect(formatTimeRange('', '09:00', '12-hour')).toBe('? - 9:00 AM');
        expect(formatTimeRange('', '', '12-hour')).toBe('');
    });

    it('writes a time on the hour short, without its minutes, on the 12-hour clock only', () => {
        expect(formatShortTime('17:00', '12-hour')).toBe('5 PM');
        expect(formatShortTime('00:00', '12-hour')).toBe('12 AM');
        expect(formatShortTime('24:00', '12-hour')).toBe('12 AM');
        expect(formatShortTime('17:15', '12-hour')).toBe('5:15 PM');
        expect(formatShortTime('17:00', '24-hour')).toBe('17:00');
        expect(formatShortTime('', '12-hour')).toBe('');
    });

    it("writes a slot's two times short where asked to, each on its own account", () => {
        expect(formatTimeRange('17:00', '19:00', '12-hour', true)).toBe('5 PM - 7 PM');
        expect(formatTimeRange('17:15', '19:00', '12-hour', true)).toBe('5:15 PM - 7 PM');
        expect(formatTimeRange('17:00', '', '12-hour', true)).toBe('5 PM - ?');
        expect(formatTimeRange('17:00', '19:00', '24-hour', true)).toBe('17:00 - 19:00');
    });

    it("offers the times on the pharmacy's step between its opening and its closing", () => {
        const values = listOfferedTimes(DAY).map((time) => time.value);

        expect(values).toHaveLength(57);
        expect(values.slice(0, 3)).toEqual(['08:00', '08:15', '08:30']);
        expect(values.slice(-2)).toEqual(['21:45', '22:00']);
        expect(listOfferedTimes({ ...DAY, closeTime: '12:00', timeStepMinutes: 60 }).map((time) => time.value)).toEqual(
            ['08:00', '09:00', '10:00', '11:00', '12:00']
        );
    });

    it('offers every time of the day to a 24-hour pharmacy, and to one whose hours cannot be read', () => {
        expect(listOfferedTimes({ ...DAY, isOpenAllDay: true, timeStepMinutes: 30 })).toHaveLength(49);
        expect(listOfferedTimes({ ...DAY, openTime: '' })).toHaveLength(97);
    });

    it('goes round midnight for a pharmacy that closes after it, the two midnights as one', () => {
        const overnight = listOfferedTimes({ ...DAY, openTime: '22:00', closeTime: '06:00', timeStepMinutes: 60 });

        expect(overnight.map((time) => time.value).join(' ')).toBe(
            '22:00 23:00 00:00 01:00 02:00 03:00 04:00 05:00 06:00'
        );
    });

    it('finds the time an hour after a start, whatever the step', () => {
        expect(findHourAfter('08:00', listOfferedTimes(DAY), 15)).toBe('09:00');
        expect(findHourAfter('08:30', listOfferedTimes({ ...DAY, timeStepMinutes: 30 }), 30)).toBe('09:30');
        expect(findHourAfter('08:00', listOfferedTimes({ ...DAY, timeStepMinutes: 60 }), 60)).toBe('09:00');
    });

    it('finds no time an hour after a start too close to closing, or one that is not offered', () => {
        expect(findHourAfter('21:15', listOfferedTimes(DAY), 15)).toBeNull();
        expect(findHourAfter('07:00', listOfferedTimes(DAY), 15)).toBeNull();
    });
});
