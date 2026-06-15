-- =============================================================
-- MYS PLATFORM — DATABASE SCHEMA v5 (DEFINITIVE)
-- Muslim Youth Summit Event Management System
-- Always drop and re-run for a clean install — no migrations.
-- =============================================================

CREATE DATABASE IF NOT EXISTS mys_platform
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mys_platform;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================
-- 1. DEPARTMENTS  (before admins for FK)
-- =============================================================
CREATE TABLE IF NOT EXISTS departments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  head_name   VARCHAR(120),
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================
-- 2. ADMINS
-- =============================================================
CREATE TABLE IF NOT EXISTS admins (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(120) NOT NULL,
  email           VARCHAR(191) NOT NULL,
  password        VARCHAR(255) NOT NULL,
  role            ENUM('super_admin','admin','attendant','department') NOT NULL DEFAULT 'admin',
  department_id   INT UNSIGNED NULL COMMENT 'Required when role=department',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  last_login      DATETIME,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 3. EVENTS
-- =============================================================
CREATE TABLE IF NOT EXISTS events (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title                VARCHAR(200) NOT NULL,
  edition              VARCHAR(20)  NOT NULL COMMENT 'e.g. MYS3 — used in ticket numbers',
  ticket_prefix        VARCHAR(10)  NULL     COMMENT 'Override prefix for ticket numbers. NULL = use edition',
  slug                 VARCHAR(220) NOT NULL UNIQUE,
  tagline              VARCHAR(300),
  description          TEXT,
  venue                VARCHAR(300),
  venue_address        TEXT,
  status               ENUM('draft','active','completed','archived') NOT NULL DEFAULT 'draft',
  start_date           DATE NOT NULL,
  end_date             DATE NOT NULL,
  early_bird_closes_at DATETIME     COMMENT 'Early bird pricing ends at this datetime',
  cover_image_url      VARCHAR(500),
  created_by           INT UNSIGNED NOT NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admins(id)
) ENGINE=InnoDB;

-- =============================================================
-- 4. EVENT DAYS
-- =============================================================
CREATE TABLE IF NOT EXISTS event_days (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id    INT UNSIGNED NOT NULL,
  day_number  TINYINT UNSIGNED NOT NULL,
  event_date  DATE NOT NULL,
  theme       VARCHAR(200),
  description TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY uq_event_day (event_id, day_number)
) ENGINE=InnoDB;

-- =============================================================
-- 5. SPEAKERS
-- =============================================================
CREATE TABLE IF NOT EXISTS speakers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id    INT UNSIGNED NULL COMMENT 'NULL = global reusable speaker',
  name        VARCHAR(150) NOT NULL,
  title       VARCHAR(200) COMMENT 'e.g. Sheikh, Dr., Engr.',
  bio         TEXT,
  photo_url   VARCHAR(500),
  email       VARCHAR(191) NULL COMMENT 'Contact email for future events',
  phone       VARCHAR(30)  NULL COMMENT 'Contact phone for future events',
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 6. LECTURES / SESSIONS
-- =============================================================
CREATE TABLE IF NOT EXISTS lectures (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id          INT UNSIGNED NOT NULL,
  event_day_id      INT UNSIGNED NULL,
  s_n               SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Display sequence number',
  title             VARCHAR(300) NOT NULL,
  description       TEXT,
  lecture_type      ENUM('lecture','panel','workshop','keynote','prayer','break','other') NOT NULL DEFAULT 'lecture',
  main_speaker_name VARCHAR(150) NULL,
  facilitators      TEXT NULL COMMENT 'Comma-separated facilitator names',
  start_time        TIME,
  end_time          TIME,
  youtube_url       VARCHAR(500) NULL COMMENT 'YouTube link uploaded after recording',
  sort_order        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id)     REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (event_day_id) REFERENCES event_days(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS lecture_speakers (
  lecture_id  INT UNSIGNED NOT NULL,
  speaker_id  INT UNSIGNED NOT NULL,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (lecture_id, speaker_id),
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
  FOREIGN KEY (speaker_id) REFERENCES speakers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 7. EVENT CATEGORIES  (GLOBAL — no event_id)
-- =============================================================
CREATE TABLE IF NOT EXISTS event_categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  color       VARCHAR(7) NOT NULL DEFAULT '#02462E',
  capacity    INT UNSIGNED NULL COMMENT 'NULL = unlimited per event',
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- =============================================================
-- 8. TICKET TYPES
-- =============================================================
CREATE TABLE IF NOT EXISTS ticket_types (
  id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id             INT UNSIGNED NOT NULL,
  name                 VARCHAR(100) NOT NULL,
  participant_category ENUM('all','undergraduate','graduate','professional','other') NOT NULL DEFAULT 'all',
  description          TEXT NULL,
  regular_price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  early_bird_price     DECIMAL(10,2) NULL,
  quantity_available   INT UNSIGNED NULL COMMENT 'NULL = unlimited',
  quantity_sold        INT UNSIGNED NOT NULL DEFAULT 0,
  is_active            TINYINT(1) NOT NULL DEFAULT 1,
  sort_order           TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 9. PARTICIPANTS
-- NOTE: email has NO UNIQUE constraint — allows family registrations.
--       Multiple children can share a parent's email (different names).
--       Uniqueness enforced at ticket level per event.
-- =============================================================
CREATE TABLE IF NOT EXISTS participants (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name             VARCHAR(150) NOT NULL,
  email            VARCHAR(191) NOT NULL,
  phone            VARCHAR(30),
  gender           ENUM('male','female','prefer_not_to_say'),
  occupation       VARCHAR(150),
  email_subscribed TINYINT(1) NOT NULL DEFAULT 1,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Fast lookup (not UNIQUE — family members share email with different names)
CREATE INDEX idx_participants_email ON participants(email);

-- =============================================================
-- 10. TICKETS
-- =============================================================
CREATE TABLE IF NOT EXISTS tickets (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id           INT UNSIGNED NOT NULL,
  ticket_type_id     INT UNSIGNED NOT NULL,
  participant_id     INT UNSIGNED NOT NULL,
  category_id        INT UNSIGNED NULL COMMENT 'Assigned at check-in by admin',
  unique_number      VARCHAR(30) NOT NULL UNIQUE COMMENT 'e.g. MYS3-25-000001',
  qr_code_svg        MEDIUMTEXT NULL,
  amount_paid        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  quantity           SMALLINT UNSIGNED NOT NULL DEFAULT 1 COMMENT 'number of admissions on this ticket',
  balance_due        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payment_method     ENUM('paystack','cash','bank_transfer','pos','waived','other') NULL,
  payment_note       TEXT NULL,
  paystack_reference VARCHAR(100) UNIQUE NULL,
  status             ENUM('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
  is_early_bird      TINYINT(1) NOT NULL DEFAULT 0,
  purchased_at       DATETIME NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id)       REFERENCES events(id),
  FOREIGN KEY (ticket_type_id) REFERENCES ticket_types(id),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (category_id)    REFERENCES event_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 11. HOSTELS  (GLOBAL — shared across events)
-- IMPORTANT: column is "beds" not "capacity"
-- =============================================================
CREATE TABLE IF NOT EXISTS hostels (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  gender      ENUM('male','female','mixed') NOT NULL DEFAULT 'mixed',
  beds        INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Total number of bed spaces',
  location    VARCHAR(200) NULL,
  description TEXT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hostel_assignments (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hostel_id      INT UNSIGNED NOT NULL,
  event_id       INT UNSIGNED NOT NULL,
  ticket_id      INT UNSIGNED NOT NULL UNIQUE,
  participant_id INT UNSIGNED NOT NULL,
  room_number    VARCHAR(30) NULL,
  notes          TEXT NULL,
  assigned_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by    INT UNSIGNED NULL,
  FOREIGN KEY (hostel_id)      REFERENCES hostels(id),
  FOREIGN KEY (event_id)       REFERENCES events(id),
  FOREIGN KEY (ticket_id)      REFERENCES tickets(id),
  FOREIGN KEY (participant_id) REFERENCES participants(id),
  FOREIGN KEY (assigned_by)    REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 12. EVENT TAGS
-- =============================================================
CREATE TABLE IF NOT EXISTS event_tags (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id       INT UNSIGNED NOT NULL,
  tag_number     VARCHAR(20) NOT NULL,
  qr_code_svg    MEDIUMTEXT NULL,
  ticket_id      INT UNSIGNED UNIQUE NULL,
  participant_id INT UNSIGNED NULL,
  assigned_at    DATETIME NULL,
  assigned_by    INT UNSIGNED NULL,
  is_printed     TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id)       REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (ticket_id)      REFERENCES tickets(id) ON DELETE SET NULL,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_by)    REFERENCES admins(id) ON DELETE SET NULL,
  UNIQUE KEY uq_event_tag (event_id, tag_number)
) ENGINE=InnoDB;

-- =============================================================
-- 13. ATTENDANCE
-- NOTE: day_id FK added — was missing in v4
-- =============================================================
CREATE TABLE IF NOT EXISTS attendance (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id       INT UNSIGNED NOT NULL,
  ticket_id      INT UNSIGNED NOT NULL,
  tag_id         INT UNSIGNED NULL,
  day_id         INT UNSIGNED NULL,
  checked_in_at  DATETIME NULL,
  checked_out_at DATETIME NULL,
  check_in_by    INT UNSIGNED NULL,
  check_out_by   INT UNSIGNED NULL,
  notes          TEXT NULL,
  FOREIGN KEY (event_id)     REFERENCES events(id),
  FOREIGN KEY (ticket_id)    REFERENCES tickets(id),
  FOREIGN KEY (tag_id)       REFERENCES event_tags(id) ON DELETE SET NULL,
  FOREIGN KEY (day_id)       REFERENCES event_days(id) ON DELETE SET NULL,
  FOREIGN KEY (check_in_by)  REFERENCES admins(id) ON DELETE SET NULL,
  FOREIGN KEY (check_out_by) REFERENCES admins(id) ON DELETE SET NULL,
  UNIQUE KEY uq_ticket_attendance (ticket_id)
) ENGINE=InnoDB;

-- =============================================================
-- 14. EVENT GALLERY
-- =============================================================
CREATE TABLE IF NOT EXISTS event_gallery (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id        INT UNSIGNED NOT NULL,
  image_url       VARCHAR(500) NOT NULL,
  thumbnail_url   VARCHAR(500) NULL,
  caption         VARCHAR(300) NULL,
  google_drive_id VARCHAR(200) NULL COMMENT 'Google Drive file ID for Drive-hosted images',
  sort_order      SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  uploaded_by     INT UNSIGNED NULL,
  uploaded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id)    REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 15. EMAIL CAMPAIGNS
-- =============================================================
CREATE TABLE IF NOT EXISTS email_campaigns (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id         INT UNSIGNED NULL,
  subject          VARCHAR(300) NOT NULL,
  body_html        MEDIUMTEXT NOT NULL,
  body_text        MEDIUMTEXT NULL,
  recipient_type   ENUM('all','past_attendees') NOT NULL DEFAULT 'all',
  status           ENUM('draft','sending','sent','failed') NOT NULL DEFAULT 'draft',
  recipient_count  INT UNSIGNED NOT NULL DEFAULT 0,
  sent_count       INT UNSIGNED NOT NULL DEFAULT 0,
  failed_count     INT UNSIGNED NOT NULL DEFAULT 0,
  created_by       INT UNSIGNED NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at          DATETIME NULL,
  FOREIGN KEY (event_id)   REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS email_logs (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  campaign_id    INT UNSIGNED NOT NULL,
  participant_id INT UNSIGNED NULL,
  email          VARCHAR(191) NOT NULL,
  status         ENUM('sent','failed') NOT NULL,
  error_message  TEXT NULL,
  sent_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campaign_id)    REFERENCES email_campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 16. EXPENSE REQUESTS
-- =============================================================
CREATE TABLE IF NOT EXISTS expense_requests (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_id    INT UNSIGNED NOT NULL,
  event_id         INT UNSIGNED NULL,
  title            VARCHAR(200) NOT NULL,
  description      TEXT NULL,
  amount_requested DECIMAL(12,2) NOT NULL,
  amount_approved  DECIMAL(12,2) NULL,
  amount_paid      DECIMAL(12,2) NULL,
  status           ENUM('pending','approved','rejected','paid') NOT NULL DEFAULT 'pending',
  priority         ENUM('low','normal','urgent') NOT NULL DEFAULT 'normal',
  raised_by        INT UNSIGNED NOT NULL,
  approved_by      INT UNSIGNED NULL,
  paid_by          INT UNSIGNED NULL,
  raise_note       TEXT NULL,
  approve_note     TEXT NULL,
  pay_note         TEXT NULL,
  due_date         DATE NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at      DATETIME NULL,
  paid_at          DATETIME NULL,
  FOREIGN KEY (department_id) REFERENCES departments(id),
  FOREIGN KEY (event_id)      REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (raised_by)     REFERENCES admins(id),
  FOREIGN KEY (approved_by)   REFERENCES admins(id) ON DELETE SET NULL,
  FOREIGN KEY (paid_by)       REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 17. SPONSORS & PARTNERS
-- =============================================================
CREATE TABLE IF NOT EXISTS sponsors (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id    INT UNSIGNED NULL COMMENT 'NULL = shown across all events',
  name        VARCHAR(150) NOT NULL,
  logo_url    VARCHAR(500) NULL,
  website_url VARCHAR(500) NULL,
  tier        ENUM('title','gold','silver','bronze','media','partner') NOT NULL DEFAULT 'gold',
  description TEXT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 18. SOUVENIRS / MERCHANDISE
-- =============================================================
CREATE TABLE IF NOT EXISTS souvenirs (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id      INT UNSIGNED NULL COMMENT 'NULL = available for all events',
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  price         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  image_url     VARCHAR(500) NULL,
  available_qty INT UNSIGNED NULL COMMENT 'NULL = unlimited',
  sold_qty      INT UNSIGNED NOT NULL DEFAULT 0,
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  sort_order    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS souvenir_orders (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_number       VARCHAR(25) NOT NULL UNIQUE COMMENT 'e.g. SVN-25-000001 — shown to buyer on confirmation',
  souvenir_id        INT UNSIGNED NOT NULL,
  participant_id     INT UNSIGNED NULL COMMENT 'NULL = anonymous buyer',
  buyer_name         VARCHAR(150) NOT NULL,
  buyer_email        VARCHAR(191) NOT NULL,
  buyer_phone        VARCHAR(30),
  quantity           TINYINT UNSIGNED NOT NULL DEFAULT 1,
  unit_price         DECIMAL(10,2) NOT NULL,
  total_amount       DECIMAL(10,2) NOT NULL,
  status             ENUM('pending','paid','cancelled','delivered') NOT NULL DEFAULT 'pending',
  paystack_reference VARCHAR(100) NULL COMMENT 'shared across rows for multi-item cart orders',
  delivery_address   TEXT NULL,
  notes              TEXT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at            DATETIME NULL,
  FOREIGN KEY (souvenir_id)    REFERENCES souvenirs(id),
  FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- =============================================================
-- 19. EVENT SNAPSHOTS  (daily dashboard trend data)
-- =============================================================
CREATE TABLE IF NOT EXISTS event_snapshots (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id      INT UNSIGNED NOT NULL,
  snapshot_date DATE NOT NULL,
  tickets_sold  INT UNSIGNED NOT NULL DEFAULT 0,
  revenue       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  checked_in    INT UNSIGNED NOT NULL DEFAULT 0,
  checked_out   INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  UNIQUE KEY uq_event_snapshot (event_id, snapshot_date)
) ENGINE=InnoDB;

-- =============================================================
-- 20. FACILITATOR REMINDERS
-- =============================================================
CREATE TABLE IF NOT EXISTS facilitator_reminders (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lecture_id INT UNSIGNED NOT NULL,
  email      VARCHAR(191) NOT NULL,
  sent_at    DATETIME NULL,
  status     ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
  FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- 21. INDEXES  (all in one block for easy reference)
-- =============================================================
CREATE INDEX idx_events_status        ON events(status);
CREATE INDEX idx_events_edition       ON events(edition);
CREATE INDEX idx_tickets_event        ON tickets(event_id);
CREATE INDEX idx_tickets_participant  ON tickets(participant_id);
CREATE INDEX idx_tickets_status       ON tickets(status);
CREATE INDEX idx_tickets_category     ON tickets(category_id);
CREATE INDEX idx_attendance_event     ON attendance(event_id);
CREATE INDEX idx_attendance_checkin   ON attendance(checked_in_at);
CREATE INDEX idx_event_tags_event     ON event_tags(event_id);
CREATE INDEX idx_gallery_event        ON event_gallery(event_id, sort_order);
CREATE INDEX idx_hostels_active       ON hostels(is_active, gender);
CREATE INDEX idx_hostel_assignments   ON hostel_assignments(event_id, hostel_id);
CREATE INDEX idx_expenses_status      ON expense_requests(status, created_at DESC);
CREATE INDEX idx_expenses_dept        ON expense_requests(department_id, status);
CREATE INDEX idx_categories_active    ON event_categories(is_active, sort_order);
CREATE INDEX idx_speakers_event       ON speakers(event_id);
CREATE INDEX idx_lectures_event_day   ON lectures(event_id, event_day_id, s_n);
CREATE INDEX idx_ticket_types_event   ON ticket_types(event_id, is_active, sort_order);
CREATE INDEX idx_souvenirs_event      ON souvenirs(event_id, is_active);
CREATE INDEX idx_souvenir_orders      ON souvenir_orders(souvenir_id, status);
CREATE INDEX idx_souvenir_buyer       ON souvenir_orders(buyer_email);
CREATE INDEX idx_sponsors_event       ON sponsors(event_id, is_active, sort_order);

SET FOREIGN_KEY_CHECKS = 1;
