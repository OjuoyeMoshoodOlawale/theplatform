/**
 * validate.js — Lightweight validation middleware
 * Usage: validate(rules)(req, res, next)
 */
import { validationError } from '../utils/response.js';

/**
 * Build a validator middleware from a rules map
 * rules: { fieldName: [validators...] }
 * Each validator: { check: (value) => bool, message: string }
 */
export const validate = (rules) => (req, res, next) => {
  const body   = { ...req.body, ...req.params, ...req.query };
  const errors = {};

  for (const [field, validators] of Object.entries(rules)) {
    const value = body[field];
    for (const v of validators) {
      if (!v.check(value)) {
        errors[field] = v.message;
        break; // first failing rule per field
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return validationError(res, errors);
  }
  next();
};

/* ─── Common validators ─────────────────────────────────────── */
export const V = {
  required:  (msg = 'This field is required.')            => ({ check: v => v !== undefined && v !== null && String(v).trim() !== '', message: msg }),
  minLen:    (n, msg)                                     => ({ check: v => !v || String(v).trim().length >= n, message: msg || `Minimum ${n} characters.` }),
  maxLen:    (n, msg)                                     => ({ check: v => !v || String(v).trim().length <= n, message: msg || `Maximum ${n} characters.` }),
  email:     (msg = 'Enter a valid email address.')       => ({ check: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), message: msg }),
  oneOf:     (values, msg)                                => ({ check: v => !v || values.includes(v), message: msg || `Must be one of: ${values.join(', ')}.` }),
  number:    (msg = 'Must be a number.')                  => ({ check: v => v === undefined || v === '' || !isNaN(Number(v)), message: msg }),
  positive:  (msg = 'Must be a positive number.')         => ({ check: v => !v || Number(v) > 0, message: msg }),
  minVal:    (n, msg)                                     => ({ check: v => !v || Number(v) >= n, message: msg || `Minimum value is ${n}.` }),
  maxVal:    (n, msg)                                     => ({ check: v => !v || Number(v) <= n, message: msg || `Maximum value is ${n}.` }),
  date:      (msg = 'Enter a valid date (YYYY-MM-DD).')   => ({ check: v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v), message: msg }),
};

/* ─── Preset rule sets ──────────────────────────────────────── */
export const rules = {
  login: {
    email:    [V.required(), V.email()],
    password: [V.required(), V.minLen(1, 'Password is required.')],
  },

  createEvent: {
    title:      [V.required(), V.minLen(3), V.maxLen(200)],
    edition:    [V.required(), V.minLen(2), V.maxLen(20)],
    start_date: [V.required(), V.date()],
    end_date:   [V.required(), V.date()],
  },

  createScheduleEntry: {
    title: [V.required(), V.minLen(2, 'Lecture title must be at least 2 characters.')],
  },

  createCategory: {
    name: [V.required(), V.minLen(2), V.maxLen(120)],
  },

  ticketInitiate: {
    event_id:        [V.required()],
    ticket_type_id:  [V.required()],
    name:            [V.required(), V.minLen(2, 'Full name required.')],
    email:           [V.required(), V.email()],
    phone:           [V.required(), V.minLen(7, 'Enter a valid phone number.')],
  },

  createAdmin: {
    name:     [V.required()],
    email:    [V.required(), V.email()],
    password: [V.required(), V.minLen(8, 'Password must be at least 8 characters.')],
    role:     [V.oneOf(['super_admin','admin','attendant'])],
  },

  generateTags: {
    count: [V.required(), V.number(), V.minVal(1), V.maxVal(2000)],
  },
};
