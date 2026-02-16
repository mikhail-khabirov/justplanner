// Annual Offer — countdown hook

import { useState, useEffect } from 'react';
import { getOfferRemainingMs } from './utils';

/** Returns remaining ms, updating every second. Returns 0 when expired. */
export function useCountdown(): number {
    const [remaining, setRemaining] = useState(() => getOfferRemainingMs());

    useEffect(() => {
        const interval = setInterval(() => {
            setRemaining(getOfferRemainingMs());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return remaining;
}
