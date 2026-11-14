/**
 * The board as a PDF: the day's board written on the original sheet (originalSheet.ts), ready to print. The sheet's
 * page is used as it is, and each text is added on top at a size that fits its box.
 *
 * The text is in Helvetica Bold, which every PDF reader has built in, so the file needs no font. It only has Western
 * European letters. A letter it lacks is written without its accent, or as "?".
 *
 * pdf-lib is large, so this file is only loaded when a PDF is first asked for (hooks/useBoardPdf.ts).
 */
import {
    breakTextIntoLines,
    clip,
    endPath,
    PDFDocument,
    popGraphicsState,
    pushGraphicsState,
    rectangle,
    rgb,
    StandardFonts,
    type PDFFont,
    type PDFPage,
} from 'pdf-lib';
import ORIGINAL_SHEET from '@/assets/original-sheet.pdf?inline';
import { formatBoardDate } from '@/lib/dates';
import {
    listSheetTexts,
    type SheetAlignment,
    type SheetBox,
    type SheetSource,
    type SheetText,
} from '@/lib/originalSheet';

/** The text colour: black, which also reads on the grid's grey rows. */
const INK = rgb(0, 0, 0);

/** The smallest font size, in points, and how much a text shrinks on each try to fit its box. */
const MINIMUM_FONT_SIZE = 5;
const FONT_SIZE_STEP = 0.5;

/** The distance from one line to the next, as a multiple of the font size. */
const LINE_SPACING = 1.15;

/** How much of a line's spare room goes on its left, for each alignment. */
const LEFT_SHARES: Readonly<Record<SheetAlignment, number>> = { left: 0, center: 0.5, right: 1 };

interface FittedText {
    lines: string[];
    fontSize: number;
}

/**
 * Writes the board on the original sheet and returns the PDF file's bytes.
 */
export async function createBoardPdf(source: SheetSource): Promise<Uint8Array<ArrayBuffer>> {
    // Keep the sheet's own dates, so the same board always gives the same file.
    const pdf = await PDFDocument.load(ORIGINAL_SHEET, { updateMetadata: false });
    const font = pdf.embedStandardFont(StandardFonts.HelveticaBold);
    const fontCodePoints = new Set(font.getCharacterSet());
    const page = pdf.getPage(0);

    // The browser shows this title on the tab the PDF opens in.
    pdf.setTitle(`Priority Zone Assignment, ${formatBoardDate(source.boardDate)}`, { showInWindowTitleBar: true });

    for (const sheetText of listSheetTexts(source)) {
        // Join a letter and its separate accent into one character first (NFC). The font may have that one.
        const characters = Array.from(sheetText.text.normalize('NFC'));
        const text = characters.map((character) => findFontCharacter(character, fontCodePoints)).join('');
        writeText(page, font, { ...sheetText, text });
    }

    // pdf-lib's types are older than TypeScript's ArrayBuffer types, so the result is cast to what a download needs.
    return (await pdf.save()) as Uint8Array<ArrayBuffer>;
}

/**
 * The character the font can write for a given one: the character itself, the letter without its accent ("ả" becomes
 * "a"), a plain space for any other kind of space, or "?". Line breaks are kept.
 */
function findFontCharacter(character: string, fontCodePoints: ReadonlySet<number>): string {
    if (character === '\n' || fontCodePoints.has(character.codePointAt(0)!)) {
        return character;
    }

    // NFD splits an accented letter into the letter followed by its accents, so the letter comes first.
    const [letter] = character.normalize('NFD');
    if (fontCodePoints.has(letter.codePointAt(0)!)) {
        return letter;
    }

    return /\s/.test(character) ? ' ' : '?';
}

/**
 * Writes a text in its box, centred from top to bottom. Nothing is drawn outside the box. A text too long even at the
 * smallest size is cut off at the edges, so it never runs into the next box.
 */
function writeText(page: PDFPage, font: PDFFont, { text, box, alignment, fontSize: preferredSize }: SheetText): void {
    const { lines, fontSize } = fitText(font, text, box, preferredSize);
    const lineSpacing = fontSize * LINE_SPACING;

    // Centre on the height of the capital letters, which is where a line looks centred.
    const capitalHeight = font.heightAtSize(fontSize, { descender: false });
    const textHeight = capitalHeight + (lines.length - 1) * lineSpacing;
    let baseline = box.bottom + (box.height + textHeight) / 2 - capitalHeight;

    page.pushOperators(pushGraphicsState(), rectangle(box.left, box.bottom, box.width, box.height), clip(), endPath());
    for (const line of lines) {
        const roomLeft = box.width - font.widthOfTextAtSize(line, fontSize);
        page.drawText(line, {
            x: box.left + roomLeft * LEFT_SHARES[alignment],
            y: baseline,
            size: fontSize,
            font,
            color: INK,
        });
        baseline -= lineSpacing;
    }
    page.pushOperators(popGraphicsState());
}

/**
 * Fits a text to its box: at the size asked for when it fits, or else at the largest size where the wrapped lines all
 * fit. It never goes below the smallest size, even if the text is still too big.
 */
function fitText(font: PDFFont, text: string, box: SheetBox, preferredSize: number): FittedText {
    let fontSize = preferredSize;
    let lines = wrapText(font, text, box.width, fontSize);
    while (fontSize > MINIMUM_FONT_SIZE && !hasRoom(font, lines, box, fontSize)) {
        fontSize = Math.max(MINIMUM_FONT_SIZE, fontSize - FONT_SIZE_STEP);
        lines = wrapText(font, text, box.width, fontSize);
    }

    return { lines, fontSize };
}

/**
 * Splits a text into lines that fit a width at a font size. Lines break at line breaks and between words. A word wider
 * than the box gets a line to itself.
 */
function wrapText(font: PDFFont, text: string, width: number, fontSize: number): string[] {
    const lines = breakTextIntoLines(text, [' '], width, (word) => font.widthOfTextAtSize(word, fontSize));

    // A line broken after a word still ends with that word's space, so trim it.
    return lines.map((line) => line.replace(/ +$/, ''));
}

/**
 * Whether lines of text fit a box at a font size, in both width and height. The height includes the tails of letters
 * like g and y on the last line.
 */
function hasRoom(font: PDFFont, lines: readonly string[], box: SheetBox, fontSize: number): boolean {
    const capitalHeight = font.heightAtSize(fontSize, { descender: false });
    const descenderHeight = font.heightAtSize(fontSize) - capitalHeight;
    const textHeight = capitalHeight + (lines.length - 1) * fontSize * LINE_SPACING;

    // The text is centred, so the room the letter tails need below it is also left above it.
    const isShortEnough = textHeight + 2 * descenderHeight <= box.height;

    return isShortEnough && lines.every((line) => font.widthOfTextAtSize(line, fontSize) <= box.width);
}
