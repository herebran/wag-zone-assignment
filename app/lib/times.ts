/**
 * The times a time slot can start and end at: every quarter hour from 12:00 AM to the midnight that ends the day. A
 * time is saved as 'HH:MM' on the 24-hour clock, whichever clock the pharmacy reads. '24:00' is the midnight that ends
 * the day.
 */
import type { ClockFormat, Settings } from '@/lib/records';

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

const SMALLEST_STEP_MINUTES = 15;

export interface ClockTime {
    /** As it is saved: 'HH:MM'. */
    value: string;

    /** Minutes since the midnight that starts the day. */
    minutes: number;
}

export const ALL_TIMES: readonly ClockTime[] = createAllTimes();

/** The times a pharmacy can open at: all of them except the midnight that ends the day. */
export const OPENING_TIMES: readonly ClockTime[] = ALL_TIMES.slice(0, -1);

function createAllTimes(): ClockTime[] {
    const times: ClockTime[] = [];
    for (let minutes = 0; minutes <= MINUTES_PER_DAY; minutes += SMALLEST_STEP_MINUTES) {
        times.push({
            value: `${padTwo(Math.floor(minutes / MINUTES_PER_HOUR))}:${padTwo(minutes % MINUTES_PER_HOUR)}`,
            minutes,
        });
    }

    return times;
}

function padTwo(number: number): string {
    return String(number).padStart(2, '0');
}

/**
 * Finds a time by its saved value ('13:30'). Undefined when the value is not a time.
 */
export function findTime(value: string): ClockTime | undefined {
    return ALL_TIMES.find((time) => time.value === value);
}

/**
 * A time as the board, the print and the export show it: "1:30 PM", or "13:30" on the 24-hour clock. '' when the value
 * is not a time.
 */
export function formatTime(value: string, clockFormat: ClockFormat): string {
    const time = findTime(value);
    if (!time) {
        return '';
    }

    const hours = Math.floor(time.minutes / MINUTES_PER_HOUR);
    const minutes = padTwo(time.minutes % MINUTES_PER_HOUR);
    if (clockFormat === '24-hour') {
        return `${padTwo(hours)}:${minutes}`;
    }

    // The midnight that ends the day reads 12:00 AM, like the one that starts it.
    const hoursOfDay = hours % 24;
    const meridiem = hoursOfDay < 12 ? 'AM' : 'PM';
    return `${hoursOfDay % 12 || 12}:${minutes} ${meridiem}`;
}

/**
 * A time written short: on the hour, without its minutes ("5 PM" for "5:00 PM"). A time off the hour stays whole ("5:15
 * PM"). So does every time on the 24-hour clock, because "17" does not read as a time.
 */
export function formatShortTime(value: string, clockFormat: ClockFormat): string {
    const time = formatTime(value, clockFormat);

    return clockFormat === '12-hour' ? time.replace(':00 ', ' ') : time;
}

/**
 * A time slot's two times as the exports write them: "8:00 AM - 9:00 AM". A time that is not picked shows as "?". ''
 * when neither is picked.
 *
 * @param isShort whether a time on the hour drops its minutes: "8 AM - 9 AM"
 */
export function formatTimeRange(startTime: string, endTime: string, clockFormat: ClockFormat, isShort = false): string {
    if (!startTime && !endTime) {
        return '';
    }

    const format = isShort ? formatShortTime : formatTime;

    return `${format(startTime, clockFormat) || '?'} - ${format(endTime, clockFormat) || '?'}`;
}

/**
 * The times the board offers: those on the pharmacy's step, from opening to closing. A pharmacy that closes after
 * midnight (or at the hour it opens) gets the times from opening, past midnight, to closing.
 */
export function listOfferedTimes({
    openTime,
    closeTime,
    isOpenAllDay,
    timeStepMinutes,
}: Pick<Settings, 'openTime' | 'closeTime' | 'isOpenAllDay' | 'timeStepMinutes'>): ClockTime[] {
    const timesOnStep = ALL_TIMES.filter((time) => time.minutes % timeStepMinutes === 0);
    const open = findTime(openTime);
    const close = findTime(closeTime);
    if (isOpenAllDay || !open || !close) {
        return timesOnStep;
    }

    if (close.minutes > open.minutes) {
        return timesOnStep.filter((time) => time.minutes >= open.minutes && time.minutes <= close.minutes);
    }

    // Past midnight, '24:00' and '00:00' are the same moment. Leave out '24:00' so midnight is listed once.
    const untilMidnight = timesOnStep.filter((time) => time.minutes >= open.minutes && time.minutes < MINUTES_PER_DAY);
    const afterMidnight = timesOnStep.filter((time) => time.minutes <= close.minutes);
    return [...untilMidnight, ...afterMidnight];
}

/**
 * The time one hour after a start, from the list of offered times. A slot that gets a start ends then until told
 * otherwise. Null when the list ends before that.
 */
export function findHourAfter(startTime: string, times: readonly ClockTime[], timeStepMinutes: number): string | null {
    const startIndex = times.findIndex((time) => time.value === startTime);
    if (startIndex === -1) {
        return null;
    }

    const stepsPerHour = Math.max(1, Math.round(MINUTES_PER_HOUR / timeStepMinutes));
    return times[startIndex + stepsPerHour]?.value ?? null;
}
