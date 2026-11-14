/**
 * The Phlomometer's thresholds: for each queue, the count it should stay under and the count above which it needs help.
 * Two queues to a row, as on the sheet.
 */
import { Box, Stack, Table, TableBody, TableCell, TableRow, Typography } from '@mui/material';
import { Fragment, memo } from 'react';
import SheetInput from '@/components/board/SheetInput';
import { SECTION_TABLE_STYLES } from '@/components/board/sheetStyles';
import usePharmacy from '@/hooks/usePharmacy';
import { setPhlomometerThreshold } from '@/lib/board';
import type { Board, PhlomometerQueue } from '@/lib/records';

/** The queues, laid out as on the sheet. */
const QUEUE_ROWS: readonly (readonly PhlomometerQueue[])[] = [
    ['F1', 'F4'],
    ['FILL', 'REV'],
];

export interface PhlomometerProps {
    phlomometer: Board['phlomometer'];
}

function Phlomometer({ phlomometer }: PhlomometerProps) {
    const pharmacy = usePharmacy();

    const setThreshold = (queue: PhlomometerQueue, side: 'under' | 'above', text: string) => {
        pharmacy.changeBoard(
            (board) => setPhlomometerThreshold(board, queue, side, text),
            `phlomometer:${queue}:${side}`
        );
    };

    return (
        <Box component='section'>
            <Typography variant='sheetSection' sx={{ mb: 1 }}>
                Phlomometer{' '}
                <Box component='span' sx={{ fontSize: '0.8em', fontWeight: 600 }}>
                    (Under / Above)
                </Box>
            </Typography>
            <Table size='small' aria-label='Phlomometer thresholds' sx={SECTION_TABLE_STYLES}>
                <TableBody>
                    {QUEUE_ROWS.map((queues) => (
                        <TableRow key={queues.join()}>
                            {queues.map((queue) => (
                                <Fragment key={queue}>
                                    <TableCell component='th' scope='row' sx={{ width: 64, textAlign: 'center' }}>
                                        {queue}
                                    </TableCell>
                                    <TableCell>
                                        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                                            <SheetInput
                                                isNumber
                                                label={`${queue} under`}
                                                placeholder='under'
                                                value={phlomometer[queue].under}
                                                onChange={(text) => setThreshold(queue, 'under', text)}
                                            />
                                            <Typography component='span' color='error' sx={{ fontWeight: 700 }}>
                                                /
                                            </Typography>
                                            <SheetInput
                                                isNumber
                                                label={`${queue} above`}
                                                placeholder='above'
                                                value={phlomometer[queue].above}
                                                onChange={(text) => setThreshold(queue, 'above', text)}
                                            />
                                        </Stack>
                                    </TableCell>
                                </Fragment>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

export default memo(Phlomometer);
