/**
 * Email Test Script
 * Run: node scripts/test-email.js
 * Run to specific address: node scripts/test-email.js you@gmail.com
 */

import nodemailer from 'nodemailer';
import dotenv     from 'dotenv';
dotenv.config();

const to = process.argv[2] || process.env.SMTP_USER;

if (!to) {
  console.error('\n❌  No email address provided.\n');
  console.error('   Usage:  node scripts/test-email.js you@gmail.com\n');
  process.exit(1);
}

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } = process.env;

/* ── Check config ─────────────────────────────────────────── */
console.log('\n📧  MYS Email Test\n');
console.log('  Config:');
console.log(`  SMTP_HOST  = ${SMTP_HOST    || '❌ NOT SET'}`);
console.log(`  SMTP_PORT  = ${SMTP_PORT    || '587 (default)'}`);
console.log(`  SMTP_USER  = ${SMTP_USER    || '❌ NOT SET'}`);
console.log(`  SMTP_PASS  = ${SMTP_PASS    ? '✅ set (' + SMTP_PASS.length + ' chars)' : '❌ NOT SET'}`);
console.log(`  EMAIL_FROM = ${EMAIL_FROM   || '(uses SMTP_USER)'}`);
console.log(`  Sending to = ${to}\n`);

if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
  console.error('❌  Missing SMTP config in backend/.env\n');
  console.error('   Add these lines to backend/.env:');
  console.error('   SMTP_HOST=smtp.gmail.com');
  console.error('   SMTP_PORT=587');
  console.error('   SMTP_SECURE=false');
  console.error('   SMTP_USER=yourname@gmail.com');
  console.error('   SMTP_PASS=your16charapppassword');
  console.error('   EMAIL_FROM=MYS <yourname@gmail.com>\n');
  process.exit(1);
}

/* ── Create transporter ───────────────────────────────────── */
const transporter = nodemailer.createTransport({
  host:   SMTP_HOST,
  port:   parseInt(SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth:   { user: SMTP_USER, pass: SMTP_PASS },
});

/* ── Step 1: verify connection ────────────────────────────── */
console.log('  Step 1/2 — Verifying SMTP connection…');
try {
  await transporter.verify();
  console.log('  ✅ Connected to SMTP server successfully\n');
} catch (err) {
  console.error('  ❌ SMTP connection failed:', err.message, '\n');
  if (err.message.includes('Invalid login') || err.message.includes('Authentication')) {
    console.error('  Hint: Gmail App Password is wrong or 2FA is not enabled.');
    console.error('        Go to: myaccount.google.com/apppasswords to regenerate.\n');
  }
  if (err.message.includes('ENOTFOUND')) {
    console.error('  Hint: Cannot reach smtp.gmail.com — check your internet connection.\n');
  }
  process.exit(1);
}

/* ── Step 2: send test email ──────────────────────────────── */
console.log(`  Step 2/2 — Sending test email to ${to}…`);
try {
  const info = await transporter.sendMail({
    from:    EMAIL_FROM || `Muslim Youth Summit <${SMTP_USER}>`,
    to,
    subject: 'MYS Platform — Email Test',
    html: `
      <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#FBF6E6">
        <div style="background:#02462E;padding:24px;text-align:center;margin-bottom:24px">
          <h1 style="color:#FEC700;margin:0;font-size:24px">MYS Platform</h1>
          <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px">
            Muslim Youth Summit
          </p>
        </div>
        <h2 style="color:#02462E;margin:0 0 12px">Email Test Successful!</h2>
        <p style="color:#555;line-height:1.7">
          Assalamu Alaikum,<br/>
          Your MYS Platform email configuration is working correctly.
        </p>
        <div style="background:#fff;border-left:4px solid #FEC700;padding:16px;margin:20px 0">
          <p style="margin:0;font-size:13px;color:#333">
            <strong>From:</strong> ${EMAIL_FROM || SMTP_USER}<br/>
            <strong>To:</strong> ${to}<br/>
            <strong>SMTP:</strong> ${SMTP_HOST}:${SMTP_PORT || 587}<br/>
            <strong>Sent at:</strong> ${new Date().toLocaleString('en-NG')}
          </p>
        </div>
        <p style="color:#888;font-size:13px">
          Ticket confirmation emails, campaign emails, and SMS notifications
          will use this configuration.
        </p>
      </div>
    `,
    text: `MYS Email Test — Sent at ${new Date().toISOString()}. If you received this, your email config is working!`,
  });

  console.log('\n  ✅ Email sent successfully!');
  console.log(`  Message ID : ${info.messageId}`);
  console.log(`  Accepted   : ${info.accepted?.join(', ')}`);
  if (info.rejected?.length) {
    console.log(`  Rejected   : ${info.rejected.join(', ')}`);
  }
  console.log(`\n  Check your inbox (and spam folder) at: ${to}\n`);

} catch (err) {
  console.error('\n  ❌ Failed to send email:', err.message, '\n');

  if (err.responseCode === 535 || err.message.includes('Invalid login')) {
    console.error('  Hint: Gmail App Password is incorrect.');
    console.error('        1. Go to myaccount.google.com/apppasswords');
    console.error('        2. Delete old MYS password and create a new one');
    console.error('        3. Copy it WITHOUT spaces into SMTP_PASS in .env\n');
  } else if (err.message.includes('self signed')) {
    console.error('  Hint: Add this to backend/.env:');
    console.error('        SMTP_TLS_REJECT_UNAUTHORIZED=false\n');
  } else if (err.responseCode === 550) {
    console.error('  Hint: Recipient address may not exist or is blocked.\n');
  }
  process.exit(1);
}
