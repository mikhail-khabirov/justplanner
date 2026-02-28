import fetch from 'node-fetch';

const API_KEY = process.env.UNISENDER_API_KEY;
const LIST_ID = process.env.UNISENDER_LIST_ID;
const BASE_URL = 'https://api.unisender.com/ru/api';

export async function addContactToUnisender(email) {
    if (!API_KEY || !LIST_ID) {
        console.warn('Unisender: UNISENDER_API_KEY or UNISENDER_LIST_ID not set, skipping');
        return;
    }

    const params = new URLSearchParams({
        format: 'json',
        api_key: API_KEY,
        'field_names[0]': 'email',
        'field_names[1]': 'email_list_ids',
        'data[0][0]': email,
        'data[0][1]': LIST_ID,
    });

    let attempt = 0;
    while (attempt < 3) {
        try {
            const res = await fetch(`${BASE_URL}/importContacts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
                signal: AbortSignal.timeout(35000),
            });
            const data = await res.json();
            if (data.error) {
                console.error(`Unisender importContacts error for ${email}:`, data.error);
            } else {
                console.log(`Unisender: added ${email}, result:`, JSON.stringify(data.result));
            }
            return;
        } catch (err) {
            attempt++;
            if (attempt >= 3) {
                console.error(`Unisender: failed to add ${email} after 3 attempts:`, err.message);
            }
        }
    }
}
