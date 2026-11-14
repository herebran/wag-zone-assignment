import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { assignTechnician, setSlotTime } from '@/lib/board';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { listOfferedTimes } from '@/lib/times';
import { addSampleTechnicians, renderApp, type RenderedApp } from '@/testing/renderApp';

async function openSettings(options?: Parameters<typeof renderApp>[0]): Promise<RenderedApp> {
    const app = renderApp(options);
    await app.user.click(screen.getByRole('tab', { name: 'Settings' }));

    return app;
}

describe('Settings', () => {
    it("writes the names in the board's cells in the style chosen", async () => {
        const { pharmacy, user } = await openSettings({
            prepare: (preparedPharmacy) => {
                addSampleTechnicians(preparedPharmacy);
                preparedPharmacy.changeBoard((board) =>
                    assignTechnician(board, { kind: 'zone', slotIndex: 0, zone: 'outWindow' }, 3)
                );
            },
        });
        const names = screen.getByRole('group', { name: 'Names on the board' });
        expect(within(names).getByRole('button', { name: 'Abbreviations' })).toHaveAttribute('aria-pressed', 'true');

        await user.click(within(names).getByRole('button', { name: 'Last, First' }));
        expect(screen.getByText('Cells show "Last, First".')).toBeInTheDocument();
        expect(pharmacy.getState().settings.nameStyle).toBe('lastFirst');

        // Clicking the style that is already on leaves it on.
        await user.click(within(names).getByRole('button', { name: 'Last, First' }));
        expect(pharmacy.getState().settings.nameStyle).toBe('lastFirst');

        await user.click(screen.getByRole('tab', { name: 'Zone Board' }));
        expect(screen.getByRole('button', { name: 'Garcia-Lopez, Maria' })).toBeInTheDocument();
    });

    it('sorts the roster and the list to assign from by the name chosen', async () => {
        const { user } = await openSettings({ prepare: addSampleTechnicians });

        await user.click(
            within(screen.getByRole('group', { name: 'Roster order' })).getByRole('button', { name: 'Last name' })
        );
        await user.click(screen.getByRole('tab', { name: 'Zone Board' }));
        await user.click(screen.getByRole('button', { name: 'Assign a technician to Fill 1, time slot 1' }));

        const names = (await screen.findAllByRole('menuitem')).map((item) => item.textContent);
        expect(names).toEqual(['Doe, Jane (JD)', 'Garcia-Lopez, Maria (MGL)', 'Lee, Sam']);
    });

    it("offers the board the times of the pharmacy's hours, on its clock and its step", async () => {
        const { pharmacy, user } = await openSettings();
        expect(screen.getByText('57 time options (8:00 AM to 10:00 PM).')).toBeInTheDocument();

        await user.click(screen.getByRole('combobox', { name: 'Pharmacy opens' }));
        await user.click(await screen.findByRole('option', { name: '9:00 AM' }));
        await user.click(screen.getByRole('combobox', { name: 'Pharmacy closes' }));
        await user.click(await screen.findByRole('option', { name: '12:00 AM (midnight)' }));
        await user.click(screen.getByRole('button', { name: '24-hour (military)' }));
        await user.click(screen.getByRole('button', { name: '1 hour' }));

        expect(pharmacy.getState().settings).toMatchObject({
            openTime: '09:00',
            closeTime: '24:00',
            clockFormat: '24-hour',
            timeStepMinutes: 60,
        });
        expect(screen.getByText('16 time options (09:00 to 24:00).')).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Zone Board' }));
        await user.click(screen.getByRole('combobox', { name: 'Start of time slot 1' }));
        const times = (await screen.findAllByRole('option')).map((option) => option.textContent);
        expect(times.slice(0, 3)).toEqual(['No time', '09:00', '10:00']);
        expect(times.at(-1)).toBe('24:00');
    });

    it('offers a 24-hour pharmacy every time of the day, and greys its hours', async () => {
        const { pharmacy, user } = await openSettings();

        await user.click(screen.getByRole('checkbox', { name: '24-hour pharmacy: every 15 minutes, all day' }));

        expect(pharmacy.getState().settings.isOpenAllDay).toBe(true);
        expect(await screen.findByText('24-hour mode on')).toBeInTheDocument();
        expect(screen.getByText('All day, in 15-minute steps (97 times).')).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Pharmacy opens' })).toHaveAttribute('aria-disabled', 'true');
    });

    it('takes the sections turned off out of the board, and keeps what a board has in them', async () => {
        const { pharmacy, user } = await openSettings({
            prepare: (preparedPharmacy) => {
                const timeChoices = { times: listOfferedTimes(DEFAULT_SETTINGS), timeStepMinutes: 15 };
                preparedPharmacy.changeBoard((board) => setSlotTime(board, 0, 'startTime', '08:00', timeChoices));
            },
        });

        await user.click(screen.getByRole('switch', { name: /^Phlomometer/ }));
        await user.click(screen.getByRole('switch', { name: /^Other notes and priorities/ }));
        expect(pharmacy.getState().settings).toMatchObject({
            hasPhlomometer: false,
            hasIc3Calls: true,
            hasNotes: false,
        });

        await user.click(screen.getByRole('tab', { name: 'Zone Board' }));
        expect(screen.queryByRole('table', { name: 'Phlomometer thresholds' })).not.toBeInTheDocument();
        expect(screen.queryByRole('table', { name: 'Other notes and priorities' })).not.toBeInTheDocument();
        expect(screen.getByRole('table', { name: 'Call for IC3' })).toBeInTheDocument();
        expect(pharmacy.getState().board.notes).toHaveLength(11);
    });

    it("writes the original board's times short until told to write them whole", async () => {
        const { pharmacy, user } = await openSettings();
        const shortTimes = screen.getByRole('switch', { name: /^Short times/ });
        expect(shortTimes).toBeChecked();

        await user.click(shortTimes);
        expect(pharmacy.getState().settings.hasShortPdfTimes).toBe(false);

        await user.click(shortTimes);
        expect(pharmacy.getState().settings.hasShortPdfTimes).toBe(true);
    });
});
