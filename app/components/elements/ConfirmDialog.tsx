/**
 * A dialog that asks before something that cannot be undone, or that replaces what is there. It says what will happen,
 * with a button to go ahead and a button to cancel.
 */
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { useId, type ReactNode } from 'react';

export interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;

    /** What will happen, and what will be lost. */
    children: ReactNode;

    /** The label of the button that goes ahead, named for what it does: 'Delete board'. */
    confirmLabel: string;

    /** Makes that button red, for something that cannot be undone. */
    isDestructive?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export default function ConfirmDialog({
    isOpen,
    title,
    children,
    confirmLabel,
    isDestructive = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    const titleId = useId();
    const textId = useId();

    const confirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth='xs'
            fullWidth
            aria-labelledby={titleId}
            aria-describedby={textId}
        >
            <DialogTitle id={titleId}>{title}</DialogTitle>
            <DialogContent>
                <DialogContentText id={textId}>{children}</DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button variant='contained' color={isDestructive ? 'error' : 'primary'} onClick={confirm} autoFocus>
                    {confirmLabel}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
