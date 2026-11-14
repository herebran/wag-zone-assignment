/**
 * The switches for the sections under the zone grid, for a pharmacy that does not use one. A section that is off is
 * left out of the board, the print and the export. What a board has in it is kept.
 */
import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import type { Settings } from '@/lib/records';

interface Section {
    setting: 'hasPhlomometer' | 'hasIc3Calls' | 'hasNotes';
    name: string;
    description: string;
}

const SECTIONS: readonly Section[] = [
    { setting: 'hasPhlomometer', name: 'Phlomometer', description: 'the F1 / F4 / FILL / REV grid of under and above' },
    { setting: 'hasIc3Calls', name: 'Call for IC3', description: 'the F1 / FILL amount and who table' },
    { setting: 'hasNotes', name: 'Other notes and priorities', description: 'the What / When / Who list' },
];

export default function BoardSections() {
    const pharmacy = usePharmacy();
    const settings = usePharmacyState((state) => state.settings);

    const setSection = (setting: Section['setting'], isOn: boolean) => {
        const changes: Partial<Settings> = { [setting]: isOn };
        pharmacy.updateSettings(changes);
    };

    return (
        <Stack spacing={0.5}>
            {SECTIONS.map((section) => (
                <FormControlLabel
                    key={section.setting}
                    control={
                        <Switch
                            checked={settings[section.setting]}
                            onChange={(event) => setSection(section.setting, event.target.checked)}
                        />
                    }
                    label={
                        <Typography variant='body2'>
                            <strong>{section.name}</strong>: {section.description}
                        </Typography>
                    }
                />
            ))}
        </Stack>
    );
}
