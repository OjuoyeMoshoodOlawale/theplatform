-- =============================================================
-- MYS Platform — Database Migration
-- Run this on EXISTING databases (skip for fresh installs)
-- Usage: mysql -u root -p mys_platform < migrate.sql
-- =============================================================

USE mys_platform;

-- ── 1. tickets: add balance tracking columns ──────────────────
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS balance_due      DECIMAL(10,2) NOT NULL DEFAULT 0.00
    COMMENT 'Outstanding balance for partial payments'
    AFTER amount_paid,
  ADD COLUMN IF NOT EXISTS payment_method   ENUM('paystack','cash','bank_transfer','pos','waived','other')
    NULL COMMENT 'How the ticket was paid for'
    AFTER balance_due,
  ADD COLUMN IF NOT EXISTS payment_note     TEXT NULL
    COMMENT 'Receipt reference or payment notes'
    AFTER payment_method;

-- ── 2. admins: add department_id + update role enum ───────────
ALTER TABLE admins
  MODIFY COLUMN role ENUM('super_admin','admin','attendant','department')
    NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS department_id INT UNSIGNED NULL
    COMMENT 'Required for department role'
    AFTER role;

-- Add FK if departments table exists
SET @fk_exists = (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admins'
    AND CONSTRAINT_NAME = 'admins_ibfk_dept'
);
-- Run manually if needed: ALTER TABLE admins ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;

-- ── 3. ticket_types: add participant_category, description, sort_order ──
ALTER TABLE ticket_types
  ADD COLUMN IF NOT EXISTS participant_category
    ENUM('all','undergraduate','graduate','professional','other')
    NOT NULL DEFAULT 'all'
    COMMENT 'Who this type is for — shown on registration form'
    AFTER name,
  ADD COLUMN IF NOT EXISTS description VARCHAR(200) NULL
    COMMENT 'Short note shown on registration form'
    AFTER participant_category,
  ADD COLUMN IF NOT EXISTS sort_order TINYINT UNSIGNED NOT NULL DEFAULT 0
    AFTER quantity_sold;

-- ── 4. event_categories: make global (remove event_id) ────────
-- Only run if event_id column exists
ALTER TABLE event_categories
  DROP FOREIGN KEY IF EXISTS `fk_category_event_id`,
  DROP FOREIGN KEY IF EXISTS `event_categories_ibfk_1`;

-- Safest way — run manually if needed:
-- ALTER TABLE event_categories DROP COLUMN event_id;

-- ── 5. lectures: add new columns ──────────────────────────────
ALTER TABLE lectures
  ADD COLUMN IF NOT EXISTS s_n              SMALLINT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Display sequence number' AFTER event_day_id,
  ADD COLUMN IF NOT EXISTS main_speaker_name VARCHAR(150) NULL
    COMMENT 'Denormalised speaker name for quick display' AFTER lecture_type,
  ADD COLUMN IF NOT EXISTS facilitators     TEXT NULL
    COMMENT 'Comma-separated facilitator names' AFTER main_speaker_name;

-- ── 6. hostels: rename capacity → beds ────────────────────────
ALTER TABLE hostels
  CHANGE COLUMN IF EXISTS capacity beds INT UNSIGNED NOT NULL DEFAULT 0
    COMMENT 'Number of bed spaces';

-- ── 7. New tables (safe — CREATE IF NOT EXISTS) ────────────────

CREATE TABLE IF NOT EXISTS departments (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  head_name   VARCHAR(120),
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS hostels (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  gender      ENUM('male','female','mixed') NOT NULL DEFAULT 'mixed',
  beds        INT UNSIGNED NOT NULL DEFAULT 0,
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
  assigned_by    INT UNSIGNED NULL
) ENGINE=InnoDB;

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
  paid_at          DATETIME NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS facilitator_reminders (
  id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  lecture_id INT UNSIGNED NOT NULL,
  email      VARCHAR(191) NOT NULL,
  sent_at    DATETIME NULL,
  status     ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending'
) ENGINE=InnoDB;

-- ── 8. Indexes (safe — won't duplicate) ───────────────────────
DROP PROCEDURE IF EXISTS AddIndexIfNotExists;
DELIMITER $$
CREATE PROCEDURE AddIndexIfNotExists(
  IN tbl VARCHAR(100), IN idx VARCHAR(100), IN col VARCHAR(200)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE() AND table_name = tbl AND index_name = idx
  ) THEN
    SET @sql = CONCAT('CREATE INDEX ', idx, ' ON ', tbl, '(', col, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;

CALL AddIndexIfNotExists('expense_requests','idx_expenses_status','status, created_at DESC');
CALL AddIndexIfNotExists('expense_requests','idx_expenses_dept','department_id, status');

DROP PROCEDURE IF EXISTS AddIndexIfNotExists;

-- ─────────────────────────────────────────────────────────────
-- Multi-item cart checkout: souvenir_orders.paystack_reference must NOT be
-- unique (a cart shares one reference across several order rows).
-- Drop the unique index if it exists.
-- ─────────────────────────────────────────────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS DropUniqueRefIfExists$$
CREATE PROCEDURE DropUniqueRefIfExists()
BEGIN
  DECLARE idxName VARCHAR(128) DEFAULT NULL;
  SELECT index_name INTO idxName
    FROM information_schema.STATISTICS
    WHERE table_schema = DATABASE()
      AND table_name = 'souvenir_orders'
      AND column_name = 'paystack_reference'
      AND non_unique = 0
    LIMIT 1;
  IF idxName IS NOT NULL THEN
    SET @sql = CONCAT('ALTER TABLE souvenir_orders DROP INDEX ', idxName);
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$
DELIMITER ;
CALL DropUniqueRefIfExists();
DROP PROCEDURE IF EXISTS DropUniqueRefIfExists;

-- Add a non-unique index for lookup performance
CREATE INDEX IF NOT EXISTS idx_souvenir_ref ON souvenir_orders(paystack_reference);

SELECT 'Migration complete!' AS result;

-- ─────────────────────────────────────────────────────────────
-- Multi-ticket purchase: add quantity to tickets
-- ─────────────────────────────────────────────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS AddTicketQty$$
CREATE PROCEDURE AddTicketQty()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema = DATABASE() AND table_name='tickets' AND column_name='quantity'
  ) THEN
    ALTER TABLE tickets ADD COLUMN quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1 AFTER amount_paid;
  END IF;
END$$
DELIMITER ;
CALL AddTicketQty();
DROP PROCEDURE IF EXISTS AddTicketQty;

SELECT 'Ticket quantity migration complete!' AS result;
