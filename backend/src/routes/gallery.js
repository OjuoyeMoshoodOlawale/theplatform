import express from 'express';
import multer from 'multer';
import path from 'path';
import { authenticate, authorize } from '../middleware/auth.js';
import { query } from '../database/db.js';
import { success, created, error } from '../utils/response.js';

const router = express.Router();
const upload = multer({
  dest: 'uploads/gallery/',
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  }
});

router.get('/:eventId', async (req, res, next) => {
  try {
    const [rows] = await query(
      'SELECT id, image_url, thumbnail_url, caption, sort_order FROM event_gallery WHERE event_id = ? ORDER BY sort_order, uploaded_at',
      [req.params.eventId]
    );
    success(res, rows);
  } catch (err) { next(err); }
});

router.post('/:eventId', authenticate, authorize('super_admin', 'admin'), upload.array('images', 30), async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { captions = [] } = req.body;
    const files = req.files || [];
    if (!files.length) return error(res, 'No images uploaded.');
    for (let i = 0; i < files.length; i++) {
      const imageUrl = `/uploads/gallery/${files[i].filename}`;
      const caption = Array.isArray(captions) ? captions[i] : captions;
      await query(
        'INSERT INTO event_gallery (event_id, image_url, caption, sort_order, uploaded_by) VALUES (?, ?, ?, ?, ?)',
        [eventId, imageUrl, caption || null, i, req.admin.id]
      );
    }
    created(res, null, `${files.length} image(s) uploaded successfully.`);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    await query('DELETE FROM event_gallery WHERE id = ?', [req.params.id]);
    success(res, null, 'Image deleted.');
  } catch (err) { next(err); }
});

router.put('/reorder', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { order } = req.body; // [{id, sort_order}]
    for (const item of order) {
      await query('UPDATE event_gallery SET sort_order = ? WHERE id = ?', [item.sort_order, item.id]);
    }
    success(res, null, 'Gallery order saved.');
  } catch (err) { next(err); }
});

export default router;
