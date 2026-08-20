# Deploy BankOps on AWS

This guide assumes you are inside the 72-hour AWS Virtual League build window and you have already completed the allowed Day 0 preparation (AWS account, repo, local tools).

## Prerequisites

- AWS CLI installed and configured (`aws configure`)
- AWS SAM CLI installed
- Node.js 20+ and npm installed
- PostgreSQL client (`psql`) installed
- Git repository initialized

## Step 1: Clone and prepare the repo

```bash
git clone <your-repo>
cd aws-virtual-league
```

## Step 2: Install Lambda dependencies

```bash
cd lambda
npm install
cd ..
```

## Step 3: Deploy the infrastructure

```bash
sam build
sam deploy --guided --stack-name bankops-virtual-league
```

During the guided deploy, accept the defaults and note:

- **AWS Region**: pick the closest to your users (e.g. `af-south-1` for South Africa, `eu-west-1` for Europe).
- **CognitoCallbackUrl**: update later to your CloudFront URL.

After deployment, SAM prints the outputs:

- `ApiUrl`
- `UserPoolId`
- `UserPoolClientId`
- `UserPoolDomain`
- `CloudFrontUrl`
- `DocumentsBucket`
- `RDSInstance`

Save these values.

## Step 4: Run the database schema

Get the RDS endpoint from the SAM outputs or the AWS console:

```bash
aws rds describe-db-instances --db-instance-identifier bankops-db --query 'DBInstances[0].Endpoint.Address'
```

Get the password from Secrets Manager:

```bash
aws secretsmanager get-secret-value --secret-id bankops/db-password-dev --query 'SecretString'
```

Run the schema:

```bash
psql -h <RDS_ENDPOINT> -U postgres -d bankops -f database/schema.sql
```

## Step 5: Configure Cognito hosted UI

Update the Cognito callback URLs to point to your CloudFront domain:

```bash
aws cognito-idp update-user-pool-client \
  --user-pool-id <UserPoolId> \
  --client-id <UserPoolClientId> \
  --callback-urls "https://<CloudFrontUrl>/auth/callback" \
  --logout-urls "https://<CloudFrontUrl>"
```

## Step 6: Configure frontend environment

Create `aws-virtual-league/frontend/.env`:

```env
VITE_COGNITO_USER_POOL_ID=<UserPoolId>
VITE_COGNITO_CLIENT_ID=<UserPoolClientId>
VITE_COGNITO_DOMAIN=<UserPoolDomain>
VITE_API_URL=<ApiUrl>
```

## Step 7: Build and deploy the frontend

```bash
cd frontend
npm install
npm run build
aws s3 sync dist/ s3://<DocumentsBucket-frontend>/ --delete
```

Invalidate the CloudFront cache:

```bash
aws cloudfront create-invalidation --distribution-id <DistributionId> --paths "/*"
```

## Step 8: Verify the deployment

1. Open the CloudFront URL.
2. Sign up with a test user.
3. Check the RDS `profiles` table has a new row.
4. Assign a role manually:

```bash
psql -h <RDS_ENDPOINT> -U postgres -d bankops -c "SELECT public.assign_user_role('<sub>', 'ops');"
```

5. Sign in and test `/documents` endpoint.

## Step 9: Test the AI assistant

```bash
curl -X POST <ApiUrl>/ai-assist \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello", "task": "greet"}'
```

## Step 10: Test the MCP server

Obtain a token from Cognito and call the MCP tool list:

```bash
curl <ApiUrl>/mcp/.mcp/list-tools \
  -H "Authorization: Bearer <token>"
```

## Common issues

### Lambda cannot connect to RDS

- Confirm the Lambda security group allows outbound TCP 5432 to the RDS security group.
- Confirm RDS is in the same VPC and private subnets.
- Confirm the DB password is in Secrets Manager and the Lambda has `secretsmanager:GetSecretValue` permission.

### CORS errors in browser

- Update the API Gateway CORS allowed origins to include your CloudFront URL.
- Confirm the Lambda response includes the CORS headers.

### Cognito login fails

- Confirm the user is confirmed (check email verification).
- Confirm the callback URL matches exactly what is configured in Cognito.
- Confirm `custom:role` is set after sign-up.

## Next steps

After the first successful deployment, fill in the remaining Lambda skeletons and iterate on the frontend.

See the 72-hour plan for the order in which to build features.
