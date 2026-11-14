/**
 * The start or the end of a time slot: a list of the times the pharmacy's hours and step allow. A time picked before
 * the hours or the step changed stays in the list, marked with a dot, until another is picked.
 */
import { Box, MenuItem, Select } from '@mui/material';
import type { ClockFormat } from '@/lib/records';
import { formatTime, type ClockTime } from '@/lib/times';
import { FIXED_WIDTH_FONT } from '@/theme';

/** The mark after a time that the pharmacy's hours and step no longer offer. */
const OFF_LIST_MARK = '•';

export interface TimeSelectProps {
    /** The list's name for screen readers: 'Start of time slot 1'. */
    label: string;

    /** Shown while no time is picked: 'Start'. */
    placeholder: string;
    value: string;
    times: readonly ClockTime[];
    clockFormat: ClockFormat;
    onChange: (time: string) => void;
}

export default function TimeSelect({ label, placeholder, value, times, clockFormat, onChange }: TimeSelectProps) {
    const isOffList = value !== '' && !times.some((time) => time.value === value);

    return (
        <Select
            variant='standard'
            disableUnderline
            displayEmpty
            fullWidth
            value={value}
            onChange={(event) => onChange(event.target.value)}
            renderValue={(chosen) =>
                chosen ? formatChoice(chosen, clockFormat, isOffList) : <Placeholder text={placeholder} />
            }
            inputProps={{ 'aria-label': label }}
            IconComponent={NoIcon}
            MenuProps={{ slotProps: { paper: { sx: { maxHeight: 320 } }, list: { dense: true } } }}
            sx={{
                borderRadius: 0.5,
                bgcolor: 'rgba(255, 255, 255, 0.75)',
                fontFamily: FIXED_WIDTH_FONT,
                fontSize: '0.72rem',
                fontWeight: 600,
                textAlign: 'center',
                '&:hover, &.Mui-focused': { bgcolor: 'common.white' },

                // No arrow is shown, so no room is kept for one.
                '& .MuiSelect-select': { px: '4px !important', py: 0.375 },
            }}
        >
            <MenuItem value=''>
                <em>No time</em>
            </MenuItem>
            {isOffList && <MenuItem value={value}>{formatChoice(value, clockFormat, true)}</MenuItem>}
            {times.map((time) => (
                <MenuItem key={time.value} value={time.value}>
                    {formatTime(time.value, clockFormat)}
                </MenuItem>
            ))}
        </Select>
    );
}

function formatChoice(value: string, clockFormat: ClockFormat, isOffList: boolean): string {
    const text = formatTime(value, clockFormat) || value;

    return isOffList ? `${text} ${OFF_LIST_MARK}` : text;
}

interface PlaceholderProps {
    text: string;
}

function Placeholder({ text }: PlaceholderProps) {
    return (
        <Box component='span' sx={{ color: 'text.disabled', fontWeight: 400 }}>
            {text}
        </Box>
    );
}

/**
 * Replaces the list's arrow with nothing. The column is too narrow for a time and an arrow.
 */
function NoIcon() {
    return null;
}
