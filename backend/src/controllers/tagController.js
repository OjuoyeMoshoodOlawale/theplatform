import { query, transaction } from '../database/db.js';
import { success, created, error, notFound as notFoundRes } from '../utils/response.js';
import { generateQRCodeSVG, tagQRData } from '../services/qrcodeService.js';
import { generateTagNumber } from '../utils/helpers.js';
import { tenantWhere } from '../utils/tenantScope.js';

/* ── Generate tags ──────────────────────────────────────────── */
export const generateTags = async (req, res, next) => {
  try {
    const { event_id, count } = req.body;
    if (!count || count < 1 || count > 2000)
      return error(res, 'Count must be between 1 and 2000.');

    // Validate the event belongs to THIS tenant (can't generate tags for
    // another organisation's event by guessing its id).
    const t = tenantWhere(req, 'e');
    const [events] = await query(
      `SELECT e.id FROM events e WHERE e.id = ?${t.clause}`,
      [event_id, ...t.params]
    );
    if (!events.length) return notFoundRes(res, 'Event');

    const [[{ currentCount }]] = await query(
      'SELECT COUNT(*) AS currentCount FROM event_tags WHERE event_id = ?', [event_id]
    );

    const tags = [];
    await transaction(async (conn) => {
      for (let i = 0; i < count; i++) {
        const tagNumber = generateTagNumber(currentCount + i + 1);
        const qrSvg     = await generateQRCodeSVG(tagQRData(tagNumber, event_id));
        const [r] = await conn.execute(
          'INSERT INTO event_tags (event_id, tag_number, qr_code_svg) VALUES (?, ?, ?)',
          [event_id, tagNumber, qrSvg]
        );
        tags.push({ id: r.insertId, tag_number: tagNumber });
      }
    });

    created(res, { generated: count, tags }, `${count} tags generated.`);
  } catch (e) { next(e); }
};

/* ── List tags ──────────────────────────────────────────────── */
export const listTags = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [rows] = await query(
      `SELECT t.*, p.name AS participant_name, p.email AS participant_email,
              c.name AS category_name, c.color AS category_color
       FROM event_tags t
       LEFT JOIN participants p  ON p.id = t.participant_id
       LEFT JOIN tickets tk      ON tk.id = t.ticket_id
       LEFT JOIN event_categories c ON c.id = tk.category_id
       WHERE t.event_id = ?
       ORDER BY t.tag_number`,
      [eventId]
    );
    success(res, rows);
  } catch (e) { next(e); }
};

/* ── Assign tag to participant ──────────────────────────────── */
export const assignTag = async (req, res, next) => {
  try {
    const { tag_number, ticket_id, event_id } = req.body;
    if (!tag_number || !ticket_id)
      return error(res, 'tag_number and ticket_id are required.');

    // Find the tag
    const [tags] = await query(
      'SELECT * FROM event_tags WHERE tag_number = ? AND event_id = ?',
      [tag_number.toUpperCase(), event_id]
    );
    if (!tags.length) return notFoundRes(res, 'Tag');
    if (tags[0].ticket_id) return error(res, `Tag ${tag_number} is already assigned.`, 409);

    const [[ticket]] = await query('SELECT participant_id FROM tickets WHERE id=?', [ticket_id]);
    if (!ticket) return notFoundRes(res, 'Ticket');

    await query(
      `UPDATE event_tags SET ticket_id=?, participant_id=?, assigned_at=NOW(), assigned_by=?
       WHERE id=?`,
      [ticket_id, ticket.participant_id, req.admin?.id || null, tags[0].id]
    );
    success(res, null, `Tag ${tag_number} assigned successfully.`);
  } catch (e) { next(e); }
};

