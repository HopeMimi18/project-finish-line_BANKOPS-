import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";

const poolData = {
  UserPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "",
  ClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "",
};

const userPool = new CognitoUserPool(poolData);

export type AuthTokens = {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
};

export function signIn(email: string, password: string): Promise<AuthTokens> {
  const user = new CognitoUser({
    Username: email,
    Pool: userPool,
  });

  const authDetails = new AuthenticationDetails({
    Username: email,
    Password: password,
  });

  return new Promise((resolve, reject) => {
    user.authenticateUser(authDetails, {
      onSuccess: (result) => {
        resolve({
          accessToken: result.getAccessToken().getJwtToken(),
          idToken: result.getIdToken().getJwtToken(),
          refreshToken: result.getRefreshToken().getToken(),
          expiresIn: result.getAccessToken().getExpiration() - Math.floor(Date.now() / 1000),
        });
      },
      onFailure: (err) => reject(err),
    });
  });
}

export function signUp(
  email: string,
  password: string,
  role: string
): Promise<void> {
  const attributes = [
    new CognitoUserAttribute({ Name: "email", Value: email }),
    new CognitoUserAttribute({ Name: "custom:role", Value: role }),
  ];

  return new Promise((resolve, reject) => {
    userPool.signUp(email, password, attributes, [], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

export function signOut(): void {
  const user = userPool.getCurrentUser();
  if (user) {
    user.signOut();
  }
  localStorage.removeItem("bankops_access_token");
  localStorage.removeItem("bankops_refresh_token");
}

export function getCurrentUser(): CognitoUser | null {
  return userPool.getCurrentUser();
}

export function getAccessToken(): string | null {
  return localStorage.getItem("bankops_access_token");
}

export function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem("bankops_access_token", tokens.accessToken);
  localStorage.setItem("bankops_refresh_token", tokens.refreshToken);
}

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  headers.set("Content-Type", "application/json");

  return fetch(url, {
    ...options,
    headers,
  });
}
