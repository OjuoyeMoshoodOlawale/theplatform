/**
 * seed-tenant-demo.js — populate each tenant with realistic demo data so the
 * platform can be shown off end-to-end.
 *
 * Run AFTER `npm run setup:tenant` (which creates the mys + icp tenants):
 *   npm run demo:tenant
 *
 * For every active tenant it creates: an active event, ticket types, ~12
 * participants, paid tickets, a couple of souvenirs and sponsors — all stamped
 * with that tenant's tenant_id so each space looks live and distinct.
 *
 * Idempotent-ish: it skips a tenant that already has a "DEMO" event so re-runs
 * don't pile up duplicates.
 */
import 'dotenv/config';
import { query } from '../src/database/db.js';
import pool from '../src/database/db.js';

const FIRST = ['Aisha','Ibrahim','Fatima','Yusuf','Khadija','Umar','Maryam','Bilal','Zainab','Hamza','Safiyya','Idris','Ruqayyah','Anas','Hauwa','Suleiman'];
const LAST  = ['Bello','Okonkwo','Abubakar','Adewale','Sani','Mohammed','Ibrahim','Yakubu','Aliyu','Danjuma','Lawal','Usman'];
const rand  = (a) => a[Math.floor(Math.random() * a.length)];
const pad   = (n, w = 4) => String(n).padStart(w, '0');

// Per-tenant demo flavour
const DEMO = {
  mys: {
    event: { title: 'Annual Youth Summit', edition: '2026', prefix: 'MYS', venue: 'Lagos Convention Centre',
             tagline: 'Empowering the next generation', desc: 'Three days of talks, mentorship and networking for young Muslims.' },
    tickets: [
      { name: 'Student',  cat: 'student',    reg: 5000,  early: 3500 },
      { name: 'Regular',  cat: 'general',    reg: 10000, early: 7500 },
      { name: 'VIP',      cat: 'vip',        reg: 25000, early: 20000 },
    ],
    souvenirs: [ { name: 'Summit T-Shirt', price: 4500 }, { name: 'Branded Notebook', price: 1500 } ],
    sponsors:  [ { name: 'Jaiz Bank', tier: 'gold' }, { name: 'Halal Foods Ltd', tier: 'silver' } ],
  },
  icp: {
    event: { title: 'Family Camping Retreat', edition: '2026', prefix: 'ICP', venue: 'Jos Plateau Camp Grounds',
             tagline: 'Annual camping & retreats', desc: 'A weekend of outdoor activities, halaqahs and family bonding.' },
    tickets: [
      { name: 'Child (under 12)', cat: 'student', reg: 8000,  early: 6000 },
      { name: 'Adult',            cat: 'general', reg: 18000, early: 15000 },
      { name: 'Family (up to 5)', cat: 'vip',     reg: 70000, early: 60000 },
    ],
    souvenirs: [ { name: 'Camp Cap', price: 3000 }, { name: 'Water Bottle', price: 2500 } ],
    sponsors:  [ { name: 'Outdoor Gear NG', tier: 'gold' } ],
  },
};

