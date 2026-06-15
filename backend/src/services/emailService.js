import nodemailer          from 'nodemailer';
import { generateQRCodePNG, ticketQRData } from './qrcodeService.js';

/* ── Transporter ──────────────────────────────────────────── */
const createTransporter = () => {
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      'Email not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to backend/.env\n' +
      'Gmail: use App Password from myaccount.google.com/apppasswords'
    );
  }
  return nodemailer.createTransport({
    host:   SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: SMTP_USER, pass: SMTP_PASS },
  });
};

/* ── Brand ────────────────────────────────────────────────── */
const B = {
  green: '#02462E', gold: '#FEC700', cream: '#FBF6E6',
};

/* ── Base template ────────────────────────────────────────── */
const wrap = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 0">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;max-width:600px;width:100%">
      <!-- Header -->
      <tr>
        <td style="background:${B.green};padding:28px 40px;text-align:center">
          <p style="color:${B.gold};font-size:10px;letter-spacing:3px;margin:0 0 6px;font-weight:700;text-transform:uppercase">
            Muslim Youth Summit
          </p>
          <h1 style="color:#ffffff;font-size:32px;margin:0;font-weight:900;letter-spacing:-1px">MYS</h1>
          <p style="color:${B.gold};font-size:12px;margin:6px 0 0;letter-spacing:1px">
            Islamic Youth Reformation &amp; Career Development
          </p>
        </td>
      </tr>
      <!-- Content -->
      <tr>
        <td style="padding:36px 40px">
          ${content}
        </td>
      </tr>
      <!-- Footer -->
      <tr>
        <td style="background:${B.cream};padding:20px 40px;text-align:center;border-top:1px solid #e0e0e0">
          <p style="color:#888;font-size:12px;margin:0">
            Muslim Youth Summit &bull; Lagos, Nigeria &bull;
            <a href="https://muslimyouthsummit.com" style="color:${B.green};text-decoration:none">
              muslimyouthsummit.com
            </a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

