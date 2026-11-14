/**
 * Keeps the app working without a connection, and says so. The service worker (written by the build, see
 * vite.config.ts) keeps a copy of the app in the browser. When a new version is out, the page asks before switching, so
 * a reload never interrupts work on a board.
 *
 * Browsers only run a service worker on https or on localhost. Anywhere else this component does nothing.
 */
import { Button } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function OfflineStatus() {
    const { enqueueSnackbar, closeSnackbar } = useSnackbar();
    const {
        offlineReady: [isOfflineReady],
        needRefresh: [hasNewVersion],
        updateServiceWorker,
    } = useRegisterSW();

    useEffect(() => {
        if (isOfflineReady) {
            enqueueSnackbar('Zone Assignment is ready to work without a connection.');
        }
    }, [isOfflineReady, enqueueSnackbar]);

    // The notification stays until the user picks Reload or Later.
    useEffect(() => {
        if (!hasNewVersion) {
            return;
        }

        enqueueSnackbar('A new version of Zone Assignment is ready.', {
            persist: true,
            action: (key) => (
                <>
                    <Button color='inherit' size='small' onClick={() => closeSnackbar(key)}>
                        Later
                    </Button>
                    <Button color='inherit' size='small' onClick={() => void updateServiceWorker(true)}>
                        Reload
                    </Button>
                </>
            ),
        });
    }, [hasNewVersion, enqueueSnackbar, closeSnackbar, updateServiceWorker]);

    return null;
}
