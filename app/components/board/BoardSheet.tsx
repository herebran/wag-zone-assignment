/**
 * The open day's sheet: its heading, the zone grid with the buttons that add and remove time slots, and below them the
 * sections that are turned on. The Phlomometer and the calls for IC3 go on the left, the notes on the right.
 */
import { Button, Grid, Paper, Stack } from '@mui/material';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import Ic3Calls from '@/components/board/Ic3Calls';
import Notes from '@/components/board/Notes';
import Phlomometer from '@/components/board/Phlomometer';
import SheetHeading from '@/components/board/SheetHeading';
import ZoneTable from '@/components/board/ZoneTable';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { addTimeSlot, removeLastTimeSlot } from '@/lib/board';

export default function BoardSheet() {
    const pharmacy = usePharmacy();
    const boardDate = usePharmacyState((state) => state.boardDate);
    const board = usePharmacyState((state) => state.board);
    const settings = usePharmacyState((state) => state.settings);

    const hasLeftColumn = settings.hasPhlomometer || settings.hasIc3Calls;
    const hasBothColumns = hasLeftColumn && settings.hasNotes;
    const columnSize = { xs: 12, md: hasBothColumns ? 6 : 12 };

    return (
        <Paper variant='outlined' sx={{ px: { xs: 2, md: 3.5 }, pt: { xs: 2, md: 3.25 }, pb: { xs: 2, md: 3.75 } }}>
            <SheetHeading boardDate={boardDate} />
            <ZoneTable timeSlots={board.timeSlots} settings={settings} />
            <Stack direction='row' spacing={1} sx={{ justifyContent: 'flex-end', mt: 1 }}>
                <Button
                    size='small'
                    variant='outlined'
                    startIcon={<IconPlus />}
                    onClick={() => pharmacy.changeBoard(addTimeSlot)}
                >
                    Add time slot
                </Button>
                <Button
                    size='small'
                    variant='outlined'
                    startIcon={<IconMinus />}
                    disabled={board.timeSlots.length <= 1}
                    onClick={() => pharmacy.changeBoard(removeLastTimeSlot)}
                >
                    Remove last
                </Button>
            </Stack>
            <Grid container spacing={3.25} sx={{ mt: 2 }}>
                {hasLeftColumn && (
                    <Grid size={columnSize}>
                        <Stack spacing={2.75}>
                            {settings.hasPhlomometer && <Phlomometer phlomometer={board.phlomometer} />}
                            {settings.hasIc3Calls && <Ic3Calls ic3Calls={board.ic3Calls} />}
                        </Stack>
                    </Grid>
                )}
                {settings.hasNotes && (
                    <Grid size={columnSize}>
                        <Notes notes={board.notes} />
                    </Grid>
                )}
            </Grid>
        </Paper>
    );
}