/* ── Core send function ───────────────────────────────────── */
const send = async ({ to, subject, html, attachments }) => {
  const t = createTransporter();
  const info = await t.sendMail({
    from:    process.env.EMAIL_FROM || `Muslim Youth Summit <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    ...(attachments ? { attachments } : {}),
  });
  console.log(`  [Email] Sent to ${to} — MessageId: ${info.messageId}`);
  return info;
};

/* ══════════════════════════════════════════════════════════ */
/*  PUBLIC EXPORTS                                            */
/* ══════════════════════════════════════════════════════════ */

/** Test email — call from /api/email/test */
export const sendTestEmail = async (to) => {
  const html = wrap(`
    <h2 style="color:${B.green};font-size:22px;margin:0 0 12px">Email Test Successful!</h2>
    <p style="color:#555;font-size:15px;line-height:1.7">
      Assalamu Alaikum,<br/>
      Your MYS Platform email configuration is working correctly.
    </p>
    <div style="background:${B.cream};border-left:4px solid ${B.gold};padding:16px 20px;margin:24px 0">
      <p style="color:#333;font-size:14px;margin:0">
        <strong>SMTP Host:</strong> ${process.env.SMTP_HOST}<br/>
        <strong>From:</strong> ${process.env.EMAIL_FROM || process.env.SMTP_USER}<br/>
        <strong>To:</strong> ${to}
      </p>
    </div>
    <p style="color:#888;font-size:13px">
      Sent at: ${new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })} WAT
    </p>
  `);
  return send({ to, subject: 'MYS Platform — Email Test', html });
};

/** Ticket confirmation email — styled to match the printed ticket */
export const sendTicketEmail = async (ticket) => {
  // Generate QR code as a CID attachment (most reliable across email clients —
  // Gmail/Outlook often block base64 data: URIs but render cid: attachments)
  let qrDataUrl = '';
  let qrAttachment = null;
  try {
    const qrData  = ticketQRData(ticket.unique_number);
    qrDataUrl     = await generateQRCodePNG(qrData);   // data:image/png;base64,...
    const base64  = qrDataUrl.split(',')[1];
    qrAttachment  = {
      filename:    `ticket-${ticket.unique_number}.png`,
      content:     base64,
      encoding:    'base64',
      cid:         'ticketqr@mys',   // referenced as <img src="cid:ticketqr@mys">
    };
  } catch { /* QR generation failed — email still sends without it */ }

  const fmtDate = (d) => {
    if (!d) return 'See event details';
    try {
      return new Date(d).toLocaleDateString('en-NG', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
    } catch { return String(d).slice(0, 10); }
  };

  const fmtMoney = (n) => `NGN ${Number(n || 0).toLocaleString('en-NG')}`;

  const hasBalance = Number(ticket.balance_due) > 0;
  const eventDate  = fmtDate(ticket.event_start_date || ticket.start_date);
  const venue      = ticket.event_venue || ticket.venue || 'Venue TBA';
  const edition    = ticket.edition || '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0">
  <tr><td align="center">

    <!--  OUTER CARD  -->
    <table width="560" cellpadding="0" cellspacing="0"
      style="background:#ffffff;max-width:560px;width:100%;border:1px solid #e0e0e0">

      <!-- ══ HEADER — dark green ══ -->
      <tr>
        <td style="background:#02462E;padding:28px 32px">
          <!-- Logo / brand -->
          <p style="color:#FEC700;font-size:10px;font-weight:700;letter-spacing:4px;
                     margin:0 0 4px;text-transform:uppercase">
            Muslim Youth Summit
          </p>
          <h1 style="color:#ffffff;font-size:26px;font-weight:900;margin:0 0 10px;
                      line-height:1.1;letter-spacing:-0.5px">
            ${ticket.event_title || 'MYS Event'}
          </h1>
          <!-- Venue & date row -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding-right:16px">
                <p style="color:rgba(255,255,255,0.55);font-size:11px;margin:0 0 2px;text-transform:uppercase;letter-spacing:1px">Venue</p>
                <p style="color:#ffffff;font-size:13px;margin:0;font-weight:600">${venue}</p>
              </td>
              <td>
                <p style="color:rgba(255,255,255,0.55);font-size:11px;margin:0 0 2px;text-transform:uppercase;letter-spacing:1px">Date</p>
                <p style="color:#ffffff;font-size:13px;margin:0;font-weight:600">${eventDate}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>

      <!-- ══ GOLD STRIPE ══ -->
      <tr><td style="background:#FEC700;height:6px;font-size:0;line-height:0">&nbsp;</td></tr>

      <!-- ══ STATUS BANNER ══ -->
      <tr>
        <td style="background:${hasBalance ? '#fff8e1' : '#f0fdf4'};
                   border-bottom:1px solid ${hasBalance ? '#ffc107' : '#bbf7d0'};
                   padding:10px 32px;text-align:center">
          <p style="margin:0;font-size:13px;font-weight:700;
                     color:${hasBalance ? '#92400e' : '#166534'}">
            ${hasBalance
              ? `Outstanding Balance: ${fmtMoney(ticket.balance_due)} — Please pay at the registration desk`
              : 'Payment Confirmed &mdash; Fully Paid'}
          </p>
        </td>
      </tr>

      <!-- ══ TICKET BODY — cream background ══ -->
      <tr>
        <td style="background:#FBF6E6;padding:28px 32px">

          <!-- Attendee info grid -->
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:0 12px 16px 0;width:50%;vertical-align:top">
                <p style="color:#888;font-size:10px;font-weight:700;text-transform:uppercase;
                           letter-spacing:1.5px;margin:0 0 4px">Name</p>
                <p style="color:#02462E;font-size:16px;font-weight:800;margin:0;line-height:1.3">
                  ${ticket.participant_name}
                </p>
              </td>
              <td style="padding:0 0 16px 0;width:50%;vertical-align:top">
                <p style="color:#888;font-size:10px;font-weight:700;text-transform:uppercase;
                           letter-spacing:1.5px;margin:0 0 4px">Ticket Type</p>
                <p style="color:#333;font-size:14px;font-weight:600;margin:0">
                  ${ticket.ticket_type_name || 'General'}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 12px 16px 0;vertical-align:top">
                <p style="color:#888;font-size:10px;font-weight:700;text-transform:uppercase;
                           letter-spacing:1.5px;margin:0 0 4px">Amount Paid</p>
                <p style="color:#02462E;font-size:16px;font-weight:800;margin:0">
                  ${fmtMoney(ticket.amount_paid)}
                </p>
              </td>
              <td style="padding:0 0 16px 0;vertical-align:top">
                ${hasBalance ? `
                <p style="color:#888;font-size:10px;font-weight:700;text-transform:uppercase;
                           letter-spacing:1.5px;margin:0 0 4px">Balance Due</p>
                <p style="color:#dc2626;font-size:16px;font-weight:800;margin:0">
                  ${fmtMoney(ticket.balance_due)}
                </p>` : `
                <p style="color:#888;font-size:10px;font-weight:700;text-transform:uppercase;
                           letter-spacing:1.5px;margin:0 0 4px">Payment Method</p>
                <p style="color:#333;font-size:14px;font-weight:600;margin:0;text-transform:capitalize">
                  ${(ticket.payment_method || 'paystack').replace('_', ' ')}
                </p>`}
              </td>
            </tr>
          </table>

          <!-- Dashed divider -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin:4px 0 20px">
            <tr>
              <td style="border-top:2px dashed #ddd;height:1px;font-size:0">&nbsp;</td>
            </tr>
          </table>

          <!-- Ticket number — centred, large -->
          <p style="text-align:center;color:#888;font-size:10px;font-weight:700;
                     text-transform:uppercase;letter-spacing:2px;margin:0 0 8px">
            Ticket Number
          </p>
          <p style="text-align:center;color:#02462E;font-size:26px;font-weight:900;
                     letter-spacing:3px;margin:0 0 20px;font-family:'Courier New',monospace">
            ${ticket.unique_number}
          </p>

          <!-- QR code — centred -->
          ${qrAttachment ? `
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center" style="padding:20px;background:#ffffff;
                border:2px solid rgba(2,70,46,0.15)">
                <img src="cid:ticketqr@mys"
                  width="160" height="160"
                  alt="Ticket QR Code: ${ticket.unique_number}"
                  style="display:block;border:0;width:160px;height:160px" />
                <p style="color:#999;font-size:11px;margin:10px 0 0">
                  Scan or show at the event gate
                </p>
              </td>
            </tr>
          </table>` : `
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center" style="padding:20px;background:#f9f9f9;border:2px dashed #ddd">
                <p style="color:#aaa;font-size:13px;margin:0">QR code available at check-in</p>
                <p style="color:#02462E;font-size:15px;font-weight:700;margin:8px 0 0;
                           font-family:'Courier New',monospace;letter-spacing:2px">
                  ${ticket.unique_number}
                </p>
              </td>
            </tr>
          </table>`}

          ${hasBalance ? `
          <!-- Balance warning -->
          <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px">
            <tr>
              <td style="background:#fff8e1;border:1px solid #ffc107;
                          padding:14px 18px;border-radius:4px">
                <p style="color:#92400e;font-size:13px;font-weight:700;margin:0 0 6px">
                  Outstanding Balance
                </p>
                <p style="color:#92400e;font-size:13px;margin:0;line-height:1.6">
                  Please complete payment of <strong>${fmtMoney(ticket.balance_due)}</strong>
                  at the registration desk upon arrival.
                </p>
              </td>
            </tr>
          </table>` : ''}

        </td>
      </tr>

      <!-- ══ INSTRUCTIONS ══ -->
      <tr>
        <td style="background:#ffffff;padding:20px 32px;border-top:1px solid #f0f0f0">
          <p style="color:#555;font-size:13px;font-weight:700;margin:0 0 8px">
            Important Information
          </p>
          <ul style="color:#666;font-size:13px;margin:0;padding-left:18px;line-height:2">
            <li>Show your QR code or ticket number at the event gate</li>
            <li>Arrive at least 30 minutes before sessions begin</li>
            <li>Dress modestly in accordance with Islamic guidelines</li>
            ${hasBalance ? `<li style="color:#92400e;font-weight:600">
              Complete your outstanding payment of ${fmtMoney(ticket.balance_due)} at the registration desk
            </li>` : ''}
          </ul>
        </td>
      </tr>

      <!-- ══ FOOTER ══ -->
      <tr>
        <td style="background:#02462E;padding:20px 32px;text-align:center">
          <p style="color:rgba(255,255,255,0.6);font-size:12px;margin:0 0 4px">
            Muslim Youth Summit &mdash; Lagos, Nigeria
          </p>
          <p style="color:rgba(255,255,255,0.4);font-size:11px;margin:0">
            muslimyouthsummit.com &nbsp;&bull;&nbsp; ${edition}
          </p>
        </td>
      </tr>

    </table>
    <!--  /OUTER CARD  -->

    <!-- View online link -->
    <p style="text-align:center;margin:16px 0 0">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/ticket/${ticket.unique_number}"
        style="color:#02462E;font-size:13px;text-decoration:none">
        View ticket online &rarr;
      </a>
    </p>

  </td></tr>
</table>
</body>
</html>`;

  return send({
    to:          ticket.participant_email,
    subject:     `Ticket Confirmed: ${ticket.unique_number} — ${ticket.event_title}`,
    html,
    attachments: qrAttachment ? [qrAttachment] : undefined,
  });
};

