import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_tokens",
  title: "List ephemeral tokens",
  description:
    "List ephemeral access tokens visible to the signed-in user with their scope, permissions, expiry and revocation state. Token secrets are never returned.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum tokens to return."),
    active_only: z.boolean().default(false).describe("When true, exclude revoked tokens."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, active_only }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("tokens")
      .select("id, token_preview, scope_cid, document_id, permissions, expires_at, revoked, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (active_only) query = query.eq("revoked", false);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { tokens: data ?? [] },
    };
  },
});