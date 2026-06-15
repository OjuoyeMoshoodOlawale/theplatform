/**
 * paystackService.js — All Paystack API calls.
 * Keys are read from environment — never hardcoded.
 */
import axios  from 'axios';
import crypto from 'crypto';

const BASE = 'https://api.paystack.co';

const PLACEHOLDER = /^sk_(test|live)_x+$/i;

/** Validate that we have a real (non-placeholder) secret key */
const assertKey = (overrideKey = null) => {
  const key = overrideKey || process.env.PAYSTACK_SECRET_KEY;
  if (!key || PLACEHOLDER.test(key)) {
    throw new Error(
      'Paystack is not configured. Add your PAYSTACK_SECRET_KEY to backend/.env ' +
      'or set the organisation\'s own keys in Settings. ' +
      'Get test keys at https://dashboard.paystack.com/#/settings/developers'
    );
  }
  return key;
};

/** Build an authenticated axios instance (optionally with a tenant's key) */
const ps = (overrideKey = null) => axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Bearer ${overrideKey || process.env.PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 15_000,
});

/**
 * Initialize a Paystack transaction.
 * Returns { authorization_url, access_code, reference }
 */
export const initializeTransaction = async ({ email, amount, reference, metadata, callback_url, secretKey = null }) => {
  assertKey(secretKey);
  // Always provide a callback URL so Paystack can redirect back after payment
  const finalCallbackUrl = callback_url
    || process.env.PAYMENT_CALLBACK_URL
    || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/ticket/verify`;

  try {
    const { data } = await ps(secretKey).post('/transaction/initialize', {
      email,
      amount,   // in kobo
      reference,
      metadata,
      callback_url: finalCallbackUrl,
    });
    if (!data.status) throw new Error(data.message || 'Paystack initialization failed.');
    return data.data; // { authorization_url, access_code, reference }
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('Invalid Paystack secret key. Check your PAYSTACK_SECRET_KEY in backend/.env.');
    }
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      throw new Error('Cannot reach Paystack (api.paystack.co). Check the server\'s internet connection / DNS.');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('Paystack request timed out. Please try again.');
    }
    // Surface Paystack's own message if present (e.g. duplicate reference)
    if (err.response?.data?.message) {
      throw new Error(`Paystack: ${err.response.data.message}`);
    }
    throw err;
  }
};

/**
 * Verify a Paystack transaction.
 * Returns the full Paystack transaction object.
 */
export const verifyTransaction = async (reference, secretKey = null) => {
  assertKey(secretKey);
  try {
    const { data } = await ps(secretKey).get(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (!data.status) throw new Error(data.message || 'Paystack verification failed.');
    return data.data;
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error('Invalid Paystack secret key. Check your PAYSTACK_SECRET_KEY in backend/.env.');
    }
    if (err.code === 'ENOTFOUND' || err.code === 'EAI_AGAIN') {
      throw new Error('Cannot reach Paystack (api.paystack.co). Check the server\'s internet connection / DNS.');
    }
    if (err.code === 'ECONNABORTED') {
      throw new Error('Paystack verification timed out. Please try again.');
    }
    if (err.response?.data?.message) {
      throw new Error(`Paystack: ${err.response.data.message}`);
    }
    throw err;
  }
};

/**
 * Verify HMAC-SHA512 webhook signature from Paystack.
 * Returns true if valid, false if secret is not set.
 */
export const verifyWebhookSignature = (rawBody, signature) => {
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
  if (!secret) return false;
  const hash = crypto.createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');
  return hash === signature;
};
