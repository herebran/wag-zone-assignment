/**
 * The dialog that edits a technician's names. Boards save technicians by id, so every board that has them shows the new
 * name.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useId } from 'react';
import { useForm } from 'react-hook-form';
import TechnicianFields from '@/components/roster/TechnicianFields';
import usePharmacy from '@/hooks/usePharmacy';
import { technicianNamesSchema, type TechnicianNames } from '@/lib/names';
import type { Technician } from '@/lib/records';

export interface EditTechnicianDialogProps {
    technician: Technician;
    onClose: () => void;
}

export default function EditTechnicianDialog({ technician, onClose }: EditTechnicianDialogProps) {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const titleId = useId();
    const { control, handleSubmit, formState } = useForm<TechnicianNames>({
        defaultValues: {
            firstName: technician.firstName,
            lastName: technician.lastName,
            abbreviation: technician.abbreviation,
        },
        resolver: zodResolver(technicianNamesSchema),
    });

    // After a failed Save, the form rechecks the names as they are typed.
    const isMissingNames = formState.errors.firstName !== undefined || formState.errors.lastName !== undefined;

    const save = (names: TechnicianNames) => {
        pharmacy.updateTechnician(technician.id, names);
        enqueueSnackbar('Updated');
        onClose();
    };

    const submit = handleSubmit(save);

    return (
        <Dialog open onClose={onClose} maxWidth='xs' fullWidth aria-labelledby={titleId}>
            <Box component='form' noValidate onSubmit={(event) => void submit(event)}>
                <DialogTitle id={titleId}>Edit technician</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ pt: 1 }}>
                        <TechnicianFields control={control} hasAutoFocus />
                        {isMissingNames && <Alert severity='error'>First and last name are both required.</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type='submit' variant='contained'>
                        Save
                    </Button>
                </DialogActions>
            </Box>
        </Dialog>
    );
}
