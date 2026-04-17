#!/usr/bin/env node
// Manual subscription renewal runner.
// Usage: node server/scripts/run-renewals.js
// Picks up any subscriptions eligible for renewal (same query as the nightly cron).

import 'dotenv/config';
import { processRenewals } from '../billing/renewal.js';

(async () => {
    try {
        console.log('▶ Manual renewal run started');
        await processRenewals();
        console.log('✓ Manual renewal run finished');
        process.exit(0);
    } catch (err) {
        console.error('✗ Manual renewal run failed:', err);
        process.exit(1);
    }
})();
