/**
 * The pharmacy's hours, which the board's time lists run between, with the clock format and the step between times. A
 * 24-hour pharmacy gets every time of the day.
 */
import { Checkbox, FormControlLabel, FormLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import ChoiceGroup from '@/components/elements/ChoiceGroup';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import type { Settings } from '@/lib/records';
import { CLOCK_FORMATS, TIME_STEPS } from '@/lib/settings';
import { listOfferedTimes, ALL_TIMES, formatTime, OPENING_TIMES } from '@/lib/times';

export default function OperatingHours() {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const settings = usePharmacyState((state) => state.settings);

    const stepLabel = settings.timeStepMinutes === 60 ? 'hour' : `${settings.timeStepMinutes} minutes`;

    const setOpenAllDay = (isOpenAllDay: boolean) => {
        pharmacy.updateSettings({ isOpenAllDay });
        enqueueSnackbar(isOpenAllDay ? '24-hour mode on' : '24-hour mode off');
    };

    return (
        <Stack spacing={2.5}>
            <Stack spacing={1.5}>
                <FormControlLabel
                    label={`24-hour pharmacy: every ${stepLabel}, all day`}
                    control={
                        <Checkbox
                            checked={settings.isOpenAllDay}
                            onChange={(event) => setOpenAllDay(event.target.checked)}
                        />
                    }
                />
                <Stack direction='row' spacing={2} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                        select
                        size='small'
                        label='Pharmacy opens'
                        value={settings.openTime}
                        disabled={settings.isOpenAllDay}
                        onChange={(event) => pharmacy.updateSettings({ openTime: event.target.value })}
                        sx={{ width: 160 }}
                    >
                        {OPENING_TIMES.map((time) => (
                            <MenuItem key={time.value} value={time.value}>
                                {formatTime(time.value, settings.clockFormat)}
                            </MenuItem>
                        ))}
                    </TextField>
                    <TextField
                        select
                        size='small'
                        label='Pharmacy closes'
                        value={settings.closeTime}
                        disabled={settings.isOpenAllDay}
                        onChange={(event) => pharmacy.updateSettings({ closeTime: event.target.value })}
                        sx={{ width: 190 }}
                    >
                        {ALL_TIMES.map((time) => (
                            <MenuItem key={time.value} value={time.value}>
                                {formatTime(time.value, settings.clockFormat)}
                                {time.value === '24:00' && ' (midnight)'}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Typography variant='body2' color='text.secondary'>
                        {describeTimes(settings)}
                    </Typography>
                </Stack>
            </Stack>
            <Stack spacing={1}>
                <FormLabel>Time format</FormLabel>
                <ChoiceGroup
                    label='Time format'
                    choices={CLOCK_FORMATS}
                    value={settings.clockFormat}
                    onChange={(clockFormat) => pharmacy.updateSettings({ clockFormat })}
                />
            </Stack>
            <Stack spacing={1}>
                <FormLabel>Time increment</FormLabel>
                <ChoiceGroup
                    label='Time increment'
                    choices={TIME_STEPS}
                    value={settings.timeStepMinutes}
                    onChange={(timeStepMinutes) => pharmacy.updateSettings({ timeStepMinutes })}
                />
            </Stack>
        </Stack>
    );
}

/**
 * A summary of the hours and the step: how many times the board offers, and from when to when.
 */
function describeTimes(settings: Settings): string {
    const count = listOfferedTimes(settings).length;
    if (settings.isOpenAllDay) {
        const stepLabel = settings.timeStepMinutes === 60 ? '1-hour' : `${settings.timeStepMinutes}-minute`;

        return `All day, in ${stepLabel} steps (${count} times).`;
    }

    const openTime = formatTime(settings.openTime, settings.clockFormat);
    const closeTime = formatTime(settings.closeTime, settings.clockFormat);
    return `${count} time options (${openTime} to ${closeTime}).`;
}
