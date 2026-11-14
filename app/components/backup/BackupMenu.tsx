/**
 * The Backup menu: saves everything in the browser as a .json file, and restores from one. The browser keeps the data
 * on this computer only, so a backup is how it is kept safe and moved to another computer.
 */
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { IconChevronDown, IconDeviceFloppy, IconFileDownload, IconFileUpload } from '@tabler/icons-react';
import { bindMenu, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useSnackbar } from 'notistack';
import { useId, useRef, useState, type ChangeEvent } from 'react';
import RestoreBackupDialog from '@/components/backup/RestoreBackupDialog';
import usePharmacy from '@/hooks/usePharmacy';
import { nameBackupFile, BackupError, readBackup, type Backup } from '@/lib/backup';
import { toIsoDate } from '@/lib/dates';
import { downloadText } from '@/lib/download';

export default function BackupMenu() {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const [backupToRestore, setBackupToRestore] = useState<Backup | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);
    const buttonId = useId();
    const menu = usePopupState({ variant: 'popover', popupId: useId() });

    const downloadBackup = () => {
        menu.close();

        const fileName = nameBackupFile(toIsoDate(pharmacy.now()));
        downloadText(fileName, JSON.stringify(pharmacy.createBackup(), null, 2), 'application/json');
        enqueueSnackbar(`Backup saved as ${fileName}`);
    };

    const chooseFile = () => {
        menu.close();
        fileInput.current?.click();
    };

    const readFile = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];

        // Clear the field, so picking the same file again still counts as a change.
        event.target.value = '';
        if (!file) {
            return;
        }

        file.text().then(
            (text) => {
                try {
                    setBackupToRestore(readBackup(text));
                } catch (error) {
                    enqueueSnackbar(error instanceof BackupError ? error.message : 'That file could not be read.', {
                        variant: 'error',
                    });
                }
            },
            () => enqueueSnackbar('That file could not be read.', { variant: 'error' })
        );
    };

    const restoreBackup = () => {
        if (!backupToRestore) {
            return;
        }

        pharmacy.restoreBackup(backupToRestore);
        setBackupToRestore(null);
        enqueueSnackbar('Backup restored');
    };

    return (
        <>
            <Button
                id={buttonId}
                color='inherit'
                variant='outlined'
                size='small'
                startIcon={<IconDeviceFloppy />}
                endIcon={<IconChevronDown />}
                {...bindTrigger(menu)}
            >
                Backup
            </Button>
            <Menu {...bindMenu(menu)} slotProps={{ list: { 'aria-labelledby': buttonId } }}>
                <MenuItem onClick={downloadBackup}>
                    <ListItemIcon>
                        <IconFileDownload size={20} />
                    </ListItemIcon>
                    <ListItemText
                        primary='Save a backup (.json)'
                        secondary='The roster, the settings and every board'
                    />
                </MenuItem>
                <MenuItem onClick={chooseFile}>
                    <ListItemIcon>
                        <IconFileUpload size={20} />
                    </ListItemIcon>
                    <ListItemText primary='Restore from a backup…' secondary='Replaces what this browser keeps' />
                </MenuItem>
            </Menu>
            <input
                ref={fileInput}
                type='file'
                accept='.json,application/json'
                hidden
                aria-label='Backup file to restore'
                onChange={readFile}
            />
            {backupToRestore && (
                <RestoreBackupDialog
                    backup={backupToRestore}
                    onRestore={restoreBackup}
                    onClose={() => setBackupToRestore(null)}
                />
            )}
        </>
    );
}
