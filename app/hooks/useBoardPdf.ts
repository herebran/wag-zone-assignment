import { useEffect, useState } from 'react';
import type { SheetSource } from '@/lib/originalSheet';

/**
 * The state of the board's PDF: being written, written (with the file and a browser address for the preview or a new
 * tab), or failed.
 */
export type BoardPdf = { status: 'writing' } | { status: 'written'; file: Blob; url: string } | { status: 'failed' };

const WRITING: BoardPdf = { status: 'writing' };
const FAILED: BoardPdf = { status: 'failed' };

interface WrittenPdf {
    source: SheetSource;
    pdf: BoardPdf;
}

/**
 * Writes the board on the original sheet as a PDF (lib/boardPdf.ts), and again whenever the board changes. The PDF code
 * is large, so it is only loaded when a PDF is first asked for.
 *
 * @param source what the PDF is written from. Keep it the same object while nothing changes (useMemo), or the PDF is
 *   written again.
 */
export default function useBoardPdf(source: SheetSource): BoardPdf {
    const [written, setWritten] = useState<WrittenPdf | null>(null);

    useEffect(() => {
        let isWanted = true;
        let url = '';

        import('@/lib/boardPdf')
            .then(({ createBoardPdf }) => createBoardPdf(source))
            .then((bytes) => {
                // Skip the result if the board changed or the dialog closed while this PDF was being written.
                if (!isWanted) {
                    return;
                }

                const file = new Blob([bytes], { type: 'application/pdf' });
                url = URL.createObjectURL(file);
                setWritten({ source, pdf: { status: 'written', file, url } });
            })
            .catch(() => {
                if (isWanted) {
                    setWritten({ source, pdf: FAILED });
                }
            });

        return () => {
            isWanted = false;
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [source]);

    // A PDF from an older board does not count. Until the new one is ready, report it as being written.
    return written?.source === source ? written.pdf : WRITING;
}
