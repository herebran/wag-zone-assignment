/**
 * Call for IC3: for F1 and for FILL, the count at which the pharmacy calls for help, and who makes the call.
 */
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { memo } from 'react';
import AssignmentCell from '@/components/board/AssignmentCell';
import SheetInput from '@/components/board/SheetInput';
import { SECTION_TABLE_STYLES } from '@/components/board/sheetStyles';
import usePharmacy from '@/hooks/usePharmacy';
import { IC3_LABELS, IC3_QUEUES, setIc3Amount } from '@/lib/board';
import type { Board } from '@/lib/records';

export interface Ic3CallsProps {
    ic3Calls: Board['ic3Calls'];
}

function Ic3Calls({ ic3Calls }: Ic3CallsProps) {
    const pharmacy = usePharmacy();

    return (
        <Box component='section'>
            <Typography variant='sheetSection' sx={{ mb: 1 }}>
                Call for IC3:
            </Typography>
            <Table size='small' aria-label='Call for IC3' sx={[SECTION_TABLE_STYLES, { tableLayout: 'fixed' }]}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 80 }} />
                        <TableCell sx={{ width: 120 }}>Amount:</TableCell>
                        <TableCell>Who:</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {IC3_QUEUES.map((queue) => (
                        <TableRow key={queue}>
                            <TableCell component='th' scope='row'>
                                {IC3_LABELS[queue]}
                            </TableCell>
                            <TableCell>
                                <SheetInput
                                    isNumber
                                    label={`${IC3_LABELS[queue]} amount`}
                                    placeholder='amount'
                                    value={ic3Calls[queue].amount}
                                    onChange={(amount) =>
                                        pharmacy.changeBoard(
                                            (board) => setIc3Amount(board, queue, amount),
                                            `ic3Call:${queue}`
                                        )
                                    }
                                />
                            </TableCell>
                            <TableCell>
                                <AssignmentCell
                                    target={{ kind: 'ic3Call', queue }}
                                    technicianIds={ic3Calls[queue].technicianIds}
                                    label={`the call for IC3 on ${queue}`}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

export default memo(Ic3Calls);
