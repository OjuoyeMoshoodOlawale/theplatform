/**
 * smsService.js — Termii SMS Integration (Nigerian provider)
 * Docs: https://developers.termii.com
 *
 * Set in .env:
 *   TERMII_API_KEY=your_key
 *   TERMII_SENDER_ID=MYSummit   (max 11 chars)
 *   TERMII_CHANNEL=generic       (generic|dnd|whatsapp)
 */

const BASE = 'https://api.ng.termii.com/api';

const headers = () => ({ 'Content-Type': 'application/json' });

const apiKey   = () => process.env.TERMII_API_KEY    || '';
const senderId = () => process.env.TERMII_SENDER_ID  || 'MYSummit';
const channel  = () => process.env.TERMII_CHANNEL    || 'generic';

/** Normalise Nigerian phone number to international format */
export const normPhone = (phone) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0') && digits.length === 11) return '234' + digits.slice(1);
  if (digits.length === 10) return '234' + digits;
  return digits;
};

/** Send a single SMS */
export const sendSMS = async (phone, message) => {
  const to = normPhone(phone);
  if (!to) return { success: false, error: 'Invalid phone number' };
  if (!apiKey()) {
    console.warn('SMS skipped — TERMII_API_KEY not configured');
    return { success: false, error: 'SMS not configured' };
  }
  try {
    const res = await fetch(`${BASE}/sms/send`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        to,
        from:    senderId(),
        sms:     message,
        type:    'plain',
        channel: channel(),
        api_key: apiKey(),
      }),
    });
    const data = await res.json();
    const ok = data.code === 'ok' || data.message?.toLowerCase()?.includes('sent');
    return { success: ok, data, to };
  } catch (err) {
    console.error('Termii SMS error:', err.message);
    return { success: false, error: err.message };
  }
};

/** Send bulk SMS — Termii allows up to 1000 recipients */
export const sendBulkSMS = async (phones, message) => {
  const numbers = phones.map(normPhone).filter(Boolean);
  if (!numbers.length) return { success: false, sent: 0 };
  if (!apiKey()) {
    console.warn('Bulk SMS skipped — TERMII_API_KEY not configured');
    return { success: false, sent: 0, error: 'SMS not configured' };
  }
  try {
    // Termii bulk: to is array
    const res = await fetch(`${BASE}/sms/send/bulk`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        to:      numbers,
        from:    senderId(),
        sms:     message,
        type:    'plain',
        channel: channel(),
        api_key: apiKey(),
      }),
    });
    const data = await res.json();
    return { success: true, sent: numbers.length, data };
  } catch (err) {
    console.error('Termii bulk SMS error:', err.message);
    return { success: false, sent: 0, error: err.message };
  }
};

/* ── Pre-built message templates ──────────────────────────── */

export const smsTemplates = {
  checkIn: (name, eventTitle, tagNumber) =>
    `Assalamu Alaikum ${name}! You have been checked in to ${eventTitle}. Your tag: ${tagNumber}. JazakAllahu Khayran!`,

  checkOut: (name, eventTitle) =>
    `Assalamu Alaikum ${name}! Your check-out from ${eventTitle} has been recorded. Barakallahu feek!`,

  ticketConfirmed: (name, eventTitle, ticketNumber, date) =>
    `As-Salamu Alaykum ${name}! Your ticket for ${eventTitle} is confirmed. Ticket: ${ticketNumber}. Date: ${date}. See you there!`,

  balanceReminder: (name, balance, eventTitle) =>
    `Dear ${name}, you have an outstanding balance of NGN ${Number(balance).toLocaleString('en-NG')} for ${eventTitle}. Please pay at the gate on arrival. Jazakallah Khayran.`,

  expenseApproved: (deptName, amount, title) =>
    `Your expense request "${title}" for NGN ${Number(amount).toLocaleString('en-NG')} has been approved. Contact the coordinator to collect. - MYS Admin`,

  eventReminder: (name, eventTitle, date, venue) =>
    `As-Salamu Alaykum ${name}! Reminder: ${eventTitle} is on ${date} at ${venue}. Please bring your ticket QR code. JazakAllahu Khayran! - MYS Team`,
};
