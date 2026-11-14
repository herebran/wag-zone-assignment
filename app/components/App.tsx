/**
 * The app: the Priority Zone Assignment board, with the pharmacy's roster and settings. It sets up the theme, the
 * calendar's dates, the pharmacy's data and the notifications.
 */
import { CssBaseline, GlobalStyles, IconButton, ThemeProvider } from '@mui/material';
import { styled } from '@mui/material/styles';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { IconAlertTriangle, IconX } from '@tabler/icons-react';
import { closeSnackbar, MaterialDesignContent, SnackbarProvider, type SnackbarKey } from 'notistack';
import { useState } from 'react';
import Page from '@/components/Page';
import { createPharmacy, type Pharmacy } from '@/state/pharmacy';
import { PharmacyContext } from '@/state/pharmacyContext';
import theme from '@/theme';

/**
 * How the page prints: one upright letter page, in the sheet's colours (a browser drops backgrounds unless told to keep
 * them). Only PrintSheet prints. Dialogs, menus, the calendar and notifications sit outside #root and are hidden on
 * paper.
 */
const PRINT_STYLES = {
    '@page': { size: 'letter portrait', margin: '0.4in' },
    '@media print': {
        'html, body': { backgroundColor: '#fff !important' },
        '*': { printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' },
        'body > :not(#root)': { display: 'none !important' },
    },
};

/**
 * An error notification, in the theme's red.
 */
const ErrorNotification = styled(MaterialDesignContent)(({ theme: siteTheme }) => ({
    '&.notistack-MuiContent-error': { backgroundColor: siteTheme.palette.error.main },
}));

export interface AppProps {
    /** The pharmacy's data to show. By default it is loaded from the browser's storage. Tests pass their own. */
    pharmacy?: Pharmacy;
}

export default function App({ pharmacy }: AppProps) {
    const [shownPharmacy] = useState(() => pharmacy ?? createPharmacy());

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <GlobalStyles styles={PRINT_STYLES} />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
                <PharmacyContext value={shownPharmacy}>
                    <SnackbarProvider
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        preventDuplicate
                        action={renderDismissButton}
                        iconVariant={{ error: <IconAlertTriangle size={20} style={{ marginInlineEnd: 8 }} /> }}
                        Components={{ error: ErrorNotification }}
                    >
                        <Page />
                    </SnackbarProvider>
                </PharmacyContext>
            </LocalizationProvider>
        </ThemeProvider>
    );
}

/**
 * The close button on every notification.
 */
function renderDismissButton(key: SnackbarKey) {
    return (
        <IconButton size='small' color='inherit' aria-label='Dismiss' onClick={() => closeSnackbar(key)}>
            <IconX />
        </IconButton>
    );
}
