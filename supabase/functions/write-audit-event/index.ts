import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ACTION_RE = /^[a-z][a-z0-9_.:-]{0,99}$/;
const RESULTS = new Set(["ok", "error", "denied"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(
    auth.replace("Bearer ", ""),
  );
  if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

  let body: {
    action?: string;
    document_id?: string | null;
    resource_cid?: string | null;
    result?: string;
    meta?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const action = (body.action ?? "").trim();
  const documentId = typeof body.document_id === "string" && body.document_id.trim().length > 0
    ? body.document_id.trim()
    : null;
  const resourceCid = typeof body.resource_cid === "string" && body.resource_cid.trim().length > 0
    ? body.resource_cid.trim()
    : null;
  const result = (body.result ?? "ok").trim();
  const meta = isPlainObject(body.meta) ? body.meta : {};

  if (!ACTION_RE.test(action)) {
    return json({ error: "Invalid audit action" }, 400);
  }
  if (!RESULTS.has(result)) {
    return json({ error: "Invalid audit result" }, 400);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let normalizedDocumentId: string | null = documentId;
  let normalizedResourceCid: string | null = resourceCid;

  if (documentId || resourceCid) {
    let docQuery = admin
      .from("documents")
      .select("id, cid")
      .limit(1);

    if (documentId && resourceCid) {
      docQuery = docQuery.eq("id", documentId).eq("cid", resourceCid);
    } else if (documentId) {
      docQuery = docQuery.eq("id", documentId);
    } else {
      docQuery = docQuery.eq("cid", resourceCid!);
    }

    const { data: docs, error: docErr } = await docQuery;
    const doc = docs?.[0];

    if (docErr || !doc) {
      return json({ error: "Referenced document not found" }, 400);
    }

    const { data: visibleDoc, error: visibleErr } = await userClient
      .from("documents")
      .select("id")
      .eq("id", doc.id)
      .maybeSingle();

    if (visibleErr || !visibleDoc) {
      return json({ error: "You do not have access to the referenced document" }, 403);
    }

    normalizedDocumentId = doc.id;
    normalizedResourceCid = doc.cid;
  }

  const { error: insertErr } = await admin.from("audit_events").insert({
    user_id: userData.user.id,
    action,
    document_id: normalizedDocumentId,
    resource_cid: normalizedResourceCid,
    result,
    meta,
  });

  if (insertErr) {
    console.error("audit_events insert failed:", insertErr.message);
    return json({ error: "Failed to record audit event" }, 500);
  }

  return json({ ok: true });
});