const seedTenant = async (t) => {
  const flavour = DEMO[t.slug] || DEMO.mys;

  // Skip if this tenant already has a demo event
  const [[existing]] = await query(
    "SELECT COUNT(*) AS n FROM events WHERE tenant_id=? AND title=?",
    [t.id, flavour.event.title]
  );
  if (existing.n > 0) {
    console.log(`   • ${t.slug}: demo event already present — skipping`);
    return;
  }

  // 1. Event (active)
  const ev = flavour.event;
  const [evRes] = await query(
    `INSERT INTO events (title, edition, ticket_prefix, slug, tagline, description, venue,
       status, start_date, end_date, early_bird_closes_at, tenant_id)
     VALUES (?,?,?,?,?,?,?, 'active',
       DATE_ADD(CURDATE(), INTERVAL 30 DAY), DATE_ADD(CURDATE(), INTERVAL 32 DAY),
       DATE_ADD(CURDATE(), INTERVAL 14 DAY), ?)`,
    [ev.title, ev.edition, ev.prefix, `${t.slug}-${ev.edition}`, ev.tagline, ev.desc, ev.venue, t.id]
  );
  const eventId = evRes.insertId;

  // 2. Ticket types
  const ttIds = [];
  for (let i = 0; i < flavour.tickets.length; i++) {
    const tt = flavour.tickets[i];
    const [r] = await query(
      `INSERT INTO ticket_types (event_id, name, participant_category, regular_price, early_bird_price,
         quantity_available, is_active, sort_order, tenant_id)
       VALUES (?,?,?,?,?,?,1,?,?)`,
      [eventId, tt.name, tt.cat, tt.reg, tt.early, 200, i, t.id]
    );
    ttIds.push({ id: r.insertId, ...tt });
  }

  // 3. Participants + paid tickets (~12)
  let sold = 0;
  for (let i = 0; i < 12; i++) {
    const name = `${rand(FIRST)} ${rand(LAST)}`;
    const email = `demo${t.slug}${i}@example.com`;
    const [pRes] = await query(
      `INSERT INTO participants (name, email, phone, gender, occupation, tenant_id)
       VALUES (?,?,?,?,?,?)`,
      [name, email, `080${pad(Math.floor(Math.random()*99999999),8)}`,
       Math.random() > 0.5 ? 'male' : 'female', rand(['Student','Teacher','Engineer','Trader','Doctor']), t.id]
    );
    const pid = pRes.insertId;
    const tt = rand(ttIds);
    const early = i < 5; // first few are early-bird
    const price = early ? tt.early : tt.reg;
    await query(
      `INSERT INTO tickets (event_id, ticket_type_id, participant_id, unique_number, amount_paid,
         quantity, status, is_early_bird, payment_method, paystack_reference, purchased_at, tenant_id)
       VALUES (?,?,?,?,?,1,'paid',?, 'paystack', ?, NOW(), ?)`,
      [eventId, tt.id, pid, `${ev.prefix}-${pad(1000 + i)}`, price, early ? 1 : 0,
       `DEMO_${t.slug}_${Date.now()}_${i}`, t.id]
    );
    sold++;
  }
  // bump quantity_sold
  await query(
    `UPDATE ticket_types tt SET quantity_sold =
       (SELECT COUNT(*) FROM tickets tk WHERE tk.ticket_type_id = tt.id AND tk.status='paid')
     WHERE tt.event_id = ?`, [eventId]
  );

  // 4. Souvenirs
  for (let i = 0; i < flavour.souvenirs.length; i++) {
    const s = flavour.souvenirs[i];
    await query(
      `INSERT INTO souvenirs (event_id, name, description, price, available_qty, is_active, sort_order, tenant_id)
       VALUES (?,?,?,?,?,1,?,?)`,
      [eventId, s.name, `Official ${ev.title} merchandise`, s.price, 100, i, t.id]
    );
  }

  // 5. Sponsors
  for (let i = 0; i < flavour.sponsors.length; i++) {
    const s = flavour.sponsors[i];
    await query(
      `INSERT INTO sponsors (event_id, name, tier, description, is_active, sort_order, tenant_id)
       VALUES (?,?,?,?,1,?,?)`,
      [eventId, s.name, s.tier, `Proud ${s.tier} sponsor`, i, t.id]
    );
  }

  console.log(`   ✓ ${t.slug}: "${ev.title}" + ${ttIds.length} ticket types, ${sold} paid tickets, ` +
              `${flavour.souvenirs.length} souvenirs, ${flavour.sponsors.length} sponsors`);
};

const run = async () => {
  console.log('🎬 Seeding tenant demo data…\n');
  console.log(`   DB: ${process.env.DB_NAME || 'theplatform'}\n`);

  // Guard: tenants must exist (setup:tenant first)
  let tenants;
  try {
    [tenants] = await query("SELECT id, slug, name FROM tenants WHERE status='active' ORDER BY id");
  } catch (e) {
    console.error('❌ No tenants table. Run `npm run setup:tenant` first.\n   (' + e.message + ')\n');
    process.exit(1);
  }
  if (!tenants.length) {
    console.error('❌ No active tenants found. Run `npm run setup:tenant` first.\n');
    process.exit(1);
  }

  for (const t of tenants) {
    await seedTenant(t);
  }

  console.log('\n✅ Demo data ready. Log in and explore:');
  console.log('   /mys/admin/login  → admin@muslimyouthsummit.com / MYS@Admin2024!');
  console.log('   /icp/admin/login  → admin@icp.org / ICP@Admin2024!');
  console.log('   /platform/login   → owner@theplatform.com / Platform@2025!');
  console.log('   Public spaces: /mys and /icp (registration, shop, etc.)\n');
  await pool.end?.();
  process.exit(0);
};

run().catch(e => { console.error('\n💥 Demo seed failed:', e.message, '\n'); process.exit(1); });
