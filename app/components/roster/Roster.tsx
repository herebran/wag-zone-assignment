/**
 * The Technicians tab: the pharmacy's roster. Anyone on it can be assigned on the board. Each has a role, and an
 * abbreviation for the board's cells. The list shows their initials when there is no abbreviation.
 */
import {
    Button,
    Chip,
    MenuItem,
    Select,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import ConfirmDialog from '@/components/elements/ConfirmDialog';
import SectionCard from '@/components/elements/SectionCard';
import AddTechnicianForm from '@/components/roster/AddTechnicianForm';
import EditTechnicianDialog from '@/components/roster/EditTechnicianDialog';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { formatFullName, formatInitials, ROLES } from '@/lib/names';
import type { RosterOrder, Technician } from '@/lib/records';
import { FIXED_WIDTH_FONT } from '@/theme';

export default function Roster() {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const technicians = usePharmacyState((state) => state.technicians);
    const rosterOrder = usePharmacyState((state) => state.settings.rosterOrder);
    const [editedTechnician, setEditedTechnician] = useState<Technician | null>(null);

    // Kept apart from the open flag, so the dialog still shows the name while it closes.
    const [technicianToDelete, setTechnicianToDelete] = useState<Technician | null>(null);
    const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

    const askToDelete = (technician: Technician) => {
        setTechnicianToDelete(technician);
        setIsConfirmingDelete(true);
    };

    const deleteTechnician = () => {
        if (technicianToDelete) {
            pharmacy.deleteTechnician(technicianToDelete.id);
            enqueueSnackbar('Deleted');
        }
    };

    return (
        <SectionCard title='Pharmacy roster' description={describeCount(technicians.length)}>
            <AddTechnicianForm />
            {technicians.length === 0 ? (
                <Typography color='text.secondary' sx={{ py: 3.5, textAlign: 'center' }}>
                    No technicians yet. Add your team above, and they can be assigned in every cell of the board.
                </Typography>
            ) : (
                <TableContainer>
                    <Table size='small' aria-label='Pharmacy roster'>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: '40%' }}>Name</TableCell>
                                <TableCell sx={{ width: '16%' }}>Abbr.</TableCell>
                                <TableCell sx={{ width: '18%' }}>Role</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {technicians.map((technician) => (
                                <TableRow key={technician.id} hover>
                                    <TableCell>
                                        <RosterName technician={technician} rosterOrder={rosterOrder} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            size='small'
                                            variant='outlined'
                                            color='primary'
                                            label={technician.abbreviation || formatInitials(technician)}
                                            sx={{
                                                minWidth: 44,
                                                borderRadius: 1,
                                                fontFamily: FIXED_WIDTH_FONT,
                                                fontWeight: 700,
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            size='small'
                                            fullWidth
                                            value={technician.role}
                                            onChange={(event) =>
                                                pharmacy.setTechnicianRole(technician.id, event.target.value)
                                            }
                                            inputProps={{ 'aria-label': `Role of ${formatFullName(technician)}` }}
                                            sx={{ maxWidth: 170, fontSize: '0.875rem' }}
                                        >
                                            {listRoles(technician.role).map((role) => (
                                                <MenuItem key={role} value={role}>
                                                    {role}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction='row' spacing={1} sx={{ justifyContent: 'flex-end' }}>
                                            <Button
                                                size='small'
                                                variant='outlined'
                                                startIcon={<IconEdit />}
                                                aria-label={`Edit ${formatFullName(technician)}`}
                                                onClick={() => setEditedTechnician(technician)}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size='small'
                                                variant='outlined'
                                                color='error'
                                                startIcon={<IconTrash />}
                                                aria-label={`Delete ${formatFullName(technician)}`}
                                                onClick={() => askToDelete(technician)}
                                            >
                                                Delete
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {editedTechnician && (
                <EditTechnicianDialog technician={editedTechnician} onClose={() => setEditedTechnician(null)} />
            )}
            <ConfirmDialog
                isOpen={isConfirmingDelete}
                title='Delete this technician?'
                confirmLabel='Delete'
                isDestructive
                onConfirm={deleteTechnician}
                onClose={() => setIsConfirmingDelete(false)}
            >
                {technicianToDelete && formatFullName(technicianToDelete)} is taken off the roster. The boards that
                assigned them will show them as "removed".
            </ConfirmDialog>
        </SectionCard>
    );
}

/**
 * How many are on the roster, shown under the panel's title. '' when there is no one.
 */
function describeCount(count: number): string {
    if (count === 0) {
        return '';
    }

    return count === 1 ? '1 technician' : `${count} technicians`;
}

/**
 * The roles to pick from. A role from a backup that is not on the list is added, so the technician keeps it until
 * another is picked.
 */
function listRoles(currentRole: string): readonly string[] {
    return ROLES.includes(currentRole) ? ROLES : [...ROLES, currentRole];
}

interface RosterNameProps {
    technician: Technician;
    rosterOrder: RosterOrder;
}

/**
 * A technician's name in the roster. The name the roster is sorted by comes first, in bold.
 */
function RosterName({ technician, rosterOrder }: RosterNameProps) {
    if (rosterOrder === 'lastName') {
        return (
            <>
                <strong>{technician.lastName}</strong>, {technician.firstName}
            </>
        );
    }

    return (
        <>
            <strong>{technician.firstName}</strong> {technician.lastName}
        </>
    );
}
