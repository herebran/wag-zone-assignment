/**
 * The board's date: type it, or pick it from a calendar that puts a dot on the days with a saved board. A complete date
 * opens that day's board.
 */
import { Badge } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { PickerDay, type PickerDayProps } from '@mui/x-date-pickers/PickerDay';
import { IconCalendar } from '@tabler/icons-react';
import { isValid, isWithinInterval } from 'date-fns';
import { useMemo } from 'react';
import usePharmacy from '@/hooks/usePharmacy';
import usePharmacyState from '@/hooks/usePharmacyState';
import { parseIsoDate, toIsoDate } from '@/lib/dates';

/**
 * The range of dates the field accepts. A year is typed one digit at a time, so it passes through the year 2 on the way
 * to 2026. The range keeps the app from opening a board for a year like that.
 */
const EARLIEST_DATE = new Date(2000, 0, 1);
const LATEST_DATE = new Date(2099, 11, 31);

export default function BoardDatePicker() {
    const pharmacy = usePharmacy();
    const boardDate = usePharmacyState((state) => state.boardDate);

    // Keep the same Date object for as long as the day stays the same. The field treats a new object as a new date from
    // outside and overwrites what is being typed.
    const value = useMemo(() => parseIsoDate(boardDate), [boardDate]);

    // A half-typed or emptied date is not a day. The board stays where it is until the field has a complete date.
    const openBoard = (date: Date | null) => {
        const isWholeDate = date !== null && isValid(date);
        if (isWholeDate && isWithinInterval(date, { start: EARLIEST_DATE, end: LATEST_DATE })) {
            pharmacy.openBoard(toIsoDate(date));
        }
    };

    return (
        <DatePicker
            label='Board date'
            value={value}
            onChange={openBoard}
            minDate={EARLIEST_DATE}
            maxDate={LATEST_DATE}
            slots={{ day: BoardDay, openPickerIcon: CalendarIcon }}
            slotProps={{ textField: { size: 'small', sx: { width: 180 } } }}
        />
    );
}

/**
 * The icon on the button that opens the calendar. The picker passes its icon props meant for Material UI's own icons. A
 * Tabler icon would put them on its svg, so this draws the icon without them.
 */
function CalendarIcon() {
    return <IconCalendar />;
}

/**
 * A day in the calendar, with a dot when the day has a saved board.
 */
function BoardDay(props: PickerDayProps) {
    const savedBoardDates = usePharmacyState((state) => state.savedBoardDates);
    const hasSavedBoard = !props.outsideCurrentMonth && savedBoardDates.includes(toIsoDate(props.day));

    return (
        <Badge variant='dot' color='primary' overlap='circular' invisible={!hasSavedBoard}>
            <PickerDay {...props} title={hasSavedBoard ? 'This day has a saved board' : undefined} />
        </Badge>
    );
}
