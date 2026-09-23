import { Pool } from "pg";

const pools = new Map<string, Pool>();

/**
 * One pooled connection per distinct connection string, cached across
 * Next.js dev hot-reloads via globalThis so we don't leak connections.
 */
export function getPool(envVarName: string): Pool | null {
  const connectionString = process.env[envVarName];
  if (!connectionString) return null;

  const cacheKey = envVarName;
  const globalCache = globalThis as unknown as {
    __unifiedInboxPools?: Map<string, Pool>;
  };
  globalCache.__unifiedInboxPools ??= new Map();

  if (globalCache.__unifiedInboxPools.has(cacheKey)) {
    return globalCache.__unifiedInboxPools.get(cacheKey)!;
  }

  const pool = new Pool({
    connectionString,
    max: 3,
    ssl: connectionString.includes("sslmode=require")
      ? { rejectUnauthorized: false }
      : undefined,
  });
  globalCache.__unifiedInboxPools.set(cacheKey, pool);
  pools.set(cacheKey, pool);
  return pool;
}
