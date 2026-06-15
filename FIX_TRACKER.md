# MYS Platform — Fix Tracker (main branch)

> Session focus: 3 bugs reported. Plan → fix → verify → document each.

## Issues & Plan

### 🐛 ISSUE 1 — Multi-item cart checkout: "A record with these details already exists"
**Symptom:** Buying multiple items fails with a duplicate-record error.
**Suspected cause:** The multi-item cart endpoint inserts several `souvenir_orders`
rows all sharing ONE `paystack_reference`, but the column still has a UNIQUE
constraint on existing databases (the migration to drop it wasn't run, or the
order_number is duplicated).
**Plan:**
- [ ] Inspect `souvenir_orders` constraints (paystack_reference + order_number)
- [ ] Make the cart insert resilient: unique order_number, shared reference OK
- [ ] Ensure migrate.sql drops the unique index; make the code not depend on it
      by giving each row a unique order_number while sharing the reference
- [ ] If reference must stay unique, store cart as ONE row with line items JSON

### 🐛 ISSUE 2 — A person can't buy multiple times ("record already exists")
**Symptom:** Same buyer purchasing again is blocked by a duplicate constraint.
**Suspected cause:** A UNIQUE constraint on something that shouldn't be unique
(e.g. buyer_email, or participant email, or reused order_number/reference).
**Plan:**
- [ ] Find the UNIQUE constraint causing the block (participants.email? orders?)
- [ ] Allow repeat purchases — only the payment reference must be unique
- [ ] Verify a buyer can place several distinct orders

### 🐛 ISSUE 3 — Attendance page fails to load for attendant role, works for super_admin
**Symptom:** `/admin/attendance` (or check-in) loads for super_admin but not for
the `attendant` role.
**Suspected cause:** An API the attendance page calls is restricted to
super_admin/admin and 403s for attendants; OR a route guard blocks attendants.
**Plan:**
- [ ] Identify every API the attendance/check-in page calls
- [ ] Check which ones `authorize(...)` excludes `attendant`
- [ ] Grant attendants access to the read endpoints they need (stats, lookup)

---

## Progress Log
- (start) Switched to main, created tracker.
- ISSUE 1 cause: cart rows shared one `order_number` (UNIQUE) → 2nd row failed.
  FIX: unique order_number per line (-1,-2…), shared paystack_reference. ✅
- ISSUE 1+2 also: order_number used `COUNT(*)+1` → collides with pending/abandoned
  orders. FIX: timestamp-based collision-proof order numbers (souvenirs). ✅
- ISSUE 2 (tickets): ticketController BLOCKS a participant who already has a paid
  ticket for the event (409). Same email = same participant = blocked.
  FIX PLAN: allow multiple ticket purchases — add quantity, and stop hard-blocking
  repeat buyers. Each ticket gets its own unique_number.
- ISSUE 3 cause: `/attendance/report/:eventId` required authorize('super_admin',
  'admin') — attendants got 403 → AdminAttendance page failed to load on login.
  FIX: added 'attendant' to the allowed roles. All other check-in endpoints
  already only need authenticate. ✅

## RESULT — all 3 fixed
1. ✅ Cart multi-item: unique order_number per line, shared reference
2. ✅ Buy multiple times: removed COUNT(*)+1 collisions + removed hard 409 block
   on repeat ticket buyers (pending rows still reused)
3. ✅ Attendance for attendant role: granted report access

---

## NEXT BATCH — doing all, in order
- [x] TASK A: Verify the 3 fixes + hardened ticket number collisions ✅
- [x] TASK B: True multi-ticket purchase (quantity selector, one payment) ✅
- [ ] TASK C: Continue multi-tenant branch

### TASK B details
- tickets.quantity column added (schema + migrate.sql)
- initiate: accepts quantity (1-20), price × quantity, capacity check for batch,
  returns quantity + unit_price
