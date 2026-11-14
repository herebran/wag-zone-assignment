/**
 * The sheet as it prints: the whole board on one letter page, with nothing to click. It is always on the page, hidden
 * from the screen, so printing works from any tab and any way of printing.
 *
 * The notes take the room the zone grid leaves, so the sheet always fills the page. A board too long for one page is
 * scaled down to fit (hooks/usePrintScale.ts).
 */
import { Box, Chip, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { Fragment, memo, useRef, type ReactNode } from 'react';
import { SECTION_TABLE_STYLES, ZONE_TABLE_STYLES } from '@/components/board/sheetStyles';
import SheetHeading from '@/components/board/SheetHeading';
import ZoneTableHead from '@/components/board/ZoneTableHead';
import usePharmacyState from '@/hooks/usePharmacyState';
import usePrintScale, { PRINT_SCALE_VARIABLE } from '@/hooks/usePrintScale';
import { IC3_LABELS, IC3_QUEUES, PHLOMOMETER_QUEUES } from '@/lib/board';
import { findTechnician, formatBoardName } from '@/lib/names';
import type { Board, Settings, TimeSlot } from '@/lib/records';
import { formatTime } from '@/lib/times';
import { listVisibleZones } from '@/lib/zones';
import { FIXED_WIDTH_FONT } from '@/theme';

/**
 * The printed page: upright letter, minus the 0.4in margins App.tsx sets. The sheet is a little shorter than the page,
 * so a printer's rounding never pushes a line onto a second page.
 */
const PAGE_WIDTH = '7.7in';
const SHEET_HEIGHT_INCHES = 9.9;
const PIXELS_PER_INCH = 96;

/** The print scale: 1, or less when the sheet has to shrink to fit the page. */
const SCALE = `var(${PRINT_SCALE_VARIABLE}, 1)`;

/** Smaller text and tighter cells for print, on top of the tables' own styles. */
const PRINTED_ZONE_TABLE_STYLES = {
    breakInside: 'avoid',
    '& th': { py: '4px !important', px: '3px !important', fontSize: '11px !important' },
    '& td': { height: 'auto !important', p: '3px !important' },
} satisfies SxProps<Theme>;

const PRINTED_SECTION_TABLE_STYLES = {
    '& td, & th': { fontSize: '11.5px !important', py: '4px !important' },
    '& thead th': { fontSize: '9.5px !important' },

    // An empty row is as tall as a row with text, so there is room to write in it.
    '& tbody td': { height: 26 },
} satisfies SxProps<Theme>;

export default function PrintSheet() {
    const boardDate = usePharmacyState((state) => state.boardDate);
    const board = usePharmacyState((state) => state.board);
    const settings = usePharmacyState((state) => state.settings);

    const sheet = useRef<HTMLDivElement>(null);
    usePrintScale(sheet, { width: PAGE_WIDTH, heightPixels: SHEET_HEIGHT_INCHES * PIXELS_PER_INCH });

    const hasLeftColumn = settings.hasPhlomometer || settings.hasIc3Calls;
    const hasBothColumns = hasLeftColumn && settings.hasNotes;

    return (
        <Box
            ref={sheet}
            sx={{
                display: 'none',
                flexDirection: 'column',
                fontSize: '12px',
                '& > *': { flex: '0 0 auto' },

                // Print only. usePrintScale measures the sheet without these styles, at its natural height.
                '@media print': {
                    display: 'flex',
                    zoom: SCALE,

                    // The height is set before the scale applies, so divide by the scale to still fill the page.
                    minHeight: `calc(${SHEET_HEIGHT_INCHES}in / ${SCALE})`,
                },
            }}
        >
            <SheetHeading boardDate={boardDate} isPrinted />
            <PrintedZoneTable timeSlots={board.timeSlots} settings={settings} />
            <Box
                sx={{
                    display: 'grid',
                    gridTemplateColumns: hasBothColumns ? '1fr 1fr' : '1fr',
                    gridTemplateRows: 'minmax(0, 1fr)',
                    gap: '22px',
                    mt: '14px',
                    minHeight: 0,

                    // The sections take the rest of the page below the grid.
                    '&&': { flex: '1 1 auto' },
                }}
            >
                {hasLeftColumn && (
                    <Stack spacing='14px'>
                        {settings.hasPhlomometer && <PrintedPhlomometer phlomometer={board.phlomometer} />}
                        {settings.hasIc3Calls && <PrintedIc3Calls ic3Calls={board.ic3Calls} />}
                    </Stack>
                )}
                {settings.hasNotes && <PrintedNotes notes={board.notes} />}
            </Box>
        </Box>
    );
}

interface PrintedZoneTableProps {
    timeSlots: readonly TimeSlot[];
    settings: Settings;
}

// memo: typing in a note does not redraw the printed grid.
const PrintedZoneTable = memo(function PrintedZoneTable({ timeSlots, settings }: PrintedZoneTableProps) {
    const zones = listVisibleZones(settings.hiddenZones);

    return (
        <Table size='small' sx={[ZONE_TABLE_STYLES, PRINTED_ZONE_TABLE_STYLES]}>
            <ZoneTableHead hiddenZones={settings.hiddenZones} />
            <TableBody>
                {timeSlots.map((slot, slotIndex) => (
                    // oxlint-disable-next-line react/no-array-index-key -- time slots are only added and removed at the end, so the index is stable
                    <TableRow key={slotIndex}>
                        <TableCell>
                            <Stack
                                sx={{
                                    minHeight: 38,
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    fontFamily: FIXED_WIDTH_FONT,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    lineHeight: 1.25,
                                }}
                            >
                                <span>{formatTime(slot.startTime, settings.clockFormat)}</span>
                                <Box component='span' sx={{ color: 'text.disabled', fontSize: '9px' }}>
                                    to
                                </Box>
                                <span>{formatTime(slot.endTime, settings.clockFormat)}</span>
                            </Stack>
                        </TableCell>
                        {zones.map((zone) => (
                            <TableCell key={zone.key}>
                                <PrintedNames
                                    technicianIds={slot.assignments[zone.key]}
                                    isLead={zone.key === 'cpwLead'}
                                />
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
});

interface PrintedNamesProps {
    technicianIds: readonly number[];
    isLead?: boolean;
}

/**
 * The technicians assigned to one place, written as on the board.
 */
function PrintedNames({ technicianIds, isLead = false }: PrintedNamesProps) {
    const technicians = usePharmacyState((state) => state.technicians);
    const nameStyle = usePharmacyState((state) => state.settings.nameStyle);

    return (
        <Stack direction='row' spacing='3px' useFlexGap sx={{ flexWrap: 'wrap' }}>
            {technicianIds.map((technicianId) => (
                <Chip
                    key={technicianId}
                    size='small'
                    variant='outlined'
                    color={isLead ? 'primary' : 'default'}
                    label={formatBoardName(findTechnician(technicians, technicianId), nameStyle)}
                    sx={{ height: 20, maxWidth: '100%', bgcolor: 'common.white', fontSize: '11.5px', fontWeight: 700 }}
                />
            ))}
        </Stack>
    );
}

interface PrintedPhlomometerProps {
    phlomometer: Board['phlomometer'];
}

function PrintedPhlomometer({ phlomometer }: PrintedPhlomometerProps) {
    return (
        <Box component='section' sx={{ breakInside: 'avoid' }}>
            <PrintedSectionTitle>
                Phlomometer{' '}
                <Box component='span' sx={{ fontSize: '0.8em', fontWeight: 600 }}>
                    (Under / Above)
                </Box>
            </PrintedSectionTitle>
            <Table size='small' sx={[SECTION_TABLE_STYLES, PRINTED_SECTION_TABLE_STYLES]}>
                <TableBody>
                    {[PHLOMOMETER_QUEUES.slice(0, 2), PHLOMOMETER_QUEUES.slice(2)].map((queues) => (
                        <TableRow key={queues.join()}>
                            {queues.map((queue) => (
                                <Fragment key={queue}>
                                    <TableCell component='th' scope='row' sx={{ width: 64, textAlign: 'center' }}>
                                        {queue}
                                    </TableCell>
                                    <TableCell>
                                        <Stack
                                            direction='row'
                                            spacing='4px'
                                            sx={{ alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            <PrintedNumber text={phlomometer[queue].under} />
                                            <Typography component='span' color='error' sx={{ fontWeight: 700 }}>
                                                /
                                            </Typography>
                                            <PrintedNumber text={phlomometer[queue].above} />
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

interface PrintedIc3CallsProps {
    ic3Calls: Board['ic3Calls'];
}

function PrintedIc3Calls({ ic3Calls }: PrintedIc3CallsProps) {
    return (
        <Box component='section' sx={{ breakInside: 'avoid' }}>
            <PrintedSectionTitle>Call for IC3:</PrintedSectionTitle>
            <Table size='small' sx={[SECTION_TABLE_STYLES, PRINTED_SECTION_TABLE_STYLES, { tableLayout: 'fixed' }]}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 72 }} />
                        <TableCell sx={{ width: 110 }}>Amount:</TableCell>
                        <TableCell>Who:</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {IC3_QUEUES.map((queue) => (
                        <TableRow key={queue}>
                            <TableCell component='th' scope='row'>
                                {IC3_LABELS[queue]}
                            </TableCell>
                            <TableCell sx={{ fontFamily: FIXED_WIDTH_FONT, fontWeight: 700, textAlign: 'center' }}>
                                {ic3Calls[queue].amount}
                            </TableCell>
                            <TableCell>
                                <PrintedNames technicianIds={ic3Calls[queue].technicianIds} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}

interface PrintedNotesProps {
    notes: Board['notes'];
}

/**
 * The notes, stretched to fill the rest of the page. Every row prints, even the empty ones, which are there to write
 * in.
 */
function PrintedNotes({ notes }: PrintedNotesProps) {
    return (
        <Box component='section' sx={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <PrintedSectionTitle>Other notes and priorities:</PrintedSectionTitle>
            <Box sx={{ flex: '1 1 auto', minHeight: 0 }}>
                <Table size='small' sx={[SECTION_TABLE_STYLES, PRINTED_SECTION_TABLE_STYLES, { height: '100%' }]}>
                    <TableHead>
                        <TableRow sx={{ height: 0 }}>
                            <TableCell sx={{ width: '34%' }}>What:</TableCell>
                            <TableCell sx={{ width: '26%' }}>When:</TableCell>
                            <TableCell>Who:</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {notes.map((note, noteIndex) => (
                            // oxlint-disable-next-line react/no-array-index-key -- a note has no id, only its place in the list
                            <TableRow key={noteIndex}>
                                <TableCell
                                    component={note.isFixed ? 'th' : 'td'}
                                    scope={note.isFixed ? 'row' : undefined}
                                >
                                    {note.what}
                                </TableCell>
                                <TableCell>{note.when}</TableCell>
                                <TableCell>
                                    <PrintedNames technicianIds={note.technicianIds} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Box>
        </Box>
    );
}

interface PrintedSectionTitleProps {
    children: ReactNode;
}

function PrintedSectionTitle({ children }: PrintedSectionTitleProps) {
    return (
        <Typography variant='sheetSection' sx={{ mb: '6px', fontSize: '16px' }}>
            {children}
        </Typography>
    );
}

interface PrintedNumberProps {
    text: string;
}

/**
 * A Phlomometer count in its box. An empty box prints so a count can be written in by hand.
 */
function PrintedNumber({ text }: PrintedNumberProps) {
    return (
        <Box
            component='span'
            sx={{
                display: 'inline-block',
                minWidth: 34,
                minHeight: 20,
                border: 1,
                borderColor: 'divider',
                borderRadius: '3px',
                px: '4px',
                bgcolor: 'common.white',
                fontFamily: FIXED_WIDTH_FONT,
                fontWeight: 700,
                lineHeight: '18px',
                textAlign: 'center',
            }}
        >
            {text}
        </Box>
    );
}
