# theplatform
# 🕌 Muslim Youth Summit (MYS) Platform

A full-stack event management platform for the Muslim Youth Summit — an annual Islamic youth programme focused on reformation, career development, and community building.

---

## Tech Stack
| Layer | Tech |
|---|---|
| Frontend | Vue 3 + Vite + Tailwind CSS |
| Backend | Node.js + Express.js |
| Database | MySQL 8 |
| Payments | Paystack |
| Auth | JWT (8h expiry) |
| Emails | Nodemailer SMTP |

---

## Brand
| Color | Hex | Use |
|---|---|---|
| Deep Green | `#02462E` | Primary, backgrounds |
| Gold | `#FEC700` | CTAs, accents |
| Light Green | `#6BBC01` | Secondary |
| Cream | `#FBF6E6` | Backgrounds, cards |

---

## Quick Start

### 1. Database Setup

```bash
mysql -u root -p
```

```sql
SOURCE backend/src/database/schema.sql;
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set DB_PASS, JWT_SECRET (DB_NAME is already 'theplatform')

# Create the DB and load the schema
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS theplatform"
mysql -u root -p theplatform < src/database/schema.sql

npm run setup:tenant         # tenant layer + platform admin + mys/icp tenants
npm run demo:tenant          # fill each tenant with demo data to showcase
npm run dev
```

**Logins:**
- Platform owner: `owner@theplatform.com` / `Platform@2025!` → `/platform/login`
- MYS admin: `admin@muslimyouthsummit.com` / `MYS@Admin2024!` → `/mys/admin/login`
- ICP admin: `admin@icp.org` / `ICP@Admin2024!` → `/icp/admin/login`

> **Change all default passwords before production.**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`
API runs at `http://localhost:5000`

---

## Project Structure

```
mys-platform/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Business logic
│   │   ├── database/
│   │   │   ├── schema.sql   # Full DB schema
│   │   │   ├── seed.js      # Super admin seed
│   │   │   └── db.js        # MySQL pool
│   │   ├── middleware/      # auth.js, errorHandler.js
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Paystack, email, QR
│   │   ├── utils/           # helpers, response
│   │   └── index.js         # App entry
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── public/logos/        # MYS logo files
    ├── src/
    │   ├── assets/main.css  # Tailwind + custom classes
    │   ├── components/
    │   │   ├── admin/       # AdminSidebar, DataTable, QrScanner…
    │   │   ├── common/      # AppAlert, AppLoader, AppModal
    │   │   └── landing/     # CountdownTimer, SpeakerCard, TicketCard…
    │   ├── composables/
    │   │   └── useApi.js    # Axios instance with JWT
    │   ├── router/index.js
    │   ├── stores/          # authStore, alertStore, eventStore
    │   ├── views/
    │   │   ├── admin/       # All admin pages
    │   │   ├── Landing.vue
    │   │   ├── RegisterTicket.vue
    │   │   ├── TicketView.vue
    │   │   ├── CheckIn.vue
    │   │   └── PastEvents.vue
    │   ├── App.vue
    │   └── main.js
    └── package.json
```

---

## Admin Roles

| Role | Capabilities |
|---|---|
| `super_admin` | Full access: events, admins, email campaigns, reports |
| `admin` | Events, gallery, participants, tags, attendance |
| `attendant` | Check-in / check-out only |

---

## Event Lifecycle

```
draft → active → completed → archived
         ↑
    (landing page shows this)
```
- Only **1 event** can be `active` at a time
- Activating a new event auto-completes the previous one

---

## Ticket Flow

1. Visitor selects ticket type on landing page
2. Fills registration form → POST `/api/tickets/initiate`
3. Redirected to Paystack payment
4. Paystack webhook → POST `/api/tickets/webhook` → marks ticket `paid`, sends email with QR
5. Visitor can view ticket at `/ticket/:reference`

---

## Attendance Flow

1. Attendant opens `/check-in` (mobile-friendly)
2. Scans ticket QR code → fetches participant info
3. Scans physical tag barcode → POST `/api/attendance/checkin` (assigns tag + checks in)
4. On exit: POST `/api/attendance/checkout`

---

## Paystack Setup

1. Go to [dashboard.paystack.com](https://dashboard.paystack.com)
2. Settings → API Keys → copy secret + public keys
3. Settings → Webhooks → set URL to `https://yourdomain.com/api/tickets/webhook`
4. Copy webhook secret to `PAYSTACK_WEBHOOK_SECRET`
5. Set `PAYMENT_CALLBACK_URL` to `https://yourdomain.com/ticket`

---

## Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use strong `JWT_SECRET` (64+ chars)
- [ ] Configure real SMTP credentials
- [ ] Set up Cloudinary for gallery image hosting
- [ ] Point Paystack webhook to production URL
- [ ] Change default super admin password
- [ ] Run `npm run build` in frontend, serve dist/ via nginx
- [ ] Set up SSL certificate

---

## Frontend Dependencies
```
vue, vue-router, pinia, axios, tailwindcss, vite,
html5-qrcode, v-viewer
```

## Backend Dependencies
```
express, mysql2, bcryptjs, jsonwebtoken, dotenv,
nodemailer, qrcode, multer, cors, helmet, morgan,
express-rate-limit, axios
```
