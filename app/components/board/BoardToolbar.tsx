/**
 * The controls above the sheet: the board's date, the list of saved boards, the zones in use, undo and redo, and the
 * buttons that clear the board, copy another day over it, or delete it.
 */
import { Button, ButtonGroup, MenuItem, Stack, TextField } from '@mui/material';
import { IconArrowBackUp, IconArrowForwardUp, IconCopy, IconEraser, IconTrash } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import BoardDatePicker from '@/components/board/BoardDatePicker';
import CopyBoardDialog from '@/components/board/CopyBoardDialog';
import ZonesMenu from '@/components/board/ZonesMenu';
import ConfirmDialog from '@/components/elements/ConfirmDialog';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { formatBoardDate } from '@/lib/dates';

/** How many saved boards the lists show, newest first. Older ones are reached by date. */
const LISTED_BOARD_COUNT = 60;

export default function BoardToolbar() {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const boardDate = usePharmacyState((state) => state.boardDate);
    const isBoardSaved = usePharmacyState((state) => state.isBoardSaved);
    const savedBoardDates = usePharmacyState((state) => state.savedBoardDates);
    const canUndo = usePharmacyState((state) => state.canUndo);
    const canRedo = usePharmacyState((state) => state.canRedo);
    const [openDialog, setOpenDialog] = useState<'clear' | 'delete' | 'copy' | null>(null);

    const closeDialog = () => setOpenDialog(null);

    // Always list the open day's board, even when it is too old for the list, so the list can show it as selected.
    const listedDates = savedBoardDates.slice(0, LISTED_BOARD_COUNT);
    if (isBoardSaved && !listedDates.includes(boardDate)) {
        listedDates.push(boardDate);
    }
    const copySourceDates = savedBoardDates.filter((date) => date !== boardDate).slice(0, LISTED_BOARD_COUNT);

    const openCopyDialog = () => {
        if (copySourceDates.length === 0) {
            enqueueSnackbar('There are no other saved boards to copy from yet.', { variant: 'error' });
            return;
        }

        setOpenDialog('copy');
    };

    const clearBoard = () => {
        pharmacy.clearBoard();
        enqueueSnackbar('Board cleared');
    };

    const deleteBoard = () => {
        pharmacy.deleteBoard();
        enqueueSnackbar('Board deleted');
    };

    return (
        <Stack
            direction='row'
            spacing={1.25}
            useFlexGap
            // Make the buttons as tall as the fields next to them.
            sx={{ flexWrap: 'wrap', alignItems: 'center', '& .MuiButton-root': { height: 40 } }}
        >
            <BoardDatePicker />
            <TextField
                select
                size='small'
                label='Saved boards'
                value={isBoardSaved ? boardDate : ''}
                disabled={listedDates.length === 0}
                onChange={(event) => pharmacy.openBoard(event.target.value)}
                slotProps={{ inputLabel: { shrink: true }, select: { displayEmpty: true } }}
                sx={{ width: 210 }}
            >
                <MenuItem value='' disabled>
                    {listedDates.length === 0 ? 'None yet' : 'Pick a saved board'}
                </MenuItem>
                {listedDates.map((date) => (
                    <MenuItem key={date} value={date}>
                        {formatBoardDate(date)}
                    </MenuItem>
                ))}
            </TextField>
            <ZonesMenu />
            <ButtonGroup variant='outlined' aria-label='Undo and redo'>
                <Button
                    startIcon={<IconArrowBackUp />}
                    disabled={!canUndo}
                    title='Undo (Ctrl+Z)'
                    aria-keyshortcuts='Control+Z'
                    onClick={pharmacy.undo}
                >
                    Undo
                </Button>
                <Button
                    startIcon={<IconArrowForwardUp />}
                    disabled={!canRedo}
                    title='Redo (Ctrl+Y)'
                    aria-keyshortcuts='Control+Y'
                    onClick={pharmacy.redo}
                >
                    Redo
                </Button>
            </ButtonGroup>
            <Button variant='outlined' startIcon={<IconEraser />} onClick={() => setOpenDialog('clear')}>
                Clear board
            </Button>
            <Button variant='outlined' startIcon={<IconCopy />} onClick={openCopyDialog}>
                Copy from…
            </Button>
            <Button
                variant='outlined'
                color='error'
                startIcon={<IconTrash />}
                disabled={!isBoardSaved}
                onClick={() => setOpenDialog('delete')}
            >
                Delete this board
            </Button>

            <ConfirmDialog
                isOpen={openDialog === 'clear'}
                title='Clear this board?'
                confirmLabel='Clear board'
                onConfirm={clearBoard}
                onClose={closeDialog}
            >
                Every time, assignment, number and note on this board is taken off. You can undo this with Ctrl+Z.
            </ConfirmDialog>
            <ConfirmDialog
                isOpen={openDialog === 'delete'}
                title='Delete this board?'
                confirmLabel='Delete board'
                isDestructive
                onConfirm={deleteBoard}
                onClose={closeDialog}
            >
                The saved board for {formatBoardDate(boardDate)} is deleted for good. This cannot be undone.
            </ConfirmDialog>
            {openDialog === 'copy' && <CopyBoardDialog sourceDates={copySourceDates} onClose={closeDialog} />}
        </Stack>
    );
}
