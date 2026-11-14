/**
 * Draws the whole app for a test, with its own pharmacy data: nothing is saved unless the test saves it, and the clock
 * is fixed at 9:10 AM on 2026-11-12. The test then uses the app the way a person would, through Testing Library.
 */
import { render } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import App from '@/components/App';
import { createPharmacy, type Pharmacy } from '@/state/pharmacy';
import { createMemoryStorage } from '@/state/storage';
import { SAMPLE_BOARD_DATE } from '@/testing/sampleBoard';

/** The day the test's clock is set to. */
export const TODAY = SAMPLE_BOARD_DATE;

export interface RenderedApp {
    pharmacy: Pharmacy;
    user: UserEvent;
}

export interface RenderAppOptions {
    /** What the browser has saved. Nothing by default. Null means the browser blocks the page's storage. */
    storage?: Storage | null;

    /** Sets up the pharmacy's data before the app is drawn, for example a roster or a board. */
    prepare?: (pharmacy: Pharmacy) => void;
}

export function renderApp({ storage = createMemoryStorage(), prepare }: RenderAppOptions = {}): RenderedApp {
    const pharmacy = createPharmacy({ storage, now: () => new Date(2026, 10, 12, 9, 10, 0) });
    prepare?.(pharmacy);

    const user = userEvent.setup();
    render(<App pharmacy={pharmacy} />);

    return { pharmacy, user };
}

/**
 * Adds three technicians to the roster: Jane Doe (JD), Sam Lee and Maria Garcia-Lopez (MGL), with the ids 1, 2 and 3.
 */
export function addSampleTechnicians(pharmacy: Pharmacy): void {
    pharmacy.addTechnician({ firstName: 'Jane', lastName: 'Doe', abbreviation: 'JD' });
    pharmacy.addTechnician({ firstName: 'Sam', lastName: 'Lee', abbreviation: '' });
    pharmacy.addTechnician({ firstName: 'Maria', lastName: 'Garcia-Lopez', abbreviation: 'MGL' });
}
