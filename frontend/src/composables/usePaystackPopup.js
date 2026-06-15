/**
 * usePaystackPopup — opens Paystack's inline checkout popup so the user
 * stays on the page (no full-page redirect).
 *
 * The backend pre-initialises the transaction (server-side secret key) and
 * returns an access_code. We RESUME that transaction in the popup — this is
 * the official pattern and avoids the "Duplicate Transaction Reference" error
 * that PaystackPop.setup({ ref }) causes when the server already initialised.
 */

let scriptPromise = null;

const loadPaystackScript = () => {
  if (window.PaystackPop) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://js.paystack.co/v2/inline.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
  return scriptPromise;
};

/**
 * Open the inline popup for an already-initialised transaction.
 * @param {Object} authData  { access_code, reference, public_key, email, amount }
 *   - access_code (preferred): resumes the server transaction
 *   - falls back to setup({ ref }) only if no access_code
 * @returns {Promise} resolves on success, rejects with Error('CLOSED'|'NO_KEY'|'SCRIPT_FAILED')
 */
export const openPaystackPopup = (authData) => {
  return new Promise(async (resolve, reject) => {
    const loaded = await loadPaystackScript();
    if (!loaded || !window.PaystackPop) { reject(new Error('SCRIPT_FAILED')); return; }

    // Preferred: resume the server-initialised transaction via access_code.
    if (authData.access_code) {
      try {
        const popup = new window.PaystackPop();
        popup.resumeTransaction(authData.access_code, {
          onSuccess: (txn) => resolve(txn),
          onCancel:  () => reject(new Error('CLOSED')),
          onError:   () => reject(new Error('SCRIPT_FAILED')),
        });
        return;
      } catch { /* fall through to legacy setup */ }
    }

    // Legacy fallback: setup with a public key + reference.
    const publicKey = authData.public_key;
    if (!publicKey || !/^pk_(test|live)_/.test(publicKey)) { reject(new Error('NO_KEY')); return; }

    try {
      const handler = window.PaystackPop.setup({
        key:      publicKey,
        email:    authData.email,
        amount:   Math.round(Number(authData.amount) * 100), // kobo
        ref:      authData.reference,
        currency: 'NGN',
        onClose:  () => reject(new Error('CLOSED')),
        callback: (response) => resolve(response),
      });
      handler.openIframe();
    } catch {
      reject(new Error('SCRIPT_FAILED'));
    }
  });
};
