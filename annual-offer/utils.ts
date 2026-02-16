// Annual Offer — localStorage helpers & timer logic

const OFFER_EXPIRY_KEY = 'annualOfferExpiry';
const OFFER_DISMISSED_KEY = 'annualOfferDismissed';

/** Start the 24h offer timer (called once after registration) */
export function startAnnualOffer(): void {
    if (isOfferActive()) return; // only skip if timer is still running
    localStorage.removeItem(OFFER_DISMISSED_KEY); // clear dismissed flag for new registration
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // +24h
    localStorage.setItem(OFFER_EXPIRY_KEY, expiry.toString());
}

/** Get remaining ms until offer expires. Returns 0 if expired or not started. */
export function getOfferRemainingMs(): number {
    const raw = localStorage.getItem(OFFER_EXPIRY_KEY);
    if (!raw) return 0;
    const remaining = parseInt(raw, 10) - Date.now();
    return remaining > 0 ? remaining : 0;
}

/** Check if the offer is still active (timer running & not expired) */
export function isOfferActive(): boolean {
    return getOfferRemainingMs() > 0;
}

/** Mark offer as permanently dismissed (user purchased or timer expired) */
export function dismissOffer(): void {
    localStorage.setItem(OFFER_DISMISSED_KEY, '1');
}

/** Check if offer was permanently dismissed */
export function isOfferDismissed(): boolean {
    return localStorage.getItem(OFFER_DISMISSED_KEY) === '1';
}

/** Format remaining ms as HH:MM:SS */
export function formatCountdown(ms: number): string {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
