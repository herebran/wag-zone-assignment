/**
 * The Zone Board tab: the controls and the day's sheet. While it is open, Ctrl+Z undoes a change to the board, and
 * Ctrl+Y or Ctrl+Shift+Z redoes it (Cmd on a Mac).
 */
import { modalClasses, Stack } from '@mui/material';
import { useHotkeys, type Options } from 'react-hotkeys-hook';
import BoardSheet from '@/components/board/BoardSheet';
import BoardToolbar from '@/components/board/BoardToolbar';
import usePharmacy from '@/hooks/usePharmacy';

const UNDO_KEY_OPTIONS: Options = {
    // Match the letters Z and Y wherever the keyboard layout puts them.
    useKey: true,
    preventDefault: true,

    // Also work inside the board's fields. Typing there changes the board, and the board's own history undoes it a word
    // at a time.
    enableOnFormTags: true,
    enableOnContentEditable: true,

    // Do nothing while a dialog, a menu or the calendar is open. A field in there undoes its own typing.
    ignoreEventWhen: (event) =>
        event.target instanceof Element && event.target.closest(`.${modalClasses.root}, [role="dialog"]`) !== null,
};

export default function ZoneBoard() {
    const pharmacy = usePharmacy();
    useHotkeys('mod+z', pharmacy.undo, UNDO_KEY_OPTIONS);
    useHotkeys(['mod+y', 'mod+shift+z'], pharmacy.redo, UNDO_KEY_OPTIONS);

    return (
        <Stack spacing={2}>
            <BoardToolbar />
            <BoardSheet />
        </Stack>
    );
}
