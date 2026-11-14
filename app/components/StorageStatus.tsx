/**
 * Shows in the top bar whether changes are being saved in this browser. They are not when the browser blocks the page's
 * storage, or when the storage is full.
 */
import { Chip, Tooltip } from '@mui/material';
import { IconAlertTriangle, IconCircleCheck } from '@tabler/icons-react';
import type { ReactElement } from 'react';
import usePharmacyState from '@/hooks/usePharmacyState';
import type { StorageStatus as Status } from '@/state/pharmacy';

interface StatusLook {
    label: string;

    /** What the status means for the user's work. Shown as a tooltip. */
    explanation: string;
    icon: ReactElement;
    color: 'default' | 'warning' | 'error';
}

const LOOKS: Readonly<Record<Status, StatusLook>> = {
    saved: {
        label: 'Saved in this browser',
        explanation:
            'Every change is saved in this browser as you make it. Nothing is sent anywhere. Save a backup to keep a copy or to move to another computer.',
        icon: <IconCircleCheck size={16} />,
        color: 'default',
    },
    blocked: {
        label: 'Not saved: storage is blocked',
        explanation:
            'This browser does not let the page save anything, so the roster and the boards last only until the page is closed. Allow site data for this page, or save a backup before you close it.',
        icon: <IconAlertTriangle size={16} />,
        color: 'warning',
    },
    failed: {
        label: 'Not saved: storage is full',
        explanation:
            'The browser refused the last change: its storage for this page is full or has been turned off. Save a backup now, then delete boards you no longer need.',
        icon: <IconAlertTriangle size={16} />,
        color: 'error',
    },
};

export default function StorageStatus() {
    const storageStatus = usePharmacyState((state) => state.storageStatus);
    const look = LOOKS[storageStatus];
    const isSaved = storageStatus === 'saved';

    return (
        <Tooltip describeChild title={look.explanation}>
            <Chip
                role='status'
                size='small'
                icon={look.icon}
                label={look.label}
                color={look.color}
                variant={isSaved ? 'outlined' : 'filled'}
                sx={
                    isSaved
                        ? {
                              borderColor: 'rgba(255, 255, 255, 0.4)',
                              color: 'inherit',
                              '& .MuiChip-icon': { color: 'inherit' },
                          }
                        : undefined
                }
            />
        </Tooltip>
    );
}
