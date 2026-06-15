# MYS Platform — Design & Feature Map

> **Muslim Youth Summit Event Management System**  
> Stack: Vue 3 + Vite + Tailwind CSS (Frontend) | Express.js + MySQL 8 (Backend)

---

## Quick Navigation

| Feature | Frontend Route | Backend Endpoint |
|---|---|---|
| Landing page | `/` | `GET /api/events/active` |
| Register / Buy Ticket | `/register` | `POST /api/tickets/initiate` |
| View ticket | `/ticket/:ref` | `GET /api/tickets/:uniqueNumber` |
| Check-in gate | `/check-in` | `POST /api/attendance/checkin` |
| Admin login | `/admin/login` | `POST /api/auth/login` |
| Admin dashboard | `/admin/dashboard` | `GET /api/tickets/admin/stats/:id` |
| Event progress | `/admin/event-dashboard` | `GET /api/reports/:id/dashboard` |
| Events CRUD | `/admin/events` | `GET/POST /api/events` |
| Event detail | `/admin/events/:id` | `GET /api/events/:id` |
| **Schedule editor** | `/admin/events/:id/schedule` | `GET/POST /api/events/:id/schedule` |
| **Ticket pricing** | `/admin/events/:id/ticket-types` | `GET/POST /api/events/:id/ticket-types` |
| Categories | `/admin/categories` | `GET/POST /api/categories` |
| Attendance list | `/admin/attendance` | `GET /api/attendance/report/:id` |
| Participants | `/admin/participants` | `GET /api/participants` |
| Manual register | `/admin/register` | `POST /api/tickets/manual` |
| Email campaigns | `/admin/email` | `GET/POST /api/campaigns` |
| Gallery | `/admin/gallery` | `GET/POST /api/gallery/:eventId` |
| Tags | `/admin/tags` | `GET/POST /api/tags` |
| Hostels | `/admin/hostels` | `GET/POST /api/hostels` |
| Departments | `/admin/departments` | `GET/POST /api/departments` |
| Expenses | `/admin/expenses` | `GET/POST /api/expenses` |
| Reports | `/admin/reports` | `GET /api/reports/:id/overview` |
| Admin accounts | `/admin/admins` | `GET/POST /api/auth/admins` |

---

## Check-in Workflow (Gate Operations)

### Attendant Role → `/check-in`
1. **Scan QR code** OR type ticket number manually (e.g. `MYS3-0001`)
2. System shows participant card:
   - Name, email, ticket type, current status
3. **Assign Category** (if not yet assigned) — select from global categories
4. **Assign Hostel** (if event uses hostels) — filtered by gender, shows remaining beds
5. **Check In** button → creates attendance record + assigns tag
6. On participant **leaving** → scan again → "Check Out" button

### Admin Role → `/admin/participants`
- Search participant → "Check In" action button opens modal
- Assign tag number, validate it's not already used
- Assign hostel (optional)
- Confirm → creates attendance record

---

## Ticket Types & Pricing

### Creating Ticket Types
Go to: **Admin → Events → [Event] → "Manage Pricing →"**  
(or `/admin/events/:id/ticket-types`)

Supported categories:
- `all` — All Participants
- `undergraduate` — Undergraduate Students (100–400 level)
- `graduate` — Graduate / Postgraduate
- `professional` — Working professionals / alumni
- `other` — Other

Early bird pricing activates automatically until `events.early_bird_closes_at`.

### Registration Form Behaviour
- Ticket types grouped by `participant_category`
- Early bird badge + strikethrough shown when active
- Categories are **NOT** assigned by participants — assigned by admin at check-in

---

## Schedule / Programme Management

### Where to Add Lectures
Go to: **Admin → Events → [Event] → "Full Schedule →"**  
(or `/admin/events/:id/schedule`)

Fields per session:
- **S/N** — display sequence number
- **Day** — event day (Day 1, Day 2, etc.)
- **Start / End Time**
- **Title** — lecture/session title
- **Type** — lecture | keynote | panel | workshop | prayer | break | other
- **Lecturer / Main Speaker** — denormalised name for quick display
- **Facilitators** — comma-separated names (used for email reminders)
- **Description** — optional details

### Email Facilitators
Button on schedule page → sends reminder emails to all named facilitators  
(system matches facilitator names against participant emails in DB)

---

## Expense Request Workflow

