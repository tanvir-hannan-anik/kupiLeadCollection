// Applies every supabase/migrations/*.sql file, in order, to your Supabase database.
// The migrations are idempotent, so running this again is safe.
//
// Usage: npm run db:migrate
// Needs a Postgres connection string in .env.local as SUPABASE_DB_URL
// (Supabase → Project Settings → Database → Connection string → URI).
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // no env file — rely on the real environment
  }
}

loadEnvFile(".env.local");

const isPostgresUrl = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v);
const connectionString = [process.env.SUPABASE_DB_URL, process.env.DATABASE_URL, process.env.SUPABASE_URL].find(isPostgresUrl);

if (!connectionString) {
  console.error("No Postgres connection string found. Set SUPABASE_DB_URL in .env.local.");
  process.exit(1);
}

// Supabase's direct host (db.<ref>.supabase.co) is IPv6-only. If SUPABASE_POOLER_HOST
// is set (e.g. aws-0-eu-west-1.pooler.supabase.com), connect through the IPv4
// session pooler instead, using the same password.
function resolveConnection(urlString) {
  const url = new URL(urlString);
  const direct = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  const pooler = process.env.SUPABASE_POOLER_HOST;
  if (!direct || !pooler) return { connectionString: urlString };
  return {
    host: pooler,
    port: 5432,
    user: `${decodeURIComponent(url.username)}.${direct[1]}`,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1) || "postgres",
  };
}

const dir = "supabase/migrations";
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const client = new pg.Client({ ...resolveConnection(connectionString), ssl: { rejectUnauthorized: false } });

try {
  await client.connect();
  for (const file of files) {
    process.stdout.write(`Applying ${file} … `);
    await client.query("begin");
    await client.query(readFileSync(join(dir, file), "utf8"));
    await client.query("commit");
    console.log("done");
  }
  console.log("All migrations applied.");
} catch (err) {
  await client.query("rollback").catch(() => {});
  // Never print the connection string — only the error message.
  console.error("\nMigration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
