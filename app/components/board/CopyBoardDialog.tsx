/**
 * Copy from another board: starts the open day from a saved one (tomorrow from today) instead of from scratch.
 * Everything on the board comes across, and undo takes the copy back.
 */
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    MenuItem,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { useId, useState } from 'react';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { hasBoardContent } from '@/lib/board';
import { formatBoardDate, toIsoDate } from '@/lib/dates';

export interface CopyBoardDialogProps {
    /** The saved boards to copy from, newest first. The open day's own board is not among them. */
    sourceDates: readonly string[];
    onClose: () => void;
}

export default function CopyBoardDialog({ sourceDates, onClose }: CopyBoardDialogProps) {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const boardDate = usePharmacyState((state) => state.boardDate);
    const board = usePharmacyState((state) => state.board);
    const titleId = useId();
    const [today] = useState(() => toIsoDate(pharmacy.now()));

    // Start on the newest board that is not in the future, which is the one most often wanted.
    const [sourceDate, setSourceDate] = useState(() => sourceDates.find((date) => date < today) ?? sourceDates[0]);

    const copy = () => {
        const isCopied = pharmacy.copyBoardFrom(sourceDate);
        if (isCopied) {
            enqueueSnackbar(`Copied from ${formatBoardDate(sourceDate)}`);
        } else {
            enqueueSnackbar('That board could not be found.', { variant: 'error' });
        }
        onClose();
    };

    return (
        <Dialog open onClose={onClose} maxWidth='xs' fullWidth aria-labelledby={titleId}>
            <DialogTitle id={titleId}>Copy from another board</DialogTitle>
            <DialogContent>
                <Stack spacing={2} sx={{ pt: 1 }}>
                    <TextField
                        select
                        fullWidth
                        label='Choose a saved board'
                        value={sourceDate}
                        onChange={(event) => setSourceDate(event.target.value)}
                    >
                        {sourceDates.map((date) => (
                            <MenuItem key={date} value={date}>
                                {formatBoardDate(date)}
                                {date > today && ' (upcoming)'}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Typography variant='body2' color='text.secondary'>
                        Copies the time slots, zone assignments, Phlomometer, IC3 and notes onto{' '}
                        {formatBoardDate(boardDate)}.
                    </Typography>
                    {hasBoardContent(board) && (
                        <Alert severity='warning'>
                            This replaces everything already on this board. You can undo with Ctrl+Z.
                        </Alert>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={copy}>
                    Copy
                </Button>
            </DialogActions>
        </Dialog>
    );
}
