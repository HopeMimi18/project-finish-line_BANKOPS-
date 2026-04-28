import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

// Fixed credentials for the public read-only demo account.
// Password is intentionally non-secret — this account only ever sees synthetic data.
const DEMO_EMAIL = "demo@bankops.example";
const DEMO_PASSWORD = "demo-bankops-public-2025";
const DEMO_USERNAME = "demo";

async function sha256Hex(value: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function tokenPreview(value: string): string {
  return value.length <= 8 ? value : `${value.slice(0, 3)}...${value.slice(-4)}`;
}

function generateCid(): string {
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return "doc_" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const SAMPLE_DOCS = [
  {
    filename: "ACME_dispute_2025-04.txt",
    classification: "ops" as const,
    body: `Client: Acme Holdings (Pty) Ltd
Dispute reference: DSP-2025-04-118
Account holder ID: 8001015009087
Card last4: 4242
SWIFT: SBZAZAJJ
Amount: ZAR 12,450.00

Notes: Customer reports unauthorised debit order on 2 April 2025.`,
  },
  {
    filename: "BlueRiver_KYC_renewal.txt",
    classification: "compliance" as const,
    body: `Entity: Blue River Trading CC
Beneficial owner ID: 9203145678082
Risk rating: Medium. POPIA consent on file.`,
  },
  {
    filename: "OpsHandover_2025_W15.txt",
    classification: "ops" as const,
    body: `Weekly ops handover, week 15 2025.
- 14 SADC payment instructions pending compliance sign-off
- 1 anomaly alert reviewed, no action.`,
  },
  {
    filename: "SupportTicket_T-9921.txt",
    classification: "support" as const,
    body: `Ticket T-9921 — Card delivery delay.
Replacement card re-issued; courier tracking forwarded to customer.`,
  },
];

const SAMPLE_AUDIT = [
  { action: "doc.upload", result: "ok" },
  { action: "doc.view", result: "ok" },
  { action: "doc.view", result: "denied", meta: { reason: "classification mismatch" } },
  { action: "token.issue", result: "ok", meta: { permissions: ["read"], ttl_seconds: 600 } },
  { action: "ai.assist", result: "ok", meta: { task: "summarise", pii_findings: 1, redactions: ["SA_ID"] } },
  { action: "doc.download", result: "ok", meta: { justification: { category: "client_request" } } },
  { action: "anomaly.flag", result: "ok", meta: { type: "bulk_download", count: 8, window_minutes: 4 } },
];

async function ensureDemoSeed(admin: ReturnType<typeof createClient>, userId: string) {
  // Only seed once: detect by presence of any document owned by demo user.
  const { data: existingDocs } = await admin
    .from("documents")
    .select("id")
    .eq("owner_id", userId)
    .limit(1);
  if (existingDocs && existingDocs.length > 0) return;

  // Clients
  const clientsToUpsert = [
    { code: "ACME", name: "Acme Holdings (Pty) Ltd" },
    { code: "BLUE", name: "Blue River Trading CC" },
  ];
  const { data: existingClients } = await admin
    .from("clients")
    .select("id, code")
    .in("code", clientsToUpsert.map((c) => c.code));
  const haveCodes = new Set((existingClients ?? []).map((c: any) => c.code));
  const missing = clientsToUpsert.filter((c) => !haveCodes.has(c.code));
  if (missing.length) await admin.from("clients").insert(missing);

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

    const { data: docRow } = await admin
      .from("documents")
      .insert({
        owner_id: userId,
        cid,
        filename: doc.filename,
        content_type: "text/plain",
        size_bytes: doc.body.length,
        classification: doc.classification,
        storage_path: path,
        client_id: null,
      })
      .select("id, cid")
      .single();
    if (docRow) createdDocIds.push((docRow as any).id);
  }

  // Tokens
  for (let i = 0; i < Math.min(2, createdDocIds.length); i++) {
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
      "tk_" + Array.from(tokArr).map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 40);
    await admin.from("tokens").insert({
      token_hash: await sha256Hex(tokenStr),
      token_preview: tokenPreview(tokenStr),
      document_id: docId,
      scope_cid: (docInfo as any).cid,
      permissions: ["read"],
      expires_at: new Date(Date.now() + 3_600_000).toISOString(),
      created_by: userId,
    });
  }

  // Audit events
  for (const ev of SAMPLE_AUDIT) {
    const docId = createdDocIds.length
      ? createdDocIds[Math.floor(Math.random() * createdDocIds.length)]
      : null;
    await admin.from("audit_events").insert({
      user_id: userId,
      action: ev.action,
      result: ev.result,
      document_id: docId,
      meta: (ev as any).meta ?? {},
    });
  }

  await admin.from("audit_events").insert({
    user_id: userId,
    action: "demo.seed",
    result: "ok",
    meta: { source: "demo-login auto-seed" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Ensure the demo user exists. listUsers is paginated; filter by email.
    let demoUserId: string | null = null;
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 200,
    });
    if (listErr) throw listErr;
    const found = list.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (found) {
      demoUserId = found.id;
      // Reset password defensively in case it drifted; keeps sign-in working.
      await admin.auth.admin.updateUserById(found.id, {
        password: DEMO_PASSWORD,
        email_confirm: true,
      });
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { username: DEMO_USERNAME, display_name: "Demo (read-only)" },
      });
      if (createErr) throw createErr;
      demoUserId = created.user.id;
    }
    if (!demoUserId) throw new Error("could not resolve demo user id");

    // 2) Ensure the demo user has the roles needed for the showcase experience.
    //    Demo gets `manager` + `ops` so every page is fully functional.
    //    Workspace-wide write paths are sandboxed via `is_demo_user()` RLS
    //    guards on system_settings, clients, user_roles and client_assignments,
    //    so demo visitors cannot affect real-tenant data or escalate to admin.
    const { data: existingRoles } = await admin
      .from("user_roles")
      .select("id, role")
      .eq("user_id", demoUserId);
    const roleRows = (existingRoles ?? []) as { id: string; role: string }[];
    const desired: string[] = ["ops", "manager"];
    for (const role of desired) {
      if (!roleRows.some((r) => r.role === role)) {
        await admin.from("user_roles").insert({ user_id: demoUserId, role });
      }
    }
    // Strip any other elevated roles (e.g. admin) that may have been granted.
    const extras = roleRows
      .filter((r) => !desired.includes(r.role))
      .map((r) => r.id);
    if (extras.length) {
      await admin.from("user_roles").delete().in("id", extras);
    }

    // 3) Seed data once.
    await ensureDemoSeed(admin, demoUserId);

    // 4) Sign in as the demo user using a clean anon client to mint a session.
    const anonClient = createClient(SUPABASE_URL, ANON, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: session, error: signErr } = await anonClient.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (signErr || !session.session) throw signErr ?? new Error("no session returned");

    return new Response(
      JSON.stringify({
        access_token: session.session.access_token,
        refresh_token: session.session.refresh_token,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("demo-login error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});