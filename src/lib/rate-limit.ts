import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const LEAD_RATE_LIMIT = { limit: 5, windowSeconds: 10 * 60 };

/** Best-effort client IP from the proxy headers set by Vercel / Render / etc. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

/** We never store raw IPs — only a salted hash used as the limiter key. */
export function rateLimitKey(scope: string, ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? "kupi-leads";
  return `${scope}:${createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32)}`;
}

// In-process fallback, used only if the database limiter is unreachable.
const memory = new Map<string, { start: number; hits: number }>();

function memoryHit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { start: now, hits: 1 });
    if (memory.size > 5000) memory.clear();
    return true;
  }
  entry.hits += 1;
  return entry.hits <= limit;
}

/** Returns true if the request is allowed. */
export async function checkRateLimit(
  db: SupabaseClient,
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<boolean> {
  const { data, error } = await db.rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] database limiter failed, using memory fallback", error.message);
    return memoryHit(key, limit, windowSeconds);
  }
  return data === true;
}
