import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDocumentsTool from "./tools/list-documents";
import getDocumentTool from "./tools/get-document";
import listAuditEventsTool from "./tools/list-audit-events";
import listTokensTool from "./tools/list-tokens";
import listClientsTool from "./tools/list-clients";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "project-finish-line",
  title: "Project Finish Line",
  version: "0.1.0",
  instructions:
    "Read-only governance tools for BankOps Copilot. Inspect governed documents, ephemeral access tokens, client assignments and the tamper-evident audit trail. All access is scoped to the signed-in user by row-level security; document contents and token secrets are never exposed.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDocumentsTool, getDocumentTool, listTokensTool, listClientsTool, listAuditEventsTool],
});