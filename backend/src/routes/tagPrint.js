import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { query } from '../database/db.js';
import { generateQRCodeSVG, tagQRData } from '../services/qrcodeService.js';

const router = express.Router();

const TIER_COLORS = {
  title:   { bg: '#FFD700', text: '#02462E', border: '#FEC700' },
  gold:    { bg: '#FEC700', text: '#02462E', border: '#d4a800' },
  silver:  { bg: '#C0C0C0', text: '#333333', border: '#999999' },
  bronze:  { bg: '#CD7F32', text: '#ffffff', border: '#a0621f' },
  media:   { bg: '#02462E', text: '#ffffff', border: '#013a24' },
  partner: { bg: '#e8f4fd', text: '#1a4fa0', border: '#1a4fa0' },
};

/* ──────────────────────────────────────────────────────────────
   GET /api/events/:eventId/tags/print?ids=1,2,3,4
   Returns print-ready HTML: 4 badges per A4 page, cut lines
   ────────────────────────────────────────────────────────────── */
router.get('/events/:eventId/tags/print', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { ids, unassigned, limit = 40 } = req.query;
    const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Get event info
    const [[event]] = await query('SELECT * FROM events WHERE id=?', [eventId]);
    if (!event) return res.status(404).send('<h1>Event not found</h1>');

    // Get tags
    let tagQuery, tagParams;
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean);
      tagQuery = `
        SELECT et.*, p.name AS participant_name, p.gender,
               c.name AS category_name, c.color AS category_color,
               t.unique_number AS ticket_number
        FROM event_tags et
        LEFT JOIN participants p  ON p.id  = et.participant_id
        LEFT JOIN tickets t       ON t.id  = et.ticket_id
        LEFT JOIN tickets tk      ON tk.id = et.ticket_id
        LEFT JOIN event_categories c ON c.id = tk.category_id
        WHERE et.event_id=? AND et.id IN (${idList.map(()=>'?').join(',')})
        ORDER BY et.tag_number`;
      tagParams = [eventId, ...idList];
    } else if (unassigned === '1') {
      tagQuery = `
        SELECT et.*, NULL AS participant_name, NULL AS gender,
               NULL AS category_name, NULL AS category_color, NULL AS ticket_number
        FROM event_tags et WHERE et.event_id=? AND et.ticket_id IS NULL
        ORDER BY et.tag_number LIMIT ?`;
      tagParams = [eventId, parseInt(limit)];
    } else {
      tagQuery = `
        SELECT et.*, p.name AS participant_name, p.gender,
               c.name AS category_name, c.color AS category_color,
               t.unique_number AS ticket_number
        FROM event_tags et
        LEFT JOIN participants p  ON p.id  = et.participant_id
        LEFT JOIN tickets t       ON t.id  = et.ticket_id
        LEFT JOIN event_categories c ON c.id = t.category_id
        WHERE et.event_id=?
        ORDER BY et.tag_number LIMIT ?`;
      tagParams = [eventId, parseInt(limit)];
    }

    const [tags] = await query(tagQuery, tagParams);
    if (!tags.length) return res.status(404).send('<h1>No tags found for the given criteria.</h1>');

    // Generate (or refresh) the QR for every tag → points to /tag/:tagNumber.
    // Tags are created blank (no QR), so we generate here and persist it.
    let qrFailures = 0;
    for (const tag of tags) {
      try {
        tag.qr_code_svg = await generateQRCodeSVG(tagQRData(tag.tag_number, eventId, BASE_URL));
        query('UPDATE event_tags SET qr_code_svg=? WHERE id=?', [tag.qr_code_svg, tag.id]).catch(() => {});
      } catch (qrErr) {
        qrFailures++;
        console.error(`[Tag QR] Failed for ${tag.tag_number}: ${qrErr.message}`);
      }
    }
    if (qrFailures) console.error(`[Tag QR] ${qrFailures}/${tags.length} QR failed. Check backend/src/vendor/qrcode-svg.cjs`);

    // Mark as printed
    const tagIds = tags.map(t => t.id);
    await query(`UPDATE event_tags SET is_printed=1 WHERE id IN (${tagIds.map(()=>'?').join(',')})`, tagIds);

    // Build badge HTML — BLANK tag: logo + tag number + QR only.
    // Tags are printed BEFORE the event and assigned to people at registry on the day.
    const buildBadge = (tag, event) => {
      const tagNum = tag.tag_number || '???';
      // Make the QR responsive: ensure a viewBox (so it scales) and let CSS size
      // it to the box. Strip any fixed width/height that would overflow.
      let qr;
      if (tag.qr_code_svg) {
        let svg = tag.qr_code_svg;
        // Capture the existing pixel size to build a viewBox if none exists
        const wMatch = svg.match(/width="(\d+)"/);
        const size = wMatch ? wMatch[1] : '300';
        if (!/viewBox=/.test(svg)) {
          svg = svg.replace('<svg', `<svg viewBox="0 0 ${size} ${size}" preserveAspectRatio="xMidYMid meet"`);
        }
        // Remove fixed width/height so CSS (100% of the 124px box) controls size
        svg = svg.replace(/\swidth="\d+"/, '').replace(/\sheight="\d+"/, '');
        qr = svg;
      } else {
        qr = buildFallbackQR(tagNum);
      }

      return `
      <div class="badge">
        <!-- Brand header -->
        <div class="badge-header">
          <img src="${BASE_URL}/logos/logo-white.png" class="badge-logo" alt="MYS" />
          <div class="badge-edition">${event.edition || 'MYS'}</div>
          <div class="badge-event-title">${event.title || 'Muslim Youth Summit'}</div>
        </div>

        <!-- Gold divider -->
        <div class="badge-stripe"></div>

        <!-- Body: tag number + QR -->
        <div class="badge-body">
          <div class="badge-label">Tag Number</div>
          <div class="badge-tag-num">${tagNum}</div>
          <div class="badge-qr">${qr}</div>
          <div class="badge-scan">Scan at gate to check in</div>
        </div>

        <!-- Footer -->
        <div class="badge-footer">
          <span>${event.venue || 'Muslim Youth Summit'}</span>
        </div>
      </div>`;
    };

    const buildFallbackQR = (text) => `
      <div style="width:100px;height:100px;border:2px dashed #ccc;display:flex;align-items:center;justify-content:center;font-size:9px;text-align:center;color:#888;padding:4px">
        ${text}
      </div>`;

    // Group into pages of 4
    const pages = [];
    for (let i = 0; i < tags.length; i += 4) {
      pages.push(tags.slice(i, i + 4));
    }

    const pagesHtml = pages.map((pageTags, pi) => {
      const badges = pageTags.map(t => buildBadge(t, event));
      // Pad to 4 if last page has fewer
      while (badges.length < 4) {
        badges.push(`<div class="badge badge-empty"><div class="empty-label">Blank</div></div>`);
      }
      return `
      <div class="page">
        <div class="grid">
          <div class="cell">
            ${badges[0]}
            <div class="cut-h"></div>
          </div>
          <div class="cell">
            ${badges[1]}
            <div class="cut-h"></div>
          </div>
          <div class="cell border-bottom-cut">
            ${badges[2]}
          </div>
          <div class="cell border-bottom-cut">
            ${badges[3]}
          </div>
        </div>
        <!-- Vertical cut line -->
        <div class="cut-v"></div>
        <div class="page-num">Page ${pi + 1} of ${pages.length} · ${event.edition} Event Tags · ${tags.length} total</div>
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${event.edition} — Event Tags (${tags.length})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f0f0f0;
    }

    /* Page = A4 */
    .page {
      width: 210mm;
      height: 297mm;
      background: white;
      margin: 10px auto;
      position: relative;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      padding: 8mm;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 0;
      flex: 1;
    }

    .cell {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6mm;
    }

    /* ── Badge design ──────────────────────────── */
    .badge {
      width: 85mm;
      height: 120mm;
      border: 1.5px solid #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 1px 4px rgba(0,0,0,0.1);
      background: white;
    }

    .badge-empty {
      border: 2px dashed #ccc;
      background: #fafafa;
      align-items: center;
      justify-content: center;
    }

    .empty-label {
      color: #ccc;
      font-size: 14px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
    }

    .badge-header {
      background: #02462E;
      padding: 14px 10px 10px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .badge-logo {
      height: 34px;
      width: auto;
      margin-bottom: 8px;
    }

    .badge-edition {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: 0.08em;
      color: #FEC700;
      line-height: 1;
    }

    .badge-event-title {
      font-size: 8px;
      color: rgba(255,255,255,0.75);
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-top: 4px;
    }

    .badge-stripe {
      height: 5px;
      background: #FEC700;
    }

    .badge-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 14px 10px;
      gap: 8px;
      background: #FBF6E6;
    }

    .badge-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.25em;
      color: #999;
    }

    .badge-tag-num {
      font-size: 34px;
      font-weight: 900;
      color: #02462E;
      letter-spacing: 0.06em;
      line-height: 1;
      font-family: 'Courier New', monospace;
    }

    .badge-qr {
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      padding: 6px;
      border: 2px solid rgba(2,70,46,0.12);
      border-radius: 4px;
      margin-top: 4px;
      width: 124px;
      height: 124px;
      box-sizing: border-box;
    }

    .badge-qr svg {
      display: block;
      width: 100%;
      height: 100%;
      max-width: 112px;
      max-height: 112px;
    }

    .badge-scan {
      font-size: 8px;
      color: #02462E;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .badge-footer {
      background: #02462E;
      padding: 6px 10px;
      font-size: 7px;
      color: rgba(255,255,255,0.6);
      text-align: center;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    /* ── CUT LINES ─────────────────────────────── */
    /* Horizontal cut line between row 1 and row 2 */
    .cut-h {
      position: absolute;
      bottom: 0;
      left: -8mm;
      right: -8mm;
      height: 0;
      border-bottom: 1.5px dashed #bbb;
      pointer-events: none;
    }

    .cut-h::before, .cut-h::after {
      content: '✂';
      position: absolute;
      top: -8px;
      font-size: 12px;
      color: #bbb;
    }
    .cut-h::before { left: 2mm; }
    .cut-h::after  { right: 2mm; }

    /* Vertical cut line between col 1 and col 2 */
    .cut-v {
      position: absolute;
      top: 8mm;
      bottom: 8mm;
      left: 50%;
      width: 0;
      border-left: 1.5px dashed #bbb;
      pointer-events: none;
    }

    .cut-v::before, .cut-v::after {
      content: '✂';
      position: absolute;
      left: -8px;
      font-size: 12px;
      color: #bbb;
      transform: rotate(90deg);
    }
    .cut-v::before { top: 2mm; }
    .cut-v::after  { bottom: 2mm; }

    .page-num {
      text-align: center;
      font-size: 8px;
      color: #bbb;
      padding-top: 4px;
      letter-spacing: 0.1em;
    }

    /* ── PRINT STYLES ──────────────────────────── */
    @media print {
      body { background: white; }
      .page {
        margin: 0 !important;
        padding: 8mm !important;
        page-break-after: always;
        box-shadow: none !important;
      }
      .no-print { display: none !important; }
    }

    /* ── SCREEN TOOLBAR ─────────────────────────── */
    .toolbar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      gap: 10px;
      z-index: 100;
    }
    .toolbar button {
      padding: 12px 24px;
      font-size: 14px;
      font-weight: bold;
      border: none;
      cursor: pointer;
      border-radius: 4px;
    }
    .btn-print { background: #02462E; color: white; }
    .btn-print:hover { background: #013a24; }
    .btn-close { background: #e5e7eb; color: #374151; }
  </style>
</head>
<body>

  <!-- Toolbar (hidden on print) -->
  <div class="toolbar no-print">
    <button class="btn-print" onclick="window.print()">🖨️ Print Badges</button>
    <button class="btn-close" onclick="window.close()">✕ Close</button>
  </div>

  ${pagesHtml}

</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (e) { next(e); }
});

/* ── Generate blank tags for an event ──────────────────────────
   POST /api/events/:eventId/tags/generate
   Body: { count: 50, prefix: 'TAG' }
   ─────────────────────────────────────────────────────────── */
router.post('/events/:eventId/tags/generate', authenticate, async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { count = 20, prefix = 'TAG' } = req.body;

    const [[event]] = await query('SELECT id FROM events WHERE id=?', [eventId]);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Get current max tag number for this event
    const [[{ maxNum }]] = await query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(tag_number, LENGTH(?)+2) AS UNSIGNED)),0) AS maxNum
       FROM event_tags WHERE event_id=? AND tag_number LIKE ?`,
      [prefix, eventId, `${prefix}-%`]
    );

    const generated = [];
    for (let i = 1; i <= parseInt(count); i++) {
      const tagNum = `${prefix}-${String(maxNum + i).padStart(3, '0')}`;
      try {
        const [r] = await query(
          'INSERT INTO event_tags (event_id, tag_number) VALUES (?,?)',
          [eventId, tagNum]
        );
        generated.push({ id: r.insertId, tag_number: tagNum });
      } catch {} // skip duplicates
    }

    res.json({ success: true, data: { generated: generated.length, tags: generated }, message: `${generated.length} tags generated.` });
  } catch (e) { next(e); }
});

export default router;
