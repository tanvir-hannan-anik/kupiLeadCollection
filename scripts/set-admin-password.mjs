// Creates an admin or sets their password (stored only as a scrypt hash).
//
// Usage:  ADMIN_PASSWORD='your-password' npm run admin:password -- admin@example.com
//
// Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local.
// The password is read from the environment so it never lands in a file.
// Uses the same hash format as src/lib/password.ts.
import { randomBytes, scrypt } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const N = 16384, R = 8, P = 1, KEYLEN = 64;

function loadEnvFile(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // rely on the real environment
  }
}

function hashPassword(password) {
  const salt = randomBytes(16);
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, KEYLEN, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err ? reject(err) : resolve(["scrypt", N, R, P, salt.toString("base64"), key.toString("base64")].join("$")),
    ),
  );
}

loadEnvFile(".env.local");

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: ADMIN_PASSWORD='…' npm run admin:password -- admin@example.com");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("Set ADMIN_PASSWORD (at least 8 characters).");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const password_hash = await hashPassword(password);
const { data: existing } = await db.from("admins").select("email").eq("email", email).maybeSingle();
const { error } = existing
  ? await db.from("admins").update({ password_hash }).eq("email", email)
  : await db.from("admins").insert({ email, password_hash, added_by: "cli" });
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`Password set for ${email}. They can now sign in at /admin/login.`);