- verify: increments quantity_sold by ticket.quantity
- frontend: quantity stepper on RegisterTicket, feeInfo × quantity, sent via form

### TASK C progress (multi-tenant-platform branch)
DONE this session:
- Merged main fixes into the branch
- tenantStore.js: loads tenant by slug, applies branding as CSS vars, sets
  X-Tenant-Slug header for all API calls
- tailwind: brand colours now read CSS variables (var(--brand-primary) etc.)
  with MYS defaults → whole app re-themes per tenant

REMAINING (large, deliberate work — next sessions):
- [x] Router: /:slug, /:slug/admin, /:slug/register … + guard that loads tenant ✅
- [x] Platform views: PlatformHome, PlatformLogin, PlatformDashboard, TenantPage ✅
- [x] Slug-aware navigation (useTenantLink + router rescue redirect) ✅
- [x] Scope controllers by tenant_id ✅ DONE:
      events, participants, souvenirs, sponsors, hostels, departments,
      email_campaigns, admins (create+list+login). ticket_types isolated
      transitively via event_id. event_categories global by design.
- [x] Tenant admin branding/colours/logo + custom pages UI (AdminTenantBranding) ✅
- [x] Public branded landing consumes tenantStore (name/logo/colours) ✅
- [x] Per-tenant Paystack wired into ticket + souvenir flows ✅

FINAL STEP (needs a running DB — user action):
- [ ] Run `node backend/scripts/setup-tenant.js` to create the tenants table,
      seed platform admin + mys/icp, and backfill existing rows → MYS.
- [ ] Test end-to-end: visit /mys and /icp, log in, create events, verify
      isolation (mys admin can't see icp data), set per-tenant Paystack + branding.

NOTE: All scoping uses tenantWhere() which INCLUDES NULL rows, so a single-tenant
install (no tenants table populated) keeps working unchanged. The base MYS data
becomes tenant "mys" after the backfill.

## SESSION ADDENDUM — multi-tenant correctness audit (+ 3D landing)
- 3D platform landing (Three.js): hub + per-tenant orbiting nodes, parallax,
  click-to-enter. Lazy-loaded. Production build passes.
- FIXED latent build-breaker: CSS-variable brand colours broke Tailwind /opacity
  utilities → switched to rgb(var(--x-rgb) / <alpha-value>); tenantStore sets
  R G B triplets.
- FIXED admins.email was GLOBALLY unique → now UNIQUE(tenant_id, email) via
  tenant-schema procedure + setup-script fallback. Same email can admin
  multiple orgs.
- FIXED participant find-or-create looked up by email globally in BOTH the
  public ticket flow and the admin manual-register flow → now tenant-scoped +
  stamps tenant_id.
- Added `npm run setup:tenant`.
- Verified: full backend imports clean; frontend production build succeeds.

STILL PENDING (needs your DB): run `cd backend && npm run setup:tenant`, then
test /mys + /icp end-to-end.

## SESSION — full by-id isolation audit complete
Every tenant-owned entity is now isolated at THREE layers:
- LIST queries (tenantWhere filter)
- BY-ID READ (getEvent etc. scoped)
- BY-ID WRITE create/update/delete (scoped + 404 if not owned)

Endpoints hardened this pass:
- events: getEvent, updateEvent, changeEventStatus, deleteEvent
- tags: generateTags (event ownership)
- ticket_types: create, update, delete (event ownership + tenant_id)
- souvenirs: create (+tenant_id, was missing), update, delete
- sponsors: update, delete
- hostels: update, delete
- departments: update, delete
- email_campaigns: update, delete
- speakers: addSpeaker (event ownership + tenant_id)
- participants: find-or-create scoped (ticket + manual register)
- admins: create/list/login scoped; email unique per tenant

Isolation test (npm run test:tenant) probes list + by-id read/write/tag holes.
Also fixed admin sidebar layout (merged from main): removed double-fixed nesting.

REMAINING: only the DB-dependent run (npm run setup:tenant + test:tenant).
