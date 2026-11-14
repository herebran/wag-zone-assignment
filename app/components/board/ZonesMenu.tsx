/**
 * The Zones button: a menu to turn Purple Zone, Red Zone, Yellow Zone and CPW Lead on or off. A zone that is off is
 * left out of the board, the print and the export. Its assignments are kept for when it comes back.
 */
import { Box, Button, Checkbox, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';
import { bindMenu, bindTrigger, usePopupState } from 'material-ui-popup-state/hooks';
import { useSnackbar } from 'notistack';
import { useId } from 'react';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import type { ZoneKey } from '@/lib/records';
import { findZone, OPTIONAL_ZONES, findZoneColor } from '@/lib/zones';

export default function ZonesMenu() {
    const pharmacy = usePharmacy();
    const { enqueueSnackbar } = useSnackbar();
    const hiddenZones = usePharmacyState((state) => state.settings.hiddenZones);
    const buttonId = useId();
    const menu = usePopupState({ variant: 'popover', popupId: useId() });

    const shownCount = OPTIONAL_ZONES.filter((key) => !hiddenZones.includes(key)).length;

    const toggleZone = (key: ZoneKey) => {
        const isHidden = hiddenZones.includes(key);
        const changed = isHidden ? hiddenZones.filter((hidden) => hidden !== key) : [...hiddenZones, key];
        pharmacy.updateSettings({ hiddenZones: changed });

        const { label } = findZone(key);
        enqueueSnackbar(isHidden ? `${label} turned on` : `${label} hidden: its assignments are kept`);
    };

    return (
        <>
            <Button id={buttonId} variant='outlined' endIcon={<IconChevronDown />} {...bindTrigger(menu)}>
                Zones {shownCount}/{OPTIONAL_ZONES.length}
            </Button>
            <Menu {...bindMenu(menu)} slotProps={{ list: { 'aria-labelledby': buttonId, dense: true } }}>
                {OPTIONAL_ZONES.map((key) => {
                    const isShown = !hiddenZones.includes(key);

                    return (
                        <MenuItem
                            key={key}
                            role='menuitemcheckbox'
                            aria-checked={isShown}
                            onClick={() => toggleZone(key)}
                        >
                            <ListItemIcon>
                                <Checkbox edge='start' size='small' checked={isShown} tabIndex={-1} disableRipple />
                            </ListItemIcon>
                            <Box
                                aria-hidden
                                sx={{
                                    width: 12,
                                    height: 12,
                                    mr: 1,
                                    borderRadius: '2px',
                                    bgcolor: findZoneColor(key),
                                    opacity: isShown ? 1 : 0.3,
                                }}
                            />
                            <ListItemText primary={findZone(key).label} />
                        </MenuItem>
                    );
                })}
            </Menu>
        </>
    );
}
