/**
 * The zone grid: a row for each time slot, with its start and end, and a cell for each station showing who works it
 * then.
 */
import { Stack, Table, TableBody, TableCell, TableContainer, TableRow, Typography } from '@mui/material';
import { memo } from 'react';
import AssignmentCell from '@/components/board/AssignmentCell';
import { ZONE_TABLE_STYLES } from '@/components/board/sheetStyles';
import TimeSelect from '@/components/board/TimeSelect';
import ZoneTableHead from '@/components/board/ZoneTableHead';
import usePharmacy from '@/hooks/usePharmacy';
import { setSlotTime } from '@/lib/board';
import type { Settings, TimeSlot } from '@/lib/records';
import { listOfferedTimes } from '@/lib/times';
import { listVisibleZones } from '@/lib/zones';

/** Below this width the grid scrolls sideways, so every cell keeps room for a name. */
const MINIMUM_WIDTH = 860;

export interface ZoneTableProps {
    timeSlots: readonly TimeSlot[];
    settings: Settings;
}

function ZoneTable({ timeSlots, settings }: ZoneTableProps) {
    const pharmacy = usePharmacy();
    const zones = listVisibleZones(settings.hiddenZones);
    const times = listOfferedTimes(settings);

    const setTime = (slotIndex: number, edge: 'startTime' | 'endTime', time: string) => {
        const timeChoices = { times, timeStepMinutes: settings.timeStepMinutes };
        pharmacy.changeBoard((board) => setSlotTime(board, slotIndex, edge, time, timeChoices));
    };

    return (
        <TableContainer>
            <Table
                size='small'
                aria-label='Zone assignments by time slot'
                sx={[ZONE_TABLE_STYLES, { minWidth: MINIMUM_WIDTH }]}
            >
                <ZoneTableHead hiddenZones={settings.hiddenZones} />
                <TableBody>
                    {timeSlots.map((slot, slotIndex) => {
                        const slotName = `time slot ${slotIndex + 1}`;

                        return (
                            // oxlint-disable-next-line react/no-array-index-key -- time slots are only added and removed at the end, so the index is stable
                            <TableRow key={slotIndex}>
                                <TableCell>
                                    <Stack spacing={0.25} sx={{ alignItems: 'stretch' }}>
                                        <TimeSelect
                                            label={`Start of ${slotName}`}
                                            placeholder='Start'
                                            value={slot.startTime}
                                            times={times}
                                            clockFormat={settings.clockFormat}
                                            onChange={(time) => setTime(slotIndex, 'startTime', time)}
                                        />
                                        <Typography
                                            variant='caption'
                                            color='text.disabled'
                                            sx={{ lineHeight: 1, textAlign: 'center' }}
                                        >
                                            to
                                        </Typography>
                                        <TimeSelect
                                            label={`End of ${slotName}`}
                                            placeholder='End'
                                            value={slot.endTime}
                                            times={times}
                                            clockFormat={settings.clockFormat}
                                            onChange={(time) => setTime(slotIndex, 'endTime', time)}
                                        />
                                    </Stack>
                                </TableCell>
                                {zones.map((zone) => (
                                    <TableCell key={zone.key}>
                                        <AssignmentCell
                                            target={{ kind: 'zone', slotIndex, zone: zone.key }}
                                            technicianIds={slot.assignments[zone.key]}
                                            label={`${zone.label}, ${slotName}`}
                                            isLead={zone.key === 'cpwLead'}
                                        />
                                    </TableCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

// memo: typing in a note below the grid does not redraw the grid.
export default memo(ZoneTable);
