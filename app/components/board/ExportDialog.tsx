/**
 * The export dialog. The board goes out as plain text to copy or download, or as a PDF written on Walgreens's original
 * sheet, to print. The dialog opens with the style used last.
 */
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
} from '@mui/material';
import { IconCopy, IconDownload, IconPrinter } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { useId, useMemo, useRef, useState, type ReactNode } from 'react';
import ChoiceGroup from '@/components/elements/ChoiceGroup';
import useBoardPdf, { type BoardPdf } from '@/hooks/useBoardPdf';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { formatBoardText } from '@/lib/boardText';
import { copyText } from '@/lib/clipboard';
import { downloadFile, downloadText } from '@/lib/download';
import { listLeftOut, type LeftOut } from '@/lib/originalSheet';
import { EXPORT_STYLES } from '@/lib/settings';
import { FIXED_WIDTH_FONT } from '@/theme';

/** How many lines of text show at once. The rest scrolls. */
const VISIBLE_LINE_COUNT = 22;

/**
 * The height of the PDF preview: half the window, so the dialog and its buttons also fit a small screen. The browser's
 * PDF viewer scrolls the page inside it.
 */
const PREVIEW_HEIGHT = '50vh';

/** Writes a list the way a sentence does: "9, 10, and 11". */
const LIST_FORMAT = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

export interface ExportDialogProps {
    onClose: () => void;
}

export default function ExportDialog({ onClose }: ExportDialogProps) {
    const pharmacy = usePharmacy();
    const exportStyle = usePharmacyState((state) => state.settings.exportStyle);
    const titleId = useId();

    // The text shows the time the dialog was opened, whichever style is showing.
    const [exportedAt] = useState(() => pharmacy.now());

    const styleChoice = (
        <ChoiceGroup
            label='Export style'
            choices={EXPORT_STYLES}
            value={exportStyle}
            onChange={(chosenStyle) => pharmacy.updateSettings({ exportStyle: chosenStyle })}
        />
    );

    return (
        <Dialog open onClose={onClose} maxWidth='md' fullWidth aria-labelledby={titleId}>
            <DialogTitle id={titleId}>Export the board</DialogTitle>
            {exportStyle === 'pdf' ? (
                <PdfExport onClose={onClose}>{styleChoice}</PdfExport>
            ) : (
                <TextExport exportedAt={exportedAt} onClose={onClose}>
                    {styleChoice}
                </TextExport>
            )}
        </Dialog>
    );
}

interface TextExportProps {
    /** When the dialog was opened. The text shows it. */
    exportedAt: Date;

    /** The style buttons, shown above the text. */
    children: ReactNode;
    onClose: () => void;
}

/**
 * The board as plain text, with buttons to copy it and download it.
 */
function TextExport({ exportedAt, children, onClose }: TextExportProps) {
    const { enqueueSnackbar } = useSnackbar();
    const board = usePharmacyState((state) => state.board);
    const boardDate = usePharmacyState((state) => state.boardDate);
    const technicians = usePharmacyState((state) => state.technicians);
    const settings = usePharmacyState((state) => state.settings);
    const textField = useRef<HTMLTextAreaElement>(null);

    const text = formatBoardText({ board, boardDate, technicians, settings, now: exportedAt });

    const copy = () => {
        void copyText(text, textField.current).then((isCopied) => {
            if (isCopied) {
                enqueueSnackbar('Copied to clipboard');
            } else {
                enqueueSnackbar('The browser did not let the page copy. Select the text and copy it yourself.', {
                    variant: 'error',
                });
            }
        });
    };

    const download = () => {
        downloadText(`zone-assignment-${boardDate}.txt`, text, 'text/plain');
        enqueueSnackbar('Downloaded');
    };

    return (
        <>
            <DialogContent>
                <Stack spacing={2}>
                    {children}
                    <TextField
                        multiline
                        fullWidth
                        rows={VISIBLE_LINE_COUNT}
                        value={text}
                        inputRef={textField}
                        slotProps={{
                            htmlInput: {
                                readOnly: true,
                                spellCheck: false,
                                wrap: 'off',
                                'aria-label': 'The board as plain text',
                                sx: {
                                    fontFamily: FIXED_WIDTH_FONT,
                                    fontSize: '0.75rem',
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre',
                                },
                            },
                        }}
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                <Button variant='outlined' startIcon={<IconDownload />} onClick={download}>
                    Download .txt
                </Button>
                <Button variant='contained' startIcon={<IconCopy />} onClick={copy}>
                    Copy
                </Button>
            </DialogActions>
        </>
    );
}

