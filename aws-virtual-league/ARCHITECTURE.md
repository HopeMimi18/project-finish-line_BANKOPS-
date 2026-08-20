# AWS Architecture for BankOps Copilot

## Overview

BankOps on AWS is a serverless governance layer that lets bank employees interact with sensitive documents through an AI assistant. Every request is authenticated, scoped by role, redacted for PII, and logged in a tamper-evident audit chain.

## Architecture diagram

```text
                                 ┌─────────────────┐
                                 │   CloudFront    │
                                 │  (HTTPS + CDN)  │
                                 └────────┬────────┘
                                          │
                                          ▼
                                 ┌─────────────────┐
                                 │   S3 Website    │
                                 │ React Frontend  │
                                 └────────┬────────┘
                                          │
           ┌──────────────────────────────┼──────────────────────────────┐
           │                              │                              │
           ▼                              ▼                              ▼
  ┌─────────────────┐          ┌─────────────────────┐          ┌──────────────────┐
  │  Amazon Cognito │          │   API Gateway       │          │   Amazon Bedrock │
  │  (Auth + Roles) │          │   (HTTP API)        │          │   (AI / LLM)     │
  └────────┬────────┘          └──────────┬──────────┘          └────────┬─────────┘
           │                              │                              │
           │ JWT token                    │                              │
           │                              ▼                              │
           │                   ┌─────────────────┐                     │
           │                   │  Lambda Layer   │                     │
           │                   │  Auth + Audit   │                     │
           │                   └────────┬────────┘                     │
           │                            │                            │
           │                            ▼                            │
           │              ┌──────────────────────────┐               │
           │              │      Lambda Functions      │               │
           │              │  ai-assist                 │               │
           │              │  list-documents            │               │
           │              │  download-document         │               │
           │              │  write-audit-event         │               │
           │              │  seed-demo-data            │               │
           │              │  mcp-server                │               │
           │              └──────────┬───────────────┘               │
           │                         │                                │
           │         ┌───────────────┼───────────────┐                │
           │         ▼               ▼               ▼                │
           │  ┌──────────┐  ┌──────────────┐  ┌──────────────┐       │
           │  │   RDS    │  │     S3       │  │    Secrets   │       │
           │  │PostgreSQL│  │  Documents   │  │   Manager    │       │
           │  │Audit Chain│  │ Encrypted   │  │              │       │
           │  └──────────┘  └──────────────┘  └──────────────┘       │
           │                                                         │
           └─────────────────────────────────────────────────────────┘
                                      │
                                      ▼
                            ┌─────────────────────┐
                            │  CloudWatch Logs    │
                            │  CloudTrail         │
                            │  Budget Alarms      │
                            └─────────────────────┘
```

## Service map

| Lovable / Supabase concept | AWS service | Why it fits |
|---|---|---|
| Frontend host | S3 + CloudFront | Static hosting, CDN, HTTPS |
| Authentication | Cognito User Pools | OAuth2 / OIDC, custom role attributes, MFA |
| API | API Gateway + Lambda | Serverless, pay per call, fast to deploy |
| Database | RDS PostgreSQL | Row-level security patterns, audit chain, relational data |
| Object storage | S3 | Encrypted document storage, signed URLs |
| AI | Amazon Bedrock | Managed LLM, guardrails, no API key management |
| Secrets | Secrets Manager | Rotation, no hardcoded keys |
| Logging | CloudWatch + CloudTrail | Audit logs, metrics, alerts |
| MCP server | Lambda + API Gateway | Exposes tools to external AI agents |

## Authentication flow

1. User signs in through Cognito Hosted UI or the React login page.
2. Cognito returns an ID token and an access token.
3. React stores the access token and sends it as `Authorization: Bearer <token>`.
4. API Gateway passes the token to a Lambda authorizer (or the Lambda itself validates it with Cognito JWKS).
5. The Lambda extracts `sub` (user ID), `email`, and `custom:role`.
6. Every database query is filtered by `user_id` or `client_id` plus role checks.

## Data flow examples

### Upload a document

1. Frontend calls `POST /documents/upload`.
2. Lambda generates a pre-signed S3 PUT URL and a `cid`.
3. Frontend uploads the file directly to S3.
4. Frontend calls `POST /documents` with metadata.
5. Lambda inserts the row into `documents` with `owner_id = sub`.
6. `write-audit-event` Lambda records `document.upload` with a hash link.

### Ask the AI assistant

1. Frontend sends `POST /ai-assist` with `prompt` and optional `document_id`.
2. Lambda validates the user can access the document.
3. Lambda runs PII regex redaction on the prompt.
4. Lambda calls Amazon Bedrock with a scoped context.
5. Lambda logs the interaction to `ai_call_logs` and `audit_events`.
6. Lambda returns the redacted response.

### MCP tool call

1. External AI client (ChatGPT, Claude, etc.) obtains an OAuth token from Cognito.
2. Client calls `POST /mcp/invoke-tool/list_documents`.
3. MCP Lambda validates the token and extracts the user identity.
4. Lambda queries `documents` filtered by the user's role.
5. Lambda returns JSON MCP content.
6. Every call is recorded in `audit_events`.

## Security design

- **Least privilege IAM**: each Lambda has its own role with access only to required resources.
- **Network isolation**: RDS is in private subnets, reachable only from Lambda via VPC.
- **Encryption**: S3 SSE-S3, RDS encryption at rest, Secrets Manager encryption.
- **No secrets in code**: all keys are environment variables or Secrets Manager.
- **Audit everything**: every write and every AI interaction produces an `audit_events` row.

## Cost controls

- RDS: `db.t3.micro` (Free Tier eligible for 12 months).
- Lambda: 128 MB memory, short timeouts.
- S3: lifecycle rule to delete failed/incomplete uploads after 1 day.
- Cognito: Free Tier covers 50k MAUs.
- Bedrock: keep prompts small; use `amazon.titan-text-lite-v1` or similar for cost control.
- CloudWatch: set log retention to 1 day during the event to reduce storage.

## Next steps

1. Review `database/schema.sql` to understand the data model.
2. Review `api/contract.md` to see the endpoint surface.
3. Deploy `infrastructure/template.yaml` to create the AWS environment.
4. Fill in the Lambda skeletons in `lambda/`.
