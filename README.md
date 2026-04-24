# BankOps Copilot

**AI governance for banks.** Encrypted document storage, ephemeral scoped access tokens, automatic PII redaction, and a tamper-evident audit chain — so employees can use AI safely on real operational work.

> Demo / portfolio project. Synthetic data only. Do not upload real customer PII.

---

## Why this exists

Banks want LLM productivity but cannot hand staff an unbounded ChatGPT key over real customer data. BankOps Copilot models a realistic internal control plane around an LLM:

- **Need-to-know access** — RBAC + per-client segmentation enforced at the database row level (Postgres RLS).
- **No standing access to AI** — every AI call requires a *single-document, time-bound, permission-scoped* ephemeral token.
- **PII never reaches the model** — server-side pre-scan redacts SA IDs, card PANs, account numbers, SWIFT, emails before the prompt is sent.
- **Tamper-evident audit** — every event is hash-chained (SHA-256 of prev row + payload). A manager can run `verify_audit_chain()` to detect any silent edit.
- **Break-glass mode** — managers can freeze token issuance and AI calls in one click during an incident.
- **Insider-risk signals** — bulk downloads, off-hours access, and denial bursts surface as alerts.
- **Justification on download** — reason category + free-text required, recorded forever; PDFs are watermarked with user / time / reason.

## Eight safety layers

1. **Encrypted, private storage** — no public bucket, signed URLs only.
2. **Row-level security** — `user_can_view_doc_v2(role, classification, client)` gates every read.
3. **Ephemeral tokens** — 15–300s TTL, single doc, explicit permissions, revocable.
4. **PII pre-scan** — runs *before* the model call; privileged `pii_override` requires manager/admin.
5. **Hash-chained audit** — append-only, immutable trigger, `verify_audit_chain()` proves integrity.
6. **Break-glass freeze** — system-wide kill switch on token + AI endpoints.
7. **Justification + watermark** — every download is reasoned, every PDF is stamped.
8. **Anomaly alerts** — heuristics over the audit log surface insider-risk patterns.

## Tech stack

- **Frontend** — React 18, Vite, TypeScript, Tailwind, shadcn/ui, TanStack Query, React Router.
- **Backend** — Lovable Cloud (managed Supabase): Postgres + RLS, Storage, Edge Functions (Deno).
- **AI** — Lovable AI Gateway (Gemini / GPT models), no user-supplied keys.
- **Tests** — Vitest + Testing Library.

## Try the demo

1. Sign up at `/auth` (any email — your account is auto-granted the `ops` role).
2. Open **How it works** for the guided tour and onboarding checklist.
3. Hit **Seed demo data** in Admin → instantly populates clients, documents, tokens, audit events.
4. Walk the flow: **Upload → Tokens → AI Assist → Audit → Verify chain**.
5. Press `?` anywhere for keyboard shortcuts.

## Project structure

```
src/
  pages/           # Route components (Dashboard, Upload, Tokens, Assist, Audit, Admin, …)
  components/      # Reusable UI + domain components (AppSidebar, AuditChainVerifier, …)
  contexts/        # AuthContext (session + roles + impersonation)
  lib/bankops.ts   # Domain helpers (CIDs, PII regex, audit log writer)
  integrations/    # Auto-generated Supabase client + types
supabase/
  functions/       # Edge functions: ai-assist, download-document, seed-demo-data
  migrations/      # Schema, RLS policies, hash-chain trigger
```

## License

© 2026 Hope Lekgeu. All rights reserved.

Portfolio demo — not licensed for reuse, redistribution, or commercial use without explicit written permission.

