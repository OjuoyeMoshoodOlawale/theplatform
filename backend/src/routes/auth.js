import express from 'express';
import { login, getMe, createAdmin, listAdmins, updateAdmin, changePassword } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, rules } from '../middleware/validate.js';
import { query } from '../database/db.js';
import { success } from '../utils/response.js';

const router = express.Router();

router.post('/login',          validate(rules.login), login);
router.get('/me',              authenticate, getMe);
router.post('/admins',         authenticate, authorize('super_admin'), validate(rules.createAdmin), createAdmin);
router.get('/admins',          authenticate, authorize('super_admin'), listAdmins);
router.put('/admins/:id',      authenticate, authorize('super_admin'), updateAdmin);
router.delete('/admins/:id',   authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    // Prevent deleting yourself
    if (parseInt(id) === req.admin.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
    }
    const { query } = await import('../database/db.js');
    const [result] = await query('DELETE FROM admins WHERE id = ?', [id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: 'Admin not found.' });
    res.json({ success: true, message: 'Admin removed.' });
  } catch (e) { next(e); }
});
router.patch('/admins/:id/status', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const { is_active } = req.body;
    await query('UPDATE admins SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id]);
    success(res, null, `Admin ${is_active ? 'activated' : 'deactivated'}.`);
  } catch (e) { next(e); }
});
router.put('/change-password', authenticate, changePassword);

export default router;
