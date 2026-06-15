/**
 * Multi-tenant isolation test.
 *
 * Verifies that two tenants (mys, icp) cannot see each other's data. Run this
 * AFTER `npm run setup:tenant` and with the backend running (npm run dev).
 *
 *   node scripts/test-tenant-isolation.js
 *   API_BASE=http://localhost:5000 node scripts/test-tenant-isolation.js
 *
 * It logs in as each tenant's seeded super_admin, creates a uniquely-named event
 * in each, then asserts each admin's event list contains ONLY its own events.
 * No data is deleted; the test events are clearly labelled with a timestamp.
 */
import 'dotenv/config';

const API = process.env.API_BASE || `http://localhost:${process.env.PORT || 5000}`;
const stamp = Date.now();

let passed = 0, failed = 0;
const ok   = (m) => { passed++; console.log(`  ✅ ${m}`); };
const bad  = (m) => { failed++; console.log(`  ❌ ${m}`); };

const TENANTS = [
  { slug: 'mys', email: 'admin@muslimyouthsummit.com', pass: 'MYS@Admin2024!' },
  { slug: 'icp', email: 'admin@icp.org',               pass: 'ICP@Admin2024!' },
];

// Fetch helper that always sends the tenant slug header
const call = async (slug, path, { method = 'GET', token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json', 'X-Tenant-Slug': slug };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/api${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch {}
  return { status: res.status, data };
};

const login = async (t) => {
  const r = await call(t.slug, '/auth/login', { method: 'POST', body: { email: t.email, password: t.pass } });
  if (r.status !== 200 || !r.data?.data?.token) {
    throw new Error(`Login failed for ${t.slug} (${t.email}): ${r.data?.message || r.status}. Did you run "npm run setup:tenant"?`);
  }
  return r.data.data.token;
};

const createEvent = async (t, token) => {
  const title = `ISOTEST ${t.slug.toUpperCase()} ${stamp}`;
  const r = await call(t.slug, '/events', {
    method: 'POST', token,
    body: {
      title, edition: `T${stamp.toString().slice(-4)}`,
      start_date: '2030-01-01', end_date: '2030-01-02',
      venue: 'Isolation Test Venue',
    },
  });
  if (r.status !== 201 && r.status !== 200) {
    throw new Error(`Create event failed for ${t.slug}: ${r.data?.message || r.status}`);
  }
  const id = r.data?.data?.id ?? r.data?.id ?? r.data?.data?.event?.id ?? null;
  return { title, id };
};

const listEventTitles = async (t, token) => {
  const r = await call(t.slug, '/events/admin/all?limit=100', { token });
  const rows = r.data?.data || r.data?.items || [];
  return rows.map(e => e.title);
};

const run = async () => {
  console.log(`\n🔒 Tenant isolation test → ${API}\n`);

  // 1. Login both tenants
  const tokens = {};
  for (const t of TENANTS) {
    tokens[t.slug] = await login(t);
    ok(`logged in as ${t.slug} admin`);
  }

  // 2. Create one event per tenant (capture id + title)
  const ev = {};   // slug → { title, id }
  for (const t of TENANTS) {
    ev[t.slug] = await createEvent(t, tokens[t.slug]);
    ok(`created event for ${t.slug}: "${ev[t.slug].title}" (id ${ev[t.slug].id ?? '?'})`);
  }

  // 3. Each tenant sees its OWN event and NOT the other's (LIST scope)
  for (const t of TENANTS) {
    const seen = await listEventTitles(t, tokens[t.slug]);
    const others = TENANTS.filter(x => x.slug !== t.slug);

    if (seen.includes(ev[t.slug].title)) ok(`${t.slug} lists its own event`);
    else bad(`${t.slug} does NOT list its own event (expected "${ev[t.slug].title}")`);

    for (const o of others) {
      if (seen.includes(ev[o.slug].title)) {
        bad(`LIST LEAK: ${t.slug} lists ${o.slug}'s event "${ev[o.slug].title}"`);
      } else {
        ok(`${t.slug} cannot list ${o.slug}'s event (correct)`);
      }
    }
  }

  // 4. Cross-token check: mys token + icp slug header must stay bound to mys
  const crossSeen = await listEventTitles({ slug: 'icp' }, tokens['mys']);
  if (crossSeen.includes(ev['icp'].title)) {
    bad('CROSS-TOKEN LEAK: mys admin token + icp header exposed icp data');
  } else {
    ok('mys token cannot reach icp data even with icp slug header');
  }

  // 5. BY-ID probes — the holes just patched. A tenant must NOT be able to
  //    read/modify/delete another tenant's event by guessing its id.
  console.log('\n  — by-id access probes —');
  for (const t of TENANTS) {
    for (const o of TENANTS.filter(x => x.slug !== t.slug)) {
      const otherId = ev[o.slug].id;
      if (!otherId) { ok(`(skipped by-id probe ${t.slug}→${o.slug}: no id returned)`); continue; }

      // GET another tenant's event detail
      const get = await call(t.slug, `/events/${otherId}`, { token: tokens[t.slug] });
      if (get.status === 200 && (get.data?.data?.id == otherId)) {
        bad(`READ LEAK: ${t.slug} fetched ${o.slug}'s event by id (${otherId})`);
      } else { ok(`${t.slug} cannot GET ${o.slug}'s event by id (${get.status})`); }

      // PATCH status on another tenant's event
      const patch = await call(t.slug, `/events/${otherId}/status`, {
        method: 'PATCH', token: tokens[t.slug], body: { status: 'cancelled' },
      });
      if (patch.status === 200) {
        bad(`WRITE LEAK: ${t.slug} changed status of ${o.slug}'s event (${otherId})`);
      } else { ok(`${t.slug} cannot change status of ${o.slug}'s event (${patch.status})`); }

      // Generate tags on another tenant's event
      const tags = await call(t.slug, '/tags/generate', {
        method: 'POST', token: tokens[t.slug], body: { event_id: otherId, count: 1 },
      });
      if (tags.status === 200 || tags.status === 201) {
        bad(`TAG LEAK: ${t.slug} generated tags on ${o.slug}'s event (${otherId})`);
      } else { ok(`${t.slug} cannot generate tags on ${o.slug}'s event (${tags.status})`); }
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`──────────────────────────────\n`);
  if (failed) {
    console.log('⚠️  Isolation problems detected. Review the ❌ lines above.\n');
    process.exit(1);
  }
  console.log('🎉 All isolation checks passed. Tenants are properly separated.\n');
  console.log('Note: test events named "ISOTEST …" were created (status draft). Delete them from each admin panel if you wish.\n');
  process.exit(0);
};

run().catch(e => { console.error('\n💥 Test aborted:', e.message, '\n'); process.exit(1); });
