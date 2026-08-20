import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";
import {
  authenticate,
  badRequestResponse,
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from "../shared/auth";
import { transaction } from "../shared/db";

const BodySchema = z.object({
  action: z.string().trim().min(1),
  result: z.string().trim().min(1).default("ok"),
  resource_cid: z.string().trim().min(1).optional(),
  document_id: z.string().uuid().optional(),
  meta: z.record(z.unknown()).default({}),
});

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

    const { action, result, resource_cid, document_id, meta } = parsed.data;

    const row = await transaction(async (client) => {
      // Find previous hash
      const prevResult = await client.query(
        `SELECT row_hash FROM public.audit_events
         ORDER BY created_at DESC, id DESC LIMIT 1`
      );
      const prevHash = prevResult.rows[0]?.row_hash || "";

      const createdAt = new Date().toISOString();
      const rowHash = require("crypto")
        .createHash("sha256")
        .update(
          prevHash +
          action +
          (resource_cid || "") +
          user.sub +
          (document_id || "") +
          JSON.stringify(meta) +
          result +
          new Date(createdAt).getTime().toString()
        )
        .digest("hex");

      const insertResult = await client.query(
        `INSERT INTO public.audit_events
         (user_id, action, result, document_id, resource_cid, meta, prev_hash, row_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, row_hash, created_at`,
        [user.sub, action, result, document_id || null, resource_cid || null, JSON.stringify(meta), prevHash, rowHash, createdAt]
      );

      return insertResult.rows[0];
    });

    return successResponse({
      id: row.id,
      row_hash: row.row_hash,
      created_at: row.created_at,
    });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("write-audit-event error", err);
    return errorResponse((err as Error).message);
  }
};
