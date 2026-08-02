import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_audit_events",
  title: "List audit events",
  description:
    "List recent tamper-evident audit events visible to the signed-in user, newest first. Optionally filter by action or result.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("Maximum events to return."),
    action: z.string().optional().describe("Optional action filter, e.g. ai.assist, document.download."),
    result: z.string().optional().describe("Optional result filter, e.g. ok, denied, error."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, action, result }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("audit_events")
      .select("id, action, result, resource_cid, document_id, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (action) query = query.eq("action", action);
    if (result) query = query.eq("result", result);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { events: data ?? [] },
    };
  },
});