// Annual Offer — countdown hook

import { useState, useEffect } from 'react';
import { getOfferRemainingMs } from './utils';

/** Returns remaining ms, updating every second. Returns 0 when expired. */
export function useCountdown(): number {
    const [remaining, setRemaining] = useState(() => getOfferRemainingMs());

    useEffect(() => {
        if (remaining <= 0) return;

        const interval = setInterval(() => {
            const ms = getOfferRemainingMs();
            setRemaining(ms);
            if (ms <= 0) clearInterval(interval);
        }, 1000);

        return () => clearInterval(interval);
    }, [remaining > 0]);

    return remaining;
}
