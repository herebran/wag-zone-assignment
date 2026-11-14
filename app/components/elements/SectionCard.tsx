/**
 * A titled panel on the Technicians and Settings tabs: a title, a line saying what the panel is for, and its controls.
 */
import { Card, CardContent, CardHeader, Divider } from '@mui/material';
import type { ReactNode } from 'react';

export interface SectionCardProps {
    title: string;

    /** Shown under the title. Says what the panel's controls do. */
    description?: ReactNode;
    children: ReactNode;
}

export default function SectionCard({ title, description, children }: SectionCardProps) {
    return (
        <Card variant='outlined' component='section'>
            <CardHeader
                title={title}
                subheader={description}
                slotProps={{
                    title: { variant: 'subtitle1', component: 'h2', sx: { fontWeight: 700 } },
                    subheader: { variant: 'body2' },
                }}
            />
            <Divider />
            <CardContent>{children}</CardContent>
        </Card>
    );
}
