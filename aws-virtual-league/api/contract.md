# BankOps API Contract

Base URL: `https://<api-id>.execute-api.<region>.amazonaws.com/prod`

All authenticated endpoints require `Authorization: Bearer <Cognito access token>`.

## Authentication

### POST /auth/signup

Create a new Cognito user. The application should trigger a Lambda post-confirmation hook to insert the user into `public.profiles` and assign a default role.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "role": "ops"
}
```

**Response:**
```json
{
  "user_id": "<cognito sub>",
  "email": "user@example.com",
  "role": "ops"
}
```

### POST /auth/signin

Exchange email and password for Cognito tokens. The frontend handles this via the Cognito SDK; this endpoint is optional for server-side flows.

**Response:**
```json
{
  "access_token": "...",
  "id_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

### POST /auth/demo

Create a session for the read-only demo account. This is a public endpoint used by the "Try the demo" button.

**Response:**
```json
{
  "access_token": "...",
  "role": "ops",
  "is_demo": true
}
```

## Documents

### GET /documents

List documents visible to the signed-in user.

**Query parameters:**
- `limit` (integer, 1-50, default 20)
- `classification` (optional): `support`, `ops`, `compliance`

**Response:**
```json
{
  "documents": [
    {
      "id": "uuid",
      "cid": "doc-123",
      "filename": "statement.pdf",
      "classification": "ops",
      "content_type": "application/pdf",
      "size_bytes": 2048,
      "created_at": "2026-08-20T07:00:00Z",
      "client_id": "uuid"
    }
  ]
}
```

### GET /documents/:cid

Get metadata for a single document. Content is never returned.

**Response:**
```json
{
  "id": "uuid",
  "cid": "doc-123",
  "filename": "statement.pdf",
  "classification": "ops",
  "content_type": "application/pdf",
  "size_bytes": 2048,
  "created_at": "2026-08-20T07:00:00Z",
  "updated_at": "2026-08-20T07:00:00Z",
  "client_id": "uuid"
}
```

### POST /documents/upload

Request a pre-signed URL for direct S3 upload.

**Request:**
```json
{
  "filename": "statement.pdf",
  "content_type": "application/pdf",
  "classification": "ops",
  "client_id": "uuid"
}
```

**Response:**
```json
{
  "upload_url": "https://bankops-docs.s3.amazonaws.com/...",
  "storage_path": "user-id/doc-123-statement.pdf",
  "cid": "doc-123"
}
```

### POST /documents

After S3 upload, register the document metadata.

**Request:**
```json
{
  "cid": "doc-123",
  "filename": "statement.pdf",
  "classification": "ops",
  "content_type": "application/pdf",
  "size_bytes": 2048,
  "storage_path": "user-id/doc-123-statement.pdf",
  "client_id": "uuid"
}
```

**Response:**
```json
{
  "id": "uuid",
  "created_at": "2026-08-20T07:00:00Z"
}
```

### POST /documents/:cid/download

Request a signed S3 download URL. Writes an audit event.

**Request:**
```json
{
  "justification": "Client support request #1234"
}
```

**Response:**
```json
{
  "download_url": "https://bankops-docs.s3.amazonaws.com/...",
  "expires_in": 300
}
```

## AI Assistant

### POST /ai-assist

Send a prompt to the AI assistant. The Lambda scopes the context to documents the user can access.

**Request:**
```json
{
  "prompt": "Summarize the Blue River transactions",
  "document_id": "uuid",
  "task": "summarize"
}
```

**Response:**
```json
{
  "response": "The document shows...",
  "model": "amazon.titan-text-lite-v1",
  "pii_findings": [],
  "audit_id": "uuid"
}
```

## Audit

### GET /audit-events

List audit events visible to the user.

**Query parameters:**
- `limit` (integer, 1-100, default 25)
- `action` (optional)
- `result` (optional)

**Response:**
```json
{
  "events": [
    {
      "id": "uuid",
      "action": "document.download",
      "result": "ok",
      "resource_cid": "doc-123",
      "document_id": "uuid",
      "meta": {},
      "created_at": "2026-08-20T07:00:00Z"
    }
  ]
}
```

### POST /audit-events

Write an external action to the audit log.

**Request:**
```json
{
  "action": "document.view",
  "result": "ok",
  "resource_cid": "doc-123",
  "document_id": "uuid",
  "meta": {"source": "frontend"}
}
```

**Response:**
```json
{
  "id": "uuid",
  "row_hash": "sha256:..."
}
```

### GET /audit/verify

Verify the tamper-evident audit chain.

**Response:**
```json
{
  "intact": true,
  "total_rows": 42,
  "verified_rows": 42,
  "first_break_id": null,
  "first_break_at": null
}
```

## Tokens

### GET /tokens

List tokens created by or visible to the user.

**Response:**
```json
{
  "tokens": [
    {
      "id": "uuid",
      "token_preview": "abc...",
      "scope_cid": "doc-123",
      "permissions": ["read"],
      "expires_at": "2026-08-27T07:00:00Z",
      "revoked": false,
      "created_at": "2026-08-20T07:00:00Z"
    }
  ]
}
```

### POST /tokens

Create an ephemeral access token.

**Request:**
```json
{
  "scope_cid": "doc-123",
  "permissions": ["read"],
  "expires_at": "2026-08-27T07:00:00Z"
}
```

**Response:**
```json
{
  "token": "full-token-string",
  "token_preview": "abc...",
  "id": "uuid"
}
```

## Clients

### GET /clients

List clients the user is assigned to or permitted to see.

**Response:**
```json
{
  "clients": [
    {
      "id": "uuid",
      "code": "ACME",
      "name": "ACME Holdings",
      "created_at": "2026-08-20T07:00:00Z"
    }
  ]
}
```

## Admin

### GET /system-settings

Read system settings (e.g. break-glass).

**Response:**
```json
{
  "break_glass": {
    "enabled": false,
    "enabled_by": null,
    "enabled_at": null,
    "reason": null
  }
}
```

### POST /system-settings/break-glass

Toggle break-glass mode. Manager or admin only.

**Request:**
```json
{
  "enabled": true,
  "reason": "Emergency audit request"
}
```

## MCP Server

MCP endpoints are mounted under `/mcp`.

### GET /mcp/.well-known/oauth-protected-resource

OAuth resource metadata for MCP discovery.

### GET /mcp/.mcp/list-tools

List available tools.

### POST /mcp/.mcp/invoke-tool/:toolName

Invoke a tool. Requires a valid OAuth bearer token from Cognito.

Supported tools:
- `list_documents`
- `get_document`
- `list_audit_events`
- `list_tokens`
- `list_clients`

**Response format:**
```json
{
  "content": [{"type": "text", "text": "..."}]
}
```

## Demo data

### POST /demo/seed

Populate demo data for the signed-in demo account. Public endpoint for the demo flow.

**Response:**
```json
{
  "clients": 2,
  "documents": 4,
  "tokens": 2,
  "audit_events": 6
}
```

## Error responses

All errors use this shape:

```json
{
  "error": "human-readable message",
  "code": "UNAUTHORIZED | FORBIDDEN | VALIDATION_ERROR | INTERNAL_ERROR"
}
```

Status codes:
- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error
