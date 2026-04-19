// AI Assist edge function — token-validated, calls Lovable AI
// Tasks: summarize | keywords | classify
// Supports text/* + PDF + DOCX (server-side text extraction)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Task = "summarize" | "keywords" | "classify";

const SYSTEM_PROMPTS: Record<Task, string> = {
  summarize:
    "You are a banking operations assistant. Summarize the document in 3-5 concise bullet points. Focus on entities, amounts, dates, and required actions. Do not invent facts.",
  keywords:
    "You are a banking operations assistant. Extract 5-12 keywords or key phrases from the document. Return them as a comma-separated list, nothing else.",
  classify:
    "You are a banking operations assistant. Classify the document into exactly one of: support, ops, compliance. Reply with the single word only.",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function logAudit(
  admin: ReturnType<typeof createClient>,
  args: {
    user_id: string | null;
    action: string;
    document_id?: string | null;
    resource_cid?: string | null;
    result?: string;
    meta?: Record<string, unknown>;
  },
) {
  try {
    await admin.from("audit_events").insert({
      user_id: args.user_id,
      action: args.action,
      document_id: args.document_id ?? null,
      resource_cid: args.resource_cid ?? null,
      result: args.result ?? "ok",
      meta: args.meta ?? {},
    });
  } catch (e) {
    console.warn("audit insert failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  // Authenticate caller
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userErr || !userData?.user) {
    return json({ error: "Unauthorized" }, 401);
  }
  const userId = userData.user.id;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  // Break-glass check
  const { data: bg } = await admin
    .from("system_settings")
    .select("value")
    .eq("key", "break_glass")
    .maybeSingle();
  if ((bg?.value as any)?.enabled === true) {
    await logAudit(admin, {
      user_id: userId,
      action: "ai.assist",
      result: "denied",
      meta: { reason: "break_glass_active" },
    });
    return json({ error: "Break-glass mode is active. AI calls are frozen." }, 423);
  }

  let body: { token?: string; task?: Task };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const token = (body.token ?? "").trim();
  const task = body.task as Task;
  if (!token || !["summarize", "keywords", "classify"].includes(task)) {
    return json({ error: "Missing token or invalid task" }, 400);
  }

  // Validate token
  const { data: tokenRow, error: tokenErr } = await admin
    .from("tokens")
    .select("id, document_id, scope_cid, permissions, expires_at, revoked, created_by")
    .eq("token", token)
    .maybeSingle();

  if (tokenErr || !tokenRow) {
    await logAudit(admin, {
      user_id: userId,
      action: "ai.assist",
      result: "denied",
      meta: { reason: "token_not_found", task },
    });
    return json({ error: "Invalid token" }, 403);
  }
  if (tokenRow.revoked) {
    await logAudit(admin, {
      user_id: userId,
      action: "ai.assist",
      document_id: tokenRow.document_id,
      resource_cid: tokenRow.scope_cid,
      result: "denied",
      meta: { reason: "token_revoked", task },
    });
    return json({ error: "Token revoked" }, 403);
  }
  if (new Date(tokenRow.expires_at).getTime() < Date.now()) {
    await logAudit(admin, {
      user_id: userId,
      action: "ai.assist",
      document_id: tokenRow.document_id,
      resource_cid: tokenRow.scope_cid,
      result: "denied",
      meta: { reason: "token_expired", task },
    });
    return json({ error: "Token expired" }, 403);
  }
  if (!tokenRow.permissions?.includes(task)) {
    await logAudit(admin, {
      user_id: userId,
      action: "ai.assist",
      document_id: tokenRow.document_id,
      resource_cid: tokenRow.scope_cid,
      result: "denied",
      meta: { reason: "permission_missing", task, allowed: tokenRow.permissions },
    });
    return json({ error: `Token does not allow '${task}'` }, 403);
  }

  // Load doc + content
  const { data: doc, error: docErr } = await admin
    .from("documents")
    .select("id, cid, filename, classification, storage_path, content_type, size_bytes")
    .eq("id", tokenRow.document_id)
    .maybeSingle();
  if (docErr || !doc) return json({ error: "Document not found" }, 404);

  // Download content from storage
  const { data: file, error: dlErr } = await admin.storage
    .from("documents")
    .download(doc.storage_path);
  if (dlErr || !file) {
    await logAudit(admin, {
      user_id: userId,
      action: "ai.assist",
      document_id: doc.id,
      resource_cid: doc.cid,
      result: "error",
      meta: { reason: "download_failed", task },
    });
    return json({ error: "Failed to read document" }, 500);
  }

  // Extract text by format
  let text = "";
  let extractor: "text" | "pdf" | "docx" = "text";
  try {
    const name = (doc.filename || "").toLowerCase();
    const ct = (doc.content_type || "").toLowerCase();
    if (ct === "application/pdf" || name.endsWith(".pdf")) {
      extractor = "pdf";
      const buf = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const { text: pages } = await extractText(pdf, { mergePages: true });
      text = Array.isArray(pages) ? pages.join("\n") : String(pages ?? "");
    } else if (
      ct === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      name.endsWith(".docx")
    ) {
      extractor = "docx";
      const buf = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(buf);
      const docXml = await zip.file("word/document.xml")?.async("string");
      if (!docXml) throw new Error("DOCX missing word/document.xml");
      // Convert paragraph/break tags to newlines, strip remaining XML
      text = docXml
        .replace(/<w:p[^>]*\/>/g, "\n")
        .replace(/<\/w:p>/g, "\n")
        .replace(/<w:br[^>]*\/>/g, "\n")
        .replace(/<w:tab[^>]*\/>/g, "\t")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#x?[0-9a-fA-F]+;/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    } else {
      text = await file.text();
    }
  } catch (e) {
    console.error("extract failed", extractor, e);
    await logAudit(admin, {
      user_id: userId,
      action: "ai.assist",
      document_id: doc.id,
      resource_cid: doc.cid,
      result: "error",
      meta: { reason: "extract_failed", extractor, task },
    });
    return json({ error: `Failed to extract text from ${extractor.toUpperCase()}` }, 422);
  }

  if (!text.trim()) {
    return json({ error: "Document contains no extractable text" }, 422);
  }

  // Cap input to keep latency/cost predictable
  const MAX_CHARS = 12000;
  const truncated = text.length > MAX_CHARS;
  if (truncated) text = text.slice(0, MAX_CHARS);

  // ---- PII / sensitive-data pre-scan ----
  // Detects SA ID numbers, account numbers, card numbers (Luhn-validated),
  // SWIFT/BIC codes, and email addresses. Redacts in-place before the AI call.
  function luhnValid(num: string): boolean {
    let sum = 0, alt = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let d = parseInt(num[i], 10);
      if (alt) { d *= 2; if (d > 9) d -= 9; }
      sum += d; alt = !alt;
    }
    return sum % 10 === 0 && num.length >= 13;
  }
  function saIdValid(id: string): boolean {
    if (!/^\d{13}$/.test(id)) return false;
    const m = parseInt(id.slice(2, 4), 10);
    const d = parseInt(id.slice(4, 6), 10);
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    return luhnValid(id);
  }
  const findings: { type: string; count: number }[] = [];
  let redacted = text;
  const tally = (type: string, n: number) => { if (n > 0) findings.push({ type, count: n }); };

  // SA ID (13 digits, Luhn + date-shaped)
  let n = 0;
  redacted = redacted.replace(/\b\d{13}\b/g, (m) => {
    if (saIdValid(m)) { n++; return "[REDACTED_SA_ID]"; }
    return m;
  });
  tally("sa_id", n);

  // Card numbers (13–19 digits, optional spaces/dashes, Luhn-validated)
  n = 0;
  redacted = redacted.replace(/\b(?:\d[ -]?){12,18}\d\b/g, (m) => {
    const digits = m.replace(/[ -]/g, "");
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) {
      n++; return "[REDACTED_CARD]";
    }
    return m;
  });
  tally("card", n);

  // SA bank account numbers (9–11 digits, standalone)
  n = 0;
  redacted = redacted.replace(/\b\d{9,11}\b/g, (m) => { n++; return "[REDACTED_ACCOUNT]"; });
  tally("account", n);

  // SWIFT/BIC (8 or 11 chars: 6 letters + 2 alnum + optional 3 alnum)
  n = 0;
  redacted = redacted.replace(/\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g, (m) => {
    n++; return "[REDACTED_SWIFT]";
  });
  tally("swift", n);

  // Emails
  n = 0;
  redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (m) => {
    n++; return "[REDACTED_EMAIL]";
  });
  tally("email", n);

  const piiTotal = findings.reduce((a, b) => a + b.count, 0);
  // Block if Restricted-class signal present (SA ID or card) and token doesn't carry an explicit override permission.
  const hasHighRisk = findings.some((f) => (f.type === "sa_id" || f.type === "card") && f.count > 0);
  const allowPii = tokenRow.permissions?.includes("pii_override");
  if (hasHighRisk && !allowPii) {
    await logAudit(admin, {
      user_id: userId,
      action: "ai.assist",
      document_id: doc.id,
      resource_cid: doc.cid,
      result: "denied",
      meta: { reason: "pii_blocked", task, findings, token_id: tokenRow.id },
    });
    return json({
      error: "Sensitive data detected (SA ID or card number). AI call blocked by policy.",
      findings,
    }, 422);
  }
  text = redacted;
  // ---- end PII pre-scan ----

  if (!LOVABLE_API_KEY) return json({ error: "AI not configured" }, 500);

  const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[task] },
        {
          role: "user",
          content: `Document: ${doc.filename}\nClassification: ${doc.classification}\n\n---\n${text}`,
        },
      ],
    }),
  });

  if (aiResp.status === 429) {
    await logAudit(admin, {
      user_id: userId, action: "ai.assist", document_id: doc.id,
      resource_cid: doc.cid, result: "error", meta: { task, reason: "rate_limited" },
    });
    return json({ error: "Rate limit exceeded. Try again shortly." }, 429);
  }
  if (aiResp.status === 402) {
    await logAudit(admin, {
      user_id: userId, action: "ai.assist", document_id: doc.id,
      resource_cid: doc.cid, result: "error", meta: { task, reason: "payment_required" },
    });
    return json({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
  }
  if (!aiResp.ok) {
    const errText = await aiResp.text();
    console.error("AI error", aiResp.status, errText);
    await logAudit(admin, {
      user_id: userId, action: "ai.assist", document_id: doc.id,
      resource_cid: doc.cid, result: "error", meta: { task, status: aiResp.status },
    });
    return json({ error: "AI request failed" }, 500);
  }

  const aiData = await aiResp.json();
  const output: string = aiData?.choices?.[0]?.message?.content?.trim() ?? "";

  // Forensic log: full sanitized prompt + response
  try {
    await admin.from("ai_call_logs").insert({
      user_id: userId,
      document_id: doc.id,
      task,
      model: "google/gemini-3-flash-preview",
      prompt_text: `Document: ${doc.filename}\nClassification: ${doc.classification}\n\n---\n${text}`,
      response_text: output,
      pii_findings: findings,
      truncated,
      status: "ok",
    });
  } catch (e) {
    console.warn("ai_call_logs insert failed", e);
  }

  await logAudit(admin, {
    user_id: userId,
    action: "ai.assist",
    document_id: doc.id,
    resource_cid: doc.cid,
    result: "ok",
    meta: {
      task,
      token_id: tokenRow.id,
      extractor,
      truncated,
      input_chars: text.length,
      output_chars: output.length,
      pii_findings: findings,
      pii_redacted: piiTotal,
    },
  });

  return json({
    task,
    document: {
      id: doc.id,
      cid: doc.cid,
      filename: doc.filename,
      classification: doc.classification,
    },
    output,
    truncated,
    pii: { redacted: piiTotal, findings },
  });
});