| Step | Who | Action |
|---|---|---|
| 1 | Department Staff | Login → `/admin/expenses` → "Raise Request" |
| 2 | System | Emails all super admins immediately |
| 3 | Admin | Review → Approve (with custom amount) or Reject (with note) |
| 4 | Admin | After purchase → "Mark Paid" (records amount + reference) |

Rules:
- No payment until approved
- Department staff see only their department's requests
- Rejected requests can be resubmitted

---

## Admin Roles

| Role | Access |
|---|---|
| `super_admin` | Everything |
| `admin` | Events, participants, schedule, expenses approval |
| `attendant` | Check-in page only |
| `department` | Expenses (own department only) → `/admin/expenses` |

Department staff login redirects automatically to expenses page.

---

## Database Key Relationships

```
events ──────┬── event_days
             ├── ticket_types (participant_category: undergrad/grad/prof/all)
             ├── speakers
             ├── lectures (schedule) 
             ├── tickets ──── participants
             │              └── event_categories (assigned at check-in)
             ├── attendance ── event_tags
             ├── hostel_assignments ── hostels (global)
             ├── event_gallery
             ├── email_campaigns
             └── expense_requests ── departments ── admins

event_categories — GLOBAL (no event_id, reused every year)
hostels          — GLOBAL (no event_id, reused every year)
departments      — GLOBAL (permanent)
```

---

## Global Resources (Permanent, Reused Each Year)

| Resource | Managed At | Notes |
|---|---|---|
| **Categories** | `/admin/categories` | Youth, Graduate, Brothers, Sisters etc. |
| **Hostels** | `/admin/hostels` | Khadijah Hall, Umar Block, VIP Annex |
| **Departments** | `/admin/departments` | Kitchen, Gate, AV, Transport |

---

## Tags (Event Wristbands / Entry Cards)

Tags are physical entry cards assigned at the gate.

### Assigning Tags
1. **At check-in gate** (`/check-in`) — enter tag number when checking in participant
2. **From participants list** (`/admin/participants`) — "Check In" action → modal to assign tag

Tag numbers format: `TAG-001`, `TAG-002`, etc.  
Tags are per-event — same tag number can be reused across different events.

---

## Event Creation Checklist

1. **Create Event** → `/admin/events/new`
   - Title, edition (e.g. MYS4), tagline, description, venue, dates, early bird close date
2. **Add Event Days** → Event Detail → (auto-populated from dates)
3. **Add Ticket Types** → Event Detail → "Manage Pricing →"
   - One type per participant category with regular + early bird prices
4. **Add Speakers** → Event Detail → Speakers tab
5. **Build Schedule** → Event Detail → "Full Schedule →"
6. **Add Gallery** → `/admin/gallery` (after event, upload photos)
7. **Activate Event** → Event Detail → "Activate" button

---

## Payment Flow (Paystack)

```
User selects ticket → POST /api/tickets/initiate
→ Paystack payment link generated
→ User pays on Paystack
→ Paystack webhook → POST /api/tickets/webhook
→ Ticket status updated to 'paid'
→ QR code generated
→ Confirmation email sent
```

Security: webhook verifies Paystack signature (HMAC-SHA512).  
Manual payments (cash/transfer) → `/admin/register` (admin enters directly).

---

## Pending / Future Features

- [ ] Certificate generation (PDF per participant after event)
- [ ] Google Drive image backup for event gallery
- [ ] YouTube video link tracking per session
- [ ] SMS check-in confirmation (Termii/BulkSMS Nigeria)
- [ ] Participant portal (view own ticket history)
- [ ] WhatsApp integration for reminders

---

## Setup

```bash
# 1. Database
mysql -u root -p
DROP DATABASE IF EXISTS mys_platform;
SOURCE backend/src/database/schema.sql;

# 2. Backend
cd backend && npm install
cp .env.example .env   # edit with your DB/Paystack/SMTP credentials
node src/database/seed.js    # super admin
npm run demo                 # full demo data

# 3. Frontend
cd frontend && npm install

# 4. Run
Terminal 1: cd backend && npm run dev
Terminal 2: cd frontend && npm run dev

# Access
Frontend:     http://localhost:5173
Admin login:  http://localhost:5173/admin/login
API health:   http://localhost:5000/api/health
```

---

*Last updated: June 2026 — MYS Platform v2*
