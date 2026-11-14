/**
 * The zone grid's heading, in the sheet's colours: Time Slot, then each zone. Green Zone and Blue Zone span their two
 * stations, which have their own headings below. The other zones are one column with a heading two rows tall.
 */
import { TableCell, TableHead, TableRow } from '@mui/material';
import { Fragment } from 'react';
import { TIME_COLUMN_WIDTH } from '@/components/board/sheetStyles';
import type { ZoneKey } from '@/lib/records';
import { findZone, TIME_SLOT_COLOR, listVisibleZoneGroups, listVisibleZones, type ZoneGroup } from '@/lib/zones';

/**
 * The sheet prints Yellow Zone in white on yellow. A shadow keeps it readable on a screen. On paper there is none,
 * because printers draw a shadow as a grey box behind the words.
 */
const YELLOW_HEADING_SHADOW = { textShadow: '0 1px 1px rgba(0, 0, 0, 0.22)', '@media print': { textShadow: 'none' } };

export interface ZoneTableHeadProps {
    hiddenZones: readonly ZoneKey[];
}

export default function ZoneTableHead({ hiddenZones }: ZoneTableHeadProps) {
    const groups = listVisibleZoneGroups(hiddenZones);
    const stationCount = listVisibleZones(hiddenZones).length;
    const stationWidth = (100 - TIME_COLUMN_WIDTH) / stationCount;

    return (
        <>
            <colgroup>
                <col style={{ width: `${TIME_COLUMN_WIDTH}%` }} />
                {listVisibleZones(hiddenZones).map((zone) => (
                    <col key={zone.key} style={{ width: `${stationWidth}%` }} />
                ))}
            </colgroup>
            <TableHead>
                <TableRow>
                    <TableCell rowSpan={2} sx={{ bgcolor: TIME_SLOT_COLOR }}>
                        <StackedWords text='Time Slot' />
                    </TableCell>
                    {groups.map((group) => (
                        <GroupHeading key={group.label} group={group} />
                    ))}
                </TableRow>
                <TableRow>
                    {groups.filter(hasStationHeadings).flatMap((group) =>
                        group.zones.map((key) => (
                            <TableCell key={key} sx={{ bgcolor: group.stationColor, fontSize: '0.625rem', py: 0.625 }}>
                                {findZone(key).label}
                            </TableCell>
                        ))
                    )}
                </TableRow>
            </TableHead>
        </>
    );
}

/**
 * Whether a zone's stations have their own headings below the zone's. Green Zone and Blue Zone do.
 */
function hasStationHeadings(group: ZoneGroup): boolean {
    return group.stationColor !== undefined;
}

interface GroupHeadingProps {
    group: ZoneGroup;
}

/**
 * A zone's heading. It spans the zone's stations, or both heading rows when the zone is a single column.
 */
function GroupHeading({ group }: GroupHeadingProps) {
    if (hasStationHeadings(group)) {
        return (
            <TableCell colSpan={group.zones.length} sx={{ bgcolor: group.color }}>
                {group.label}
            </TableCell>
        );
    }

    const isYellow = group.zones.includes('yellow');

    return (
        <TableCell rowSpan={2} sx={[{ bgcolor: group.color }, isYellow && YELLOW_HEADING_SHADOW]}>
            <StackedWords text={group.label} />
        </TableCell>
    );
}

interface StackedWordsProps {
    text: string;
}

/**
 * A heading with each word on its own line, as the sheet prints its narrow columns. The space between the words is kept
 * for screen readers.
 */
function StackedWords({ text }: StackedWordsProps) {
    return text.split(' ').map((word, index) => (
        <Fragment key={word}>
            {index > 0 && ' '}
            {index > 0 && <br />}
            {word}
        </Fragment>
    ));
}
