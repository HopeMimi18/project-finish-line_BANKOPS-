# 72-Hour Checklist

Use this checklist to track progress during the AWS Virtual League build.

## Day 0 — Allowed preparation

- [ ] AWS account created and budget alarm set at $10
- [ ] GitHub repo initialized
- [ ] SAM CLI and AWS CLI installed locally
- [ ] This folder copied into the repo
- [ ] Pitch deck template created
- [ ] Architecture diagram reviewed

## Day 1 — Foundation

- [ ] Deploy SAM template
- [ ] VPC and subnets created
- [ ] RDS PostgreSQL reachable
- [ ] S3 bucket created
- [ ] CloudFront distribution created
- [ ] Cognito User Pool created
- [ ] Database schema executed
- [ ] Lambda skeletons deployed
- [ ] API Gateway returns 200 for all hello-world endpoints
- [ ] Sign-up creates a Cognito user and profile row
- [ ] Day 1 commit pushed

## Day 2 — Core features

- [ ] Document upload with signed S3 URLs
- [ ] Document metadata stored in RDS
- [ ] AI assist connected to Bedrock
- [ ] PII redaction working
- [ ] Audit events write to chain
- [ ] Verify audit chain returns intact
- [ ] Tokens table and endpoints
- [ ] Client list and assignments
- [ ] Break-glass toggle
- [ ] MCP server returns tool list
- [ ] MCP tool invocation requires valid token
- [ ] Day 2 commit pushed

## Day 3 — Polish and submission

- [ ] All frontend routes implemented
- [ ] Landing page with "Try the demo" button
- [ ] Demo login and seed data working
- [ ] One-pager created
- [ ] Security hardening: IAM, no secrets, CloudTrail
- [ ] Cost under $10
- [ ] Pitch deck finalized
- [ ] Demo script written
- [ ] Demo video recorded
- [ ] Final deployment tested end-to-end
- [ ] Submission uploaded before deadline

## Post-submission

- [ ] Rotate any demo credentials
- [ ] Set CloudWatch log retention to 1 day for cost control
- [ ] Write post-mortem
- [ ] Take screenshots of the final app
