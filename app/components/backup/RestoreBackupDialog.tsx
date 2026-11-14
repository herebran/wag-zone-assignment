/**
 * Asks before a backup is restored. Restoring replaces the roster, the settings and every board in the browser, so the
 * dialog says what the file holds and when it was made.
 */
import {
    Alert,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
} from '@mui/material';
import { useId } from 'react';
import type { Backup } from '@/lib/backup';
import { formatMoment } from '@/lib/dates';

export interface RestoreBackupDialogProps {
    backup: Backup;
    onRestore: () => void;
    onClose: () => void;
}

export default function RestoreBackupDialog({ backup, onRestore, onClose }: RestoreBackupDialogProps) {
    const titleId = useId();
    const boardCount = Object.keys(backup.boards).length;
    const technicianCount = backup.technicians.length;

    return (
        <Dialog open onClose={onClose} maxWidth='xs' fullWidth aria-labelledby={titleId}>
            <DialogTitle id={titleId}>Restore this backup?</DialogTitle>
            <DialogContent>
                <Stack spacing={2}>
                    <DialogContentText>
                        The backup{describeAge(backup.exportedAt)} has {formatCount(technicianCount, 'technician')} and{' '}
                        {formatCount(boardCount, 'saved board')}, with the pharmacy's settings.
                    </DialogContentText>
                    <Alert severity='warning'>
                        Restoring replaces the roster, the settings and every board kept in this browser.
                    </Alert>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant='contained' onClick={onRestore}>
                    Restore
                </Button>
            </DialogActions>
        </Dialog>
    );
}

/**
 * A count with its noun: "1 technician", "12 technicians".
 */
function formatCount(count: number, thing: string): string {
    return count === 1 ? `1 ${thing}` : `${count} ${thing}s`;
}

/**
 * When the backup was made: " of Nov 12, 2026, 2:05 PM". '' when the file does not say.
 */
function describeAge(exportedAt: string): string {
    const madeAt = formatMoment(exportedAt);

    return madeAt ? ` of ${madeAt}` : '';
}
