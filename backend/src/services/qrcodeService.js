/**
 * QR code service.
 *
 * Uses a VENDORED, dependency-free QR generator (src/vendor/qrcode-svg.cjs)
 * so QR codes ALWAYS render — even if `npm install` was never run or the
 * native `qrcode` package failed to build. This is what guarantees the QR
 * shows on printed tags.
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const QRCodeSVG = require('../vendor/qrcode-svg.cjs');

/**
 * Generate a QR code SVG string (vendored pure-JS — no install needed).
 */
export const generateQRCodeSVG = async (data) => {
  const qr = new QRCodeSVG({
    content: String(data || ''),
    width: 300,
    height: 300,
    color: '#02462E',
    background: '#FFFFFF',
    padding: 1,
    ecl: 'M',
    join: true,
    container: 'svg',
  });
  // Strip the XML prolog so the SVG embeds cleanly inline inside HTML
  return qr.svg().replace(/<\?xml[^>]*\?>\s*/i, '').trim();
};

/**
 * Generate a QR code as a base64 PNG data URL (for emails).
 * Tries native `qrcode`; falls back to an SVG data-URI from the vendored gen.
 */
export const generateQRCodePNG = async (data) => {
  try {
    const QRCode = (await import('qrcode')).default;
    return await QRCode.toDataURL(String(data || ''), {
      color: { dark: '#02462E', light: '#FFFFFF' },
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  } catch {
    const svg = await generateQRCodeSVG(data);
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
};

/** Ticket QR data — links to /ticket/:uniqueNumber */
export const ticketQRData = (uniqueNumber, baseUrl) => {
  return `${baseUrl || process.env.FRONTEND_URL}/ticket/${uniqueNumber}`;
};

/**
 * Tag QR data — links to the public tag page /tag/:tagNumber.
 * When scanned, the page shows the assigned participant's details, or
 * "not assigned yet" if the tag hasn't been given to anyone. Tags are
 * printed blank and assigned to a person at the gate; the QR always
 * resolves to whoever is currently assigned.
 */
export const tagQRData = (tagNumber, eventId, baseUrl) => {
  return `${baseUrl || process.env.FRONTEND_URL}/tag/${tagNumber}`;
};
