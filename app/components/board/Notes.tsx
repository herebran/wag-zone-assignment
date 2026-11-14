/**
 * Other notes and priorities: what needs doing, when, and who does it. The sheet's printed rows come first, with a
 * fixed "what". The pharmacy can add its own rows below them and remove them again.
 */
import {
    Box,
    Button,
    IconButton,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from '@mui/material';
import { IconPlus, IconX } from '@tabler/icons-react';
import { memo } from 'react';
import AssignmentCell from '@/components/board/AssignmentCell';
import SheetInput from '@/components/board/SheetInput';
import { SECTION_TABLE_STYLES } from '@/components/board/sheetStyles';
import usePharmacy from '@/hooks/usePharmacy';
import { addNote, removeNote, setNoteText } from '@/lib/board';
import type { Note } from '@/lib/records';

export interface NotesProps {
    notes: readonly Note[];
}

function Notes({ notes }: NotesProps) {
    const pharmacy = usePharmacy();

    const setText = (noteIndex: number, field: 'what' | 'when', text: string) => {
        pharmacy.changeBoard((board) => setNoteText(board, noteIndex, field, text), `note:${noteIndex}:${field}`);
    };

    return (
        <Box component='section'>
            <Typography variant='sheetSection' sx={{ mb: 1 }}>
                Other notes and priorities:
            </Typography>
            <Table size='small' aria-label='Other notes and priorities' sx={SECTION_TABLE_STYLES}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: '34%' }}>What:</TableCell>
                        <TableCell sx={{ width: '26%' }}>When:</TableCell>
                        <TableCell>Who:</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {notes.map((note, noteIndex) => {
                        const noteName = note.what.trim() || `note ${noteIndex + 1}`;

                        return (
                            // oxlint-disable-next-line react/no-array-index-key -- a note has no id, only its place in the list
                            <TableRow key={noteIndex}>
                                {note.isFixed ? (
                                    <TableCell component='th' scope='row'>
                                        {note.what}
                                    </TableCell>
                                ) : (
                                    <TableCell>
                                        <Stack direction='row' spacing={0.5} sx={{ alignItems: 'center' }}>
                                            <SheetInput
                                                label={`What, note ${noteIndex + 1}`}
                                                placeholder='add a task…'
                                                value={note.what}
                                                onChange={(text) => setText(noteIndex, 'what', text)}
                                            />
                                            <IconButton
                                                size='small'
                                                aria-label={`Remove ${noteName}`}
                                                onClick={() =>
                                                    pharmacy.changeBoard((board) => removeNote(board, noteIndex))
                                                }
                                                sx={{ p: 0.25, fontSize: '0.9rem' }}
                                            >
                                                <IconX />
                                            </IconButton>
                                        </Stack>
                                    </TableCell>
                                )}
                                <TableCell>
                                    <SheetInput
                                        label={`When, ${noteName}`}
                                        placeholder='when'
                                        value={note.when}
                                        onChange={(text) => setText(noteIndex, 'when', text)}
                                    />
                                </TableCell>
                                <TableCell>
                                    <AssignmentCell
                                        target={{ kind: 'note', noteIndex }}
                                        technicianIds={note.technicianIds}
                                        label={noteName}
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <Button
                size='small'
                variant='outlined'
                startIcon={<IconPlus />}
                onClick={() => pharmacy.changeBoard(addNote)}
                sx={{ mt: 1 }}
            >
                Add row
            </Button>
        </Box>
    );
}

export default memo(Notes);
