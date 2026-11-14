import { describe, expect, it, vi } from 'vitest';
import { addTimeSlot, assignTechnician, createBlankBoard, setIc3Amount } from '@/lib/board';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { createPharmacy } from '@/state/pharmacy';
import { getBoardKey, createMemoryStorage, ROSTER_KEY, SETTINGS_KEY } from '@/state/storage';
import { createSampleBoard } from '@/testing/sampleBoard';

const TODAY = '2026-11-12';
const JANE = { firstName: 'Jane', lastName: 'Doe', abbreviation: 'JD' };
const SAM = { firstName: 'Sam', lastName: 'Adams', abbreviation: '' };

/**
 * The pharmacy's data on its own storage, with a clock the test controls. Each change is one second after the last,
 * unless the test says otherwise.
 */
function createTestPharmacy(storage: Storage | null = createMemoryStorage()) {
    const clock = { time: new Date(2026, 10, 12, 9, 0, 0).getTime() };
    const pharmacy = createPharmacy({
        storage,
        now: () => {
            clock.time += 1000;
            return new Date(clock.time);
        },
    });

    return { pharmacy, storage, clock };
}

describe('pharmacy', () => {
    it("opens on today's blank board, an empty roster and the default settings", () => {
        const { pharmacy } = createTestPharmacy();

        expect(pharmacy.getState()).toEqual({
            technicians: [],
            settings: DEFAULT_SETTINGS,
            boardDate: TODAY,
            board: createBlankBoard(),
            isBoardSaved: false,
            savedBoardDates: [],
            canUndo: false,
            canRedo: false,
            storageStatus: 'saved',
        });
    });

    it('tells its listeners of every change, until they stop listening', () => {
        const { pharmacy } = createTestPharmacy();
        const listener = vi.fn();
        const stopListening = pharmacy.subscribe(listener);
        const stateBefore = pharmacy.getState();

        pharmacy.addTechnician(JANE);
        expect(listener).toHaveBeenCalledTimes(1);
        expect(pharmacy.getState()).not.toBe(stateBefore);
        expect(pharmacy.getState().board).toBe(stateBefore.board);

        stopListening();
        pharmacy.addTechnician(SAM);
        expect(listener).toHaveBeenCalledTimes(1);
    });

    it('keeps the roster in the order the settings ask for, each technician with an id of their own', () => {
        const { pharmacy } = createTestPharmacy();
        const jane = pharmacy.addTechnician({ firstName: '  Jane ', lastName: ' Doe', abbreviation: ' JD ' });
        const sam = pharmacy.addTechnician(SAM);

        expect(jane).toMatchObject({ id: 1, firstName: 'Jane', lastName: 'Doe', abbreviation: 'JD', role: 'Tech' });
        expect(sam.id).toBe(2);
        expect(pharmacy.getState().technicians.map((technician) => technician.id)).toEqual([1, 2]);

        pharmacy.updateSettings({ rosterOrder: 'lastName' });
        expect(pharmacy.getState().technicians.map((technician) => technician.id)).toEqual([2, 1]);
    });

    it('changes a technician, and never gives the id of one deleted to anyone else', () => {
        const { pharmacy, storage } = createTestPharmacy();
        const jane = pharmacy.addTechnician(JANE);
        pharmacy.updateTechnician(jane.id, { firstName: 'Janet', lastName: 'Doe', abbreviation: '' });
        pharmacy.setTechnicianRole(jane.id, 'RPh');
        expect(pharmacy.getState().technicians[0]).toMatchObject({ firstName: 'Janet', abbreviation: '', role: 'RPh' });

        pharmacy.deleteTechnician(jane.id);
        expect(pharmacy.getState().technicians).toEqual([]);
        expect(pharmacy.addTechnician(SAM).id).toBe(2);
        expect(createTestPharmacy(storage).pharmacy.addTechnician(JANE).id).toBe(3);
    });

    it('saves a board with the first change to it, and finds everything again when the page is opened again', () => {
        const { pharmacy, storage } = createTestPharmacy();
        const jane = pharmacy.addTechnician(JANE);
        pharmacy.updateSettings({ clockFormat: '24-hour', hiddenZones: ['red'] });
        expect(pharmacy.getState().isBoardSaved).toBe(false);

        pharmacy.changeBoard((board) =>
            assignTechnician(board, { kind: 'zone', slotIndex: 0, zone: 'fill1' }, jane.id)
        );
        expect(pharmacy.getState().isBoardSaved).toBe(true);
        expect(pharmacy.getState().savedBoardDates).toEqual([TODAY]);

        const reopened = createTestPharmacy(storage).pharmacy.getState();
        expect(reopened.technicians).toEqual(pharmacy.getState().technicians);
        expect(reopened.settings).toEqual(pharmacy.getState().settings);
        expect(reopened.board).toEqual(pharmacy.getState().board);
        expect(reopened.isBoardSaved).toBe(true);
        expect(reopened.canUndo).toBe(false);
    });

    it('does not save a change that changes nothing', () => {
        const { pharmacy } = createTestPharmacy();
        const listener = vi.fn();
        pharmacy.subscribe(listener);

        pharmacy.changeBoard((board) => board);

        expect(listener).not.toHaveBeenCalled();
        expect(pharmacy.getState().isBoardSaved).toBe(false);
    });

    it('undoes and redoes the changes to the open board, and saves the board it steps to', () => {
        const { pharmacy, storage } = createTestPharmacy();
        pharmacy.changeBoard(addTimeSlot);
        pharmacy.changeBoard(addTimeSlot);
        expect(pharmacy.getState()).toMatchObject({ canUndo: true, canRedo: false });

        pharmacy.undo();
        expect(pharmacy.getState().board.timeSlots).toHaveLength(9);
        expect(pharmacy.getState()).toMatchObject({ canUndo: true, canRedo: true });
        expect(createTestPharmacy(storage).pharmacy.getState().board.timeSlots).toHaveLength(9);

        pharmacy.redo();
        expect(pharmacy.getState().board.timeSlots).toHaveLength(10);

        pharmacy.undo();
        pharmacy.undo();
        pharmacy.undo();
        expect(pharmacy.getState().board).toEqual(createBlankBoard());
        expect(pharmacy.getState()).toMatchObject({ canUndo: false, isBoardSaved: true });
    });

    it('makes one step to undo of typing in a field', () => {
        const { pharmacy, clock } = createTestPharmacy();
        for (const amount of ['2', '20', '200']) {
            // Each key press comes a tenth of a second after the last.
            clock.time -= 900;
            pharmacy.changeBoard((board) => setIc3Amount(board, 'F1', amount), 'ic3Call:F1');
        }
        expect(pharmacy.getState().board.ic3Calls.F1.amount).toBe('200');

        pharmacy.undo();
        expect(pharmacy.getState().board.ic3Calls.F1.amount).toBe('');
    });

    it('opens the board of another day with a history of its own', () => {
        const { pharmacy } = createTestPharmacy();
        pharmacy.changeBoard(addTimeSlot);
        pharmacy.openBoard('2026-11-13');
        expect(pharmacy.getState()).toMatchObject({ boardDate: '2026-11-13', isBoardSaved: false, canUndo: false });
        expect(pharmacy.getState().board).toEqual(createBlankBoard());

        pharmacy.changeBoard((board) => setIc3Amount(board, 'FILL', '40'));
        expect(pharmacy.getState().savedBoardDates).toEqual(['2026-11-13', TODAY]);

        pharmacy.openBoard(TODAY);
        expect(pharmacy.getState().board.timeSlots).toHaveLength(9);
        expect(pharmacy.getState()).toMatchObject({ isBoardSaved: true, canUndo: false });
    });

    it('clears the board, which undo takes back, and deletes it, which nothing does', () => {
        const { pharmacy, storage } = createTestPharmacy();
        pharmacy.changeBoard(addTimeSlot);
        pharmacy.clearBoard();
        expect(pharmacy.getState().board).toEqual(createBlankBoard());
        expect(pharmacy.getState().isBoardSaved).toBe(true);

        pharmacy.undo();
        expect(pharmacy.getState().board.timeSlots).toHaveLength(9);

        pharmacy.deleteBoard();
        expect(pharmacy.getState()).toMatchObject({ isBoardSaved: false, savedBoardDates: [], canUndo: false });
        expect(pharmacy.getState().board).toEqual(createBlankBoard());
        expect(storage?.getItem(getBoardKey(TODAY))).toBeNull();
    });

    it("copies another day's board over the open one, which undo takes back", () => {
        const { pharmacy } = createTestPharmacy();
        pharmacy.changeBoard(() => createSampleBoard());
        pharmacy.openBoard('2026-11-13');
        pharmacy.changeBoard(addTimeSlot);

        expect(pharmacy.copyBoardFrom(TODAY)).toBe(true);
        expect(pharmacy.getState().board).toEqual(createSampleBoard());
        expect(pharmacy.getState().boardDate).toBe('2026-11-13');

        pharmacy.undo();
        expect(pharmacy.getState().board.timeSlots).toHaveLength(9);
        expect(pharmacy.copyBoardFrom('2026-01-01')).toBe(false);
    });

    it('puts everything into a backup, and restores a browser from one', () => {
        const { pharmacy } = createTestPharmacy();
        pharmacy.addTechnician(JANE);
        pharmacy.updateSettings({ nameStyle: 'firstLast' });
        pharmacy.changeBoard(() => createSampleBoard());
        pharmacy.openBoard('2026-11-13');
        pharmacy.changeBoard(addTimeSlot);
        const backup = pharmacy.createBackup();
        expect(Object.keys(backup.boards)).toEqual(['2026-11-13', TODAY]);

        // Another browser, with its own roster and boards. The backup replaces them.
        const other = createTestPharmacy();
        other.pharmacy.addTechnician(SAM);
        other.pharmacy.openBoard('2026-10-01');
        other.pharmacy.changeBoard(addTimeSlot);
        other.pharmacy.openBoard(TODAY);
        other.pharmacy.restoreBackup(backup);

        const restored = other.pharmacy.getState();
        expect(restored.technicians.map((technician) => technician.firstName)).toEqual(['Jane']);
        expect(restored.settings.nameStyle).toBe('firstLast');
        expect(restored.savedBoardDates).toEqual(['2026-11-13', TODAY]);
        expect(restored.board).toEqual(createSampleBoard());
        expect(restored).toMatchObject({ isBoardSaved: true, canUndo: false });
        expect(other.pharmacy.addTechnician(SAM).id).toBe(2);
        expect(createTestPharmacy(other.storage).pharmacy.getState().savedBoardDates).toEqual(['2026-11-13', TODAY]);
    });

    it('reads again what another tab of the browser saved', () => {
        const { pharmacy, storage } = createTestPharmacy();
        const otherTab = createTestPharmacy(storage).pharmacy;
        pharmacy.changeBoard(addTimeSlot);

        otherTab.addTechnician(JANE);
        pharmacy.readChangeFromStorage(ROSTER_KEY);
        expect(pharmacy.getState().technicians).toHaveLength(1);
        expect(pharmacy.getState().canUndo).toBe(true);

        otherTab.updateSettings({ timeStepMinutes: 30 });
        pharmacy.readChangeFromStorage(SETTINGS_KEY);
        expect(pharmacy.getState().settings.timeStepMinutes).toBe(30);

        otherTab.openBoard('2026-11-20');
        otherTab.changeBoard(addTimeSlot);
        pharmacy.readChangeFromStorage(getBoardKey('2026-11-20'));
        expect(pharmacy.getState().savedBoardDates).toEqual(['2026-11-20', TODAY]);
        expect(pharmacy.getState().canUndo).toBe(true);

        // The other tab changes the board that is open here, so its version is shown.
        otherTab.openBoard(TODAY);
        otherTab.changeBoard((board) => setIc3Amount(board, 'F1', '20'));
        pharmacy.readChangeFromStorage(getBoardKey(TODAY));
        expect(pharmacy.getState().board.ic3Calls.F1.amount).toBe('20');
        expect(pharmacy.getState().canUndo).toBe(false);

        storage?.clear();
        pharmacy.readChangeFromStorage(null);
        expect(pharmacy.getState()).toMatchObject({ technicians: [], savedBoardDates: [], isBoardSaved: false });
    });

    it('says so when the browser refuses a change, and when it takes one again', () => {
        const { pharmacy, storage } = createTestPharmacy();
        const setItem = vi.spyOn(storage!, 'setItem').mockImplementation(() => {
            throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        });
        pharmacy.changeBoard(addTimeSlot);
        expect(pharmacy.getState()).toMatchObject({
            storageStatus: 'failed',
            isBoardSaved: false,
            savedBoardDates: [],
        });
        expect(pharmacy.getState().board.timeSlots).toHaveLength(9);

        // A later change that saves does not fix the one that failed. The board is still not saved.
        setItem.mockRestore();
        pharmacy.updateSettings({ nameStyle: 'firstLast' });
        expect(pharmacy.getState().storageStatus).toBe('failed');

        pharmacy.changeBoard(addTimeSlot);
        expect(pharmacy.getState()).toMatchObject({
            storageStatus: 'saved',
            isBoardSaved: true,
            savedBoardDates: [TODAY],
        });
        expect(createTestPharmacy(storage).pharmacy.getState().board.timeSlots).toHaveLength(10);
    });

    it('has nothing left to save of a board the browser refused, once another board takes its place', () => {
        const { pharmacy, storage } = createTestPharmacy();
        const setItem = vi.spyOn(storage!, 'setItem').mockImplementation(() => {
            throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        });
        pharmacy.changeBoard(addTimeSlot);
        setItem.mockRestore();

        pharmacy.openBoard('2026-11-13');
        expect(pharmacy.getState()).toMatchObject({ storageStatus: 'saved', savedBoardDates: [] });

        pharmacy.openBoard(TODAY);
        expect(pharmacy.getState().board).toEqual(createBlankBoard());
    });

    it("keeps to the browser's own storage when given none, and to the page's memory where the browser blocks it", () => {
        localStorage.clear();
        createPharmacy().addTechnician(JANE);
        expect(createPharmacy().getState()).toMatchObject({
            technicians: [{ firstName: 'Jane' }],
            storageStatus: 'saved',
        });
        localStorage.clear();

        const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        });
        expect(createPharmacy().getState().storageStatus).toBe('blocked');
        getItem.mockRestore();
    });

    it('works for as long as the page is open where the browser blocks its storage', () => {
        const { pharmacy } = createTestPharmacy(null);
        pharmacy.addTechnician(JANE);
        pharmacy.changeBoard(addTimeSlot);
        pharmacy.openBoard('2026-11-13');
        pharmacy.openBoard(TODAY);

        expect(pharmacy.getState().storageStatus).toBe('blocked');
        expect(pharmacy.getState().technicians).toHaveLength(1);
        expect(pharmacy.getState().board.timeSlots).toHaveLength(9);
    });

    it('opens on what it can read when what is saved is damaged', () => {
        const storage = createMemoryStorage();
        storage.setItem(ROSTER_KEY, '{"technicians": [');
        storage.setItem(SETTINGS_KEY, '"dark mode"');
        storage.setItem(getBoardKey(TODAY), '{"board": {"timeSlots": "eight"}}');
        const { pharmacy } = createTestPharmacy(storage);

        expect(pharmacy.getState()).toMatchObject({ technicians: [], settings: DEFAULT_SETTINGS, isBoardSaved: true });
        expect(pharmacy.getState().board).toEqual(createBlankBoard());
    });
});
