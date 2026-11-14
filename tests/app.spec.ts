import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';

/**
 * Opens the app. Each test gets a fresh browser with nothing saved in it.
 */
async function openSite(page: Page): Promise<void> {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Priority Zone Assignment' })).toBeVisible();
}

/**
 * Adds someone to the roster on the Technicians tab, then goes back to the board.
 */
async function addTechnician(page: Page, firstName: string, lastName: string, abbreviation: string): Promise<void> {
    await page.getByRole('tab', { name: 'Technicians' }).click();
    await page.getByRole('textbox', { name: 'First name' }).fill(firstName);
    await page.getByRole('textbox', { name: 'Last name' }).fill(lastName);
    await page.getByRole('textbox', { name: 'Abbreviation (optional)' }).fill(abbreviation);
    await page.getByRole('button', { name: 'Add technician' }).click();
    await expect(page.getByText(`${firstName} ${lastName} added`)).toBeVisible();
    await page.getByRole('tab', { name: 'Zone Board' }).click();
}

/**
 * Counts the pages of a PDF the browser printed. Each page is an object in the file marked "/Type /Page".
 */
function countPages(pdf: Buffer): number {
    return (pdf.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g) ?? []).length;
}

/**
 * The scale the sheet was last printed at (1 is full size). usePrintScale saves it on the sheet as a CSS variable.
 */
async function readPrintScale(page: Page): Promise<number> {
    const style = await page.locator('[style*="--print-scale"]').getAttribute('style');
    const [, scale] = /--print-scale:\s*([\d.]+)/.exec(style ?? '') ?? [];

    return Number(scale);
}

test("builds a day's board, which is there again when the page is opened again", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await openSite(page);
    await addTechnician(page, 'Jane', 'Doe', 'JD');
    await addTechnician(page, 'Sam', 'Lee', '');

    // A slot starting at 8:00, which ends an hour later by itself, with two people at the Out Window.
    await page.getByRole('combobox', { name: 'Start of time slot 1' }).click();
    await page.getByRole('option', { name: '8:00 AM' }).click();
    await expect(page.getByRole('combobox', { name: 'End of time slot 1' })).toHaveText('9:00 AM');
    for (const name of ['Jane Doe (JD)', 'Sam Lee']) {
        await page.getByRole('button', { name: 'Assign a technician to Out Window, time slot 1' }).click();
        await page.getByRole('menuitem', { name }).click();
    }
    await page.getByRole('textbox', { name: 'F1 under' }).fill('5');
    await page.getByRole('textbox', { name: 'When, TPR' }).fill('by noon');

    // Everything is saved as it happens, so it is all still there after a reload.
    await page.reload();
    const board = page.getByRole('main');
    await expect(board.getByRole('button', { name: 'JD' })).toBeVisible();
    await expect(board.getByRole('button', { name: 'Sam L.' })).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Start of time slot 1' })).toHaveText('8:00 AM');
    await expect(page.getByRole('textbox', { name: 'F1 under' })).toHaveValue('5');
    await expect(page.getByRole('textbox', { name: 'When, TPR' })).toHaveValue('by noon');
    await expect(page.getByRole('status')).toHaveText('Saved in this browser');

    // The text export uses full names, for pasting into another board.
    await page.getByRole('button', { name: 'Export' }).click();
    const exportedText = page.getByRole('textbox', { name: 'The board as plain text' });
    await expect(exportedText).toHaveValue(/\[ 8:00 AM - 9:00 AM \]\n {2}Green \/ Out Window: Jane Doe, Sam Lee/);
    await expect(exportedText).toHaveValue(/- TPR {2}\(when: by noon\)/);

    expect(pageErrors).toEqual([]);
});

test('opens and runs without a connection, once it has been opened with one', async ({ page, context }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    // The first visit saves a copy of the app in the browser, and the page says when the copy is complete.
    await openSite(page);
    await expect(page.getByText('Zone Assignment is ready to work without a connection.')).toBeVisible();
    await addTechnician(page, 'Jane', 'Doe', 'JD');

    await context.setOffline(true);
    await page.reload();

    // With no network at all, the app still opens with its saved data and keeps saving.
    await expect(page.getByRole('heading', { name: 'Priority Zone Assignment' })).toBeVisible();
    await page.getByRole('button', { name: 'Assign a technician to Fill 1, time slot 2' }).click();
    await page.getByRole('menuitem', { name: 'Jane Doe (JD)' }).click();
    await page.reload();
    await expect(page.getByRole('main').getByRole('button', { name: 'JD' })).toBeVisible();

    expect(pageErrors).toEqual([]);
});

test('writes the board on the original sheet as a PDF, with no connection too', async ({ page, context }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await openSite(page);
    await expect(page.getByText('Zone Assignment is ready to work without a connection.')).toBeVisible();
    await addTechnician(page, 'Jane', 'Doe', 'JD');
    await page.getByRole('button', { name: 'Assign a technician to Out Window, time slot 1' }).click();
    await page.getByRole('menuitem', { name: 'Jane Doe (JD)' }).click();

    // The PDF code is not loaded with the page. Offline, it comes from the browser's copy of the app, like the page
    // itself.
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('button', { name: 'Export' }).click();
    await page.getByRole('button', { name: 'Original board (PDF)' }).click();

    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download .pdf' }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toMatch(/^zone-assignment-\d{4}-\d{2}-\d{2}\.pdf$/);

    // The file is one page, at the sheet's size.
    const pdf = await PDFDocument.load(await readFile(await download.path()));
    expect(pdf.getPageCount()).toBe(1);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 540, height: 720 });
    expect(pdf.getTitle()).toMatch(/^Priority Zone Assignment, /);

    expect(pageErrors).toEqual([]);
});

test('prints the board on one letter page, a long day scaled down to fit', async ({ page }) => {
    await openSite(page);
    await addTechnician(page, 'Jane', 'Doe', 'JD');
    await page.getByRole('button', { name: 'Assign a technician to CPW Lead, time slot 1' }).click();
    await page.getByRole('menuitem', { name: 'Jane Doe (JD)' }).click();

    expect(countPages(await page.pdf({ preferCSSPageSize: true, printBackground: true }))).toBe(1);

    // Fourteen time slots are too many for one page at full size, so the sheet shrinks to fit.
    for (let slotNumber = 9; slotNumber <= 14; slotNumber++) {
        await page.getByRole('button', { name: 'Add time slot' }).click();
    }
    await expect(page.getByRole('combobox', { name: 'Start of time slot 14' })).toBeVisible();

    expect(countPages(await page.pdf({ preferCSSPageSize: true, printBackground: true }))).toBe(1);
    expect(await readPrintScale(page)).toBeLessThan(0.9);

    // Back at the sheet's eight slots, it prints at full size again.
    for (let slotNumber = 14; slotNumber > 8; slotNumber--) {
        await page.getByRole('button', { name: 'Remove last' }).click();
    }

    expect(countPages(await page.pdf({ preferCSSPageSize: true, printBackground: true }))).toBe(1);
    expect(await readPrintScale(page)).toBe(1);
});
