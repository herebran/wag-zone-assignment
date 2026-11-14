import { decodePDFRawStream, PDFArray, PDFDocument, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { createBlankBoard, setNoteText } from '@/lib/board';
import { createBoardPdf } from '@/lib/boardPdf';
import type { SheetSource } from '@/lib/originalSheet';
import type { Board, Technician } from '@/lib/records';
import { DEFAULT_SETTINGS } from '@/lib/settings';
import { createSampleBoard, SAMPLE_BOARD_DATE, SAMPLE_TECHNICIANS } from '@/testing/sampleBoard';

/**
 * A line of text written on the page.
 */
interface WrittenLine {
    text: string;
    fontSize: number;
}

function createSource(board: Board = createSampleBoard(), technicians = SAMPLE_TECHNICIANS): SheetSource {
    return { board, boardDate: SAMPLE_BOARD_DATE, technicians, settings: DEFAULT_SETTINGS };
}

/**
 * The lines written on a PDF's page, in order. pdf-lib adds its drawing after the page's own, as separate instructions.
 * Each line appears as its font and size ("/Helvetica-Bold-1 10 Tf"), then its characters as pairs of hexadecimal
 * digits ("<4A44> Tj").
 */
async function readWrittenLines(bytes: Uint8Array): Promise<WrittenLine[]> {
    const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
    const contents = pdf.getPage(0).node.Contents();
    const written = contents instanceof PDFArray ? pdf.context.lookup(contents.get(contents.size() - 1)) : undefined;
    if (!(written instanceof PDFRawStream)) {
        return [];
    }

    const instructions = new TextDecoder('latin1').decode(decodePDFRawStream(written).decode());

    return Array.from(instructions.matchAll(/ ([\d.]+) Tf[^<]*<([0-9A-F]*)> Tj/g), ([, fontSize, characters]) => ({
        text: (characters.match(/../g) ?? []).map((pair) => String.fromCharCode(Number.parseInt(pair, 16))).join(''),
        fontSize: Number(fontSize),
    }));
}

/**
 * The lines as text, with no-break spaces turned into normal spaces.
 */
function readTexts(lines: readonly WrittenLine[]): string[] {
    return lines.map((line) => line.text.replaceAll('\u00A0', ' '));
}

describe('boardPdf', () => {
    it('writes the board on the original sheet: its one page, at its size, titled with the day', async () => {
        const pdf = await PDFDocument.load(await createBoardPdf(createSource()), { updateMetadata: false });

        expect(pdf.getPageCount()).toBe(1);
        expect(pdf.getPage(0).getSize()).toEqual({ width: 540, height: 720 });
        expect(pdf.getTitle()).toBe('Priority Zone Assignment, Thu, Nov 12, 2026');
    });

    it('writes every text of the board, on as many lines as its box asks for', async () => {
        const lines = await readWrittenLines(await createBoardPdf(createSource()));

        expect(readTexts(lines)).toEqual([
            'Thu, Nov 12, 2026',
            '8 AM -',
            '9 AM',
            'JD,',
            'Sam L.',
            'MGL',
            '(removed)',
            'JD',
            'Sam L.',
            '9 AM - ?',
            'MGL',
            'JD',
            '10 PM -',
            '12 AM',
            'Sam L.',
            '5',
            '15',
            '10',
            '3',
            '20',
            'JD, MGL',
            'by noon',
            'Sam L.',
            'JD, (removed)',
            'Order supplies for',
            'the week ahead',
        ]);
    });

    it('writes a text at its own size where it fits its box, and smaller where it is too long', async () => {
        const lines = await readWrittenLines(await createBoardPdf(createSource()));
        const findFontSize = (text: string) => lines[readTexts(lines).indexOf(text)].fontSize;

        expect(findFontSize('Thu, Nov 12, 2026')).toBe(16);
        expect(findFontSize('MGL')).toBe(18);
        expect(findFontSize('by noon')).toBe(16);

        // "(removed)" is too wide for a station at 18 points, and the note too long for its row at 12.
        expect(findFontSize('(removed)')).toBeLessThan(18);
        expect(findFontSize('Order supplies for')).toBeLessThan(12);
        expect(findFontSize('the week ahead')).toBe(findFontSize('Order supplies for'));
    });

    it('never writes smaller than five points, however long the text', async () => {
        const board = setNoteText(createBlankBoard(), 0, 'when', 'as soon as the truck is in '.repeat(12));
        const lines = await readWrittenLines(await createBoardPdf(createSource(board)));

        expect(lines.length).toBeGreaterThan(4);
        expect(new Set(lines.slice(1).map((line) => line.fontSize))).toEqual(new Set([5]));
    });

    it('writes a letter the font lacks under its accent without it, and "?" for what it has nothing for', async () => {
        const technician: Technician = {
            ...SAMPLE_TECHNICIANS[0],
            firstName: 'Thảo',
            lastName: 'Nguyễn',
            abbreviation: '',
        };

        // An "é" typed as an "e" plus a separate accent, then a symbol, an unusual space and two letters the font
        // lacks.
        const board = setNoteText(createSampleBoard(), 0, 'when', 'Cafe\u0301 ≥\u2003Łódź');
        const lines = await readWrittenLines(await createBoardPdf(createSource(board, [technician])));

        expect(readTexts(lines)).toContain('Thao N.');
        expect(readTexts(lines).join(' ')).toContain('Café ? ?ódz');
    });

    it('writes only the day on an empty board, and the same file for the same board', async () => {
        const source = createSource(createBlankBoard());

        expect(readTexts(await readWrittenLines(await createBoardPdf(source)))).toEqual(['Thu, Nov 12, 2026']);
        expect(await createBoardPdf(source)).toEqual(await createBoardPdf(source));
    });
});
