import { useSyncExternalStore } from 'react';
import usePharmacy from '@/hooks/usePharmacy';
import type { PharmacyState } from '@/state/pharmacy';

/**
 * A part of the pharmacy's data. The component updates whenever that part changes.
 *
 * Example: `usePharmacyState((state) => state.boardDate)`
 *
 * @param select picks the part out of the state. It must return something the state already holds. A new object each
 *   time would make React redraw without end.
 */
export default function usePharmacyState<Selected>(select: (state: PharmacyState) => Selected): Selected {
    const pharmacy = usePharmacy();

    return useSyncExternalStore(pharmacy.subscribe, () => select(pharmacy.getState()));
}
