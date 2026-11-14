import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { assignTechnician } from '@/lib/board';
import { addSampleTechnicians, renderApp, type RenderedApp } from '@/testing/renderApp';

async function openRoster(options?: Parameters<typeof renderApp>[0]): Promise<RenderedApp> {
    const app = renderApp(options);
    await app.user.click(screen.getByRole('tab', { name: 'Technicians' }));

    return app;
}

describe('Roster', () => {
    it('adds a team one after another, with Enter, the keyboard back on the first name each time', async () => {
        const { pharmacy, user } = await openRoster();
        expect(screen.getByText(/No technicians yet/)).toBeInTheDocument();

        await user.type(screen.getByRole('textbox', { name: 'First name' }), 'Jane');
        await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'Doe');
        await user.type(screen.getByRole('textbox', { name: 'Abbreviation (optional)' }), 'JD{Enter}');
        expect(await screen.findByText('Jane Doe added')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'First name' })).toHaveFocus();
        expect(screen.getByRole('textbox', { name: 'First name' })).toHaveValue('');

        await user.keyboard('Sam');
        await user.type(screen.getByRole('textbox', { name: 'Last name' }), 'Adams');
        await user.click(screen.getByRole('button', { name: 'Add technician' }));

        expect(pharmacy.getState().technicians.map((technician) => technician.lastName)).toEqual(['Doe', 'Adams']);
        expect(screen.getByText('2 technicians')).toBeInTheDocument();
        const [, janeRow, samRow] = within(screen.getByRole('table', { name: 'Pharmacy roster' })).getAllByRole('row');
        expect(janeRow).toHaveTextContent('Jane DoeJD');
        expect(samRow).toHaveTextContent('Sam AdamsSA');
    });

    it('asks for both names before it adds anyone, and keeps an abbreviation to eight characters', async () => {
        const { pharmacy, user } = await openRoster();

        await user.type(screen.getByRole('textbox', { name: 'First name' }), 'Jane');
        await user.click(screen.getByRole('button', { name: 'Add technician' }));
        expect(await screen.findByRole('alert')).toHaveTextContent('First and last name are required.');
        expect(screen.getByRole('textbox', { name: 'Last name' })).toBeInvalid();
        expect(pharmacy.getState().technicians).toEqual([]);

        await user.type(screen.getByRole('textbox', { name: 'Abbreviation (optional)' }), 'ABCDEFGHIJK');
        expect(screen.getByRole('textbox', { name: 'Abbreviation (optional)' })).toHaveValue('ABCDEFGH');
    });

    it('lists the roster in the order the settings ask for, the name it is sorted by first', async () => {
        await openRoster({
            prepare: (pharmacy) => {
                addSampleTechnicians(pharmacy);
                pharmacy.updateSettings({ rosterOrder: 'lastName' });
            },
        });

        const rows = within(screen.getByRole('table', { name: 'Pharmacy roster' })).getAllByRole('row');
        expect(rows.slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)).toEqual([
            'Doe, Jane',
            'Garcia-Lopez, Maria',
            'Lee, Sam',
        ]);
    });

    it("changes a technician's role", async () => {
        const { pharmacy, user } = await openRoster({ prepare: addSampleTechnicians });

        await user.click(screen.getByRole('combobox', { name: 'Role of Sam Lee' }));
        await user.click(await screen.findByRole('option', { name: 'Senior Tech' }));

        expect(pharmacy.getState().technicians.find((technician) => technician.id === 2)?.role).toBe('Senior Tech');
        expect(screen.getByRole('combobox', { name: 'Role of Sam Lee' })).toHaveTextContent('Senior Tech');
    });

    it("edits a technician's names, which the board then shows", async () => {
        const { pharmacy, user } = await openRoster({
            prepare: (preparedPharmacy) => {
                addSampleTechnicians(preparedPharmacy);
                preparedPharmacy.changeBoard((board) =>
                    assignTechnician(board, { kind: 'zone', slotIndex: 0, zone: 'outWindow' }, 1)
                );
            },
        });

        await user.click(screen.getByRole('button', { name: 'Edit Jane Doe' }));
        const dialog = await screen.findByRole('dialog', { name: 'Edit technician' });
        const firstName = within(dialog).getByRole('textbox', { name: 'First name' });
        expect(firstName).toHaveFocus();
        expect(firstName).toHaveValue('Jane');

        // Both names are needed before the change is saved.
        await user.clear(firstName);
        await user.click(within(dialog).getByRole('button', { name: 'Save' }));
        expect(await within(dialog).findByRole('alert')).toHaveTextContent('First and last name are both required.');

        await user.type(firstName, 'Janet');
        await user.clear(within(dialog).getByRole('textbox', { name: 'Abbreviation (optional)' }));
        await user.type(within(dialog).getByRole('textbox', { name: 'Abbreviation (optional)' }), 'JAN{Enter}');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(pharmacy.getState().technicians[0]).toMatchObject({ id: 1, firstName: 'Janet', abbreviation: 'JAN' });
        await user.click(screen.getByRole('tab', { name: 'Zone Board' }));
        expect(screen.getByRole('button', { name: 'JAN' })).toBeInTheDocument();
    });

    it('deletes a technician once asked, and the boards that assigned them show them as removed', async () => {
        const { pharmacy, user } = await openRoster({
            prepare: (preparedPharmacy) => {
                addSampleTechnicians(preparedPharmacy);
                preparedPharmacy.changeBoard((board) =>
                    assignTechnician(board, { kind: 'zone', slotIndex: 0, zone: 'outWindow' }, 2)
                );
            },
        });

        await user.click(screen.getByRole('button', { name: 'Delete Sam Lee' }));
        const dialog = await screen.findByRole('dialog', { name: 'Delete this technician?' });
        expect(dialog).toHaveTextContent('Sam Lee is taken off the roster.');
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
        await waitForElementToBeRemoved(dialog);
        expect(pharmacy.getState().technicians).toHaveLength(3);

        await user.click(screen.getByRole('button', { name: 'Delete Sam Lee' }));
        await user.click(
            within(await screen.findByRole('dialog', { name: 'Delete this technician?' })).getByRole('button', {
                name: 'Delete',
            })
        );
        await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));

        expect(pharmacy.getState().technicians.map((technician) => technician.id)).toEqual([1, 3]);
        await user.click(screen.getByRole('tab', { name: 'Zone Board' }));
        expect(screen.getByRole('button', { name: '(removed)' })).toBeInTheDocument();
    });
});
