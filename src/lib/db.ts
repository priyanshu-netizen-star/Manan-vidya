import { SCHEMA_SQL } from "./schema";

/**
 * Database access layer.
 *
 * - Production / hosted: PostgreSQL via `pg` (DATABASE_URL).
 * - Local development and automated tests: embedded PGlite (real Postgres compiled to WASM),
 *   so the same SQL runs everywhere.
 *
 * Type parsers are aligned so both drivers return identical JS values:
 * DATE -> "YYYY-MM-DD", TIMESTAMPTZ -> ISO string, BIGINT/NUMERIC -> number.
 */

export type Row = Record<string, unknown>;

export interface Queryable {
  query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}

export interface Db extends Queryable {
  one<T = Row>(sql: string, params?: unknown[]): Promise<T | null>;
  exec(sql: string): Promise<void>;
  tx<R>(fn: (q: Queryable) => Promise<R>): Promise<R>;
  close(): Promise<void>;
  driver: "pg" | "pglite";
}

const toIso = (v: string) => new Date(v).toISOString();
const PARSERS: Record<number, (v: string) => unknown> = {
  20: (v) => Number(v), // int8
  1700: (v) => Number(v), // numeric
  1082: (v) => v, // date
  1114: (v) => toIso(v.replace(" ", "T") + "Z"), // timestamp (stored as UTC)
  1184: toIso, // timestamptz
};

async function createPg(url: string): Promise<Db> {
  const pg = await import("pg");
  const { Pool, types } = pg.default ?? pg;
  for (const [oid, fn] of Object.entries(PARSERS)) types.setTypeParser(Number(oid), fn);
  // TLS is set explicitly rather than from the URL's sslmode, whose meaning varies between pg versions.
  // Certificates are verified (Neon and other hosted providers use public CAs); local servers use plain TCP.
  const conn = new URL(url);
  const local = conn.searchParams.get("sslmode") === "disable" || /^(localhost|127\.0\.0\.1)$/.test(conn.hostname);
  const channelBinding = conn.searchParams.get("channel_binding") === "require";
  conn.searchParams.delete("sslmode");
  conn.searchParams.delete("channel_binding");
  const pool = new Pool({
    connectionString: conn.toString(),
    max: Number(process.env.DB_POOL_MAX || 5),
    idleTimeoutMillis: 10_000,
    enableChannelBinding: channelBinding,
    ssl: local ? undefined : { rejectUnauthorized: process.env.DB_SSL_NO_VERIFY !== "true" },
  });
  if (process.env.VERCEL) {
    // Vercel Fluid compute: close idle connections before the instance is suspended.
    const { attachDatabasePool } = await import("@vercel/functions");
    attachDatabasePool(pool);
  }
  const query = async <T,>(sql: string, params: unknown[] = []) => (await pool.query(sql, params)).rows as T[];
  return {
    driver: "pg",
    query,
    one: async <T,>(sql: string, params?: unknown[]) => ((await query<T>(sql, params))[0] ?? null),
    exec: async (sql) => {
      await pool.query(sql);
    },
    tx: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn({ query: async (s, p = []) => (await client.query(s, p)).rows });
        await client.query("COMMIT");
        return result;
      } catch (e) {
        await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    },
    close: () => pool.end(),
  };
}

async function createPglite(dir: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const fs = await import("node:fs");
  if (dir !== "memory") fs.mkdirSync(dir, { recursive: true });
  const lite = await PGlite.create(dir === "memory" ? undefined : dir, { parsers: PARSERS });
  const query = async <T,>(sql: string, params: unknown[] = []) => (await lite.query<T>(sql, params)).rows;
  // PGlite is single-connection; serialise transactions so concurrent requests cannot interleave.
  let chain: Promise<unknown> = Promise.resolve();
  return {
    driver: "pglite",
    query,
    one: async <T,>(sql: string, params?: unknown[]) => ((await query<T>(sql, params))[0] ?? null),
    exec: async (sql) => {
      await lite.exec(sql);
    },
    tx: (fn) => {
      const run = chain.then(() =>
        lite.transaction(async (t) => fn({ query: async (s, p = []) => (await t.query(s, p)).rows as never })),
      );
      chain = run.catch(() => undefined);
      return run;
    },
    close: () => lite.close(),
  };
}

type GlobalDb = { __schoolOsDb?: Promise<Db> };
const g = globalThis as unknown as GlobalDb;

export async function initDb(opts: { seed?: boolean } = {}): Promise<Db> {
  const url = process.env.DATABASE_URL;
  const db = url ? await createPg(url) : await createPglite(process.env.PGLITE_DIR || ".data/pglite");
  await db.exec(SCHEMA_SQL);
  const autoSeed = opts.seed ?? process.env.APP_ENV !== "production";
  if (autoSeed) {
    const row = await db.one<{ n: number }>("SELECT count(*)::int AS n FROM users");
    if (!row || row.n === 0) {
      const { seedDatabase } = await import("./seed");
      await seedDatabase(db);
    }
  }
  return db;
}

/** Process-wide singleton (survives dev hot reloads). */
export function getDb(): Promise<Db> {
  if (!g.__schoolOsDb) {
    g.__schoolOsDb = initDb().catch((e) => {
      g.__schoolOsDb = undefined;
      throw e;
    });
  }
  return g.__schoolOsDb;
}

/** Test helper: replace the singleton with a fresh database. */
export async function resetDbSingleton() {
  if (g.__schoolOsDb) {
    try {
      await (await g.__schoolOsDb).close();
    } catch {
      /* already closed */
    }
  }
  g.__schoolOsDb = undefined;
}
