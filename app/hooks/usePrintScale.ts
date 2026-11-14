import { useEffect, type RefObject } from 'react';

/** The CSS variable that the sheet's print styles read the scale from. */
export const PRINT_SCALE_VARIABLE = '--print-scale';

/**
 * The smallest scale the sheet prints at. Below it the names are too small to read on a wall, so a longer board runs
 * onto a second page instead.
 */
const MINIMUM_SCALE = 0.6;

export interface PrintedPage {
    /** The width the sheet prints at, as a CSS length ('7.7in'). */
    width: string;

    /** The height the sheet has to fit, in CSS pixels. */
    heightPixels: number;
}

/**
 * Keeps the sheet on one printed page. A sheet that is too tall is scaled down just enough to fit, like a copier's "fit
 * to page".
 *
 * The sheet is hidden on screen, so it is measured off screen when the browser is about to print. The scale is saved on
 * the sheet as a CSS variable for its print styles.
 */
export default function usePrintScale(
    sheet: RefObject<HTMLElement | null>,
    { width, heightPixels }: PrintedPage
): void {
    useEffect(() => {
        const setScale = () => {
            const element = sheet.current;
            if (!element) {
                return;
            }

            const hiddenStyle = element.style.cssText;
            element.style.cssText = `display: flex; position: absolute; top: 0; left: -10000px; width: ${width}; visibility: hidden;`;
            const height = element.offsetHeight;
            element.style.cssText = hiddenStyle;

            const scale = height > heightPixels ? Math.max(MINIMUM_SCALE, heightPixels / height) : 1;
            element.style.setProperty(PRINT_SCALE_VARIABLE, String(scale));
        };

        window.addEventListener('beforeprint', setScale);
        return () => window.removeEventListener('beforeprint', setScale);
    }, [sheet, width, heightPixels]);
}
