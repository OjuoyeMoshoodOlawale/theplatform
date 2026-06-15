# Multi-Tenant Platform Architecture

> Branch: `multi-tenant-platform`
> Converts the single-tenant MYS app into a multi-tenant SaaS where any
> organisation runs its own branded event space at `platform.com/<slug>`.

## Concept

```
platform.com/mys   → Muslim Youth Summit committee's space
platform.com/icp   → Islamic Camping Programs space
platform.com/<x>   → any organisation
```

Each tenant gets:
- Its own **slug** (`/mys`, `/icp`) — the URL prefix
- Its own **branding**: colours, logo, name, tagline
- Its own **admins, events, participants, tickets, tags, etc.** (fully isolated)
- Its own **custom pages** (about, contact, rich write-ups)
- Its own **Paystack keys** (set in Settings) — falls back to platform `.env` if absent
- Access to **all features** of the base app (registration, check-in, tags,
  certificates, souvenirs, email, SMS, reports…)

## Data model

A `tenants` table sits above everything. Every **root** table gets a
`tenant_id` column. Child tables (e.g. `lectures` under `events`) inherit
tenancy through their parent FK, so they don't all need `tenant_id` — but the
top-level ones do:

Root tables that get `tenant_id`:
- `admins`, `events`, `participants`, `speakers`, `departments`,
  `event_categories`, `hostels`, `sponsors`, `souvenirs`, `email_campaigns`,
  `ticket_types` (if global), `tenant_pages` (new)

Isolation rule: **every query is scoped by `tenant_id`**, resolved from the
URL slug → tenant → injected into `req.tenant`.

## Request flow

```
GET platform.com/mys/api/events
  → tenant middleware reads slug "mys"
  → looks up tenants WHERE slug='mys' → req.tenant = { id, ... }
  → controllers filter all queries by req.tenant.id
```

Frontend:
```
/:slug                → tenant landing (branded)
/:slug/register       → ticket registration
/:slug/admin          → tenant admin panel
/:slug/admin/login    → tenant admin login
```

## Tenant settings (Settings page)

- Branding: primary/secondary/accent colours, logo upload, name, tagline
- Custom pages: title + rich HTML body, shown in nav
- Payment: tenant's own `paystack_public_key` + `paystack_secret_key`
  (encrypted at rest). If empty → use platform `.env` keys.

## Paystack resolution

```js
function getPaystackKeys(tenant) {
  return {
    secret: tenant.paystack_secret_key || process.env.PAYSTACK_SECRET_KEY,
    public: tenant.paystack_public_key || process.env.PAYSTACK_PUBLIC_KEY,
  };
}
```

## Build phases

1. **Schema** — `tenants` + `tenant_pages` tables, `tenant_id` on root tables ✅
2. **Tenant middleware** — resolve slug → req.tenant
3. **Tenant CRUD** — create/manage tenants (super-platform-admin)
4. **Scope existing controllers** — add `tenant_id` filter (incremental)
5. **Frontend slug routing** — `/:slug/...`
6. **Branding system** — dynamic theme from tenant colours
7. **Custom pages** — tenant_pages CRUD + public render
8. **Per-tenant Paystack** — settings + key resolution
9. **Multi-ticket purchase** — buy several tickets in one order

This is a large migration. It's built incrementally so the app keeps working
at each step.
