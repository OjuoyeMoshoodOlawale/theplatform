# Muslim Youth Summit (MYS) Platform — Design & Architecture Document

> **Version:** 1.0.0 | **Edition:** MYS 3.0 | **Status:** Active Development

---

## 1. Project Overview

The MYS Platform is a full-stack web application powering the Muslim Youth Summit — an annual Islamic youth programme focused on youth reformation, career development, and community networking. The platform covers the complete event lifecycle: from public-facing registration and ticketing, through live attendance management, to post-event alumni tracking and gallery archiving.

### 1.1 Core Goals
- Provide a stunning, brand-aligned public landing page for each event edition
- Enable secure, multi-admin event creation and management
- Support Paystack-powered ticket sales (Regular + Early Bird pricing)
- Generate unique QR-coded tickets and physical event tags for attendance
- Track participant entry and exit with physical tag assignment
- Build a persistent alumni database for future event outreach via email
- Archive past event history and galleries

### 1.2 User Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full platform control: admins, events, settings |
| `admin` | Event management, gallery, email campaigns |
| `attendant` | Check-in scanner only (entry point staff) |
| `public` | Landing page, ticket purchase, ticket view |

---

## 2. Brand Identity

### 2.1 Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Deep Green | `#02462E` | Primary brand, hero bg, sidebar, headings |
| Gold | `#FEC700` | Primary accent, CTAs, highlights, badges |
| Light Green | `#6BBC01` | Secondary accents, success states, tags |
| Cream | `#FBF6E6` | Light section backgrounds, card fills |
| Black | `#0A0A0A` | Text, dark overlays |
| White | `#FFFFFF` | Inverse text, light surfaces |

### 2.2 Typography
- **Display (headings):** Syne — bold, geometric, modern
- **Body:** DM Sans — clean, readable, professional
- **Mono (codes/tags):** JetBrains Mono — for ticket numbers, QR data

### 2.3 Logo Usage
- Dark bg → White SVG logo (`MYS_Logo_WHite_SVG.svg`)
- Light bg → Black PNG logo (`MYS_Logo_PNG_Black.png`)
- Maintain clear space equal to the height of the "M" letterform
- Never distort, recolor, or place on busy backgrounds without overlay

