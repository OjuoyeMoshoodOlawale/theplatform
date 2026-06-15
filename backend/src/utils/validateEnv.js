/**
 * validateEnv.js
 * Called at server startup. Exits if core variables are missing.
 * Payment variables are OPTIONAL — app works without them (cash/manual only).
 */
export const validateEnv = () => {
  // These MUST exist — app cannot function without them
  const required = [
    ['DB_HOST',     'Database host (e.g. localhost)'],
    ['DB_NAME',     'Database name (e.g. mys_platform)'],
    ['DB_USER',     'Database username'],
    ['JWT_SECRET',  'JWT signing secret (min 32 chars)'],
  ];

  // These are optional — warn but don't crash
  const optional = [
    ['DB_PASS',                 'Database password (leave blank if none)'],
    ['PAYSTACK_SECRET_KEY',     'Paystack secret key — required for online payments'],
    ['PAYSTACK_PUBLIC_KEY',     'Paystack public key — required for online payments'],
    ['PAYSTACK_WEBHOOK_SECRET', 'Paystack webhook secret — required to verify webhooks'],
    ['PAYMENT_CALLBACK_URL',    'URL Paystack redirects to after payment'],
    ['SMTP_HOST',               'SMTP host — required to send emails'],
    ['SMTP_USER',               'SMTP username'],
    ['SMTP_PASS',               'SMTP password'],
    ['TERMII_API_KEY',          'Termii API key — required to send SMS'],
  ];

  // Hard stop on missing required vars
  const missing = required.filter(([key]) => !process.env[key]);
  if (missing.length) {
    console.error('\n❌  MYS Platform — Missing required environment variables:\n');
    missing.forEach(([key, desc]) => {
      console.error(`   ${key.padEnd(24)} — ${desc}`);
    });
    console.error('\n   Copy backend/.env.example to backend/.env and fill in the values.\n');
    process.exit(1);
  }

  // Warn about missing optional vars (don't crash)
  const missingOpt = optional.filter(([key]) => !process.env[key]);
  if (missingOpt.length) {
    console.warn('\n⚠️   Some optional features are not configured:');
    missingOpt.forEach(([key, desc]) => {
      console.warn(`   ${key.padEnd(24)} — ${desc}`);
    });
    console.warn('   (App will start. These features will be disabled until configured.)\n');
  }

  // Warn about weak JWT secret
  if ((process.env.JWT_SECRET || '').length < 32) {
    console.warn('⚠️   JWT_SECRET is very short — use at least 64 random characters in production.\n');
  }

  console.log('✅  Environment validated. Server starting…');
};
