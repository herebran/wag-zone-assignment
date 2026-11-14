/**
 * The styles of the sheet's tables, on screen and on paper: the zone grid as tiles under coloured headings, and the
 * lined tables of the sections below it. A table that adds styles of its own lists them after these
 * (`sx={[ZONE_TABLE_STYLES, own]}`).
 */
import { tableCellClasses } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { SHEET_COLORS } from '@/theme';

/** The Time Slot column's share of the zone grid's width, in percent. The stations split the rest. */
export const TIME_COLUMN_WIDTH = 9;

/** The colour of a section table's lines. It is a shade darker than Material UI's divider, so it shows in print. */
const RULE_COLOR = '#d6d9df';

export const ZONE_TABLE_STYLES = {
    tableLayout: 'fixed',
    borderCollapse: 'separate',
    borderSpacing: '2px',
    [`& .${tableCellClasses.head}`]: {
        border: 0,
        borderRadius: '2px',
        px: 0.5,
        py: 0.875,
        color: 'common.white',
        fontSize: '0.72rem',
        fontWeight: 700,
        lineHeight: 1.2,
        textAlign: 'center',
    },
    [`& .${tableCellClasses.body}`]: {
        height: 54,
        border: 1,
        borderColor: 'divider',
        borderRadius: '2px',
        p: 0.5,
        bgcolor: SHEET_COLORS.cell,
        verticalAlign: 'top',
    },
    '& tbody tr:nth-of-type(even) td': { bgcolor: SHEET_COLORS.alternateCell },
    '& tbody td:first-of-type': { bgcolor: SHEET_COLORS.timeCell },
    '& tbody tr:nth-of-type(even) td:first-of-type': { bgcolor: SHEET_COLORS.alternateTimeCell },
} satisfies SxProps<Theme>;

export const SECTION_TABLE_STYLES = {
    [`& .${tableCellClasses.root}`]: {
        border: 1,
        borderColor: RULE_COLOR,
        px: 1,
        py: 0.5,
        fontSize: '0.8rem',
    },
    [`& .${tableCellClasses.head}`]: {
        bgcolor: SHEET_COLORS.labelCell,
        color: 'text.secondary',
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textAlign: 'center',
        textTransform: 'uppercase',
    },

    // A cell that labels its row.
    '& tbody th': { bgcolor: SHEET_COLORS.labelCell, fontWeight: 700 },
} satisfies SxProps<Theme>;
