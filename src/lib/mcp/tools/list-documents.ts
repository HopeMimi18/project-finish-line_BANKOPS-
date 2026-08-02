import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_documents",
  title: "List documents",
  description:
    "List governed documents the signed-in user is allowed to see, newest first. Never returns file contents.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(20).describe("Maximum documents to return."),
    classification: z
      .string()
      .optional()
      .describe("Optional classification filter, e.g. public, internal, confidential, restricted."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, classification }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("documents")
      .select("id, cid, filename, classification, content_type, size_bytes, created_at, client_id")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (classification) query = query.eq("classification", classification);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { documents: data ?? [] },
    };
  },
});