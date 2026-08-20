# Lambda Functions

Each Lambda lives in its own folder. The SAM template points to these folders for packaging.

## Structure

```text
lambda/
  shared/
    auth.ts      - Cognito token validation, response helpers
    db.ts        - RDS connection and query helpers
  ai-assist/
    index.ts     - AI assistant with PII redaction
  list-documents/
    index.ts     - List visible documents
  get-document/
    index.ts     - Get document metadata
  upload-document/
    index.ts     - Generate S3 pre-signed upload URL
  create-document/
    index.ts     - Register document metadata after upload
  download-document/
    index.ts     - Generate signed S3 download URL
  write-audit-event/
    index.ts     - Write tamper-evident audit event
  list-audit-events/
    index.ts     - List audit events
  verify-audit-chain/
    index.ts     - Verify audit chain integrity
  list-tokens/
    index.ts     - List tokens
  create-token/
    index.ts     - Create ephemeral token
  list-clients/
    index.ts     - List clients
  seed-demo-data/
    index.ts     - Seed demo data
  demo-login/
    index.ts     - Create demo session
  mcp-server/
    index.ts     - MCP server entry point
```

## Shared helpers

- `auth.ts`: validates the Cognito bearer token, extracts `sub`, `email`, and `custom:role`, and provides standard HTTP responses.
- `db.ts`: manages a `pg` connection pool, reads RDS credentials from Secrets Manager, and provides `query()` and `transaction()` helpers.

## Common handler pattern

```typescript
import { APIGatewayProxyEventV2, APIGatewayProxyHandlerV2 } from "aws-lambda";
import { authenticate, successResponse, unauthorizedResponse, errorResponse } from "../shared/auth";

export const handler: APIGatewayProxyHandlerV2 = async (event: APIGatewayProxyEventV2) => {
  try {
    const user = await authenticate(event);
    // ... business logic
    return successResponse({ data: "ok" });
  } catch (err) {
    if ((err as Error).message === "UNAUTHORIZED") {
      return unauthorizedResponse();
    }
    console.error("handler error", err);
    return errorResponse((err as Error).message);
  }
};
```

## Environment variables

Each Lambda receives these environment variables from the SAM template:

- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `DB_SECRET_ARN` (or `DATABASE_URL` for local testing)
- `DOCUMENTS_BUCKET_NAME`
- `ENVIRONMENT`

## Local testing

For local testing, use the AWS SAM CLI:

```bash
sam build
sam local invoke ListDocumentsFunction -e events/list-documents.json
```

Make sure `DATABASE_URL` is set in your local environment for the `db.ts` helper to connect.
