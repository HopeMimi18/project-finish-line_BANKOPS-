import { Pool, PoolClient } from "pg";
import { SecretsManager } from "aws-sdk";

let pool: Pool | null = null;

async function getDatabaseUrl(): Promise<string> {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const secretArn = process.env.DB_SECRET_ARN;
  if (!secretArn) {
    throw new Error("DATABASE_URL or DB_SECRET_ARN is required");
  }

  const secretsManager = new SecretsManager();
  const secret = await secretsManager
    .getSecretValue({ SecretId: secretArn })
    .promise();

  const parsed = JSON.parse(secret.SecretString || "{}");
  return `postgresql://${parsed.username}:${parsed.password}@${parsed.host}:${parsed.port}/${parsed.dbname}`;
}

export async function getPool(): Promise<Pool> {
  if (!pool) {
    const databaseUrl = await getDatabaseUrl();
    pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function query<T = unknown>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const p = await getPool();
  const result = await p.query<T>(sql, params);
  return result.rows;
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const p = await getPool();
  const client = await p.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  return withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}
