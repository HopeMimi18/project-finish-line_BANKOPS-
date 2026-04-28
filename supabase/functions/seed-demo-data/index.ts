import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tokenPreview(value: string): string {
  return value.length <= 8 ? value : `${value.slice(0, 3)}...${value.slice(-4)}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

const SAMPLE_DOCS = [
  {
    filename: "ACME_dispute_2025-04.txt",
    classification: "ops",
    body: `Client: Acme Holdings (Pty) Ltd
Dispute reference: DSP-2025-04-118
Account holder ID: 8001015009087
Card last4: 4242
SWIFT: SBZAZAJJ
Amount: ZAR 12,450.00

Notes: Customer reports unauthorised debit order on 2 April 2025. Direct debit
from "Northglen Holdings" not recognised. Customer requests reversal under
Direct Debit Indemnity scheme. KYC re-verified 12 March 2025.`,
  },
  {
    filename: "BlueRiver_KYC_renewal.txt",
    classification: "compliance",
    body: `Entity: Blue River Trading CC
Entity reg: 2018/123456/23
Beneficial owner ID: 9203145678082
Risk rating: Medium (post-2024 review)

POPIA consent on file (signed 2024-09-12). Source-of-funds declaration
attached. PEP screening: clear. Sanctions screening: clear (last run 2025-04-01).`,
  },
  {
    filename: "OpsHandover_2025_W15.txt",
    classification: "ops",
    body: `Weekly ops handover, week 15 2025.

- 14 SADC payment instructions pending compliance sign-off
- 3 break-glass document accesses logged (all justified, all reviewed)
- 1 anomaly alert: User opsuser2 downloaded 8 files in 4 minutes; reviewed,
  legitimate batch reconciliation. No action.`,
  },
  {
    filename: "SupportTicket_T-9921.txt",
    classification: "support",
    body: `Ticket T-9921 — Card delivery delay
Customer: J. Naidoo (account ****8821)
Channel: Branch · Sandton

Replacement card ordered 2025-04-08 not received. Re-issuance triggered;
courier tracking forwarded to customer. SLA 48h.`,
  },
  {
    filename: "ComplianceMemo_PA-Directive-3.txt",
    classification: "compliance",
    body: `Internal memo — PA Directive 3 of 2024 readiness

Status: Phase 2 controls 87% implemented. Outstanding items:
 - Cross-border transfer logging for SADC corridor
 - Quarterly insider-risk attestation
 - AI usage register (NEW — pilot underway with BankOps Copilot)

Next review: 2025-05-15.`,
  },
];

const SAMPLE_AUDIT = [
  { action: "doc.upload", result: "ok" },
  { action: "doc.view", result: "ok" },
  { action: "doc.view", result: "denied", meta: { reason: "classification mismatch" } },
  { action: "token.issue", result: "ok", meta: { permissions: ["read"], ttl_seconds: 600 } },
  { action: "token.use", result: "ok" },
  { action: "ai.assist", result: "ok", meta: { task: "summarise", pii_findings: 1, redactions: ["SA_ID"] } },
  { action: "doc.download", result: "ok", meta: { justification: { category: "client_request", note: "Customer requested copy" } } },
  { action: "anomaly.flag", result: "ok", meta: { type: "bulk_download", count: 8, window_minutes: 4 } },
  { action: "breakglass.enable", result: "ok", meta: { duration_minutes: 15, reason: "Urgent regulator query" } },
  { action: "breakglass.disable", result: "ok" },
  { action: "role.assign", result: "ok", meta: { target_role: "compliance" } },
];

function generateCid(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return "doc_" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email?.toLowerCase() ?? "";
    const isDemoUser = userEmail === "demo@bankops.example";

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Authorise: only manager/admin can seed
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const roleSet = new Set((roles ?? []).map((r) => r.role));
    if (!isDemoUser && !roleSet.has("manager") && !roleSet.has("admin")) {
      return new Response(JSON.stringify({ error: "manager or admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const summary: Record<string, number> = {};

    // 1) Clients
    const clientsToUpsert = [
      { code: "ACME", name: "Acme Holdings (Pty) Ltd" },
      { code: "BLUE", name: "Blue River Trading CC" },
    ];
    const { data: existingClients } = await admin
      .from("clients")
      .select("id, code")
      .in("code", clientsToUpsert.map((c) => c.code));
    const haveCodes = new Set((existingClients ?? []).map((c) => c.code));
    const missing = clientsToUpsert.filter((c) => !haveCodes.has(c.code));
    if (missing.length) {
      const { data: inserted } = await admin
        .from("clients")
        .insert(missing)
        .select("id, code");
      summary.clients_created = inserted?.length ?? 0;
    } else {
      summary.clients_created = 0;
    }
    const { data: allClients } = await admin
      .from("clients")
      .select("id, code")
      .in("code", ["ACME", "BLUE"]);
    const clientByCode: Record<string, string> = {};
    for (const c of allClients ?? []) clientByCode[c.code] = c.id;

    // 2) Documents (storage upload + DB row)
    summary.documents_created = 0;
    const createdDocIds: string[] = [];
    for (const doc of SAMPLE_DOCS) {
      const cid = generateCid();
      const path = `${userId}/${cid}_${doc.filename}`;
      const { error: upErr } = await admin.storage
        .from("documents")
        .upload(path, new Blob([doc.body], { type: "text/plain" }), {
          contentType: "text/plain",
          upsert: false,
        });
      if (upErr && !upErr.message.includes("exists")) continue;

      const clientId =
        doc.filename.startsWith("ACME") ? clientByCode["ACME"] :
        doc.filename.startsWith("BlueRiver") ? clientByCode["BLUE"] : null;

      const { data: docRow, error: docErr } = await admin
        .from("documents")
        .insert({
          owner_id: userId,
          cid,
          filename: doc.filename,
          content_type: "text/plain",
          size_bytes: doc.body.length,
          classification: doc.classification,
          storage_path: path,
          client_id: clientId,
        })
        .select("id, cid")
        .single();
      if (!docErr && docRow) {
        createdDocIds.push(docRow.id);
        summary.documents_created++;
      }
    }

    // 3) Tokens (one per first 3 docs)
    summary.tokens_created = 0;
    for (let i = 0; i < Math.min(3, createdDocIds.length); i++) {
      const docId = createdDocIds[i];
      const { data: docInfo } = await admin
        .from("documents")
        .select("cid")
        .eq("id", docId)
        .single();
      if (!docInfo) continue;
      const tokArr = new Uint8Array(24);
      crypto.getRandomValues(tokArr);
      const tokenStr =
        "tk_" +
        Array.from(tokArr).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 40);
      const expires = new Date(Date.now() + (i === 0 ? 600_000 : 3_600_000)).toISOString();
      const { error: tokErr } = await admin.from("tokens").insert({
        token_hash: await sha256Hex(tokenStr),
        token_preview: tokenPreview(tokenStr),
        document_id: docId,
        scope_cid: docInfo.cid,
        permissions: ["read"],
        expires_at: expires,
        created_by: userId,
      });
      if (!tokErr) summary.tokens_created++;
    }

    // 4) Audit events
    summary.audit_events_created = 0;
    for (const ev of SAMPLE_AUDIT) {
      const docId = createdDocIds.length
        ? createdDocIds[Math.floor(Math.random() * createdDocIds.length)]
        : null;
      const { error: evErr } = await admin.from("audit_events").insert({
        user_id: userId,
        action: ev.action,
        result: ev.result,
        document_id: docId,
        meta: ev.meta ?? {},
      });
      if (!evErr) summary.audit_events_created++;
    }

    // Final marker event
    await admin.from("audit_events").insert({
      user_id: userId,
      action: "demo.seed",
      result: "ok",
      meta: { summary },
    });

    return new Response(JSON.stringify({ ok: true, summary }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});