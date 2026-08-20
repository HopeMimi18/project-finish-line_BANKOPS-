# BankOps on AWS — AWS Virtual League Submission Kit

This folder contains the reference architecture, database schema, API contract, and infrastructure skeleton for a 72-hour AWS rebuild of BankOps Copilot.

It is **not** connected to the running Lovable app. The Lovable app is a design reference and working demo. Use this folder as the starting point when you create the AWS version in the hackathon sandbox.

## What is in this kit

| File / folder | Purpose |
|---------------|---------|
| `ARCHITECTURE.md` | Full AWS architecture diagram, service map, and data flow |
| `database/schema.sql` | PostgreSQL schema for Amazon RDS |
| `api/contract.md` | OpenAPI-style contract for every Lambda endpoint |
| `infrastructure/template.yaml` | AWS SAM template that spins up the network, database, storage, and API |
| `lambda/` | Skeleton Lambda handlers (add business logic during the event) |
| `frontend/` | Cognito auth helper and environment stub |

## How to use this during the 72-hour event

1. **Day 1, first 4 hours**: Deploy the SAM template to get VPC, RDS, S3, Cognito, and API Gateway.
2. **Day 1, next 4 hours**: Run `database/schema.sql` against RDS and verify the schema.
3. **Day 2**: Fill in the Lambda skeletons using the API contract.
4. **Day 3**: Connect the frontend, seed demo data, record the demo.

## Important rules

- **Do not deploy this before the event starts.** The SAM template and skeletons are allowed scaffolding, but the final working app must be built inside the 72-hour window.
- **Keep the AWS bill low.** The template uses Free Tier sizes where possible (db.t3.micro, Lambda 128 MB, S3 standard, Cognito). Set a budget alarm at $10.
- **No hardcoded secrets.** Use AWS Secrets Manager and Cognito environment variables.

## Useful AWS commands

```bash
# Deploy the infrastructure
sam build
sam deploy --guided --stack-name bankops-virtual-league

# Connect to the database
psql -h $RDS_ENDPOINT -U postgres -d bankops -f database/schema.sql

# View logs
aws logs tail /aws/lambda/bankops-ai-assist --follow
```

## Judging story

BankOps on AWS demonstrates how a bank can safely expose internal documents to AI agents:

- **Amazon Cognito** handles identity and role-based access.
- **Amazon RDS** stores the tamper-evident audit chain.
- **Amazon S3** stores encrypted documents with signed URLs.
- **AWS Lambda + API Gateway** expose the governance API.
- **Amazon Bedrock** powers the AI assistant while the app redacts PII.
- **CloudTrail + CloudWatch** provide observability.

This is a security layer that complements tools like Microsoft Copilot, not a replacement.