interface PdfExportProps {
    /** The style buttons, shown above the PDF. */
    children: ReactNode;
    onClose: () => void;
}

/**
 * The board on the original sheet, as a PDF: a note of what did not fit, the preview, and buttons to download it and
 * open it for printing.
 */
function PdfExport({ children, onClose }: PdfExportProps) {
    const { enqueueSnackbar } = useSnackbar();
    const board = usePharmacyState((state) => state.board);
    const boardDate = usePharmacyState((state) => state.boardDate);
    const technicians = usePharmacyState((state) => state.technicians);
    const settings = usePharmacyState((state) => state.settings);

    // Keep the same object while nothing changes. A new object makes the PDF get written again.
    const source = useMemo(
        () => ({ board, boardDate, technicians, settings }),
        [board, boardDate, technicians, settings]
    );
    const pdf = useBoardPdf(source);
    const leftOut = formatLeftOut(listLeftOut(source));

    const download = () => {
        if (pdf.status !== 'written') {
            return;
        }

        downloadFile(`zone-assignment-${boardDate}.pdf`, pdf.file);
        enqueueSnackbar('Downloaded');
    };

    // The browser's own PDF viewer prints the PDF and keeps the sheet's size. The top bar's Print button prints the
    // app's sheet instead.
    const openToPrint = () => {
        if (pdf.status !== 'written') {
            return;
        }

        if (!window.open(pdf.url, '_blank')) {
            enqueueSnackbar('The browser did not open a new tab. Download the PDF and print it from there.', {
                variant: 'error',
            });
        }
    };

    return (
        <>
            <DialogContent>
                <Stack spacing={2}>
                    {children}
                    {leftOut && <Alert severity='warning'>{leftOut}</Alert>}
                    <PdfPreview pdf={pdf} />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                <Button
                    variant='outlined'
                    startIcon={<IconDownload />}
                    disabled={pdf.status !== 'written'}
                    onClick={download}
                >
                    Download .pdf
                </Button>
                <Button
                    variant='contained'
                    startIcon={<IconPrinter />}
                    disabled={pdf.status !== 'written'}
                    onClick={openToPrint}
                >
                    Open to print
                </Button>
            </DialogActions>
        </>
    );
}

interface PdfPreviewProps {
    pdf: BoardPdf;
}

/**
 * The PDF in the browser's own PDF viewer, once it is written.
 */
function PdfPreview({ pdf }: PdfPreviewProps) {
    if (pdf.status === 'failed') {
        return <Alert severity='error'>The PDF could not be written. Reload the page and try again.</Alert>;
    }

    if (pdf.status === 'writing') {
        return (
            <Stack sx={{ height: PREVIEW_HEIGHT, alignItems: 'center', justifyContent: 'center' }}>
                <CircularProgress aria-label='Writing the PDF' />
            </Stack>
        );
    }

    // Some browsers are set to download every PDF, and phone browsers rarely show one inside a page.
    if (!navigator.pdfViewerEnabled) {
        return (
            <Alert severity='info'>
                This browser does not show a PDF inside a page. Open it or download it to look at it.
            </Alert>
        );
    }

    return (
        <Box
            component='object'
            type='application/pdf'
            // Hide the viewer's own toolbar. The buttons below the preview do the same jobs.
            data={`${pdf.url}#toolbar=0&navpanes=0`}
            aria-label='The board on the original sheet'
            sx={{
                display: 'block',
                width: '100%',
                height: PREVIEW_HEIGHT,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
            }}
        >
            This browser could not show the PDF here. Open it or download it to look at it.
        </Box>
    );
}

/**
 * What is on the board but does not fit on the original sheet, as a sentence. '' when everything fits.
 */
function formatLeftOut({ timeSlotNumbers, noteCount }: LeftOut): string {
    const parts: string[] = [];
    if (timeSlotNumbers.length > 0) {
        const noun = timeSlotNumbers.length === 1 ? 'time slot' : 'time slots';
        parts.push(`${noun} ${LIST_FORMAT.format(timeSlotNumbers.map(String))}`);
    }
    if (noteCount > 0) {
        parts.push(noteCount === 1 ? '1 note of your own' : `${noteCount} notes of your own`);
    }

    return parts.length > 0 ? `Not on the PDF, which has no room for them: ${parts.join('; ')}.` : '';
}
