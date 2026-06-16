import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

import { validateEnv } from './utils/validateEnv.js';
if (process.env.NODE_ENV !== 'test') validateEnv();

import authRoutes        from './routes/auth.js';
import eventRoutes       from './routes/events.js';
import ticketRoutes      from './routes/tickets.js';
import attendanceRoutes  from './routes/attendance.js';
import tagRoutes         from './routes/tags.js';
import galleryRoutes     from './routes/gallery.js';
import emailRoutes       from './routes/email.js';
import participantRoutes from './routes/participants.js';
import scheduleRoutes    from './routes/schedule.js';
import categoryRoutes    from './routes/categories.js';
import reportsRoutes     from './routes/reports.js';
import hostelRoutes      from './routes/hostels.js';
import ticketTypeRoutes  from './routes/ticketTypes.js';
import expenseRoutes     from './routes/expenses.js';
import souvenirRoutes    from './routes/souvenirs.js';
import sponsorRoutes     from './routes/sponsors.js';
import smsRoutes         from './routes/sms.js';
import testRoutes        from './routes/test.js';
import tagPrintRoutes    from './routes/tagPrint.js';
import tenantRoutes      from './routes/tenant.js';
import { resolveTenantOptional } from './middleware/tenant.js';
import platformRoutes    from './routes/platform.js';
import { cloneEvent }    from './controllers/cloneController.js';
import { authenticate, authorize } from './middleware/auth.js';

import { errorHandler, notFound } from './middleware/errorHandler.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security ───────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─── CORS ───────────────────────────────────────────────────
// Multi-tenant platform: requests can come from localhost (dev), the apex
// domain, www, and any tenant subdomain. A single fixed origin is not enough,
// so we validate against an allow-list (env CSV) plus sensible defaults.
//
// Set CORS_ORIGINS in the backend .env as a comma-separated list, e.g.
//   CORS_ORIGINS=https://themuhsinahacademy.com,https://www.themuhsinahacademy.com
// Localhost dev origins are always permitted.
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const defaultDevOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',   // vite preview
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin(origin, callback) {
    // Allow same-origin / server-to-server / curl (no Origin header).
    if (!origin) return callback(null, true);

    // Always allow localhost dev origins.
    if (defaultDevOrigins.includes(origin)) return callback(null, true);

    // Allow anything explicitly listed in env.
    if (allowedOrigins.includes(origin)) return callback(null, true);

    // Allow the production apex + any of its subdomains (tenant slugs)
    // e.g. https://themuhsinahacademy.com, https://www.themuhsinahacademy.com,
    //      https://mys.themuhsinahacademy.com
    try {
      const host = new URL(origin).hostname;
      if (host === 'themuhsinahacademy.com' || host.endsWith('.themuhsinahacademy.com')) {
        return callback(null, true);
      }
    } catch { /* malformed origin — fall through to reject */ }

    return callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Slug'],
}));

// ─── Rate Limiting ───────────────────────────────────────────
// General limiter — generous, for high-volume event operations (check-in, scans).
// A gate scanning thousands of tickets must not be throttled.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,          // 1 minute window
  max: 300,                     // 300 requests/min per IP (≈5/sec) — plenty for rapid scanning
  standardHeaders: true,
  legacyHeaders: false,
  // Don't count successful reads against the limit as harshly
  skip: (req) => req.method === 'OPTIONS',
  message: { success: false, message: 'Too many requests. Please slow down and try again.' },
});

// Login — strict to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                      // 10 login attempts per 15 min
  standardHeaders: true,
  skipSuccessfulRequests: true, // only count FAILED logins
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
});

// Payment initiation — moderate (a user retrying after closing popup is normal)
const paymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,                      // 30 initiate attempts per 10 min per IP
  standardHeaders: true,
  message: { success: false, message: 'Too many payment attempts. Please wait a moment and try again.' },
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/tickets/initiate', paymentLimiter);

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Logging ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Static Files ────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ─── Health Check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '🕌 MYS Platform API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Routes ─────────────────────────────────────────────────
// Resolve the tenant (from X-Tenant-Slug header) for every API request so
// controllers can scope by req.tenant.id. Optional so platform/auth routes
// without a tenant still work.
app.use('/api', resolveTenantOptional);

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/gallery', galleryRoutes);
app.use('/api/email', emailRoutes);
app.use('/api', participantRoutes);
app.use('/api', scheduleRoutes);
app.use('/api', categoryRoutes);
app.use('/api', reportsRoutes);
app.use('/api', hostelRoutes);
app.use('/api', ticketTypeRoutes);
app.use('/api', expenseRoutes);
app.use('/api', souvenirRoutes);
app.use('/api', sponsorRoutes);
app.use('/api', smsRoutes);
app.use('/api', testRoutes);
app.use('/api', tagPrintRoutes);
app.use('/api', tenantRoutes);
app.use('/api', platformRoutes);
app.post('/api/events/clone', authenticate, authorize('super_admin','admin'), cloneEvent);

// Facilitator reminders
import { sendFacilitatorReminders } from './controllers/scheduleController.js';
app.post('/api/events/:eventId/schedule/remind',
  authenticate, authorize('super_admin','admin'), sendFacilitatorReminders);

// ─── Error Handling ──────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🕌  MYS Platform API`);
  console.log(`    Running on: http://localhost:${PORT}`);
  console.log(`    Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

export default app;
