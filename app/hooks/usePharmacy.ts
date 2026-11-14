import { useContext } from 'react';
import type { Pharmacy } from '@/state/pharmacy';
import { PharmacyContext } from '@/state/pharmacyContext';

/**
 * The pharmacy's data, for a component that changes it: `pharmacy.addTechnician(names)`. To show data and update when
 * it changes, use usePharmacyState.
 */
export default function usePharmacy(): Pharmacy {
    const pharmacy = useContext(PharmacyContext);
    if (!pharmacy) {
        throw new Error('usePharmacy was called outside the App, which provides the pharmacy data.');
    }

    return pharmacy;
}
