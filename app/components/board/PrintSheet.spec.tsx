import { ThemeProvider } from '@mui/material';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import PrintSheet from '@/components/board/PrintSheet';
import type { Settings } from '@/lib/records';
import { createPharmacy } from '@/state/pharmacy';
import { PharmacyContext } from '@/state/pharmacyContext';
import { createMemoryStorage } from '@/state/storage';
import { addSampleTechnicians } from '@/testing/renderApp';
import { createSampleBoard } from '@/testing/sampleBoard';
import theme from '@/theme';

// The sheet is hidden on screen, so the tests also look at hidden elements.
const HIDDEN = { hidden: true };

function renderPrintSheet(settings: Partial<Settings> = {}) {
    const pharmacy = createPharmacy({ storage: createMemoryStorage(), now: () => new Date(2026, 10, 12, 9, 10) });
    addSampleTechnicians(pharmacy);
    pharmacy.updateSettings(settings);
    pharmacy.changeBoard(() => createSampleBoard());

    render(
        <ThemeProvider theme={theme}>
            <PharmacyContext value={pharmacy}>
                <PrintSheet />
            </PharmacyContext>
        </ThemeProvider>
    );
}

/**
 * The text of each cell of a table's row.
 */
function readCellTexts(row: HTMLElement): (string | null)[] {
    return within(row)
        .getAllByRole('cell', HIDDEN)
        .map((cell) => cell.textContent);
}

describe('PrintSheet', () => {
    it("prints the day, the zone grid and who is assigned, as the board's cells write them", () => {
        renderPrintSheet();
        const [zoneGrid] = screen.getAllByRole('table', HIDDEN);

        expect(screen.getByText('Date: Thu, Nov 12, 2026')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: 'Priority Zone Assignment', ...HIDDEN })).toBeInTheDocument();
        expect(
            within(zoneGrid)
                .getAllByRole('columnheader', HIDDEN)
                .map((heading) => heading.textContent)
        ).toEqual([
            'Time Slot',
            'Green Zone',
            'Blue Zone',
            'Purple Zone',
            'Red Zone',
            'Yellow Zone',
            'CPW Lead',
            'Out Window',
            'Drive Thru',
            'Fill 1',
            'Fill 2',
        ]);

        const rows = within(zoneGrid).getAllByRole('row', HIDDEN).slice(2);
        expect(rows).toHaveLength(8);
        expect(readCellTexts(rows[0])).toEqual([
            '8:00 AMto9:00 AM',
            'JDSam L.',
            'MGL',
            '',
            '(removed)',
            'JD',
            '',
            '',
            'Sam L.',
        ]);
        expect(readCellTexts(rows[3])).toEqual(['10:00 PMto12:00 AM', '', '', '', '', '', 'Sam L.', '', '']);
        expect(readCellTexts(rows[7])).toEqual(['to', '', '', '', '', '', '', '', '']);
        expect(screen.queryByRole('button', HIDDEN)).not.toBeInTheDocument();
    });

    it('prints the Phlomometer, the calls for IC3 and every row of the notes, the empty ones to write on', () => {
        renderPrintSheet();
        const [, phlomometer, ic3Calls, notes] = screen.getAllByRole('table', HIDDEN);

        expect(phlomometer).toHaveTextContent('F15/15F4/10FILL/REV3/');
        expect(readCellTexts(within(ic3Calls).getAllByRole('row', HIDDEN)[1])).toEqual(['20', 'JDMGL']);

        const noteRows = within(notes).getAllByRole('row', HIDDEN).slice(1);
        expect(noteRows).toHaveLength(13);
        expect(noteRows[4]).toHaveTextContent('TPRby noonSam L.');
        expect(noteRows[10]).toHaveTextContent('Order supplies for the week ahead');
        expect(noteRows[12]).toHaveTextContent('');
    });

    it('leaves out the zones and the sections the pharmacy has turned off', () => {
        renderPrintSheet({
            clockFormat: '24-hour',
            nameStyle: 'firstLast',
            hiddenZones: ['purple', 'cpwLead'],
            hasPhlomometer: false,
            hasNotes: false,
        });
        const tables = screen.getAllByRole('table', HIDDEN);
        const rows = within(tables[0]).getAllByRole('row', HIDDEN).slice(2);

        expect(tables).toHaveLength(2);
        expect(screen.queryByRole('columnheader', { name: 'Purple Zone', ...HIDDEN })).not.toBeInTheDocument();
        expect(readCellTexts(rows[0])).toEqual([
            '08:00to09:00',
            'Jane DoeSam Lee',
            'Maria Garcia-Lopez',
            '',
            '(removed)',
            '',
            '',
        ]);
        expect(screen.getByRole('heading', { name: 'Call for IC3:', ...HIDDEN })).toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: /Phlomometer/, ...HIDDEN })).not.toBeInTheDocument();
    });
});
