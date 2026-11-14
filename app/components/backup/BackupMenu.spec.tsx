import { screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Backup } from '@/lib/backup';
import { addTimeSlot } from '@/lib/board';
import { createPharmacy } from '@/state/pharmacy';
import { createMemoryStorage } from '@/state/storage';
import { addSampleTechnicians, renderApp, TODAY } from '@/testing/renderApp';
import { createSampleBoard } from '@/testing/sampleBoard';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

/**
 * A backup file from another browser: three technicians, a board for today and one for 2026-11-10.
 */
function createBackupFile(): File {
    const pharmacy = createPharmacy({ storage: createMemoryStorage(), now: () => new Date(2026, 10, 11, 17, 30) });
    addSampleTechnicians(pharmacy);
    pharmacy.updateSettings({ nameStyle: 'firstLast' });
    pharmacy.openBoard(TODAY);
    pharmacy.changeBoard(() => createSampleBoard());
    pharmacy.openBoard('2026-11-10');
    pharmacy.changeBoard(addTimeSlot);

    return new File([JSON.stringify(pharmacy.createBackup())], 'zone-assignment-backup-2026-11-11.json', {
        type: 'application/json',
    });
}

describe('BackupMenu', () => {
    it('saves everything the browser keeps as a .json file named after the day', async () => {
        let savedFile = new Blob();
        vi.stubGlobal(
            'URL',
            Object.assign(URL, {
                createObjectURL: (file: Blob) => {
                    savedFile = file;
                    return 'blob:backup';
                },
                revokeObjectURL: () => undefined,
            })
        );
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
        const { user } = renderApp({
            prepare: (pharmacy) => {
                addSampleTechnicians(pharmacy);
                pharmacy.changeBoard(() => createSampleBoard());
            },
        });

        await user.click(screen.getByRole('button', { name: 'Backup' }));
        await user.click(await screen.findByRole('menuitem', { name: /Save a backup/ }));

        expect(await screen.findByText('Backup saved as zone-assignment-backup-2026-11-12.json')).toBeInTheDocument();
        expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe('zone-assignment-backup-2026-11-12.json');
        const backup = JSON.parse(await savedFile.text()) as Backup;
        expect(backup).toMatchObject({ app: 'zone-assignment', version: 2, nextTechnicianId: 4 });
        expect(backup.technicians.map((technician) => technician.firstName)).toEqual(['Jane', 'Sam', 'Maria']);
        expect(backup.boards[TODAY].board).toEqual(createSampleBoard());
    });

    it('restores a backup once asked, in place of what the browser kept', async () => {
        const { pharmacy, user } = renderApp({
            prepare: (preparedPharmacy) => {
                preparedPharmacy.addTechnician({ firstName: 'Old', lastName: 'Roster', abbreviation: '' });
                preparedPharmacy.openBoard('2026-10-01');
                preparedPharmacy.changeBoard(addTimeSlot);
                preparedPharmacy.openBoard(TODAY);
            },
        });

        await user.upload(screen.getByLabelText('Backup file to restore'), createBackupFile());
        const dialog = await screen.findByRole('dialog', { name: 'Restore this backup?' });
        expect(dialog).toHaveTextContent('The backup of Nov 11, 2026, 5:30 PM has 3 technicians and 2 saved boards');
        expect(pharmacy.getState().technicians).toHaveLength(1);

        await user.click(within(dialog).getByRole('button', { name: 'Restore' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByText('Backup restored')).toBeInTheDocument();
        expect(pharmacy.getState().technicians.map((technician) => technician.firstName)).toEqual([
            'Jane',
            'Maria',
            'Sam',
        ]);
        expect(pharmacy.getState().savedBoardDates).toEqual([TODAY, '2026-11-10']);
        expect(pharmacy.getState().board).toEqual(createSampleBoard());

        // The board uses the backup's settings: full names, in each of the three places Maria is assigned.
        expect(screen.getAllByRole('button', { name: 'Maria Garcia-Lopez' })).toHaveLength(3);
    });

    it('leaves everything as it was when the restore is cancelled', async () => {
        const { pharmacy, user } = renderApp();
        const stateBefore = pharmacy.getState();

        await user.upload(screen.getByLabelText('Backup file to restore'), createBackupFile());
        const dialog = await screen.findByRole('dialog', { name: 'Restore this backup?' });
        await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(pharmacy.getState()).toBe(stateBefore);
    });

    it('says why a file that is no backup cannot be restored', async () => {
        const { pharmacy, user } = renderApp();
        const exportedText = new File(['PRIORITY ZONE ASSIGNMENT'], 'zone-assignment-2026-11-12.json', {
            type: 'application/json',
        });

        await user.upload(screen.getByLabelText('Backup file to restore'), exportedText);

        expect(await screen.findByRole('alert')).toHaveTextContent(
            'That file is not a Zone Assignment backup: it is not a JSON file.'
        );
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(pharmacy.getState().technicians).toEqual([]);
    });
});
