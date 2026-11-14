/**
 * The bar across the top of the page: the app's name, whether changes are saved, and the Print, Export and Backup
 * buttons.
 */
import { AppBar, Box, Button, Container, Stack, Toolbar, Tooltip, Typography } from '@mui/material';
import { IconFileExport, IconPrinter, IconUsers } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import BackupMenu from '@/components/backup/BackupMenu';
import StorageStatus from '@/components/StorageStatus';

export interface TopBarProps {
    /** The bar's content is kept as wide as the page's content. */
    contentWidth: number;

    /** Whether the Zone Board tab is open. Print and Export only work there. */
    isBoardShown: boolean;
    onExport: () => void;
}

export default function TopBar({ contentWidth, isBoardShown, onExport }: TopBarProps) {
    return (
        <AppBar position='sticky' elevation={1}>
            <Container maxWidth={false} sx={{ maxWidth: contentWidth }}>
                <Toolbar disableGutters sx={{ flexWrap: 'wrap', gap: 1.25, py: 1 }}>
                    <Stack direction='row' spacing={1.25} sx={{ alignItems: 'center', mr: 'auto' }}>
                        <Box
                            aria-hidden
                            sx={{
                                display: 'grid',
                                placeItems: 'center',
                                width: 30,
                                height: 30,
                                borderRadius: 1.5,
                                bgcolor: 'common.white',
                                color: 'primary.main',
                                fontSize: 21,
                            }}
                        >
                            <IconUsers size={20} />
                        </Box>
                        <Typography variant='subtitle1' component='span' sx={{ fontWeight: 700 }}>
                            Zone Assignment
                        </Typography>
                    </Stack>
                    <StorageStatus />
                    <BoardAction
                        label='Print'
                        icon={<IconPrinter />}
                        isEnabled={isBoardShown}
                        onClick={() => window.print()}
                    />
                    <BoardAction label='Export' icon={<IconFileExport />} isEnabled={isBoardShown} onClick={onExport} />
                    <BackupMenu />
                </Toolbar>
            </Container>
        </AppBar>
    );
}

interface BoardActionProps {
    label: string;
    icon: ReactNode;
    isEnabled: boolean;
    onClick: () => void;
}

/**
 * A button that acts on the board. On the other tabs it is greyed out and a tooltip says where it works. Otherwise
 * someone on the Technicians tab might expect Print to print the roster.
 */
function BoardAction({ label, icon, isEnabled, onClick }: BoardActionProps) {
    return (
        <Tooltip title={isEnabled ? '' : `Switch to the Zone Board tab to ${label.toLowerCase()}`}>
            {/* A disabled button gets no mouse events, so the tooltip is attached to a span around it. */}
            <span>
                <Button
                    color='inherit'
                    variant='outlined'
                    size='small'
                    startIcon={icon}
                    disabled={!isEnabled}
                    onClick={onClick}
                    sx={{
                        '&.Mui-disabled': {
                            borderColor: 'rgba(255, 255, 255, 0.3)',
                            color: 'rgba(255, 255, 255, 0.5)',
                        },
                    }}
                >
                    {label}
                </Button>
            </span>
        </Tooltip>
    );
}
