# 72-Hour AWS Virtual League Build Plan

## Goal

Build a portfolio-grade AWS-native version of BankOps Copilot that demonstrates secure AI governance for banking: scoped document access, tamper-evident audit chain, PII redaction, break-glass controls, and an MCP server for agent integration.

## Scope

72 hours of active build time, plus optional pre-event preparation. The plan assumes one builder working in focused blocks. Each block is either 4 hours (deep work) or 2 hours (integration/validation). Daily total is 10 hours of work with 8 hours reserved for sleep and rest.

---

## Day 0 — Before the event starts (allowed preparation)

| Time block | Task | Deliverable |
|---|---|---|
| 2h | AWS account setup, IAM budget alert, free-tier check | Account ready, budget alarm at $10 |
| 2h | Create empty GitHub repo, CI/CD skeleton, README | Repo with branch strategy and issue labels |
| 2h | Draw final architecture diagram and API contract | Architecture diagram + OpenAPI sketch |
| 2h | Validate Lovable project export feasibility | List of components that can be reused vs rewritten |
| 2h | Prepare pitch deck template | Empty slide deck with 5 sections: problem, solution, demo, AWS stack, future |

---

## Day 1 — Foundation (0h to 24h)

### 00:00–04:00 — AWS account and networking

1. Create VPC with public and private subnets across 2 AZs.
2. Set up Internet Gateway, NAT Gateway, and security groups.
3. Create RDS PostgreSQL instance in private subnet.
4. Create S3 bucket for documents with encryption and block-public-access.
5. Create CloudFront distribution for the frontend (placeholder).

Deliverables: VPC, RDS reachable, S3 bucket, CloudFront distribution.

### 04:00–08:00 — Authentication and roles

1. Create Cognito User Pool with email and Google sign-in.
2. Configure custom attributes: `role` (ops, compliance, manager, support).
3. Create Cognito App Client with allowed OAuth scopes.
4. Build a small React login page that exchanges tokens with Cognito.
5. Verify token contains `sub`, `email`, and `custom:role`.

Deliverables: Cognito pool, sign-in flow, JWT with role claim.

### 08:00–12:00 — Database schema and RLS patterns

1. Create tables: `clients`, `documents`, `tokens`, `audit_events`, `client_assignments`, `system_settings`.
2. Add `user_id` and `client_id` ownership columns.
3. Implement helper functions: `has_role`, `current_user_id`, `is_manager_or_admin`.
4. Replace Supabase RLS with query filters in SQL functions keyed on Cognito `sub`.
5. Seed minimum required lookup data.

Deliverables: Schema deployed, helper functions tested, test queries return correct rows per role.

### 12:00–16:00 — Lambda function skeleton

1. Create Lambda functions: `ai-assist`, `download-document`, `write-audit-event`, `list-documents`, `seed-demo-data`, `demo-login`.
2. Create API Gateway routes and map them to Lambdas.
3. Add CORS headers and Zod input validation to each handler.
4. Deploy a hello-world endpoint for each function.

Deliverables: API Gateway live, all functions return 200 with CORS.

### 16:00–18:00 — End-of-day validation

1. Run a manual integration test: sign in, call list-documents.
2. Verify CloudWatch logs are readable.
3. Commit all code and write Day 1 status in README.

Deliverables: Day 1 demo video or screenshot, clean Git history.

---

## Day 2 — Core features (24h to 48h)

### 00:00–04:00 — Document upload, storage, and metadata

1. Implement S3 pre-signed URL upload from the frontend.
2. Implement `documents` insert Lambda with metadata extraction.
3. Implement classification tagging (public, internal, confidential, restricted).
4. Add S3 lifecycle rule to delete temporary uploads after 24 hours if not committed.
5. Test upload and retrieval for each role.

Deliverables: Document upload works, metadata stored, roles see correct documents.

### 04:00–08:00 — AI assist with PII redaction

1. Connect `ai-assist` Lambda to Amazon Bedrock.
2. Build prompt with PII regex guardrails (SA ID, account number, SWIFT).
3. Log every AI request to `audit_events`.
4. Implement scoped access: the assistant only sees documents the user can access.
5. Add a simple chat UI in the frontend.

Deliverables: AI assistant answers questions without leaking PII, audit log captures each interaction.

