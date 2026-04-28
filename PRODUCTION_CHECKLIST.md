# Production Checklist

This project ships as a **public showcase demo**. Several components exist
only to make `demo@bankops.example` fully interactive without endangering
real data. Before pointing this codebase at a real tenant or real client
PII, work through every item below.

Treat each section as a hard gate, not a suggestion.

---

## 1. Remove demo-only components

### Code & edge functions

- [ ] **Delete `supabase/functions/demo-login/`** — public unauthenticated
      sign-in endpoint. Anyone calling it gets a session as the demo user.
- [ ] **Delete `supabase/functions/seed-demo-data/`** — populates synthetic
      ACME / Blue River documents, tokens, and audit events.
- [ ] **Delete `src/components/SeedDemoDataButton.tsx`** and remove every
      import / usage from `src/pages/*`.
- [ ] **Delete `src/components/DevRolePanel.tsx`** (UI role impersonation).
      Remove every `<DevRolePanel />` mount. Optionally keep it gated behind
      `import.meta.env.DEV` for local development.
- [ ] **Strip impersonation from `src/contexts/AuthContext.tsx`** —
      remove `impersonatedRoles`, `setImpersonatedRoles`, `isImpersonating`,
      and the `IMPERSONATION_KEY` sessionStorage logic. `roles` should
      equal `realRoles` directly.
- [ ] **Remove demo UI on `src/pages/Landing.tsx`** — the "Try the demo
      (no signup)" button, the `DEMO_EMAIL` constant, the `startDemo`
      handler, and the "How the demo works" credentials card.

### Database

Run as a single migration:

```sql
-- Drop the demo user (cascades to documents, tokens, audit_events,
-- profiles, user_roles, client_assignments via owner_id / user_id).
DELETE FROM auth.users WHERE lower(email) = 'demo@bankops.example';

-- Drop the demo carve-out helper.
DROP FUNCTION IF EXISTS public.is_demo_user();

-- Restore the original RLS policies without `is_demo_user()` branches.
-- Re-create these four policies with the manager/admin check ONLY:
--   public.clients          → "Managers/admins can update clients"
--   public.clients          → "Managers/admins can delete clients"
--   public.client_assignments → "Managers/admins can insert assignments"
--   public.client_assignments → "Managers/admins can delete assignments"
--   public.system_settings  → "Managers/admins can upsert settings"
--   public.system_settings  → "Managers/admins can update settings"

-- Restore assign_user_role / remove_user_role to their non-demo bodies
-- (drop the `IF public.is_demo_user() THEN ...` blocks).

-- Delete seed clients if no real data references them.
DELETE FROM public.clients WHERE code IN ('ACME', 'BLUE');
```

- [ ] Migration applied and `select * from pg_proc where proname = 'is_demo_user'`
      returns zero rows.
- [ ] `select count(*) from auth.users where lower(email) = 'demo@bankops.example'`
      returns 0.
- [ ] Spot-check `pg_policies` for any remaining reference to `is_demo_user`.

---

## 2. Auth hardening

- [ ] **Email confirmation required.** In Cloud → Users → Auth Settings,
      ensure "Confirm email" is **ON**. Test: sign up a new account, verify
      you cannot sign in until the confirmation link is clicked.
- [ ] **Leaked-password protection (HIBP).** In Cloud → Users → Auth
      Settings → Email, enable **Password HIBP Check**. Test by trying to
      sign up with `Password123!`.
- [ ] **Minimum password length ≥ 12** and require mixed character classes
      in Cloud auth settings.
- [ ] **Disable any unused providers.** Only Email + Google should be on
      unless a specific business case justifies more.
- [ ] **Rotate `SUPABASE_SERVICE_ROLE_KEY`** if it was ever shared during
      demo development. Use Cloud → API → Rotate keys.
- [ ] **Rotate `LOVABLE_API_KEY`** for the same reason.
- [ ] **Set `Site URL` and `Redirect URLs`** in Cloud auth settings to the
      production domain only — remove `localhost`, preview URLs, and
      `*.lovable.app` entries.
- [ ] **Session lifetime** reviewed (default 1h access token + 30d refresh
      may be too long for a banking app — consider 15 min / 8 h).

---

## 3. Authorization & RLS audit

- [ ] Run `security--run_security_scan` and resolve every finding (or
      document why it is an accepted risk in this file).
- [ ] Run the Supabase linter (`supabase--linter`) — zero ERROR-level
      issues, every WARN documented.
- [ ] **Manually verify every table has RLS enabled.** Query:
      `select tablename from pg_tables where schemaname='public' and rowsecurity=false;`
      → must return zero rows.
- [ ] **Verify every table has explicit policies for SELECT / INSERT /
      UPDATE / DELETE** as appropriate. Missing INSERT policy = no inserts;
      missing SELECT policy = no reads — both are fine, but be deliberate.
