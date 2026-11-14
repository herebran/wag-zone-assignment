import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { assignTechnician, setIc3Amount } from '@/lib/board';
import { addSampleTechnicians, renderApp, TODAY } from '@/testing/renderApp';

const OUT_WINDOW_FIRST_SLOT = 'Assign a technician to Out Window, time slot 1';

describe('ZoneBoard', () => {
    it('assigns technicians to a station from the roster, each once, and takes one off', async () => {
        const { pharmacy, user } = renderApp({ prepare: addSampleTechnicians });

        await user.click(screen.getByRole('button', { name: OUT_WINDOW_FIRST_SLOT }));
        await user.click(await screen.findByRole('menuitem', { name: 'Jane Doe (JD)' }));
        await user.click(screen.getByRole('button', { name: OUT_WINDOW_FIRST_SLOT }));
        expect(screen.queryByRole('menuitem', { name: 'Jane Doe (JD)' })).not.toBeInTheDocument();
        await user.click(await screen.findByRole('menuitem', { name: 'Sam Lee' }));

        expect(pharmacy.getState().board.timeSlots[0].assignments.outWindow).toEqual([1, 2]);
        expect(screen.getByRole('button', { name: 'JD' })).toBeInTheDocument();

        await user.click(within(screen.getByRole('button', { name: 'JD' })).getByTestId('CancelIcon'));
        expect(pharmacy.getState().board.timeSlots[0].assignments.outWindow).toEqual([2]);
        expect(screen.queryByRole('button', { name: 'JD' })).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sam L.' })).toBeInTheDocument();
    });

    it('says where to add technicians while the roster is empty', async () => {
        const { user } = renderApp();

        await user.click(screen.getByRole('button', { name: OUT_WINDOW_FIRST_SLOT }));

        expect(await screen.findByRole('menuitem', { name: /Add your team on the Technicians tab/ })).toHaveAttribute(
            'aria-disabled',
            'true'
        );
    });

    it('ends a slot an hour after the start chosen, and lets the end be changed', async () => {
        const { pharmacy, user } = renderApp();

        await user.click(screen.getByRole('combobox', { name: 'Start of time slot 2' }));
        await user.click(await screen.findByRole('option', { name: '8:30 AM' }));
        expect(screen.getByRole('combobox', { name: 'Start of time slot 2' })).toHaveTextContent('8:30 AM');
        expect(screen.getByRole('combobox', { name: 'End of time slot 2' })).toHaveTextContent('9:30 AM');

        await user.click(screen.getByRole('combobox', { name: 'End of time slot 2' }));
        await user.click(await screen.findByRole('option', { name: '11:00 AM' }));
        expect(pharmacy.getState().board.timeSlots[1]).toMatchObject({ startTime: '08:30', endTime: '11:00' });
    });

    it('keeps a time the hours no longer offer, marked, until another is chosen', async () => {
        const { pharmacy, user } = renderApp({
            prepare: (preparedPharmacy) => {
                preparedPharmacy.changeBoard((board) => ({
                    ...board,
                    timeSlots: board.timeSlots.map((slot, index) =>
                        index === 0 ? { ...slot, startTime: '06:15' } : slot
                    ),
                }));
            },
        });
        const start = screen.getByRole('combobox', { name: 'Start of time slot 1' });
        expect(start).toHaveTextContent('6:15 AM •');

        await user.click(start);
        await user.click(await screen.findByRole('option', { name: '8:00 AM' }));

        expect(pharmacy.getState().board.timeSlots[0].startTime).toBe('08:00');
        expect(start).toHaveTextContent(/^8:00 AM$/);
    });

    it('adds and removes time slots at the end of the grid', async () => {
        const { pharmacy, user } = renderApp();

        await user.click(screen.getByRole('button', { name: 'Add time slot' }));
        expect(screen.getByRole('combobox', { name: 'Start of time slot 9' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Remove last' }));
        await user.click(screen.getByRole('button', { name: 'Remove last' }));
        expect(pharmacy.getState().board.timeSlots).toHaveLength(7);
        expect(screen.queryByRole('combobox', { name: 'Start of time slot 8' })).not.toBeInTheDocument();
    });

    it('writes the Phlomometer, the calls for IC3 and the notes as they are typed', async () => {
        const { pharmacy, user } = renderApp({ prepare: addSampleTechnicians });

        await user.type(screen.getByRole('textbox', { name: 'F1 under' }), '5');
        await user.type(screen.getByRole('textbox', { name: 'F1 above' }), '15');
        await user.type(screen.getByRole('textbox', { name: 'FILL > amount' }), '40');
        await user.type(screen.getByRole('textbox', { name: 'When, TPR' }), 'by noon');
        await user.type(screen.getByRole('textbox', { name: 'What, note 11' }), 'Order supplies');
        await user.click(screen.getByRole('button', { name: 'Assign a technician to Order supplies' }));
        await user.click(await screen.findByRole('menuitem', { name: 'Maria Garcia-Lopez (MGL)' }));

        const { board } = pharmacy.getState();
        expect(board.phlomometer.F1).toEqual({ under: '5', above: '15' });
        expect(board.ic3Calls.FILL.amount).toBe('40');
        expect(board.notes[4]).toMatchObject({ what: 'TPR', when: 'by noon' });
        expect(board.notes[10]).toMatchObject({ what: 'Order supplies', technicianIds: [3] });
    });

    it("adds rows for the pharmacy's own notes and removes them, the printed rows staying", async () => {
        const { pharmacy, user } = renderApp();

        await user.click(screen.getByRole('button', { name: 'Add row' }));
        await user.type(screen.getByRole('textbox', { name: 'What, note 12' }), 'Inventory');
        await user.click(screen.getByRole('button', { name: 'Remove note 11' }));

        expect(
            pharmacy
                .getState()
                .board.notes.map((note) => note.what)
                .slice(-2)
        ).toEqual(['Immunizer', 'Inventory']);
        expect(screen.queryByRole('button', { name: 'Remove Immunizer' })).not.toBeInTheDocument();
        expect(screen.getByRole('rowheader', { name: 'Immunizer' })).toBeInTheDocument();
    });

    it('undoes and redoes with the buttons and with the keyboard, typing a field at a time', async () => {
        const { pharmacy, user } = renderApp();
        const undo = screen.getByRole('button', { name: 'Undo' });
        const redo = screen.getByRole('button', { name: 'Redo' });
        expect(undo).toBeDisabled();

        await user.type(screen.getByRole('textbox', { name: 'F1 under' }), '125');
        await user.click(screen.getByRole('button', { name: 'Add time slot' }));
        await user.click(undo);
        expect(pharmacy.getState().board.timeSlots).toHaveLength(8);
        expect(redo).toBeEnabled();

        await user.keyboard('{Control>}z{/Control}');
        expect(screen.getByRole('textbox', { name: 'F1 under' })).toHaveValue('');
        expect(undo).toBeDisabled();

        await user.keyboard('{Control>}y{/Control}');
        expect(screen.getByRole('textbox', { name: 'F1 under' })).toHaveValue('125');
        await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
        expect(pharmacy.getState().board.timeSlots).toHaveLength(9);
        expect(redo).toBeDisabled();
    });

    it('turns a zone off for the pharmacy and on again, keeping who was assigned to it', async () => {
        const { pharmacy, user } = renderApp({
            prepare: (preparedPharmacy) => {
                addSampleTechnicians(preparedPharmacy);
                preparedPharmacy.changeBoard((board) =>
                    assignTechnician(board, { kind: 'zone', slotIndex: 0, zone: 'red' }, 1)
                );
            },
        });
        expect(screen.getByRole('columnheader', { name: 'Red Zone' })).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Zones 4/4' }));
        await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Red Zone' }));
        expect(await screen.findByText('Red Zone hidden: its assignments are kept')).toBeInTheDocument();
        expect(screen.queryByRole('columnheader', { name: 'Red Zone' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'JD' })).not.toBeInTheDocument();
        expect(pharmacy.getState().settings.hiddenZones).toEqual(['red']);

        // The menu stays open, so another zone can be turned off.
        expect(screen.getByRole('button', { name: 'Zones 3/4', hidden: true })).toBeInTheDocument();

        await user.click(screen.getByRole('menuitemcheckbox', { name: 'Red Zone' }));
        await user.keyboard('{Escape}');
        expect(screen.getByRole('columnheader', { name: 'Red Zone' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'JD' })).toBeInTheDocument();
    });

    it('clears the board once asked, which undo takes back', async () => {
        const { pharmacy, user } = renderApp({
            prepare: (preparedPharmacy) => preparedPharmacy.changeBoard((board) => setIc3Amount(board, 'F1', '20')),
        });

        await user.click(screen.getByRole('button', { name: 'Clear board' }));
        const dialog = await screen.findByRole('dialog', { name: 'Clear this board?' });
        await user.click(within(dialog).getByRole('button', { name: 'Clear board' }));
        await waitForElementToBeRemoved(dialog);

        expect(pharmacy.getState().board.ic3Calls.F1.amount).toBe('');
        expect(screen.getByText('Board cleared')).toBeInTheDocument();

        await user.click(screen.getByRole('button', { name: 'Undo' }));
        expect(pharmacy.getState().board.ic3Calls.F1.amount).toBe('20');
    });

    it('goes to a saved board from the list, and deletes the open one once asked', async () => {
        const { pharmacy, user } = renderApp({
            prepare: (preparedPharmacy) => {
                preparedPharmacy.openBoard('2026-11-10');
                preparedPharmacy.changeBoard((board) => setIc3Amount(board, 'F1', '20'));
                preparedPharmacy.openBoard(TODAY);
            },
        });
        expect(screen.getByRole('button', { name: 'Delete this board' })).toBeDisabled();

        await user.click(screen.getByRole('combobox', { name: 'Saved boards' }));
        await user.click(await screen.findByRole('option', { name: 'Tue, Nov 10, 2026' }));
        expect(pharmacy.getState().boardDate).toBe('2026-11-10');
        expect(within(screen.getByRole('main')).getByText('Date: Tue, Nov 10, 2026')).toBeInTheDocument();
        expect(screen.getByRole('textbox', { name: 'F1 > amount' })).toHaveValue('20');

        await user.click(screen.getByRole('button', { name: 'Delete this board' }));
        const dialog = await screen.findByRole('dialog', { name: 'Delete this board?' });
        await user.click(within(dialog).getByRole('button', { name: 'Delete board' }));
        await waitForElementToBeRemoved(dialog);

        expect(pharmacy.getState()).toMatchObject({ isBoardSaved: false, savedBoardDates: [] });
        expect(screen.getByRole('textbox', { name: 'F1 > amount' })).toHaveValue('');
    });

    it('opens another day from the calendar, on which the days that have a board saved are marked', async () => {
        const { pharmacy, user } = renderApp({
            prepare: (preparedPharmacy) => {
                preparedPharmacy.openBoard('2026-11-10');
                preparedPharmacy.changeBoard((board) => setIc3Amount(board, 'F1', '20'));
                preparedPharmacy.openBoard(TODAY);
            },
        });

        await user.click(screen.getByRole('button', { name: 'Choose date, selected date is Nov 12, 2026' }));
        const calendar = await screen.findByRole('dialog', { name: 'Board date' });
        expect(within(calendar).getByRole('gridcell', { name: '10' })).toHaveAccessibleDescription(
            'This day has a saved board'
        );
        expect(within(calendar).getByRole('gridcell', { name: '11' })).not.toHaveAccessibleDescription();

        await user.click(within(calendar).getByRole('gridcell', { name: '10' }));
        expect(pharmacy.getState().boardDate).toBe('2026-11-10');
        expect(screen.getByRole('textbox', { name: 'F1 > amount' })).toHaveValue('20');
        expect(screen.getByRole('button', { name: 'Choose date, selected date is Nov 10, 2026' })).toBeInTheDocument();
    });

    it('opens the day typed into the date once the date is whole, and no board for a year half typed', async () => {
        const { pharmacy, user } = renderApp();

        await user.click(screen.getByRole('spinbutton', { name: 'Day' }));
        await user.keyboard('14');
        expect(pharmacy.getState().boardDate).toBe('2026-11-14');

        // The year is typed one digit at a time. No board is opened for the years 2, 20 and 202.
        await user.click(screen.getByRole('spinbutton', { name: 'Year' }));
        await user.keyboard('202');
        expect(pharmacy.getState().boardDate).toBe('2026-11-14');
        await user.keyboard('7');
        expect(pharmacy.getState().boardDate).toBe('2027-11-14');
        expect(within(screen.getByRole('main')).getByText('Date: Sun, Nov 14, 2027')).toBeInTheDocument();
    });

    it("copies another day's board over the open one, after saying what it replaces", async () => {
        const { pharmacy, user } = renderApp({
            prepare: (preparedPharmacy) => {
                preparedPharmacy.openBoard('2026-11-20');
                preparedPharmacy.changeBoard((board) => setIc3Amount(board, 'F1', '99'));
                preparedPharmacy.openBoard('2026-11-10');
                preparedPharmacy.changeBoard((board) => setIc3Amount(board, 'F1', '20'));
                preparedPharmacy.openBoard(TODAY);
                preparedPharmacy.changeBoard((board) => setIc3Amount(board, 'FILL', '5'));
            },
        });

        await user.click(screen.getByRole('button', { name: 'Copy from…' }));
        const dialog = await screen.findByRole('dialog', { name: 'Copy from another board' });

        // The newest board that is not in the future is offered first.
        expect(within(dialog).getByRole('combobox', { name: 'Choose a saved board' })).toHaveTextContent(
            'Tue, Nov 10, 2026'
        );
        expect(within(dialog).getByRole('alert')).toHaveTextContent('This replaces everything already on this board.');
        await user.click(within(dialog).getByRole('button', { name: 'Copy' }));

        expect(pharmacy.getState().boardDate).toBe(TODAY);
        expect(pharmacy.getState().board.ic3Calls).toMatchObject({ F1: { amount: '20' }, FILL: { amount: '' } });
        expect(await screen.findByText('Copied from Tue, Nov 10, 2026')).toBeInTheDocument();
    });

    it('says so when there is no other board to copy from', async () => {
        const { user } = renderApp();

        await user.click(screen.getByRole('button', { name: 'Copy from…' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('There are no other saved boards to copy from yet.');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
});
