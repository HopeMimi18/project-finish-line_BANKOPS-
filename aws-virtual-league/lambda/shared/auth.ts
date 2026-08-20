import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { createClient } from "@supabase/supabase-js";

export type AuthenticatedUser = {
  sub: string;
  email: string;
  role: string;
};

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: "access",
  clientId: process.env.COGNITO_CLIENT_ID!,
});

export async function authenticate(
  event: APIGatewayProxyEventV2
): Promise<AuthenticatedUser> {
  const authHeader = event.headers.authorization || event.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("UNAUTHORIZED");
  }

  const token = authHeader.slice(7);
  const payload = await verifier.verify(token);

  return {
    sub: payload.sub as string,
    email: (payload.email as string) || "",
    role: (payload["custom:role"] as string) || "support",
  };
}

export function unauthorizedResponse(message = "Unauthorized"): APIGatewayProxyResultV2 {
  return {
    statusCode: 401,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: message, code: "UNAUTHORIZED" }),
  };
}

export function forbiddenResponse(message = "Forbidden"): APIGatewayProxyResultV2 {
  return {
    statusCode: 403,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: message, code: "FORBIDDEN" }),
  };
}

export function badRequestResponse(message: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 400,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: message, code: "VALIDATION_ERROR" }),
  };
}

export function successResponse<T>(data: T): APIGatewayProxyResultV2 {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data),
  };
}

export function errorResponse(message: string): APIGatewayProxyResultV2 {
  return {
    statusCode: 500,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify({ error: message, code: "INTERNAL_ERROR" }),
  };
}

export function createSupabaseClient(token: string) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );
}
