import { createContext } from 'react';
import type { Pharmacy } from '@/state/pharmacy';

/**
 * Passes the pharmacy's data from the App down to every component (hooks/usePharmacy.ts).
 */
export const PharmacyContext = createContext<Pharmacy | null>(null);
