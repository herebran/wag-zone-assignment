import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import usePrintScale, { PRINT_SCALE_VARIABLE } from '@/hooks/usePrintScale';

function Sheet() {
    const sheet = useRef<HTMLDivElement>(null);
    usePrintScale(sheet, { width: '7.7in', heightPixels: 950 });

    return <div ref={sheet} role='document' style={{ display: 'none' }} />;
}

/**
 * The scale a sheet of the given height gets when the browser is about to print it.
 */
function measureScale(heightPixels: number): string {
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(heightPixels);
    render(<Sheet />);
    window.dispatchEvent(new Event('beforeprint'));

    return screen.getByRole('document', { hidden: true }).style.getPropertyValue(PRINT_SCALE_VARIABLE);
}

afterEach(() => vi.restoreAllMocks());

describe('usePrintScale', () => {
    it('prints a sheet that fits the page at full size', () => {
        expect(measureScale(857)).toBe('1');
    });

    it('scales a sheet taller than the page down by as much as it is too tall', () => {
        expect(measureScale(1187.5)).toBe('0.8');
    });

    it('stops shrinking where the names would be too small to read', () => {
        expect(measureScale(2400)).toBe('0.6');
    });

    it('leaves the sheet hidden from the screen as it found it, and stops measuring once the sheet is gone', () => {
        vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(1900);
        const { unmount } = render(<Sheet />);
        const sheet = screen.getByRole('document', { hidden: true });
        window.dispatchEvent(new Event('beforeprint'));
        expect(sheet.style.display).toBe('none');
        expect(sheet.style.position).toBe('');

        sheet.style.removeProperty(PRINT_SCALE_VARIABLE);
        unmount();
        window.dispatchEvent(new Event('beforeprint'));
        expect(sheet.style.getPropertyValue(PRINT_SCALE_VARIABLE)).toBe('');
    });
});
