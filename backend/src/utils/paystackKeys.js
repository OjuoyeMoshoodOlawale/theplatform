/**
 * Resolve which Paystack keys to use for a request.
 * Priority: the tenant's own keys (set in their Settings) → platform .env keys.
 */
export const resolvePaystackKeys = (tenant) => {
  const secret = tenant?.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY || '';
  const pub    = tenant?.paystack_public_key || process.env.PAYSTACK_PUBLIC_KEY || '';
  return {
    secret,
    public: pub,
    source: (tenant?.paystack_secret_key ? 'tenant' : 'platform'),
  };
};
