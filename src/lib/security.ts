import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type AuditResult = "ok" | "error" | "denied";

interface AuditEventPayload {
  action: string;
  document_id?: string | null;
  resource_cid?: string | null;
  result?: AuditResult;
  meta?: Record<string, unknown>;
}

const AUDIT_ACTION_RE = /^[a-z][a-z0-9_.:-]{0,99}$/;

function sanitizeMeta(meta?: Record<string, unknown>): Json {
  if (!meta) return {};
  return JSON.parse(JSON.stringify(meta)) as Json;
}

export async function writeAuditEvent({
  action,
  document_id = null,
  resource_cid = null,
  result = "ok",
  meta = {},
}: AuditEventPayload) {
  if (!AUDIT_ACTION_RE.test(action)) {
    throw new Error("Invalid audit action");
  }

  const payload = {
    action,
    document_id,
    resource_cid,
    result,
    meta: sanitizeMeta(meta),
  };

  const { error } = await supabase.functions.invoke("write-audit-event", {
    body: payload,
  });

  if (error) {
    const ctx = (error as { context?: Response }).context;
    let message = error.message || "Audit write failed";
    try {
      const text = await ctx?.text?.();
      if (text) {
        const parsed = JSON.parse(text) as { error?: string };
        if (parsed?.error) message = parsed.error;
      }
    } catch {
      // ignore parse failures and keep fallback message
    }
    throw new Error(message);
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildTokenPreview(token: string): string {
  return token.length <= 8 ? token : `${token.slice(0, 3)}...${token.slice(-4)}`;
}

export async function buildTokenRecord(token: string) {
  return {
    token_hash: await sha256Hex(token),
    token_preview: buildTokenPreview(token),
  };
}
