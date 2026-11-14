/**
 * A text field that sits right on the sheet, inside a table cell. It shows no box until it has the keyboard. What is
 * typed is kept exactly as typed.
 */
import { InputBase } from '@mui/material';
import { FIXED_WIDTH_FONT } from '@/theme';

export interface SheetInputProps {
    /** The field's name for screen readers: 'F1 under'. */
    label: string;
    value: string;
    placeholder: string;
    onChange: (text: string) => void;

    /** True for a count: centred, bold, and with the number keyboard on a phone. */
    isNumber?: boolean;
}

export default function SheetInput({ label, value, placeholder, onChange, isNumber = false }: SheetInputProps) {
    return (
        <InputBase
            fullWidth
            value={value}
            placeholder={placeholder}
            onChange={(event) => onChange(event.target.value)}
            slotProps={{
                input: {
                    'aria-label': label,
                    inputMode: isNumber ? 'numeric' : undefined,
                    sx: {
                        px: 0.5,
                        py: 0.25,
                        borderRadius: 0.5,
                        textAlign: isNumber ? 'center' : undefined,
                        '&:focus': { boxShadow: (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}` },
                    },
                },
            }}
            sx={{
                fontSize: 'inherit',
                fontFamily: isNumber ? FIXED_WIDTH_FONT : undefined,
                fontWeight: isNumber ? 700 : undefined,
            }}
        />
    );
}