### 2.4 Visual Language
- Geometric pixel-block motif (as seen in logo) repeated as decorative elements
- Islamic geometric pattern overlays (low opacity) for texture
- Strong typographic hierarchy — oversized display text is a hallmark
- Golden rule: gold (#FEC700) always draws the eye to the most important action

---

## 3. Technology Stack

### 3.1 Backend
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 20+ (ES Modules) | Modern JS, great ecosystem |
| Framework | Express.js 4.x | Lightweight, flexible, battle-tested |
| Database | MySQL 8.0 | Relational integrity, ACID transactions |
| ORM/Query | mysql2 (raw SQL) | Performance, full SQL control |
| Auth | JWT (httpOnly cookie) | Stateless, secure |
| Password | bcrypt (12 rounds) | Industry standard hashing |
| QR Codes | `qrcode` npm package | SVG/PNG generation |
| Email | Nodemailer + SMTP | Transactional email |
| Payments | Paystack | Nigerian payment gateway |
| File Upload | Multer + Cloudinary | Images (events, gallery, speakers) |
| Validation | express-validator | Input sanitisation |
| Security | helmet, cors, rate-limit | Defence in depth |

### 3.2 Frontend
| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Vue.js 3 (Composition API) | Reactive, component-based |
| Build | Vite 5 | Fast HMR, modern bundling |
| State | Pinia | Official Vue state manager |
| Routing | Vue Router 4 | SPA navigation, guards |
| Styling | Tailwind CSS 3 | Utility-first, responsive |
| HTTP | Axios | Consistent API calls |
| QR Scanner | html5-qrcode | Camera-based QR scanning |
| Forms | @vuelidate/core | Reactive validation |
| Dates | date-fns | Lightweight date utils |
| Images | v-viewer | Lightbox gallery viewer |

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER (Vue.js SPA)                    │
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────────┐ │
│  │  Landing Page│  │  Admin Dashboard │  │  Check-in Scanner │ │
│  └──────────────┘  └──────────────────┘  └───────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTPS / REST API
┌──────────────────────────────▼──────────────────────────────────┐
│                      EXPRESS.JS API SERVER                       │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐ │
│  │   Auth    │ │  Events  │ │ Tickets  │ │    Attendance     │ │
│  │  Routes   │ │  Routes  │ │  Routes  │ │      Routes       │ │
│  └───────────┘ └──────────┘ └──────────┘ └───────────────────┘ │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐ │
│  │  Gallery  │ │  Email   │ │Participants│ │      Tags         │ │
│  │  Routes   │ │  Routes  │ │  Routes  │ │      Routes       │ │
│  └───────────┘ └──────────┘ └──────────┘ └───────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │         Services: Paystack | Email | QRCode | Cloudinary   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
┌──────────────┐     ┌──────────────────┐    ┌──────────────┐
│  MySQL 8.0   │     │   Cloudinary CDN │    │   Paystack   │
│  (Primary DB)│     │  (Image Storage) │    │  (Payments)  │
└──────────────┘     └──────────────────┘    └──────────────┘
                               │
                    ┌──────────────────┐
                    │  SMTP Server     │
                    │  (Email sending) │
                    └──────────────────┘
```

---

## 5. Database Schema

### 5.1 Entity Relationship Overview

```
admins ──────────────────────┐
  │                          │
  │ created_by               │ assigned/sent_by
events ─────────────────┐   │
  │                     │   ▼
  ├── event_days         │  attendance ◄──── tickets ◄─── participants
  ├── lectures           │       │              │
  ├── speakers           │  event_tags ─────────┘
  ├── ticket_types       │
  ├── event_gallery      │
  └── email_campaigns    │
                         └── email_logs
```

### 5.2 Full SQL Schema

```sql
-- ============================================================
-- MYS PLATFORM DATABASE SCHEMA
-- MySQL 8.0 | Character Set: utf8mb4
-- ============================================================

CREATE DATABASE IF NOT EXISTS mys_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mys_platform;

-- -----------------------------------------------------------
-- ADMINS
-- -----------------------------------------------------------
CREATE TABLE admins (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('super_admin','admin','attendant') DEFAULT 'admin',
  avatar       VARCHAR(500),
  is_active    BOOLEAN DEFAULT TRUE,
  last_login   TIMESTAMP NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- EVENTS
-- -----------------------------------------------------------
CREATE TABLE events (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title            VARCHAR(255) NOT NULL,
  subtitle         VARCHAR(255),
  edition          VARCHAR(50),           -- e.g., "3.0", "MYS3"
  description      TEXT,
  theme            VARCHAR(255),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  is_multi_day     BOOLEAN DEFAULT FALSE,
  venue            VARCHAR(255),
  venue_address    TEXT,
  venue_maps_url   VARCHAR(500),
  status           ENUM('draft','active','completed','cancelled') DEFAULT 'draft',
  registration_open BOOLEAN DEFAULT TRUE,
  max_capacity     INT UNSIGNED,
  banner_image     VARCHAR(500),
  og_image         VARCHAR(500),
  created_by       INT UNSIGNED,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_start_date (start_date)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- EVENT DAYS (for multi-day events)
-- -----------------------------------------------------------
CREATE TABLE event_days (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id     INT UNSIGNED NOT NULL,
  day_number   TINYINT UNSIGNED NOT NULL,   -- 1, 2, 3...
  date         DATE NOT NULL,
  theme        VARCHAR(255),
  description  TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY unique_event_day (event_id, day_number)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- SPEAKERS / INVITED GUESTS
-- -----------------------------------------------------------
CREATE TABLE speakers (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id     INT UNSIGNED NOT NULL,
  name         VARCHAR(255) NOT NULL,
  title        VARCHAR(255),
  organization VARCHAR(255),
  bio          TEXT,
  photo        VARCHAR(500),
  social_link  VARCHAR(500),
  sort_order   TINYINT UNSIGNED DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- LECTURE SERIES
-- -----------------------------------------------------------
CREATE TABLE lectures (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id     INT UNSIGNED NOT NULL,
  day_id       INT UNSIGNED,               -- NULL = applies to all days
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  start_time   TIME,
  end_time     TIME,
  location     VARCHAR(255),               -- e.g. "Main Hall", "Room A"
  sort_order   TINYINT UNSIGNED DEFAULT 0,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (day_id) REFERENCES event_days(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- LECTURE ↔ SPEAKER (many-to-many)
-- -----------------------------------------------------------
CREATE TABLE lecture_speakers (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lecture_id   INT UNSIGNED NOT NULL,
  speaker_id   INT UNSIGNED NOT NULL,
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
  FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE CASCADE,
  UNIQUE KEY unique_lecture_speaker (lecture_id, speaker_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- TICKET TYPES
-- -----------------------------------------------------------
CREATE TABLE ticket_types (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id             INT UNSIGNED NOT NULL,
  name                 VARCHAR(100) NOT NULL,      -- e.g., "Regular", "VIP"
  description          TEXT,
  price                DECIMAL(10,2) NOT NULL,
  early_bird_price     DECIMAL(10,2),
  early_bird_closes_at TIMESTAMP NULL,
  total_slots          INT UNSIGNED,               -- NULL = unlimited
  sold_count           INT UNSIGNED DEFAULT 0,
  is_active            BOOLEAN DEFAULT TRUE,
  sort_order           TINYINT UNSIGNED DEFAULT 0,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- PARTICIPANTS (alumni-style persistent registry)
-- -----------------------------------------------------------
CREATE TABLE participants (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  phone             VARCHAR(20),
  gender            ENUM('male','female','prefer_not') DEFAULT 'prefer_not',
  state_of_origin   VARCHAR(100),
  occupation        VARCHAR(255),
  organisation      VARCHAR(255),
  how_heard         VARCHAR(255),
  email_subscribed  BOOLEAN DEFAULT TRUE,
  total_events      TINYINT UNSIGNED DEFAULT 0,   -- denormalized counter
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_subscribed (email_subscribed)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- TICKETS (individual purchase record)
-- -----------------------------------------------------------
CREATE TABLE tickets (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  participant_id       INT UNSIGNED NOT NULL,
  event_id             INT UNSIGNED NOT NULL,
  ticket_type_id       INT UNSIGNED NOT NULL,
  unique_number        VARCHAR(50) UNIQUE NOT NULL,   -- MYS3-0001
  qr_code_svg          MEDIUMTEXT,                    -- inline SVG
  qr_code_data         VARCHAR(200),                  -- encoded value
  paystack_reference   VARCHAR(255) UNIQUE,
  amount_paid          DECIMAL(10,2),
  currency             VARCHAR(5) DEFAULT 'NGN',
  status               ENUM('pending','paid','cancelled','refunded') DEFAULT 'pending',
  purchased_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at          TIMESTAMP NULL,
  email_sent           BOOLEAN DEFAULT FALSE,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id),
  INDEX idx_unique_number (unique_number),
  INDEX idx_paystack_ref (paystack_reference),
  INDEX idx_event_status (event_id, status)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- EVENT TAGS (physical printed cards with QR)
-- -----------------------------------------------------------
CREATE TABLE event_tags (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id         INT UNSIGNED NOT NULL,
  tag_number       VARCHAR(50) UNIQUE NOT NULL,   -- TAG-001
  qr_code_svg      MEDIUMTEXT,
  qr_code_data     VARCHAR(200),
  ticket_id        INT UNSIGNED,                  -- set when assigned
  participant_id   INT UNSIGNED,                  -- set when assigned
  assigned_at      TIMESTAMP NULL,
  assigned_by      INT UNSIGNED,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE SET NULL,
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (assigned_by) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_tag_number (tag_number),
  INDEX idx_event_id (event_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- ATTENDANCE TRACKING
-- -----------------------------------------------------------
CREATE TABLE attendance (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ticket_id        INT UNSIGNED NOT NULL,
  event_id         INT UNSIGNED NOT NULL,
  day_id           INT UNSIGNED,               -- for multi-day tracking
  tag_id           INT UNSIGNED,               -- physical tag assigned
  checked_in_at    TIMESTAMP NULL,
  checked_out_at   TIMESTAMP NULL,
  check_in_by      INT UNSIGNED,               -- admin/attendant
  check_out_by     INT UNSIGNED,
  notes            TEXT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id),
  FOREIGN KEY (event_id) REFERENCES events(id),
  FOREIGN KEY (day_id) REFERENCES event_days(id) ON DELETE SET NULL,
  FOREIGN KEY (tag_id) REFERENCES event_tags(id) ON DELETE SET NULL,
  FOREIGN KEY (check_in_by) REFERENCES admins(id) ON DELETE SET NULL,
  FOREIGN KEY (check_out_by) REFERENCES admins(id) ON DELETE SET NULL,
  UNIQUE KEY unique_ticket_day (ticket_id, day_id),
  INDEX idx_event_checkin (event_id, checked_in_at)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- EVENT GALLERY
-- -----------------------------------------------------------
CREATE TABLE event_gallery (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id      INT UNSIGNED NOT NULL,
  image_url     VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption       TEXT,
  sort_order    SMALLINT UNSIGNED DEFAULT 0,
  uploaded_by   INT UNSIGNED,
  uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL,
  INDEX idx_event_sort (event_id, sort_order)
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- EMAIL CAMPAIGNS
-- -----------------------------------------------------------
CREATE TABLE email_campaigns (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id        INT UNSIGNED,               -- promotional event (optional)
  subject         VARCHAR(255) NOT NULL,
  body_html       LONGTEXT NOT NULL,
  body_text       TEXT,
  recipient_type  ENUM('all','past_attendees','registered','custom') DEFAULT 'all',
  custom_emails   TEXT,                       -- JSON array for custom
  recipient_count INT UNSIGNED DEFAULT 0,
  sent_count      INT UNSIGNED DEFAULT 0,
  failed_count    INT UNSIGNED DEFAULT 0,
  status          ENUM('draft','sending','sent','failed') DEFAULT 'draft',
  sent_at         TIMESTAMP NULL,
  created_by      INT UNSIGNED,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------
-- EMAIL LOGS
-- -----------------------------------------------------------
CREATE TABLE email_logs (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id     INT UNSIGNED NOT NULL,
  participant_id  INT UNSIGNED,
  email           VARCHAR(255) NOT NULL,
  status          ENUM('sent','failed','bounced') DEFAULT 'sent',
  error_message   TEXT,
  sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  INDEX idx_campaign (campaign_id),
  INDEX idx_status (status)
) ENGINE=InnoDB;
```

---

## 6. API Specification

### 6.1 Base URL
- Development: `http://localhost:5000/api`
- Production: `https://api.mys-summit.org/api`

### 6.2 Authentication
All admin routes require: `Authorization: Bearer <JWT_TOKEN>`

Token payload: `{ id, email, role, iat, exp }`

### 6.3 Response Format

```json
// Success
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}

// Error
{
  "success": false,
  "message": "Human-readable error message",
  "errors": [ { "field": "email", "message": "Invalid email" } ]
}

// Paginated
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

### 6.4 Route Map

#### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | — | Admin login |
| POST | `/auth/logout` | ✓ | Logout |
| GET | `/auth/me` | ✓ | Current admin profile |
| POST | `/auth/admins` | super_admin | Create admin |
| GET | `/auth/admins` | super_admin | List all admins |
| PUT | `/auth/admins/:id` | super_admin | Update admin |
| PUT | `/auth/change-password` | ✓ | Change own password |

#### Events (Public)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events` | — | All events (public fields) |
| GET | `/events/active` | — | Current active event |
| GET | `/events/past` | — | Past events with gallery |
| GET | `/events/:id` | — | Single event details |
| GET | `/events/:id/schedule` | — | Full schedule/lectures |
| GET | `/events/:id/speakers` | — | Speakers list |

#### Events (Admin)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/events` | admin | Create event |
| PUT | `/admin/events/:id` | admin | Update event |
| DELETE | `/admin/events/:id` | super_admin | Delete event |
| PUT | `/admin/events/:id/status` | admin | Change status |
| POST | `/admin/events/:id/days` | admin | Add event day |
| PUT | `/admin/events/:id/days/:dayId` | admin | Update day |
| DELETE | `/admin/events/:id/days/:dayId` | admin | Delete day |
| POST | `/admin/events/:id/lectures` | admin | Add lecture |
| PUT | `/admin/events/:id/lectures/:lid` | admin | Update lecture |
| DELETE | `/admin/events/:id/lectures/:lid` | admin | Delete lecture |
| POST | `/admin/events/:id/speakers` | admin | Add speaker |
| PUT | `/admin/events/:id/speakers/:sid` | admin | Update speaker |
| DELETE | `/admin/events/:id/speakers/:sid` | admin | Delete speaker |

#### Tickets
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/events/:id/ticket-types` | — | Available ticket types |
| POST | `/tickets/initiate` | — | Init Paystack payment |
| GET | `/tickets/verify/:reference` | — | Verify + confirm ticket |
| GET | `/tickets/:uniqueNumber` | — | View ticket (for QR landing) |
| POST | `/tickets/webhook` | — | Paystack webhook |
| GET | `/admin/tickets` | admin | All tickets for event |
| GET | `/admin/tickets/stats/:eventId` | admin | Ticket statistics |

#### Attendance
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/attendance/check-in` | attendant | Scan & check in |
| POST | `/attendance/check-out` | attendant | Check out |
| POST | `/attendance/assign-tag` | attendant | Assign physical tag |
| GET | `/admin/attendance/:eventId` | admin | Attendance report |
| GET | `/admin/attendance/live/:eventId` | admin | Live dashboard |

#### Tags
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/tags/generate` | admin | Batch generate tags |
| GET | `/admin/tags/:eventId` | admin | List tags for event |
| PUT | `/admin/tags/:id/assign` | attendant | Assign tag to ticket |
| GET | `/admin/tags/print/:eventId` | admin | Printable tags PDF |

#### Gallery
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/gallery/:eventId` | — | Public gallery |
| POST | `/admin/gallery/:eventId` | admin | Upload images |
| DELETE | `/admin/gallery/:id` | admin | Delete image |
| PUT | `/admin/gallery/reorder` | admin | Reorder images |

#### Email
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/email/campaigns` | admin | List campaigns |
| POST | `/admin/email/campaigns` | admin | Create campaign |
| PUT | `/admin/email/campaigns/:id` | admin | Update campaign |
| POST | `/admin/email/campaigns/:id/send` | admin | Send campaign |
| GET | `/admin/email/campaigns/:id/logs` | admin | Send logs |
| GET | `/admin/participants/export` | admin | Export subscriber CSV |

#### Participants
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/participants` | admin | All participants |
| GET | `/admin/participants/:id` | admin | Participant detail |
| PUT | `/admin/participants/:id` | admin | Update |
| DELETE | `/admin/participants/:id/unsubscribe` | admin | Unsubscribe |

---

## 7. Frontend Architecture

### 7.1 Route Structure

```
/ ─────────────────── Landing.vue              [public]
/past-events ────────── PastEvents.vue          [public]
/register/:eventId ──── RegisterTicket.vue      [public]
/ticket/:uniqueNumber ── TicketView.vue         [public]
/check-in ────────────── CheckIn.vue            [attendant]
/admin ────────────────── AdminLayout.vue       [admin wrapper]
  /admin/login ────────── AdminLogin.vue        [public]
  /admin/dashboard ─────── AdminDashboard.vue   [admin]
  /admin/events ────────── AdminEvents.vue      [admin]
  /admin/events/create ─── CreateEvent.vue      [admin]
  /admin/events/:id ─────── EventDetail.vue     [admin]
  /admin/attendance ─────── AdminAttendance.vue [admin]
  /admin/gallery ───────── AdminGallery.vue     [admin]
  /admin/participants ───── AdminParticipants.vue [admin]
  /admin/email ─────────── AdminEmail.vue       [admin]
  /admin/tags ──────────── AdminTags.vue        [admin]
  /admin/admins ────────── AdminAdmins.vue      [super_admin]
```

### 7.2 Pinia Stores

```
stores/
├── authStore.js      → admin session, login/logout, role checks
├── eventStore.js     → active event, event CRUD, lectures, speakers
├── ticketStore.js    → ticket purchase flow, verification
├── attendanceStore.js → live check-in stats, attendance list
├── galleryStore.js   → gallery management, upload queue
├── participantStore.js → participants list, pagination
├── emailStore.js     → campaigns, send status
└── alertStore.js     → global toast/notification system
```

### 7.3 Global Alert System (Custom)

```
useAlert composable:
  alert.success('Message')     → green toast, auto-dismiss 4s
  alert.error('Message')       → red toast, auto-dismiss 6s
  alert.warning('Message')     → yellow toast, auto-dismiss 5s
  alert.info('Message')        → blue toast, auto-dismiss 4s
  alert.confirm('Message')     → modal with OK/Cancel, returns Promise
```

---

## 8. Event Lifecycle

```
                       ┌───────────────────────────────────┐
                       │            ADMIN PANEL             │
                       └─────────────────┬─────────────────┘
                                         │
                    ① CREATE             ▼
              ┌─────────────────────────────────────────────┐
              │  Draft Event                                 │
              │  - Add title, dates, venue, description      │
              │  - Add event days (if multi-day)             │
              │  - Add lecture series per day                │
              │  - Add invited speakers/guests               │
              │  - Configure ticket types (Regular + EB)     │
              │  - Set early bird close date                 │
              └────────────────────┬────────────────────────┘
                                   │
                    ② ACTIVATE      ▼
              ┌─────────────────────────────────────────────┐
              │  Active Event                                │
              │  - Visible on landing page                   │
              │  - Registration open                         │
              │  - Tickets purchasable                       │
              │  - Early bird auto-expires at deadline        │
              └────────────────────┬────────────────────────┘
                                   │
                    ③ EVENT DAY     ▼
              ┌─────────────────────────────────────────────┐
              │  Live Event                                  │
              │  - Attendance scanning active                │
              │  - Tags being assigned at entry              │
              │  - Real-time attendance dashboard            │
              │  - Exit tracking at end of day               │
              └────────────────────┬────────────────────────┘
                                   │
                    ④ COMPLETE      ▼
              ┌─────────────────────────────────────────────┐
              │  Completed Event (Past)                      │
              │  - Gallery uploaded and published            │
              │  - Attendance stats archived                 │
              │  - Shown in past events section              │
              │  - Participants added to alumni database      │
              │  - Email campaigns enabled for next event    │
              └─────────────────────────────────────────────┘
```

---

## 9. Ticket Purchase Flow

```
[PARTICIPANT] fills registration form
       │
       ▼
[BACKEND] validates input, creates/updates participant record
       │
       ▼
[BACKEND] creates PENDING ticket with unique number (MYS3-0001)
       │
       ▼
[BACKEND] initiates Paystack transaction
       │  → returns authorization_url + reference
       ▼
[FRONTEND] redirects user to Paystack payment page
       │
       ▼
[PAYSTACK] processes payment (card, transfer, USSD, etc.)
       │
       ├── SUCCESS → redirects to /ticket/verify?reference=xxx
       │                │
       │                ▼
       │           [BACKEND] calls Paystack verify endpoint
       │                │
       │                ├── VERIFIED → updates ticket status to 'paid'
       │                │           → generates QR code SVG
       │                │           → sends ticket email to participant
       │                │           → increments sold_count
       │                │           → increments participant total_events
       │                │           → returns ticket data
       │                │
       │                └── FAILED → returns error, ticket stays 'pending'
       │
       └── FAILED/CANCELLED → user sees error, can retry
```

---

## 10. Attendance & Tag Flow

```
[EVENT DAY - ENTRY POINT]

Participant arrives → shows ticket (digital QR or printed)
       │
       ▼
[ATTENDANT] uses Check-in Scanner page (mobile-friendly)
       │
       ├── Camera scans QR code  ─→  extracts unique_number
       │   OR
       └── Types unique_number manually into search field
                     │
                     ▼
           [BACKEND] looks up ticket
                     │
                     ├── NOT FOUND / CANCELLED → ❌ Alert: "Invalid ticket"
                     │
                     ├── ALREADY CHECKED IN   → ⚠️ Alert: "Already checked in at [time]"
                     │
                     └── VALID PAID TICKET    → ✅ Shows participant info
                                                    │
                                                    ▼
                                          [ATTENDANT] confirms → types TAG number
                                          (or scans pre-printed tag's QR)
                                                    │
                                                    ▼
                                          [BACKEND] assigns tag to ticket
                                          • Links tag_id ↔ ticket_id in event_tags
                                          • Creates attendance record (checked_in_at)
                                                    │
                                                    ▼
                                          ✅ "Tag {TAG-001} assigned to {Name}"
                                          Participant enters event

[EVENT DAY - EXIT POINT] (optional)

Scan tag QR at exit →  [BACKEND] updates attendance.checked_out_at
```

---

## 11. Email Campaign Flow

```
Admin selects recipients:
  ○ All subscribers (email_subscribed = true)
  ○ Past attendees (attendance records > 0)
  ○ Registered for specific past event
  ○ Custom list (paste emails)

Admin composes email:
  • Subject line
  • Rich HTML body (with event details template)
  • Preview before send

Admin clicks SEND:
  [BACKEND] fetches recipient list → queues emails in batches of 50
  [NODEMAILER] sends via SMTP (or SendGrid)
  [EMAIL LOGS] records each send (success/failure)
  [CAMPAIGN] status updated to 'sent' with count

Participant receives email with:
  • MYS branding
  • New event details
  • Registration CTA button → links to /register/:eventId
  • Unsubscribe link at footer
```

---

## 12. File & Directory Structure

```
mys-platform/
├── design.md                          ← This document
│
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── .gitignore
│   ├── uploads/                       ← Local dev file storage
│   │   ├── events/
│   │   ├── gallery/
│   │   ├── speakers/
│   │   └── tags/
│   └── src/
│       ├── index.js                   ← Express server entry
│       ├── database/
│       │   ├── schema.sql
│       │   ├── seed.sql               ← Dev seed data
│       │   └── db.js                  ← mysql2 pool
│       ├── middleware/
│       │   ├── auth.js                ← JWT verification
│       │   ├── authorize.js           ← Role-based guard
│       │   ├── errorHandler.js        ← Global error handler
│       │   ├── upload.js              ← Multer config
│       │   └── validate.js            ← express-validator runner
│       ├── routes/
│       │   ├── auth.js
│       │   ├── events.js
│       │   ├── tickets.js
│       │   ├── attendance.js
│       │   ├── tags.js
│       │   ├── gallery.js
│       │   ├── email.js
│       │   └── participants.js
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── eventController.js
│       │   ├── ticketController.js
│       │   ├── attendanceController.js
│       │   ├── tagController.js
│       │   ├── galleryController.js
│       │   ├── emailController.js
│       │   └── participantController.js
│       ├── services/
│       │   ├── paystackService.js     ← Paystack API wrapper
│       │   ├── emailService.js        ← Nodemailer wrapper
│       │   ├── qrcodeService.js       ← QR code generation
│       │   └── cloudinaryService.js   ← Image upload
│       └── utils/
│           ├── response.js            ← Standardised responses
│           ├── helpers.js             ← Ticket ID gen, slugs, etc.
│           └── constants.js
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    ├── public/
    │   ├── mys-logo-white.svg
    │   ├── mys-logo-black.png
    │   └── favicon.ico
    └── src/
        ├── main.js
        ├── App.vue
        ├── router/
        │   └── index.js
        ├── stores/
        │   ├── authStore.js
        │   ├── eventStore.js
        │   ├── attendanceStore.js
        │   ├── galleryStore.js
        │   └── alertStore.js
        ├── composables/
        │   ├── useApi.js
        │   ├── useAlert.js
        │   ├── useAuth.js
        │   └── useCountdown.js
        ├── utils/
        │   ├── formatters.js
        │   └── validators.js
        ├── components/
        │   ├── common/
        │   │   ├── AppAlert.vue       ← Toast notification system
        │   │   ├── AppLoader.vue
        │   │   ├── AppModal.vue
        │   │   └── AppPagination.vue
        │   ├── landing/
        │   │   ├── HeroSection.vue
        │   │   ├── EventStats.vue
        │   │   ├── SpeakerCard.vue
        │   │   ├── ScheduleAccordion.vue
        │   │   ├── TicketCard.vue
        │   │   ├── GalleryMasonry.vue
        │   │   ├── CountdownTimer.vue
        │   │   └── PastEventCard.vue
        │   └── admin/
        │       ├── AdminSidebar.vue
        │       ├── AdminHeader.vue
        │       ├── StatsWidget.vue
        │       ├── DataTable.vue
        │       ├── ImageUploader.vue
        │       └── QrScanner.vue
        └── views/
            ├── Landing.vue
            ├── RegisterTicket.vue
            ├── TicketView.vue
            ├── CheckIn.vue
            ├── PastEvents.vue
            └── admin/
                ├── AdminLayout.vue
                ├── AdminLogin.vue
                ├── AdminDashboard.vue
                ├── AdminEvents.vue
                ├── CreateEvent.vue
                ├── EventDetail.vue
                ├── AdminAttendance.vue
                ├── AdminGallery.vue
                ├── AdminParticipants.vue
                ├── AdminEmail.vue
                ├── AdminTags.vue
                └── AdminAdmins.vue
```

---

## 13. Security Considerations

| Concern | Implementation |
|---------|---------------|
| Auth | JWT + short expiry (8h) + refresh flow |
| Passwords | bcrypt (12 rounds), no plaintext ever stored |
| SQL | Parameterized queries only (mysql2 prepared statements) |
| Input | express-validator on all POST/PUT routes |
| Rate Limiting | 100 req/15min global, 5 req/15min on /login |
| CORS | Allowlist only known frontend origin |
| Headers | Helmet.js (XSS, HSTS, CSP, etc.) |
| Paystack | Webhook signature verification with HMAC-SHA512 |
| File Upload | Type validation (images only), size limit 5MB |
| Role Guard | Middleware checks role before every admin action |

---

## 14. Environment Variables

```bash
# backend/.env
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mys_platform
DB_USER=root
DB_PASS=yourpassword

# JWT
JWT_SECRET=super_long_random_secret_here
JWT_EXPIRES_IN=8h

# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxx
PAYMENT_CALLBACK_URL=http://localhost:5173/ticket/verify

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=mys@example.com
SMTP_PASS=app_password_here
EMAIL_FROM=MYS Summit <mys@example.com>

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

---

## 15. Coding Standards

### Backend
- ES Modules (`import/export`) throughout
- `async/await` — never callbacks
- All DB queries through parameterized statements
- Controllers stay thin — business logic in services
- Every route has input validation middleware
- Custom `AppError` class for operational errors
- Centralized error handler — no `res.status(500)` scattered

### Frontend
- Vue 3 Composition API with `<script setup>` only
- All state through Pinia stores
- No `localStorage` access outside stores
- API calls only through `useApi` composable
- All alerts/toasts through `useAlert` composable
- Responsive-first: mobile → tablet → desktop
- All forms validated with Vuelidate before submit
- Loading states on every async action
- Graceful error display — never silent failures

---

## 16. Deployment Checklist

- [ ] MySQL database created & schema migrated
- [ ] Super admin seeded (`node src/database/seed.js`)
- [ ] Environment variables configured on server
- [ ] Paystack webhook URL set in Paystack dashboard
- [ ] SMTP credentials tested
- [ ] Cloudinary account configured
- [ ] Frontend built (`npm run build`)
- [ ] Nginx configured for SPA routing
- [ ] SSL certificate installed
- [ ] CORS origin updated to production domain
- [ ] Rate limits adjusted for production traffic
- [ ] Backups scheduled for database
