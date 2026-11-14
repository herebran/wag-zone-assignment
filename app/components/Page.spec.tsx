import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addTimeSlot, assignTechnician } from '@/lib/board';
import { createPharmacy } from '@/state/pharmacy';
import { createMemoryStorage, ROSTER_KEY } from '@/state/storage';
import { addSampleTechnicians, renderApp } from '@/testing/renderApp';
import { createSampleBoard } from '@/testing/sampleBoard';

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'pdfViewerEnabled');
});

/**
 * Replaces the browser's file download and records what was downloaded.
 */
function watchDownloads() {
    const downloads: { fileName: string; file: Blob }[] = [];
    let latestFile = new Blob();
    vi.stubGlobal(
        'URL',
        Object.assign(URL, {
            createObjectURL: (file: Blob) => {
                latestFile = file;
                return 'blob:download';
            },
            revokeObjectURL: () => undefined,
        })
    );
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push({ fileName: this.download, file: latestFile });
    });

    return downloads;
}

describe('Page', () => {
    it('opens on the Zone Board, with the roster and the settings a tab away', async () => {
        const { user } = renderApp();
        expect(screen.getByRole('tab', { name: 'Zone Board' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('heading', { name: 'Priority Zone Assignment', level: 1 })).toBeInTheDocument();
        expect(screen.getByRole('status')).toHaveTextContent('Saved in this browser');

        await user.click(screen.getByRole('tab', { name: 'Technicians' }));
        expect(screen.getByRole('heading', { name: 'Pharmacy roster' })).toBeInTheDocument();

        await user.click(screen.getByRole('tab', { name: 'Settings' }));
        expect(screen.getByRole('heading', { name: 'Operating hours' })).toBeInTheDocument();
        expect(screen.getByText('v1.0.0')).toBeInTheDocument();
    });

    it('prints from the top bar on the Zone Board, and greys Print and Export on the other tabs', async () => {
        const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
        const { user } = renderApp();

        await user.click(screen.getByRole('button', { name: 'Print' }));
        expect(print).toHaveBeenCalledTimes(1);

        await user.click(screen.getByRole('tab', { name: 'Technicians' }));
        expect(screen.getByRole('button', { name: 'Print' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Backup' })).toBeEnabled();
    });

    it('shows the board as text, to copy or to download', async () => {
        const downloads = watchDownloads();
        const { user } = renderApp({
            prepare: (preparedPharmacy) => {
                addSampleTechnicians(preparedPharmacy);
                preparedPharmacy.changeBoard(() => createSampleBoard());
            },
        });

        await user.click(screen.getByRole('button', { name: 'Export' }));
        const dialog = await screen.findByRole('dialog', { name: 'Export the board' });
        expect(within(dialog).getByRole('button', { name: 'Simple list' })).toHaveAttribute('aria-pressed', 'true');
        const text = within(dialog).getByRole<HTMLTextAreaElement>('textbox', { name: 'The board as plain text' });
        expect(text.value).toContain('[ 8:00 AM - 9:00 AM ]\n  Green / Out Window: Jane Doe, Sam Lee');
        expect(text.value).toContain('Generated 11/12/2026, 9:10:00 AM');

        await user.click(within(dialog).getByRole('button', { name: 'Copy' }));
        expect(await screen.findByText('Copied to clipboard')).toBeInTheDocument();
        expect(await navigator.clipboard.readText()).toBe(text.value);

        await user.click(within(dialog).getByRole('button', { name: 'Download .txt' }));
        expect(downloads.map((download) => download.fileName)).toEqual(['zone-assignment-2026-11-12.txt']);
        expect(await downloads[0].file.text()).toBe(text.value);
    });

    it('writes the board on the original board as a PDF, to download or to open and print', async () => {
        const downloads = watchDownloads();
        const open = vi.spyOn(window, 'open').mockReturnValue(window);
        Object.defineProperty(navigator, 'pdfViewerEnabled', { value: true, configurable: true });
        const { pharmacy, user } = renderApp({
            prepare: (preparedPharmacy) => {
                addSampleTechnicians(preparedPharmacy);
                preparedPharmacy.changeBoard(() => createSampleBoard());
            },
        });

        await user.click(screen.getByRole('button', { name: 'Export' }));
        const dialog = await screen.findByRole('dialog', { name: 'Export the board' });
        // A plain click with nothing awaited after it, so the checks below run before the PDF can be ready.
        fireEvent.click(within(dialog).getByRole('button', { name: 'Original board (PDF)' }));
        expect(pharmacy.getState().settings.exportStyle).toBe('pdf');
        expect(within(dialog).queryByRole('textbox', { name: 'The board as plain text' })).not.toBeInTheDocument();

        // The buttons are disabled until the PDF is ready. The browser's own PDF viewer then shows it.
        const download = within(dialog).getByRole('button', { name: 'Download .pdf' });
        expect(download).toBeDisabled();
        await waitFor(() => expect(download).toBeEnabled());
        const preview = within(dialog).getByLabelText('The board on the original sheet');
        expect(preview).toHaveAttribute('type', 'application/pdf');
        expect(preview).toHaveAttribute('data', 'blob:download#toolbar=0&navpanes=0');

        await user.click(download);
        expect(downloads.map(({ fileName }) => fileName)).toEqual(['zone-assignment-2026-11-12.pdf']);
        expect(downloads[0].file.type).toBe('application/pdf');
        expect(await downloads[0].file.text()).toMatch(/^%PDF-/);

        await user.click(within(dialog).getByRole('button', { name: 'Open to print' }));
        expect(open).toHaveBeenCalledWith('blob:download', '_blank');

        // The dialog reopens in the style it was left in, and can switch back to the text.
        await user.click(within(dialog).getByRole('button', { name: 'Close' }));
        await user.click(screen.getByRole('button', { name: 'Export' }));
        expect(await screen.findByRole('button', { name: 'Original board (PDF)' })).toHaveAttribute(
            'aria-pressed',
            'true'
        );
        await user.click(screen.getByRole('button', { name: 'Simple list' }));
        expect(screen.getByRole('textbox', { name: 'The board as plain text' })).toBeInTheDocument();
        expect(pharmacy.getState().settings.exportStyle).toBe('list');
    });

    it('says what the original board has no room for, and when the browser shows no PDF or opens no tab', async () => {
        watchDownloads();
        vi.spyOn(window, 'open').mockReturnValue(null);
        const { user } = renderApp({
            prepare: (preparedPharmacy) => {
                addSampleTechnicians(preparedPharmacy);
                preparedPharmacy.updateSettings({ exportStyle: 'pdf' });

                // Two time slots more than the sheet's eight, each with someone in it. The sample board also has two of
                // the pharmacy's own notes, and the sheet has one row for them.
                preparedPharmacy.changeBoard(() => addTimeSlot(addTimeSlot(createSampleBoard())));
                preparedPharmacy.changeBoard((board) =>
                    assignTechnician(board, { kind: 'zone', slotIndex: 8, zone: 'fill1' }, 1)
                );
                preparedPharmacy.changeBoard((board) =>
                    assignTechnician(board, { kind: 'zone', slotIndex: 9, zone: 'fill2' }, 2)
                );
            },
        });

        await user.click(screen.getByRole('button', { name: 'Export' }));
        const dialog = await screen.findByRole('dialog', { name: 'Export the board' });
        expect(
            within(dialog).getByText(
                'Not on the PDF, which has no room for them: time slots 9 and 10; 1 note of your own.'
            )
        ).toBeInTheDocument();
        expect(
            await within(dialog).findByText(
                'This browser does not show a PDF inside a page. Open it or download it to look at it.'
            )
        ).toBeInTheDocument();

        await user.click(within(dialog).getByRole('button', { name: 'Open to print' }));
        expect(
            await screen.findByText('The browser did not open a new tab. Download the PDF and print it from there.')
        ).toBeInTheDocument();
    });

    it('says what was done at the foot of the page, in a notification that can be dismissed', async () => {
        const { user } = renderApp();

        await user.click(screen.getByRole('tab', { name: 'Settings' }));
        await user.click(screen.getByRole('checkbox', { name: /24-hour pharmacy/ }));
        const notification = await screen.findByRole('alert');
        expect(notification).toHaveTextContent('24-hour mode on');

        await user.click(within(notification).getByRole('button', { name: 'Dismiss' }));
        await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    });

    it('says in the top bar and at the foot of the page when the browser refuses a change', async () => {
        const storage = createMemoryStorage();
        const { user } = renderApp({ storage });
        vi.spyOn(storage, 'setItem').mockImplementation(() => {
            throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
        });

        await user.click(screen.getByRole('button', { name: 'Add time slot' }));

        expect(screen.getByRole('status')).toHaveTextContent('Not saved: storage is full');
        expect(await screen.findByRole('alert')).toHaveTextContent('Save a backup now so nothing is lost.');
        expect(screen.getByRole('combobox', { name: 'Start of time slot 9' })).toBeInTheDocument();
    });

    it('says so where the browser gives the page no storage at all, and still runs', async () => {
        const { pharmacy, user } = renderApp({ storage: null });
        expect(screen.getByRole('status')).toHaveTextContent('Not saved: storage is blocked');

        await user.click(screen.getByRole('button', { name: 'Add time slot' }));
        expect(pharmacy.getState().board.timeSlots).toHaveLength(9);
    });

    it('shows what another tab of the browser has just saved', async () => {
        const storage = createMemoryStorage();
        const { user } = renderApp({ storage });
        const otherTab = createPharmacy({ storage });
        addSampleTechnicians(otherTab);

        act(() => {
            window.dispatchEvent(new StorageEvent('storage', { key: ROSTER_KEY }));
        });
        await user.click(screen.getByRole('button', { name: 'Assign a technician to Out Window, time slot 1' }));

        expect(await screen.findByRole('menuitem', { name: 'Jane Doe (JD)' })).toBeInTheDocument();
    });
});