/** Send a single campaign email */
export const sendCampaignEmail = async ({ to, subject, html }) => {
  return send({ to, subject, html });
};

/** Send bulk campaign emails with rate limiting */
export const sendBulkCampaignEmails = async (recipients, subject, bodyHtml, onProgress) => {
  const BATCH = 50;
  let sent = 0, failed = 0;
  const logs = [];

  for (let i = 0; i < recipients.length; i += BATCH) {
    const batch = recipients.slice(i, i + BATCH);
    await Promise.allSettled(batch.map(async (r) => {
      try {
        await sendCampaignEmail({
          to:      r.email,
          subject,
          html:    bodyHtml.replace(/\{\{name\}\}/gi, r.name || 'Dear Friend'),
        });
        sent++;
        logs.push({ email: r.email, participantId: r.id, status: 'sent' });
      } catch (err) {
        failed++;
        logs.push({ email: r.email, participantId: r.id, status: 'failed', error: err.message });
        console.error(`  [Email] Failed to ${r.email}: ${err.message}`);
      }
    }));
    if (onProgress) onProgress({ sent, failed, total: recipients.length });
    if (i + BATCH < recipients.length) await new Promise(r => setTimeout(r, 2000));
  }
  return { sent, failed, logs };
};

/** Welcome email — sent when participant checks IN */
export const sendCheckInEmail = async ({ to, name, eventTitle, tagNumber }) => {
  const html = wrap(`
    <h2 style="color:${B.green};font-size:22px;margin:0 0 12px">Welcome to ${eventTitle}!</h2>
    <p style="color:#555;font-size:15px;line-height:1.7">
      Assalamu Alaikum <strong>${name}</strong>,<br/>
      You have been successfully checked in. We are delighted to have you with us!
    </p>
    ${tagNumber ? `
    <div style="background:${B.cream};border-left:4px solid ${B.gold};padding:16px 20px;margin:20px 0">
      <p style="color:#666;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Your Tag Number</p>
      <p style="color:${B.green};font-size:22px;font-weight:800;margin:0;font-family:monospace">${tagNumber}</p>
    </div>` : ''}
    <p style="color:#555;font-size:14px;line-height:1.7">
      Please keep your tag visible at all times. Enjoy the sessions, connect with fellow attendees,
      and may this gathering be a means of benefit and barakah for you. JazakAllahu Khayran!
    </p>
    <p style="color:${B.green};font-size:14px;font-weight:700;margin:16px 0 0">The MYS Team</p>
  `);
  return send({ to, subject: `Welcome to ${eventTitle}! You're checked in`, html });
};

