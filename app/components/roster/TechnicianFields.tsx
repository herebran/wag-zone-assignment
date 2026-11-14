/**
 * The fields for a technician: first name, last name, and the abbreviation the board can show instead of the name. The
 * add form and the edit dialog both use them, each passing in its own form's `control`. The form checks the names
 * (lib/names.ts) and marks the field that fails.
 */
import { TextField } from '@mui/material';
import { useController, type Control } from 'react-hook-form';
import { ABBREVIATION_MAX_LENGTH, type TechnicianNames } from '@/lib/names';

export interface TechnicianFieldsProps {
    /** The form the fields belong to. */
    control: Control<TechnicianNames>;

    /** Puts the cursor in the first name when the fields appear. */
    hasAutoFocus?: boolean;
}

export default function TechnicianFields({ control, hasAutoFocus = false }: TechnicianFieldsProps) {
    return (
        <>
            <TechnicianField
                control={control}
                name='firstName'
                label='First name'
                placeholder='Jane'
                hasAutoFocus={hasAutoFocus}
            />
            <TechnicianField control={control} name='lastName' label='Last name' placeholder='Doe' />
            <TechnicianField
                control={control}
                name='abbreviation'
                label='Abbreviation (optional)'
                placeholder='JD'
                maxLength={ABBREVIATION_MAX_LENGTH}
            />
        </>
    );
}

interface TechnicianFieldProps {
    control: Control<TechnicianNames>;
    name: keyof TechnicianNames;
    label: string;
    placeholder: string;
    hasAutoFocus?: boolean;
    maxLength?: number;
}

/**
 * One field, connected to the form so the form can read it, check it and put the cursor in it.
 */
function TechnicianField({ control, name, label, placeholder, hasAutoFocus = false, maxLength }: TechnicianFieldProps) {
    const { field, fieldState } = useController({ control, name });
    const { ref, ...fieldProps } = field;

    return (
        <TextField
            {...fieldProps}
            inputRef={ref}
            size='small'
            label={label}
            placeholder={placeholder}
            autoComplete='off'
            autoFocus={hasAutoFocus}
            error={fieldState.invalid}
            slotProps={{ htmlInput: { maxLength } }}
        />
    );
}
