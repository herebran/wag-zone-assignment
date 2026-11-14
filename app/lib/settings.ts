/**
 * The settings a pharmacy starts with, and the label and hint of each choice on the Settings tab.
 */
import type { ClockFormat, ExportStyle, NameStyle, RosterOrder, Settings, TimeStepMinutes } from '@/lib/records';

export const DEFAULT_SETTINGS: Settings = {
    openTime: '08:00',
    closeTime: '22:00',
    isOpenAllDay: false,
    clockFormat: '12-hour',
    timeStepMinutes: 15,
    nameStyle: 'abbreviation',
    rosterOrder: 'firstName',
    hasPhlomometer: true,
    hasIc3Calls: true,
    hasNotes: true,
    hiddenZones: [],
    exportStyle: 'list',
    hasShortPdfTimes: true,
};

/**
 * One choice of a setting: its value, its button label, and a hint saying what it does.
 */
export interface SettingChoice<Value> {
    value: Value;
    label: string;
    hint: string;
}

export const NAME_STYLES: readonly SettingChoice<NameStyle>[] = [
    {
        value: 'abbreviation',
        label: 'Abbreviations',
        hint: 'Cells show the abbreviation (or "First L." when no abbreviation is set).',
    },
    { value: 'lastFirst', label: 'Last, First', hint: 'Cells show "Last, First".' },
    { value: 'firstLast', label: 'First Last', hint: 'Cells show "First Last".' },
    { value: 'firstName', label: 'First name only', hint: 'Cells show the first name only.' },
];

export const ROSTER_ORDERS: readonly SettingChoice<RosterOrder>[] = [
    {
        value: 'firstName',
        label: 'First name',
        hint: 'Ordered by first name (A to Z). The list to assign from reads "First Last".',
    },
    {
        value: 'lastName',
        label: 'Last name',
        hint: 'Ordered by last name (A to Z). The list to assign from reads "Last, First".',
    },
];

export const CLOCK_FORMATS: readonly SettingChoice<ClockFormat>[] = [
    {
        value: '12-hour',
        label: '12-hour (AM/PM)',
        hint: 'Times read as 1:30 PM. Applies to the board, printing and export.',
    },
    {
        value: '24-hour',
        label: '24-hour (military)',
        hint: 'Times read as 13:30. Applies to the board, printing and export.',
    },
];

const STEP_HINT_ENDING = "Times already on the board that don't land on the new step are kept and marked.";

export const TIME_STEPS: readonly SettingChoice<TimeStepMinutes>[] = [
    { value: 15, label: '15 min', hint: `Times step by 15 minutes. ${STEP_HINT_ENDING}` },
    { value: 30, label: '30 min', hint: `Times step by 30 minutes. ${STEP_HINT_ENDING}` },
    { value: 60, label: '1 hour', hint: `Times step by 1 hour. ${STEP_HINT_ENDING}` },
];

export const EXPORT_STYLES: readonly SettingChoice<ExportStyle>[] = [
    {
        value: 'list',
        label: 'Simple list',
        hint: 'One time slot after another. Reads right in any font: paste it into the workflow board or a chat.',
    },
    {
        value: 'pdf',
        label: 'Original board (PDF)',
        hint: "Walgreens's own printed board with this day's board written on it, in abbreviations as when it is filled in by hand. It has room for 8 time slots and one note of your own.",
    },
];
