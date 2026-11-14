/**
 * The form that adds a technician to the roster: type the names, then press Enter or the button. The form then clears
 * and puts the cursor back in the first name, so a whole team can be typed in quickly.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Button } from '@mui/material';
import { IconUserPlus } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useForm } from 'react-hook-form';
import TechnicianFields from '@/components/roster/TechnicianFields';
import usePharmacy from '@/hooks/usePharmacy';
import { technicianNamesSchema, type TechnicianNames } from '@/lib/names';

const NO_NAMES: TechnicianNames = { firstName: '', lastName: '', abbreviation: '' };

export default function AddTechnicianForm() {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const { control, handleSubmit, reset, setFocus } = useForm<TechnicianNames>({
        defaultValues: NO_NAMES,
        resolver: zodResolver(technicianNamesSchema),
    });

    const addTechnician = (names: TechnicianNames) => {
        const technician = pharmacy.addTechnician(names);
        enqueueSnackbar(`${technician.firstName} ${technician.lastName} added`);

        // Clear the form but keep its fields registered, so the cursor can go back to the first name.
        reset(NO_NAMES, { keepFieldsRef: true });
        setFocus('firstName');
    };

    // The form already marks the missing name and puts the cursor in it. This adds a message saying what is wrong.
    const sayNamesAreMissing = () => {
        enqueueSnackbar('First and last name are required.', { variant: 'error' });
    };

    const submit = handleSubmit(addTechnician, sayNamesAreMissing);

    return (
        <Box
            component='form'
            aria-label='Add a technician'
            noValidate
            onSubmit={(event) => void submit(event)}
            sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 200px auto' },
                gap: 1.5,
                alignItems: 'center',
                mb: 2.25,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                bgcolor: 'action.hover',
                '& .MuiInputBase-root': { bgcolor: 'background.paper' },
            }}
        >
            <TechnicianFields control={control} />
            <Button type='submit' variant='contained' startIcon={<IconUserPlus />} sx={{ height: 40 }}>
                Add technician
            </Button>
        </Box>
    );
}