/* ── Tag stats ──────────────────────────────────────────────── */
export const tagStats = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const [[stats]] = await query(
      `SELECT
         COUNT(*)                              AS total,
         SUM(ticket_id IS NOT NULL)            AS assigned,
         SUM(ticket_id IS NULL)                AS unassigned,
         SUM(is_printed = 1)                   AS printed
       FROM event_tags WHERE event_id = ?`,
      [eventId]
    );
    success(res, stats);
  } catch (e) { next(e); }
};

/* ── Printable tag badges — 4-up A4 layout ──────────────────── */
export const getPrintableTags = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { ids, unassigned_only } = req.query;

    const [[event]] = await query(
      'SELECT title, edition, start_date, end_date, venue FROM events WHERE id = ?',
      [eventId]
    );
    if (!event) return notFoundRes(res, 'Event');

    let where = 'WHERE t.event_id = ?';
    const params = [eventId];
    if (ids) {
      const idList = ids.split(',').map(Number).filter(Boolean);
      if (idList.length) { where += ` AND t.id IN (${idList.join(',')})`; }
    }
    if (unassigned_only === '1') where += ' AND t.ticket_id IS NULL';

    const [tags] = await query(
      `SELECT t.id, t.tag_number, t.qr_code_svg
       FROM event_tags t
       ${where}
       ORDER BY t.tag_number
       LIMIT 500`,
      params
    );

    if (!tags.length) {
      res.setHeader('Content-Type', 'text/html');
      return res.send('<html><body style="font-family:sans-serif;padding:40px"><h2>No tags found.</h2><p>Generate tags first.</p></body></html>');
    }

    // Always (re)generate the QR on print so it points to the current
    // /tag/:tagNumber URL — this also repairs any blank or outdated QR.
    let qrFailures = 0;
    for (const tag of tags) {
      try {
        tag.qr_code_svg = await generateQRCodeSVG(tagQRData(tag.tag_number, eventId));
        query('UPDATE event_tags SET qr_code_svg = ? WHERE id = ?', [tag.qr_code_svg, tag.id]).catch(() => {});
      } catch (qrErr) {
        qrFailures++;
        console.error(`[Tag QR] Failed to generate QR for ${tag.tag_number}: ${qrErr.message}`);
      }
    }
    if (qrFailures) {
      console.error(`[Tag QR] ${qrFailures}/${tags.length} QR codes failed to generate. Check that backend/src/vendor/qrcode-svg.cjs exists.`);
    }

    const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
    const logoUrl  = `${FRONTEND}/logos/logo-white.png`;

    // ── Single tag card: logo + event + BIG number + QR only ──
    const tagCard = (tag) => `
      <div class="tag">
        <div class="tag-stripe"></div>
        <div class="tag-head">
          <img src="${logoUrl}" alt="MYS" class="tag-logo" />
          <div class="tag-evt">
            <div class="tag-evt-name">${event.title}</div>
            <div class="tag-evt-ed">${event.edition}</div>
          </div>
        </div>
        <div class="tag-mid">
          <div class="tag-qr">
            ${tag.qr_code_svg || `<div class="qr-fallback">${tag.tag_number}</div>`}
          </div>
          <div class="tag-num-label">TAG NUMBER</div>
          <div class="tag-num">${tag.tag_number}</div>
          <div class="tag-scan">Scan to check in &amp; view attendee</div>
        </div>
        <div class="tag-foot">muslimyouthsummit.com</div>
      </div>`;

    // Chunk into pages of 4 (2×2)
    const pages = [];
    for (let i = 0; i < tags.length; i += 4) pages.push(tags.slice(i, i + 4));

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Event Tags — ${event.title} ${event.edition}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', sans-serif; background: #e8e8e8; }

    @page { size: A4 portrait; margin: 8mm; }

    .toolbar {
      position: sticky; top: 0; background: #02462E; color: #fff;
      padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
      z-index: 10;
    }
    .toolbar h1 { font-family:'Syne',sans-serif; font-size: 15px; }
    .toolbar button {
      background: #FEC700; color: #02462E; border: 0; font-weight: 700;
      padding: 8px 18px; border-radius: 6px; cursor: pointer; font-size: 13px;
    }
    .toolbar .count { font-size: 12px; opacity: .7; }

    .page {
      width: 210mm; min-height: 297mm; background: #fff;
      margin: 16px auto; padding: 8mm;
      display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
      gap: 0; page-break-after: always;
    }
    .cell { position: relative; padding: 5mm; }
    .cell:nth-child(1), .cell:nth-child(2) { border-bottom: 1.5px dashed #c5c5c5; }
    .cell:nth-child(odd) { border-right: 1.5px dashed #c5c5c5; }
    .cell::after {
      content: '✂'; position: absolute; font-size: 13px; color: #ccc; line-height: 1;
    }
    .cell:nth-child(1)::after { bottom: -10px; right: -7px; }
    .cell:nth-child(2)::after { bottom: -10px; left: -7px; }

    /* ── The tag itself ── */
    .tag {
      width: 100%; height: 100%; min-height: 122mm;
      border: 2px solid #02462E; border-radius: 4px;
      background: #fff; display: flex; flex-direction: column;
      overflow: hidden; position: relative;
    }
    .tag-stripe { height: 8px; background: #FEC700; flex-shrink: 0; }

    .tag-head {
      background: #02462E; color: #fff; padding: 12px 16px;
      display: flex; align-items: center; gap: 12px; flex-shrink: 0;
    }
    .tag-logo { height: 34px; width: auto; flex-shrink: 0; }
    .tag-evt-name {
      font-family:'Syne',sans-serif; font-weight: 800; font-size: 14px;
      line-height: 1.1; letter-spacing: -0.3px;
    }
    .tag-evt-ed {
      font-size: 10px; font-weight: 700; color: #FEC700;
      letter-spacing: 0.15em; margin-top: 2px;
    }

    .tag-mid {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 6px;
      padding: 14px;
    }
    .tag-qr {
      width: 150px; height: 150px; padding: 8px;
      border: 2px solid #02462E22; border-radius: 8px; background: #fff;
      display: flex; align-items: center; justify-content: center;
    }
    .tag-qr svg { width: 100%; height: 100%; }
    .qr-fallback {
      width: 100%; height: 100%; border: 2px dashed #ccc; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 12px; color: #999; font-family: monospace;
    }
    .tag-num-label {
      font-size: 9px; font-weight: 700; letter-spacing: 0.3em;
      color: #999; text-transform: uppercase; margin-top: 8px;
    }
    .tag-num {
      font-family:'Syne',sans-serif; font-weight: 800; font-size: 30px;
      color: #02462E; letter-spacing: 1px; line-height: 1;
    }
    .tag-scan { font-size: 9px; color: #aaa; margin-top: 2px; }

    .tag-foot {
      background: #FBF6E6; color: #02462E; text-align: center;
      font-size: 9px; font-weight: 600; padding: 6px; letter-spacing: 0.05em;
      flex-shrink: 0; border-top: 1px solid #02462E15;
    }

    @media print {
      .toolbar { display: none; }
      body { background: #fff; }
      .page { margin: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>${event.title} ${event.edition} — Event Tags</h1>
    <span class="count">${tags.length} tag${tags.length>1?'s':''} · 4 per A4 page</span>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>

  ${pages.map(pageTags => `
    <div class="page">
      ${pageTags.map(t => `<div class="cell">${tagCard(t)}</div>`).join('')}
      ${Array(4 - pageTags.length).fill('<div class="cell"></div>').join('')}
    </div>`).join('')}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);

    // Mark as printed (best-effort)
    const printedIds = tags.map(t => t.id);
    if (printedIds.length) {
      query(`UPDATE event_tags SET is_printed = 1 WHERE id IN (${printedIds.join(',')})`).catch(() => {});
    }
  } catch (e) { next(e); }
};
