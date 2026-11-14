/**
 * A setting with a few choices, one of which is on: a row of buttons, with a hint below for the one that is on.
 */
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import type { SettingChoice } from '@/lib/settings';

export interface ChoiceGroupProps<Value extends string | number> {
    /** The group's name for screen readers: 'Time format'. */
    label: string;
    choices: readonly SettingChoice<Value>[];
    value: Value;
    onChange: (value: Value) => void;
}

export default function ChoiceGroup<Value extends string | number>({
    label,
    choices,
    value,
    onChange,
}: ChoiceGroupProps<Value>) {
    const chosen = choices.find((choice) => choice.value === value);

    // Clicking the choice that is on would turn it off. Ignore that, so one choice is always on.
    const choose = (_event: unknown, chosenValue: Value | null) => {
        if (chosenValue !== null) {
            onChange(chosenValue);
        }
    };

    return (
        <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
            <ToggleButtonGroup
                exclusive
                size='small'
                color='primary'
                value={value}
                onChange={choose}
                aria-label={label}
            >
                {choices.map((choice) => (
                    <ToggleButton key={choice.value} value={choice.value} sx={{ px: 1.75 }}>
                        {choice.label}
                    </ToggleButton>
                ))}
            </ToggleButtonGroup>
            {chosen && (
                <Typography variant='body2' color='text.secondary'>
                    {chosen.hint}
                </Typography>
            )}
        </Stack>
    );
}
