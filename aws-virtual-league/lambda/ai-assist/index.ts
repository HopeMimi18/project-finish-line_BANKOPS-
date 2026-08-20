import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";
import {
  authenticate,
  badRequestResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "../shared/auth";
import { query } from "../shared/db";

const BodySchema = z.object({
  prompt: z.string().trim().min(1),
  document_id: z.string().uuid().optional(),
  task: z.string().trim().min(1),
});

function redactPII(text: string): { redacted: string; findings: string[] } {
  const findings: string[] = [];
  let redacted = text;

  const patterns = [
    { name: "sa_id", regex: /\b\d{13}\b/g },
    { name: "account_number", regex: /\b\d{10,16}\b/g },
    { name: "swift", regex: /\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\b/g },
  ];

  for (const pattern of patterns) {
    const matches = text.match(pattern.regex) || [];
    for (const match of matches) {
      findings.push(`${pattern.name}: ${match}`);
      redacted = redacted.replace(match, `[REDACTED-${pattern.name.toUpperCase()}]`);
    }
  }

  return { redacted, findings };
}

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  try {
    const user = await authenticate(event);

    const body = event.body ? JSON.parse(event.body) : {};
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.message);
    }

    const { prompt, document_id, task } = parsed.data;

    // Redact PII from the prompt
    const { redacted, findings } = redactPII(prompt);
    if (findings.length > 0) {
      return successResponse({
        response: "I cannot process this request because it contains personal or account information.",
        model: null,
        pii_findings: findings,
        audit_id: null,
      });
    }

    // Verify document access if document_id is provided
    if (document_id) {
      const docRows = await query(
        `SELECT id, classification, client_id, owner_id
         FROM public.documents
         WHERE id = $1
         AND public.user_can_view_doc(classification, client_id, $2)`,
        [document_id, user.sub]
      );
      if (docRows.length === 0) {
        return badRequestResponse("Document not accessible");
      }
    }

    // TODO: Call Amazon Bedrock with the scoped context
    const aiResponse = "This is a placeholder response. Replace with Bedrock InvokeModel call.";

    // Log the AI call
    const auditRows = await query(
      `INSERT INTO public.ai_call_logs (user_id, document_id, task, prompt_text, response_text, model, status, pii_findings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [user.sub, document_id || null, task, redacted, aiResponse, "amazon.titan-text-lite-v1", "ok", JSON.stringify(findings)]
    );

    // Write audit event
    await query(
      `INSERT INTO public.audit_events (user_id, action, result, document_id, meta)
       VALUES ($1, 'ai.assist', 'ok', $2, $3)`,
      [user.sub, document_id || null, JSON.stringify({ task, model: "amazon.titan-text-lite-v1" })]
    );

    return successResponse({
      response: aiResponse,
      model: "amazon.titan-text-lite-v1",
      pii_findings: findings,
      audit_id: auditRows[0]?.id,
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("ai-assist error", err);
    return errorResponse((err as Error).message);
  }
};
