import { Pool } from "pg";

const pools = new Map<string, Pool>();

/**
 * Strip sslmode/channel_binding from the URL and set `ssl` explicitly
 * instead — pg's connection-string parser emits a Node deprecation
 * warning whenever it sees sslmode=require/prefer/verify-ca in the URL
 * itself, regardless of what `ssl` option is passed alongside it.
 */
function parseConnection(connectionString: string): {
  connectionString: string;
  ssl: boolean | { rejectUnauthorized: boolean };
} {
  const url = new URL(connectionString);
  const requiresSsl =
    url.searchParams.get("sslmode") === "require" ||
    url.searchParams.get("sslmode") === "verify-full";
  url.searchParams.delete("sslmode");
  url.searchParams.delete("channel_binding");

  return {
    connectionString: url.toString(),
    ssl: requiresSsl ? { rejectUnauthorized: false } : false,
  };
}

/**
 * One pooled connection per distinct connection string, cached across
 * Next.js dev hot-reloads via globalThis so we don't leak connections.
 */
export function getPool(envVarName: string): Pool | null {
  const rawConnectionString = process.env[envVarName];
  if (!rawConnectionString) return null;

  const cacheKey = envVarName;
  const globalCache = globalThis as unknown as {
    __unifiedInboxPools?: Map<string, Pool>;
  };
  globalCache.__unifiedInboxPools ??= new Map();

  if (globalCache.__unifiedInboxPools.has(cacheKey)) {
    return globalCache.__unifiedInboxPools.get(cacheKey)!;
  }

  const { connectionString, ssl } = parseConnection(rawConnectionString);
  const pool = new Pool({ connectionString, max: 3, ssl });
  globalCache.__unifiedInboxPools.set(cacheKey, pool);
  pools.set(cacheKey, pool);
  return pool;
}
