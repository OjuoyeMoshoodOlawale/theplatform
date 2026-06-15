-- =============================================================
-- MULTI-TENANT SCHEMA ADDITIONS
-- Run AFTER the base schema.sql. Adds the tenants layer and
-- tenant_id columns to root tables.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- TENANTS — each organisation running its own event space
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug                VARCHAR(40) NOT NULL UNIQUE COMMENT 'URL prefix, e.g. mys, icp',
  name                VARCHAR(150) NOT NULL COMMENT 'e.g. Muslim Youth Summit',
  tagline             VARCHAR(255) NULL,
  description         TEXT NULL,

  -- Branding
  logo_url            VARCHAR(500) NULL,
  favicon_url         VARCHAR(500) NULL,
  color_primary       VARCHAR(9) NOT NULL DEFAULT '#02462E',
  color_secondary     VARCHAR(9) NOT NULL DEFAULT '#FEC700',
  color_accent        VARCHAR(9) NOT NULL DEFAULT '#6BBC01',
  color_bg            VARCHAR(9) NOT NULL DEFAULT '#FBF6E6',

  -- Contact / social
  contact_email       VARCHAR(191) NULL,
  contact_phone       VARCHAR(30) NULL,
  website_url         VARCHAR(255) NULL,
  social_instagram    VARCHAR(255) NULL,
  social_twitter      VARCHAR(255) NULL,
  social_facebook     VARCHAR(255) NULL,

  -- Payment (tenant's own Paystack — falls back to platform .env if NULL)
  paystack_public_key  VARCHAR(120) NULL,
  paystack_secret_key  VARCHAR(255) NULL COMMENT 'encrypted at rest',

  -- Status
  status              ENUM('active','suspended','trial') NOT NULL DEFAULT 'trial',
  plan                ENUM('free','pro','enterprise') NOT NULL DEFAULT 'free',

  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tenant_slug (slug),
  INDEX idx_tenant_status (status)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- TENANT PAGES — custom pages (About, Contact, etc.) per tenant
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_pages (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tenant_id     INT UNSIGNED NOT NULL,
  slug          VARCHAR(60) NOT NULL COMMENT 'e.g. about, contact',
  title         VARCHAR(150) NOT NULL,
  body_html     MEDIUMTEXT NULL,
  is_published  TINYINT(1) NOT NULL DEFAULT 1,
  show_in_nav   TINYINT(1) NOT NULL DEFAULT 1,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tenant_page (tenant_id, slug)
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- PLATFORM ADMINS — manage the whole platform (create tenants)
-- Separate from per-tenant admins.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_admins (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(150) NOT NULL,
  email       VARCHAR(191) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ─────────────────────────────────────────────────────────────
-- ADD tenant_id TO ROOT TABLES
-- Child tables inherit tenancy via their parent FK.
-- Use the migration procedure so it's idempotent.
-- ─────────────────────────────────────────────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS AddTenantColumn$$
CREATE PROCEDURE AddTenantColumn(IN tbl VARCHAR(64))
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE table_schema = DATABASE() AND table_name = tbl AND column_name = 'tenant_id'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', tbl, ' ADD COLUMN tenant_id INT UNSIGNED NULL');
    PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
    SET @sql = CONCAT('CREATE INDEX idx_', tbl, '_tenant ON ', tbl, '(tenant_id)');
    PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
  END IF;
END$$
DELIMITER ;

CALL AddTenantColumn('admins');
CALL AddTenantColumn('events');
CALL AddTenantColumn('participants');
CALL AddTenantColumn('speakers');
CALL AddTenantColumn('departments');
CALL AddTenantColumn('event_categories');
CALL AddTenantColumn('hostels');
CALL AddTenantColumn('sponsors');
CALL AddTenantColumn('souvenirs');
CALL AddTenantColumn('email_campaigns');
CALL AddTenantColumn('ticket_types');

DROP PROCEDURE IF EXISTS AddTenantColumn;

-- ─────────────────────────────────────────────────────────────
-- Admin email uniqueness must be PER TENANT (the same email can run admin
-- accounts in different organisations). Drop the global unique on admins.email
-- and add a composite (tenant_id, email) unique.
-- ─────────────────────────────────────────────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS FixAdminEmailUnique$$
CREATE PROCEDURE FixAdminEmailUnique()
BEGIN
  DECLARE globalIdx VARCHAR(128) DEFAULT NULL;
  -- Find a single-column unique index on admins.email
  SELECT s.index_name INTO globalIdx
    FROM information_schema.STATISTICS s
    WHERE s.table_schema = DATABASE() AND s.table_name='admins'
      AND s.column_name='email' AND s.non_unique=0
      AND (SELECT COUNT(*) FROM information_schema.STATISTICS s2
           WHERE s2.table_schema=DATABASE() AND s2.table_name='admins'
             AND s2.index_name=s.index_name) = 1
    LIMIT 1;
  IF globalIdx IS NOT NULL THEN
    SET @sql = CONCAT('ALTER TABLE admins DROP INDEX ', globalIdx);
    PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
  END IF;
  -- Add composite unique if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.STATISTICS
    WHERE table_schema=DATABASE() AND table_name='admins' AND index_name='uq_admin_tenant_email'
  ) THEN
    ALTER TABLE admins ADD UNIQUE KEY uq_admin_tenant_email (tenant_id, email);
  END IF;
END$$
DELIMITER ;
CALL FixAdminEmailUnique();
DROP PROCEDURE IF EXISTS FixAdminEmailUnique;

SELECT 'Multi-tenant schema applied.' AS result;
