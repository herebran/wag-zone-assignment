/**
 * The Settings tab: how the pharmacy uses the board. A setting applies to every day's board. It changes how boards are
 * shown, printed and exported, and never removes anything from a board.
 */
import { FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import ChoiceGroup from '@/components/elements/ChoiceGroup';
import SectionCard from '@/components/elements/SectionCard';
import BoardSections from '@/components/settings/BoardSections';
import OperatingHours from '@/components/settings/OperatingHours';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { NAME_STYLES, ROSTER_ORDERS } from '@/lib/settings';

export default function Settings() {
    const pharmacy = usePharmacy();
    const settings = usePharmacyState((state) => state.settings);

    return (
        <Stack spacing={2.25}>
            <SectionCard
                title='Board display'
                description='How technician names appear in the zone cells. Text export always uses full names, and the original board (PDF) always uses abbreviations.'
            >
                <ChoiceGroup
                    label='Names on the board'
                    choices={NAME_STYLES}
                    value={settings.nameStyle}
                    onChange={(nameStyle) => pharmacy.updateSettings({ nameStyle })}
                />
            </SectionCard>
            <SectionCard
                title='Roster & assignment order'
                description='Sets the order of the Technicians list and of the list you pick from when assigning.'
            >
                <ChoiceGroup
                    label='Roster order'
                    choices={ROSTER_ORDERS}
                    value={settings.rosterOrder}
                    onChange={(rosterOrder) => pharmacy.updateSettings({ rosterOrder })}
                />
            </SectionCard>
            <SectionCard title='Operating hours' description="Controls which times appear in the board's time lists.">
                <OperatingHours />
            </SectionCard>
            <SectionCard
                title='Board sections'
                description="Turn off sections your pharmacy doesn't use. Applies to the board, printing, and export."
            >
                <BoardSections />
            </SectionCard>
            <SectionCard
                title='Original board (PDF)'
                description="How the board is written on Walgreens's own printed board when you export it."
            >
                <FormControlLabel
                    control={
                        <Switch
                            checked={settings.hasShortPdfTimes}
                            onChange={(event) => pharmacy.updateSettings({ hasShortPdfTimes: event.target.checked })}
                        />
                    }
                    label={
                        <Typography variant='body2'>
                            <strong>Short times</strong>: a time on the hour is written without its minutes, 5 PM - 7 PM
                            in place of 5:00 PM - 7:00 PM, which leaves room to write it larger. A time off the hour
                            keeps its minutes (5:15 PM), and so does every time on the 24-hour clock (17:00).
                        </Typography>
                    }
                />
            </SectionCard>
        </Stack>
    );
}
