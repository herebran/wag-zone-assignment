/**
 * The page: the top bar, the three tabs (Zone Board, Technicians, Settings) with the open one's content, and the
 * footer. The printable sheet is also here, hidden from the screen.
 */
import { Box, Container, Stack, Tab, Tabs, Typography } from '@mui/material';
import { IconLayoutGrid, IconSettings, IconUsers } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useEffect, useState, type ReactElement } from 'react';
import ExportDialog from '@/components/board/ExportDialog';
import PrintSheet from '@/components/board/PrintSheet';
import ZoneBoard from '@/components/board/ZoneBoard';
import OfflineStatus from '@/components/OfflineStatus';
import Roster from '@/components/roster/Roster';
import Settings from '@/components/settings/Settings';
import TopBar from '@/components/TopBar';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { version } from '../../package.json';

/** The most width the content takes, in pixels. It is wide enough for the grid's eight stations. */
const CONTENT_WIDTH = 1420;

type TabName = 'board' | 'technicians' | 'settings';

const TABS: readonly { name: TabName; label: string; icon: ReactElement }[] = [
    { name: 'board', label: 'Zone Board', icon: <IconLayoutGrid size={20} /> },
    { name: 'technicians', label: 'Technicians', icon: <IconUsers size={20} /> },
    { name: 'settings', label: 'Settings', icon: <IconSettings size={20} /> },
];

export default function Page() {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const storageStatus = usePharmacyState((state) => state.storageStatus);
    const [tab, setTab] = useState<TabName>('board');
    const [isExporting, setIsExporting] = useState(false);

    // Another tab of the browser saves to the same storage. Show what it saves here too, so neither tab overwrites the
    // other with an old board.
    useEffect(() => {
        const readChange = (event: StorageEvent) => pharmacy.readChangeFromStorage(event.key);

        window.addEventListener('storage', readChange);
        return () => window.removeEventListener('storage', readChange);
    }, [pharmacy]);

    // The top bar already says when a change was not saved, but that is easy to miss. Also show a notification that
    // stays until it is closed.
    useEffect(() => {
        if (storageStatus === 'failed') {
            enqueueSnackbar(
                'The browser could not save that change: its storage for this page is full. Save a backup now so nothing is lost.',
                { variant: 'error', persist: true }
            );
        }
    }, [storageStatus, enqueueSnackbar]);

    return (
        <>
            <Box sx={{ displayPrint: 'none', pb: 8 }}>
                <TopBar
                    contentWidth={CONTENT_WIDTH}
                    isBoardShown={tab === 'board'}
                    onExport={() => setIsExporting(true)}
                />
                <Container component='main' maxWidth={false} sx={{ maxWidth: CONTENT_WIDTH, pt: 1.5 }}>
                    <Tabs
                        value={tab}
                        onChange={(_event, chosenTab: TabName) => setTab(chosenTab)}
                        aria-label='Zone Assignment'
                        sx={{ mb: 2.25, borderBottom: 1, borderColor: 'divider' }}
                    >
                        {TABS.map(({ name, label, icon }) => (
                            <Tab
                                key={name}
                                value={name}
                                label={label}
                                icon={icon}
                                iconPosition='start'
                                id={`${name}-tab`}
                                aria-controls={`${name}-panel`}
                            />
                        ))}
                    </Tabs>
                    <Box role='tabpanel' id={`${tab}-panel`} aria-labelledby={`${tab}-tab`}>
                        {tab === 'board' && <ZoneBoard />}
                        {tab === 'technicians' && <Roster />}
                        {tab === 'settings' && <Settings />}
                    </Box>
                </Container>
                <Container component='footer' maxWidth={false} sx={{ maxWidth: CONTENT_WIDTH, mt: 4 }}>
                    <Stack
                        direction='row'
                        spacing={2}
                        sx={{ justifyContent: 'space-between', color: 'text.secondary' }}
                    >
                        <Typography variant='caption'>
                            Zone Assignment keeps the roster and the boards in this browser. Nothing is sent anywhere.
                        </Typography>
                        <Typography variant='caption'>v{version}</Typography>
                    </Stack>
                </Container>
            </Box>
            <PrintSheet />
            {isExporting && <ExportDialog onClose={() => setIsExporting(false)} />}
            <OfflineStatus />
        </>
    );
}
