// Justification-required document download.
// - Authenticated caller
// - Caller must satisfy the same RLS visibility rules
// - Reason category + free-text required
// - Returns a short-lived signed URL and writes a "document.download" audit event
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const REASONS = new Set([
  "client_request",
  "internal_review",
  "audit",
  "compliance_investigation",
  "ops_handover",
  "other",
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  const { data: u, error: uerr } = await userClient.auth.getUser(
    auth.replace("Bearer ", ""),
  );
  if (uerr || !u?.user) return json({ error: "Unauthorized" }, 401);
  const userId = u.user.id;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  let body: { document_id?: string; reason_category?: string; reason_text?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const docId = (body.document_id ?? "").trim();
  const cat = (body.reason_category ?? "").trim();
  const text = (body.reason_text ?? "").trim();

  if (!docId) return json({ error: "document_id required" }, 400);
  if (!REASONS.has(cat)) return json({ error: "Invalid reason category" }, 400);
  if (text.length < 10) return json({ error: "Reason must be at least 10 characters" }, 400);
  if (text.length > 500) return json({ error: "Reason too long (max 500 chars)" }, 400);

  // Verify visibility via the user-scoped client (so RLS is the source of truth)
  const { data: doc, error: docErr } = await userClient
    .from("documents")
    .select("id, cid, filename, classification, storage_path, size_bytes, client_id")
    .eq("id", docId)
    .maybeSingle();

  if (docErr || !doc) {
    await admin.from("audit_events").insert({
      user_id: userId,
      action: "document.download",
      document_id: docId || null,
      result: "denied",
      meta: { reason: "not_visible_or_missing", reason_category: cat },
    });
    return json({ error: "Document not found or not accessible" }, 403);
  }

  // Generate a short-lived signed URL via service role
  const { data: signed, error: signErr } = await admin.storage
    .from("documents")
    .createSignedUrl(doc.storage_path, 60); // 60s

  if (signErr || !signed?.signedUrl) {
    await admin.from("audit_events").insert({
      user_id: userId,
      action: "document.download",
      document_id: doc.id,
      resource_cid: doc.cid,
      result: "error",
      meta: { reason: "signing_failed", reason_category: cat },
    });
    return json({ error: "Could not prepare download" }, 500);
  }

  await admin.from("audit_events").insert({
    user_id: userId,
    action: "document.download",
    document_id: doc.id,
    resource_cid: doc.cid,
    result: "ok",
    meta: {
      reason_category: cat,
      reason_text: text,
      filename: doc.filename,
      classification: doc.classification,
      client_id: doc.client_id,
      size_bytes: doc.size_bytes,
    },
  });

  return json({
    url: signed.signedUrl,
    filename: doc.filename,
    expires_in: 60,
  });
});
