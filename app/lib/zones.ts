/**
 * The zone grid's stations, in the sheet's order, and the coloured headings above them. Green Zone covers Out Window
 * and Drive Thru. Blue Zone covers Fill 1 and Fill 2. Purple, Red, Yellow and CPW Lead are one column each. The colours
 * match the printed sheet.
 */
import type { ZoneKey } from '@/lib/records';

export interface Zone {
    key: ZoneKey;

    /** The station's name on the sheet. */
    label: string;

    /** The station's name in the text export, with its zone. */
    listLabel: string;
}

// key, label, list label
export const ZONES: readonly Zone[] = [
    { key: 'outWindow', label: 'Out Window', listLabel: 'Green / Out Window' },
    { key: 'driveThru', label: 'Drive Thru', listLabel: 'Green / Drive Thru' },
    { key: 'fill1', label: 'Fill 1', listLabel: 'Blue / Fill 1' },
    { key: 'fill2', label: 'Fill 2', listLabel: 'Blue / Fill 2' },
    { key: 'purple', label: 'Purple Zone', listLabel: 'Purple Zone' },
    { key: 'red', label: 'Red Zone', listLabel: 'Red Zone' },
    { key: 'yellow', label: 'Yellow Zone', listLabel: 'Yellow Zone' },
    { key: 'cpwLead', label: 'CPW Lead', listLabel: 'CPW Lead' },
];

/**
 * A coloured heading of the zone grid and the stations under it.
 */
export interface ZoneGroup {
    label: string;
    color: string;

    /** The colour of the stations' own headings, for a zone with more than one station. */
    stationColor?: string;
    zones: readonly ZoneKey[];
}

export const ZONE_GROUPS: readonly ZoneGroup[] = [
    { label: 'Green Zone', color: '#8d9c5b', stationColor: '#7d8c4b', zones: ['outWindow', 'driveThru'] },
    { label: 'Blue Zone', color: '#6f9bd5', stationColor: '#5f8ecd', zones: ['fill1', 'fill2'] },
    { label: 'Purple Zone', color: '#c34dbf', zones: ['purple'] },
    { label: 'Red Zone', color: '#c4595e', zones: ['red'] },
    { label: 'Yellow Zone', color: '#f0c517', zones: ['yellow'] },
    { label: 'CPW Lead', color: '#7f8286', zones: ['cpwLead'] },
];

/** The colour of the Time Slot column's heading. */
export const TIME_SLOT_COLOR = '#6f5a13';

/** The zones a pharmacy can turn off. Green and Blue are always on. */
export const OPTIONAL_ZONES: readonly ZoneKey[] = ['purple', 'red', 'yellow', 'cpwLead'];

export function findZone(key: ZoneKey): Zone {
    return ZONES.find((zone) => zone.key === key)!;
}

/**
 * The heading colour of a zone's column.
 */
export function findZoneColor(key: ZoneKey): string {
    return ZONE_GROUPS.find((group) => group.zones.includes(key))!.color;
}

/**
 * The zones that are turned on, in the sheet's order.
 */
export function listVisibleZones(hiddenZones: readonly ZoneKey[]): Zone[] {
    return ZONES.filter((zone) => !hiddenZones.includes(zone.key));
}

/**
 * The headings above the zones that are turned on. A group with no station turned on is left out.
 */
export function listVisibleZoneGroups(hiddenZones: readonly ZoneKey[]): ZoneGroup[] {
    return ZONE_GROUPS.map((group) => ({
        ...group,
        zones: group.zones.filter((key) => !hiddenZones.includes(key)),
    })).filter((group) => group.zones.length > 0);
}
