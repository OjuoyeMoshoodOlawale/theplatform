/**
 * Multi-tenant setup:
 *   1. Applies tenant-schema.sql (tenants, tenant_pages, platform_admins,
 *      tenant_id columns)
 *   2. Seeds a platform super-admin
 *   3. Seeds two example tenants: MYS and ICP, each with a super_admin
 *   4. Backfills tenant_id onto existing rows → assigns them to MYS
 *
 * Run:  node scripts/setup-tenant.js
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { query } from '../src/database/db.js';
import pool from '../src/database/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const run = async () => {
  console.log('🏗️  Multi-tenant setup starting…\n');
  console.log(`   DB: ${process.env.DB_NAME || 'event_platform'} @ ${process.env.DB_HOST || 'localhost'}\n`);

  // 0. Guard: the base schema (events, admins, participants…) must already
  //    exist — tenant-schema only ADDS tenant columns to those tables. If the
  //    platform DB is empty, load the base schema first.
  try {
    const [[chk]] = await query(
      `SELECT COUNT(*) AS n FROM information_schema.TABLES
       WHERE table_schema = DATABASE() AND table_name IN ('events','admins','participants')`
    );
    if (!chk || chk.n < 3) {
      console.error('❌ Base tables (events/admins/participants) not found in this DB.');
      console.error('   Load the base schema into the platform DB first, e.g.:');
      console.error('     mysql -u root -p ' + (process.env.DB_NAME || 'event_platform') + ' < src/database/schema.sql');
      console.error('   Then re-run: npm run setup:tenant\n');
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Cannot reach the database "' + (process.env.DB_NAME || 'event_platform') + '".');
    console.error('   Create it and load the base schema first:');
    console.error('     mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS ' + (process.env.DB_NAME || 'event_platform') + '"');
    console.error('     mysql -u root -p ' + (process.env.DB_NAME || 'event_platform') + ' < src/database/schema.sql');
    console.error('   (' + e.message + ')\n');
    process.exit(1);
  }

  // 1. Apply tenant schema (split on ; but keep DELIMITER blocks intact)
  const sqlPath = path.join(__dirname, '../src/database/tenant-schema.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Naive but works: run the whole file through multipleStatements
  await new Promise((resolve, reject) => {
    pool.query(sql, (err) => (err ? reject(err) : resolve()));
  }).catch(async () => {
    // Fallback: the pool may not allow multi-statements with procedures.
    console.log('   (running statements individually…)');
    // Strip the DELIMITER procedure block and run the ALTERs manually
    const rootTables = ['admins','events','participants','speakers','departments',
      'event_categories','hostels','sponsors','souvenirs','email_campaigns','ticket_types'];
    // Create core tables
    await query(`CREATE TABLE IF NOT EXISTS tenants (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(40) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
      tagline VARCHAR(255) NULL, description TEXT NULL,
      logo_url VARCHAR(500) NULL, favicon_url VARCHAR(500) NULL,
      color_primary VARCHAR(9) NOT NULL DEFAULT '#02462E',
      color_secondary VARCHAR(9) NOT NULL DEFAULT '#FEC700',
      color_accent VARCHAR(9) NOT NULL DEFAULT '#6BBC01',
      color_bg VARCHAR(9) NOT NULL DEFAULT '#FBF6E6',
      contact_email VARCHAR(191) NULL, contact_phone VARCHAR(30) NULL, website_url VARCHAR(255) NULL,
      social_instagram VARCHAR(255) NULL, social_twitter VARCHAR(255) NULL, social_facebook VARCHAR(255) NULL,
      paystack_public_key VARCHAR(120) NULL, paystack_secret_key VARCHAR(255) NULL,
      status ENUM('active','suspended','trial') NOT NULL DEFAULT 'trial',
      plan ENUM('free','pro','enterprise') NOT NULL DEFAULT 'free',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
    await query(`CREATE TABLE IF NOT EXISTS tenant_pages (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, tenant_id INT UNSIGNED NOT NULL,
      slug VARCHAR(60) NOT NULL, title VARCHAR(150) NOT NULL, body_html MEDIUMTEXT NULL,
      is_published TINYINT(1) NOT NULL DEFAULT 1, show_in_nav TINYINT(1) NOT NULL DEFAULT 1,
      sort_order INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      UNIQUE KEY uq_tenant_page (tenant_id, slug)
    ) ENGINE=InnoDB`);
    await query(`CREATE TABLE IF NOT EXISTS platform_admins (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(150) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB`);
    for (const tbl of rootTables) {
      const [cols] = await query(
        `SELECT 1 FROM information_schema.COLUMNS WHERE table_schema=DATABASE() AND table_name=? AND column_name='tenant_id'`,
        [tbl]
      );
      if (!cols.length) {
        await query(`ALTER TABLE ${tbl} ADD COLUMN tenant_id INT UNSIGNED NULL`);
        await query(`CREATE INDEX idx_${tbl}_tenant ON ${tbl}(tenant_id)`).catch(()=>{});
        console.log(`   + tenant_id on ${tbl}`);
      }
    }

    // Admin email uniqueness → per tenant (drop global unique, add composite)
    try {
      const [idx] = await query(
        `SELECT s.index_name FROM information_schema.STATISTICS s
         WHERE s.table_schema=DATABASE() AND s.table_name='admins'
           AND s.column_name='email' AND s.non_unique=0
           AND (SELECT COUNT(*) FROM information_schema.STATISTICS s2
                WHERE s2.table_schema=DATABASE() AND s2.table_name='admins'
                  AND s2.index_name=s.index_name)=1 LIMIT 1`
      );
      if (idx.length) {
        await query(`ALTER TABLE admins DROP INDEX ${idx[0].index_name}`);
        console.log('   ↻ dropped global unique on admins.email');
      }
      const [comp] = await query(
        `SELECT 1 FROM information_schema.STATISTICS WHERE table_schema=DATABASE()
           AND table_name='admins' AND index_name='uq_admin_tenant_email' LIMIT 1`
      );
      if (!comp.length) {
        await query('ALTER TABLE admins ADD UNIQUE KEY uq_admin_tenant_email (tenant_id, email)');
        console.log('   + composite unique (tenant_id, email) on admins');
      }
    } catch (e) { console.log('   (admin email index:', e.message, ')'); }
  });
  console.log('✅ Tenant schema applied.\n');

  // 2. Platform admin
  const platformPass = await bcrypt.hash('Platform@2025!', 12);
  await query(
    `INSERT INTO platform_admins (name, email, password)
     VALUES ('Platform Owner','owner@theplatform.com',?)
     ON DUPLICATE KEY UPDATE password=VALUES(password)`,
    [platformPass]
  );
  console.log('✅ Platform admin: owner@theplatform.com / Platform@2025!\n');

  // 3. Example tenants
  const tenants = [
    { slug: 'mys', name: 'Muslim Youth Summit', tagline: 'Empowering the next generation',
      primary: '#02462E', secondary: '#FEC700', accent: '#6BBC01', bg: '#FBF6E6',
      admin: { name: 'MYS Admin', email: 'admin@muslimyouthsummit.com', pass: 'MYS@Admin2024!' } },
    { slug: 'icp', name: 'Islamic Camping Programs', tagline: 'Annual camping & retreats',
      primary: '#1B4332', secondary: '#E9C46A', accent: '#2A9D8F', bg: '#F4F1DE',
      admin: { name: 'ICP Admin', email: 'admin@icp.org', pass: 'ICP@Admin2024!' } },
  ];

  for (const t of tenants) {
    const [existing] = await query('SELECT id FROM tenants WHERE slug=?', [t.slug]);
    let tenantId;
    if (existing.length) {
      tenantId = existing[0].id;
      console.log(`   • Tenant ${t.slug} already exists (id ${tenantId})`);
    } else {
      const [r] = await query(
        `INSERT INTO tenants (slug, name, tagline, color_primary, color_secondary, color_accent, color_bg, status, plan)
         VALUES (?,?,?,?,?,?,?,'active','pro')`,
        [t.slug, t.name, t.tagline, t.primary, t.secondary, t.accent, t.bg]
      );
      tenantId = r.insertId;
      console.log(`   ✓ Created tenant /${t.slug} → ${t.name} (id ${tenantId})`);
    }

    // Tenant super_admin
    const hash = await bcrypt.hash(t.admin.pass, 12);
    await query(
      `INSERT INTO admins (tenant_id, name, email, password, role, is_active)
       VALUES (?,?,?,?,'super_admin',1)
       ON DUPLICATE KEY UPDATE password=VALUES(password), tenant_id=VALUES(tenant_id)`,
      [tenantId, t.admin.name, t.admin.email, hash]
    );
    console.log(`     admin: ${t.admin.email} / ${t.admin.pass}`);

    // A starter About page
    await query(
      `INSERT INTO tenant_pages (tenant_id, slug, title, body_html, show_in_nav, sort_order)
       VALUES (?,?,?,?,1,1)
       ON DUPLICATE KEY UPDATE title=VALUES(title)`,
      [tenantId, 'about', 'About Us', `<h2>Welcome to ${t.name}</h2><p>${t.tagline}</p>`]
    );
  }

  // 4. Backfill: assign all existing (NULL) rows to the MYS tenant
  const [[mys]] = await query("SELECT id FROM tenants WHERE slug='mys'");
  if (mys) {
    const rootTables = ['admins','events','participants','speakers','departments',
      'event_categories','hostels','sponsors','souvenirs','email_campaigns','ticket_types'];
    for (const tbl of rootTables) {
      const [r] = await query(`UPDATE ${tbl} SET tenant_id=? WHERE tenant_id IS NULL`, [mys.id]).catch(()=>[{affectedRows:0}]);
      if (r?.affectedRows) console.log(`   ↻ Backfilled ${r.affectedRows} ${tbl} → MYS`);
    }
  }

  console.log('\n🎉 Multi-tenant setup complete!');
  console.log('   Platform admin: owner@theplatform.com / Platform@2025!');
  console.log('   Visit /mys and /icp');
  process.exit(0);
};

run().catch(e => { console.error('❌ Setup failed:', e); process.exit(1); });