- [ ] **Test each role end-to-end** with a real signed-in account:
      - `support` cannot view `ops` or `compliance` documents.
      - `ops` cannot toggle break-glass.
      - `compliance` cannot delete clients.
      - `manager` cannot grant `admin`.
      - `admin` actions appear in `audit_events` with correct `actor`.
- [ ] **Verify SECURITY DEFINER functions** — every one has either
      `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` or an internal
      `has_role()` check on the first line.
- [ ] **Confirm `user_roles` cannot be mutated from the client.** RLS has
      explicit `Deny client INSERT/UPDATE/DELETE` policies — verify they
      are still present.

---

## 4. Edge function hardening

- [ ] **Rate limiting** on every edge function. Minimum:
      - `ai-assist`: 30 req/min per user (cost control + abuse).
      - `download-document`: 60 req/min per user.
      - `write-audit-event`: 120 req/min per user.
      - Any future public/auth endpoints: 10 req/min per IP.
- [ ] **JWT validation in code** for every function — confirm every
      `index.ts` has `supabase.auth.getClaims(token)` or equivalent before
      doing work.
- [ ] **Input validation** with Zod on every function body and query
      param. Reject with 400 on invalid input.
- [ ] **CORS allow-list** — replace `Access-Control-Allow-Origin: *` with
      an explicit list of production origins.
- [ ] **Logging** — confirm no edge function logs PII, secrets, or full
      request bodies. `console.error` only on actual errors.
- [ ] **Timeouts** — every external HTTP call (LLM gateway, etc.) has a
      hard timeout (≤ 30s) and is wrapped in try/catch.
- [ ] **AI assist guardrails** — confirm PII regex coverage for the target
      jurisdiction (currently SA: ID numbers, account numbers, SWIFT). Add
      tests for false-negative cases.

---

## 5. Storage & data

- [ ] **`documents` bucket is private** (it is — verify in Storage settings).
- [ ] **Storage RLS policies** scope reads to owner + authorised roles.
      Test signed-out access returns 403.
- [ ] **Backups** — confirm Cloud automatic backups are enabled and
      retention meets the regulator's requirement (POPIA: 5 years for
      financial records).
- [ ] **Point-in-time recovery** enabled if available on the plan.
- [ ] **No real PII in seed data, fixtures, tests, or git history.** Run
      `git log -p | grep -E '[0-9]{13}'` to scan for SA-ID-shaped numbers.

---

## 6. Frontend hardening

- [ ] **Remove all `console.log`** with sensitive context. `bunx eslint
      --rule 'no-console: error' src/` should pass.
- [ ] **Source maps** disabled in the production build (or uploaded to a
      private error tracker only).
- [ ] **CSP headers** set on the hosting layer — at minimum
      `default-src 'self'` plus the Supabase + LLM gateway origins.
- [ ] **No hardcoded secrets** in `src/`. Only `VITE_SUPABASE_URL` and
      `VITE_SUPABASE_PUBLISHABLE_KEY` (anon) are allowed in client code.
- [ ] **Dependency scan** clean: run `code--dependency_scan`, fix all
      high/critical CVEs.
- [ ] **`<meta name="robots">`** allows indexing only on intended pages.
      Block `/admin`, `/audit`, `/clients` from search engines.

---

## 7. Observability & incident response

- [ ] **Audit chain verification scheduled** — run
      `select * from public.verify_audit_chain()` daily; alert if `intact = false`.
- [ ] **Anomaly alerts wired to a real channel** (email / Slack /
      PagerDuty) — currently they only display in-app.
- [ ] **Edge function logs shipped** to a long-retention store (Cloud
      keeps ~7 days). Required for forensic queries.
- [ ] **Incident runbook** drafted: how to revoke all tokens, force
      sign-out all sessions, disable break-glass, rotate keys.
- [ ] **On-call rotation** defined for the team owning this app.

---

## 8. Compliance (South African banking context)

- [ ] **POPIA**: data-subject access request procedure documented;
      retention policy applied; cross-border transfer log in place.
- [ ] **PA Directive 3 of 2024**: AI usage register populated; quarterly
      insider-risk attestation scheduled; SADC corridor logging confirmed.
- [ ] **Records-management policy** signed off — what gets deleted when.
- [ ] **Threat model** (`/threat-model` page) reviewed by security lead
      and signed off.
- [ ] **DPIA** completed if processing special-category personal info.
- [ ] **Vendor due-diligence** complete for the LLM provider (data
      residency, training opt-out, sub-processor list).

---

## 9. Launch gates

Do not flip DNS / share the production URL until **every box above is
checked** and the following are recorded:

- [ ] Date of last `security--run_security_scan` (clean): _______________
- [ ] Date of last `supabase--linter` (clean or documented): _______________
- [ ] Date of last manual RLS role-test pass: _______________
- [ ] Approver name (security): _______________
- [ ] Approver name (compliance): _______________
- [ ] Production launch date: _______________

---

_Last updated: keep this file in sync with every change to demo affordances
or auth/RLS policy. If you add a new demo-only carve-out, add the matching
removal step here in the same commit._