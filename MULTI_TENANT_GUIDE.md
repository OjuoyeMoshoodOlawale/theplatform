# Multi-Tenant Platform — Operator Guide

> This guide lives on the **`multi-tenant-platform`** branch only.
> The single-tenant **MYS** app lives on **`main`**. The two are kept separate
> and will be split into different repositories later — do not merge one into
> the other.

---

## What this is

A multi-tenant SaaS version of the event platform. One deployment hosts many
organisations, each at its own URL slug with its own branding, admins, events,
participants, payments, and pages:

```
yourplatform.com/          → 3D landing (every live space orbits the hub)
yourplatform.com/mys       → Muslim Youth Summit's space
yourplatform.com/icp       → Islamic Camping Programs' space
yourplatform.com/<slug>    → any organisation
yourplatform.com/platform  → platform-owner dashboard (manage all tenants)
```

Each tenant gets the **full** feature set: registration, multi-ticket purchase,
check-in, tags + QR, certificates, souvenir shop, email campaigns, SMS,
hostels, reports — all isolated to that tenant.

---

## First-time setup

> ⚠️ **Separate database.** The platform uses its OWN database (`event_platform`),
> not the MYS database (`mys_platform`). Never run `setup:tenant` against the MYS
> production DB. Copy `.env.example` → `.env` and set `DB_NAME=event_platform`.

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env          # then edit: DB_NAME=event_platform, JWT_SECRET, etc.

#    Create the platform DB and load the BASE schema into it first
#    (tenant-schema only ADDS tenant columns to existing tables):
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS event_platform"
mysql -u root -p event_platform < src/database/schema.sql

#    Then create the tenants layer + seed platform admin + mys & icp tenants
#    + backfill base rows to the "mys" tenant:
npm run setup:tenant

# 2. Start the API
npm run dev            # http://localhost:5000

# 3. Verify isolation (in a second terminal, API must be running)
npm run test:tenant    # logs in as mys + icp, asserts no data crosses over

# 4. Frontend
cd ../frontend
npm install            # installs three.js for the 3D landing
npm run dev            # http://localhost:5173
```

### Seeded logins (change these in production)

| Role | URL | Email | Password |
|------|-----|-------|----------|
| Platform owner | `/platform/login` | `owner@theplatform.com` | `Platform@2025!` |
| MYS super admin | `/mys/admin/login` | `admin@muslimyouthsummit.com` | `MYS@Admin2024!` |
| ICP super admin | `/icp/admin/login` | `admin@icp.org` | `ICP@Admin2024!` |

---

## Adding a new organisation

1. Sign in at `/platform/login` as the platform owner.
2. On the dashboard, click **+ New Organisation**.
3. Fill in: name, URL slug (lowercase letters/numbers/hyphens), tagline,
   primary + accent colours, and the first super-admin's name/email/password.
4. Create. The org is live at `/<slug>` immediately and appears orbiting on the
   3D landing.
5. Hand the new super-admin their `/<slug>/admin/login` URL + credentials.

You can also **suspend / re-activate** any org from the dashboard. A suspended
org returns 403 on all its routes.

---

## Tenant self-service (each org's super-admin)

Inside their own admin panel → **Branding** (`/<slug>/admin/branding`):

- **Identity**: name, tagline, description, logo URL
- **Colours**: primary / secondary / accent / background (live preview). These
  re-theme the whole space via CSS variables.
- **Contact & social**: email, phone, website, Instagram/Twitter/Facebook
- **Payment (Paystack)**: their own public + secret keys. If set, payments go to
  **their** Paystack account; if left blank, the platform `.env` keys are used.
- **Custom pages**: create/edit/delete pages shown at `/<slug>/p/<page-slug>`
  (e.g. an About or Code-of-Conduct page) with HTML content.

Everything else (events, tickets, tags, check-in, shop, email, reports) works
exactly like the single-tenant app, scoped to that org.

---

## How isolation works (for maintainers)

- **Resolution**: `resolveTenantOptional` (mounted on `/api`) reads the
  `X-Tenant-Slug` header (the SPA sets it from the URL slug) and attaches
  `req.tenant`. The authenticated admin's JWT also carries `tenant_id`, loaded
  into `req.admin`.
- **Scoping**: `utils/tenantScope.js` → `scopeId(req)` returns the effective
  tenant id (**admin's own tenant wins**, then header tenant, then null).
  `tenantWhere(req, alias)` appends `AND (alias.tenant_id = ? OR ... IS NULL)`.
  `stampId(req)` is written onto new rows.
- **Why `OR IS NULL`**: keeps a single-tenant / un-seeded install working
  unchanged. After `setup:tenant` backfills, base data belongs to `mys`.
- **Scoped entities**: events, participants, souvenirs, sponsors, hostels,
  departments, email campaigns, admins (create/list/login).
  `ticket_types` are isolated **transitively** through their event.
  `event_categories` are intentionally **global**.
- **Uniqueness**: `admins.email` and participant lookups are unique **per
  tenant** (the same email can run accounts / register in different orgs).
- **Payments**: `utils/paystackKeys.js` → `resolvePaystackKeys(tenant)` chooses
  the tenant's keys or falls back to `.env`. Wired into all ticket + souvenir
  init/verify calls.

### Run the isolation test any time

```bash
npm run test:tenant
```

Creates one `ISOTEST` event per tenant and asserts neither can see the other's,
including a cross-token check. Non-zero exit on any leak.

---

## The 3D landing

`/` renders `PlatformHero3D` (Three.js): a central wireframe hub with one glowing
node per **active** tenant (from public `GET /api/tenants`) orbiting it,
connecting lines pulsing outward, a starfield, mouse-parallax, and click-to-enter
on each node. It's lazy-loaded — Three.js ships only on this route. Honors
`prefers-reduced-motion`.

---

## Keeping branches separate (important)

- `main` = single-tenant **MYS** production. No tenant files.
- `multi-tenant-platform` = this SaaS version.
- **Do not merge** main → multi-tenant or vice versa for features. Cherry-pick
  only genuine shared bug fixes if needed, deliberately.
- Planned: split into two repositories. When that happens, this branch becomes
  its own repo's `main`.

---

## Production checklist (multi-tenant)

- [ ] Rotate all seeded passwords; set a strong `JWT_SECRET`.
- [ ] Set platform-default `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` in
      `.env` (used by tenants who don't set their own).
- [ ] Configure SMTP (used by all tenants for email).
- [ ] Encrypt or vault tenant `paystack_secret_key` at rest (currently stored
      plain in the `tenants` table — acceptable for trusted orgs, review before
      onboarding untrusted ones).
- [ ] Point a wildcard/path router so `/<slug>` resolves correctly behind your
      host.
- [ ] Run `npm run test:tenant` against staging after each deploy.
