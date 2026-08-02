import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_document",
  title: "Get document metadata",
  description:
    "Fetch metadata for one governed document by its content id (cid). Returns metadata only, never file contents.",
  inputSchema: { cid: z.string().trim().min(3).describe("The document content id (cid).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ cid }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("documents")
      .select("id, cid, filename, classification, content_type, size_bytes, created_at, updated_at, client_id")
      .eq("cid", cid)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: `No accessible document with cid ${cid}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { document: data },
    };
  },
});