/**
 * The technicians assigned to one place on the board: a chip for each, and a button that opens the roster to add
 * another. Several people can share a station. The same cell is used in the zone grid, the calls for IC3 and the notes.
 */
import { Box, Chip, IconButton, Menu, MenuItem, Stack, Tooltip } from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import { bindMenu, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useId } from 'react';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { assignTechnician, unassignTechnician, type AssignmentTarget } from '@/lib/board';
import { findTechnician, formatBoardName, formatFullName, formatRosterName } from '@/lib/names';

export interface AssignmentCellProps {
    /** Where on the board the cell is. */
    target: AssignmentTarget;
    technicianIds: readonly number[];

    /** The cell's name for screen readers: 'Out Window, time slot 1'. */
    label: string;

    /** True for the CPW Lead's cells, whose names are shown in the app's blue. */
    isLead?: boolean;
}

export default function AssignmentCell({ target, technicianIds, label, isLead = false }: AssignmentCellProps) {
    const pharmacy = usePharmacy();
    const technicians = usePharmacyState((state) => state.technicians);
    const nameStyle = usePharmacyState((state) => state.settings.nameStyle);
    const rosterOrder = usePharmacyState((state) => state.settings.rosterOrder);
    const menu = usePopupState({ variant: 'popover', popupId: useId() });

    const unassigned = technicians.filter((technician) => !technicianIds.includes(technician.id));

    const assign = (technicianId: number) => {
        pharmacy.changeBoard((board) => assignTechnician(board, target, technicianId));
        menu.close();
    };

    const unassign = (technicianId: number) => {
        pharmacy.changeBoard((board) => unassignTechnician(board, target, technicianId));
    };

    return (
        <>
            <Stack
                direction='row'
                spacing={0.5}
                useFlexGap
                sx={{
                    flexWrap: 'wrap',
                    alignItems: 'center',

                    // The assign button is faint until the mouse or the keyboard is on its cell, so the names stand
                    // out. On a touch screen, where nothing hovers, it always shows.
                    '& .assign-button': { opacity: 0.3 },
                    '&:hover .assign-button, &:focus-within .assign-button': { opacity: 1 },
                    '@media (hover: none)': { '& .assign-button': { opacity: 1 } },
                }}
            >
                {technicianIds.map((technicianId) => {
                    const technician = findTechnician(technicians, technicianId);

                    return (
                        // A screen reader reads the chip's text as its name, and the full name as its description.
                        <Tooltip key={technicianId} describeChild title={formatFullName(technician)}>
                            <Chip
                                size='small'
                                variant='outlined'
                                color={isLead ? 'primary' : 'default'}
                                label={formatBoardName(technician, nameStyle)}
                                onDelete={() => unassign(technicianId)}
                                sx={{ maxWidth: '100%', bgcolor: 'background.paper', fontWeight: 700 }}
                            />
                        </Tooltip>
                    );
                })}
                <IconButton
                    className='assign-button'
                    size='small'
                    color='primary'
                    aria-label={`Assign a technician to ${label}`}
                    {...bindTrigger(menu)}
                    sx={{ p: 0.375, fontSize: '0.95rem' }}
                >
                    <IconPlus />
                </IconButton>
            </Stack>
            <Menu {...bindMenu(menu)} slotProps={{ paper: { sx: { maxHeight: 360 } }, list: { dense: true } }}>
                {unassigned.map((technician) => (
                    <MenuItem key={technician.id} onClick={() => assign(technician.id)}>
                        {formatRosterName(technician, rosterOrder)}
                    </MenuItem>
                ))}
                {unassigned.length === 0 && (
                    <MenuItem disabled>
                        <Box component='span' sx={{ whiteSpace: 'normal', maxWidth: 240 }}>
                            {technicians.length === 0
                                ? 'No technicians yet. Add your team on the Technicians tab.'
                                : 'Everyone on the roster is assigned here.'}
                        </Box>
                    </MenuItem>
                )}
            </Menu>
        </>
    );
}
