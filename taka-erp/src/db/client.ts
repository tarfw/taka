import { createClient, type Client } from '@libsql/client/web';
import dotenv from 'dotenv';

dotenv.config();

let clientInstance: Client | null = null;

export function getDb(env?: { TURSO_DATABASE_URL?: string; TURSO_AUTH_TOKEN?: string }): Client {
  const url = env?.TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || 'file:taka.db';
  const authToken = env?.TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined;

  if (!clientInstance || env) {
    clientInstance = createClient({
      url,
      authToken,
    });
  }
  return clientInstance;
}

export default getDb;

