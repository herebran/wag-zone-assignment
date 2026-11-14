/**
 * The app's look: Material UI's theme in Zone Assignment's blue, on a warm grey page. Components keep Material UI's own
 * styles. Only what the whole app shares is set here.
 */
import { createTheme } from '@mui/material/styles';
import type { CSSProperties } from 'react';

/**
 * The font for everything except the sheet's title: Inter, which Walgreens uses on its own pages. It ships with the app
 * (index.tsx). The fonts listed after it are fallbacks.
 */
const SITE_FONT = '"Inter Variable", "Helvetica", "Arial", sans-serif';

/**
 * The font for the sheet's title, "Priority Zone Assignment", and nothing else: Source Serif 4, standing in for Tiempos
 * Headline. It also ships with the app. The fonts listed after it are fallbacks.
 */
const TITLE_FONT =
    '"Source Serif 4 Variable", "Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif';

/**
 * The fixed-width font for the text export and the numbers typed on the sheet. It uses whatever the computer has.
 */
export const FIXED_WIDTH_FONT =
    'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

/** The sheet's own colours, which Material UI's palette has no names for. */
export const SHEET_COLORS = {
    heading: '#2b2b2e',

    /** A zone grid cell, and the same cell on every second row. */
    cell: '#f4f5f7',
    alternateCell: '#f0eeec',

    /** A Time Slot cell, and the same cell on every second row. */
    timeCell: '#efe9e7',
    alternateTimeCell: '#e4dcd8',

    /** A cell that labels its row, like a Phlomometer queue or a printed note. */
    labelCell: '#eceef1',
} as const;

// Adds two text styles to Material UI's Typography: the sheet's title and its section headings.
declare module '@mui/material/styles' {
    interface TypographyVariants {
        sheetTitle: CSSProperties;
        sheetSection: CSSProperties;
    }

    interface TypographyVariantsOptions {
        sheetTitle?: CSSProperties;
        sheetSection?: CSSProperties;
    }
}

declare module '@mui/material/Typography' {
    interface TypographyPropsVariantOverrides {
        sheetTitle: true;
        sheetSection: true;
    }
}

/**
 * Makes an icon in a button follow the button's font size, like Material UI's own icons. Without it a Tabler icon is
 * always 24 pixels. Outside a button, an icon sets its own size (`size={20}`).
 */
const ICON_SIZED_BY_FONT = { '& > svg': { width: '1em', height: '1em' } };

const theme = createTheme({
    palette: {
        primary: { main: '#1e5ba5' },
        error: { main: '#b42318' },
        warning: { main: '#b45309' },
        background: { default: '#f4f2ef' },
    },
    typography: {
        fontFamily: SITE_FONT,

        // Button text is shown as written, not in capitals.
        button: { textTransform: 'none', fontWeight: 600 },
        sheetTitle: {
            fontFamily: TITLE_FONT,
            fontSize: '2.25rem',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: SHEET_COLORS.heading,
        },
        sheetSection: {
            fontFamily: SITE_FONT,
            fontSize: '1.1875rem',
            fontWeight: 700,
            lineHeight: 1.3,
            color: SHEET_COLORS.heading,
        },
    },
    components: {
        MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: { startIcon: ICON_SIZED_BY_FONT, endIcon: ICON_SIZED_BY_FONT },
        },
        MuiIconButton: {
            styleOverrides: { root: ICON_SIZED_BY_FONT },
        },
        MuiTypography: {
            defaultProps: {
                variantMapping: { sheetTitle: 'h1', sheetSection: 'h2' },
            },
        },
    },
});

export default theme;