/** Thank-you email — sent when participant checks OUT */
export const sendCheckOutEmail = async ({ to, name, eventTitle }) => {
  const html = wrap(`
    <h2 style="color:${B.green};font-size:22px;margin:0 0 12px">Thank You for Attending!</h2>
    <p style="color:#555;font-size:15px;line-height:1.7">
      Assalamu Alaikum <strong>${name}</strong>,<br/>
      Thank you for attending <strong>${eventTitle}</strong>. We hope you found the sessions
      beneficial and that you leave inspired and reformed.
    </p>
    <div style="background:${B.cream};border-left:4px solid ${B.green};padding:16px 20px;margin:20px 0">
      <p style="color:#444;font-size:14px;margin:0;line-height:1.7">
        Your certificate of attendance will be emailed to you once the event concludes.
        Stay tuned for session recordings and photos!
      </p>
    </div>
    <p style="color:#555;font-size:14px;line-height:1.7">
      May Allah accept our gathering and make us among those who listen to the word and follow the best of it.
    </p>
    <p style="color:${B.green};font-size:14px;font-weight:700;margin:16px 0 0">Barakallahu feekum &mdash; The MYS Team</p>
  `);
  return send({ to, subject: `Thank you for attending ${eventTitle}`, html });
};

/** Certificate email — sent when event is marked completed */
export const sendCertificateEmail = async ({ to, name, eventTitle, uniqueNumber }) => {
  const certUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/certificate/${uniqueNumber}`;
  const html = wrap(`
    <h2 style="color:${B.green};font-size:22px;margin:0 0 12px">Your Certificate Is Ready!</h2>
    <p style="color:#555;font-size:15px;line-height:1.7">
      Assalamu Alaikum <strong>${name}</strong>,<br/>
      Thank you for attending <strong>${eventTitle}</strong>. Your Certificate of Attendance
      is now available.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="${certUrl}"
        style="display:inline-block;background:${B.green};color:#fff;padding:14px 32px;
               text-decoration:none;font-weight:700;font-size:15px;border-radius:4px">
        Download Your Certificate
      </a>
    </div>
    <div style="background:${B.cream};padding:16px 20px;margin:20px 0">
      <p style="color:#666;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">Your Reference</p>
      <p style="color:${B.green};font-size:18px;font-weight:800;margin:0;font-family:monospace">${uniqueNumber}</p>
      <p style="color:#888;font-size:12px;margin:8px 0 0">
        You can verify your certificate anytime using this ticket number or your tag number at
        ${process.env.FRONTEND_URL || 'muslimyouthsummit.com'}/certificate
      </p>
    </div>
    <p style="color:${B.green};font-size:14px;font-weight:700;margin:16px 0 0">JazakAllahu Khayran &mdash; The MYS Team</p>
  `);
  return send({ to, subject: `Your Certificate — ${eventTitle}`, html });
};

/** Facilitator reminder email */
export const sendFacilitatorReminder = async ({ to, sessionTitle, startTime, eventTitle }) => {
  const html = wrap(`
    <h2 style="color:${B.green};font-size:20px;margin:0 0 12px">Session Reminder</h2>
    <p style="color:#555;font-size:15px;margin:0 0 20px">
      You are listed as a facilitator for the following session at <strong>${eventTitle}</strong>:
    </p>
    <div style="background:${B.cream};border-left:4px solid ${B.green};padding:16px 20px;margin:0 0 20px">
      <p style="font-size:16px;font-weight:700;color:${B.green};margin:0 0 4px">${sessionTitle}</p>
      <p style="font-size:14px;color:#666;margin:0">Start time: <strong>${startTime}</strong></p>
    </div>
    <p style="color:#555;font-size:14px">Please ensure you are ready 15 minutes before. Jazakallahu Khayran!</p>
  `);
  return send({ to, subject: `Facilitator Reminder: ${sessionTitle} — ${eventTitle}`, html });
};
