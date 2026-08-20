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

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  classification: z.enum(["support", "ops", "compliance"]).optional(),
});

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
) => {
  try {
    const user = await authenticate(event);

    const rawQuery = event.queryStringParameters || {};
    const parsed = QuerySchema.safeParse(rawQuery);
    if (!parsed.success) {
      return badRequestResponse(parsed.error.message);
    }

    const { limit, classification } = parsed.data;

    let sql = `
      SELECT id, cid, filename, classification, content_type, size_bytes, created_at, client_id
      FROM public.documents
      WHERE public.user_can_view_doc(classification, client_id, $1)
    `;
    const params: unknown[] = [user.sub];

    if (classification) {
      sql += ` AND classification = $${params.length + 1}`;
      params.push(classification);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const documents = await query(sql, params);

    return successResponse({ documents });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("list-documents error", err);
    return errorResponse((err as Error).message);
  }
};