### 08:00–12:00 — Audit chain and tamper evidence

1. Implement `audit_events` table with hash-linking: each row hashes the previous hash plus current payload.
2. Implement `verify_audit_chain()` SQL function.
3. Add `write-audit-event` Lambda for external actions.
4. Add anomaly alerts when the chain breaks or high-risk action occurs.
5. Show the chain in the frontend.

Deliverables: Audit chain intact, verification function returns true, alerts visible.

### 12:00–16:00 — Tokens, clients, and break-glass

1. Implement ephemeral access tokens table with expiry and revocation.
2. Implement client list and assignment logic.
3. Implement break-glass toggle controlled by manager role only.
4. Add a read-only view for demo account.

Deliverables: Tokens created/revoked, break-glass works, demo view is read-only.

### 16:00–20:00 — MCP server and OAuth

1. Create the MCP server as a Lambda function behind API Gateway.
2. Wire OAuth 2.1 token validation via Cognito.
3. Port tools: `list_documents`, `get_document`, `list_audit_events`, `list_tokens`, `list_clients`.
4. Test tool list and invoke endpoints locally and via API Gateway.

Deliverables: MCP server returns tool list, invokes require valid OAuth token.

### 20:00–22:00 — End-of-day validation

1. Run a full scenario: sign in, upload a document, ask AI about it, check audit chain.
2. Verify MCP invocation logs.
3. Commit and update Day 2 status.

Deliverables: Day 2 demo video, issue log for Day 3.

---

## Day 3 — Polish, demo, pitch (48h to 72h)

### 00:00–04:00 — Frontend finish and routing

1. Complete all routes: dashboard, documents, audit, tokens, clients, admin, access requests, roadmap, one-pager, OAuth consent.
2. Add loading states, error toasts, and empty states.
3. Add a clean landing page with "Try the demo" button.
4. Make the UI responsive.

Deliverables: Frontend routes work, UI is polished.

### 04:00–08:00 — Demo data and one-pager

1. Implement `seed-demo-data` Lambda for ACME and Blue River demo clients.
2. Create the `/one-pager` route with a print/PDF export.
3. Add one-pager content: problem, solution, AWS architecture, why AWS, future work.
4. Test one-pager PDF export quality.

Deliverables: One-pager live, demo data populates the dashboard.

### 08:00–12:00 — Security hardening and validation

1. Add IAM least-privilege policies for each Lambda.
2. Rotate any temporary secrets.
3. Enable CloudTrail logging.
4. Verify no hardcoded secrets in the repo.
5. Run a manual security checklist.

Deliverables: IAM tightened, CloudTrail active, no secrets in code.

### 12:00–16:00 — Performance and cost checks

1. Add Lambda cold-start mitigation where needed.
2. Check CloudWatch metrics and cost explorer.
3. Reduce Bedrock model calls if over-budget.
4. Optimize S3 signed URL expiration.

Deliverables: App feels fast, AWS bill is under $10.

### 16:00–20:00 — Pitch deck and demo script

1. Finalize the 5-section pitch deck.
2. Write a 2-minute demo script.
3. Record a 2-minute demo video.
4. Prepare backup static screenshots in case of live demo failure.

Deliverables: Pitch deck, demo script, demo video.

### 20:00–22:00 — Final deployment and submission

1. Deploy final version to the live AWS environment.
2. Run a full end-to-end test from the landing page.
3. Submit project, demo link, and code repository.
4. Write a brief post-mortem of what worked and what was cut.

Deliverables: Live app, submission complete, post-mortem written.

---

## Assumptions

- One builder, no dedicated DevOps support.
- AWS Free Tier is available and sufficient for the demo.
- The Lovable project is used as a design reference, not directly deployed.
- Judging criteria include technical depth, AWS service usage, and banking relevance.

## Cut list if time runs short

In order of priority, drop these last:

1. Access Requests / Scoped Views prototype.
2. One-pager PDF export polish.
3. Full MCP OAuth consent screen UI.
4. Responsive mobile UI refinements.
5. Multi-AZ failover or advanced networking.

## Non-negotiables

These must work by hour 72:

- Sign-in and role-based document access.
- AI assist with PII redaction.
- Tamper-evident audit chain.
- Live demo recording.
- Clean AWS architecture story.
