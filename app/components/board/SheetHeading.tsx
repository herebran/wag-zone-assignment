/**
 * The top of the sheet, as on the paper one: the board's date, the title, and a red line under them.
 */
import { Box, Divider, Typography } from '@mui/material';
import { formatBoardDate } from '@/lib/dates';

/** The title's size where room is tight: a narrow screen or the printed page. */
const SMALL_TITLE_SIZE = '1.625rem';

export interface SheetHeadingProps {
    boardDate: string;

    /** True on the printed sheet, where the title is always the small size. */
    isPrinted?: boolean;
}

export default function SheetHeading({ boardDate, isPrinted = false }: SheetHeadingProps) {
    const titleSize = isPrinted ? SMALL_TITLE_SIZE : { xs: SMALL_TITLE_SIZE, md: '2.25rem' };

    return (
        <Box sx={{ mb: 2.25 }}>
            <Typography variant='body2' sx={{ mb: 0.75, color: 'text.secondary', fontWeight: 700 }}>
                Date: {formatBoardDate(boardDate)}
            </Typography>
            <Typography variant='sheetTitle' sx={{ mb: 0.5, fontSize: titleSize }}>
                Priority Zone Assignment
            </Typography>
            <Divider sx={{ borderBottomWidth: 2, borderColor: 'error.main', opacity: 0.75 }} />
        </Box>
    );
}
