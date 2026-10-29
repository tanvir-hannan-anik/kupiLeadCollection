import { after, NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { CONSENT_TEXT } from "@/config/lead-form";
import { notifyNewLead } from "@/lib/notify";
import { checkRateLimit, clientIp, LEAD_RATE_LIMIT, rateLimitKey } from "@/lib/rate-limit";
import { createServiceClient } from "@/lib/supabase/service";
import { leadFormSchema, leadMetaSchema, normalizePhone } from "@/lib/validation/lead";

const MAX_BODY_BYTES = 10_000;
const MIN_FILL_MS = 1500;
const DUPLICATE_WINDOW_HOURS = 24;

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

function isAllowedOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-browser clients; still validated and rate limited
  const allowed = new Set(
    (process.env.LEAD_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  );
  allowed.add(req.nextUrl.origin);
  return allowed.has(origin);
}

const optional = (s: string | undefined) => (s && s.trim() ? s.trim() : null);

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return json({ ok: false, error: "This form can't be submitted from here." }, 403);
  }
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return json({ ok: false, error: "Unsupported content type." }, 415);
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ ok: false, error: "Submission is too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }
  if (!body || typeof body !== "object") {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  const meta = leadMetaSchema.safeParse(body);
  if (!meta.success) {
    return json({ ok: false, error: "Invalid request body." }, 400);
  }

  // Spam trap: pretend everything went fine so bots don't learn to adapt.
  const tooFast = meta.data.elapsedMs !== undefined && meta.data.elapsedMs < MIN_FILL_MS;
  if (meta.data.website || tooFast) {
    return json({ ok: true }, 201);
  }

  const parsed = leadFormSchema.safeParse(body);
  if (!parsed.success) {
    return json(
      {
        ok: false,
        error: "Please correct the highlighted fields.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
      422,
    );
  }
  const lead = parsed.data;

  const db = createServiceClient();
  if (!db) {
    console.error("[leads] Supabase is not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
    return json({ ok: false, error: "We can't accept submissions right now. Please try again later." }, 503);
  }

  const allowed = await checkRateLimit(db, rateLimitKey("lead", clientIp(req.headers)), LEAD_RATE_LIMIT);
  if (!allowed) {
    return json(
      { ok: false, error: "Too many submissions. Please wait a few minutes and try again." },
      429,
    );
  }

  const phone = normalizePhone(lead.phone, lead.phoneCountry)!; // validated by the schema

  // Repeat submission (double click, refresh, resubmitting the same enquiry)?
  // Acknowledge it without creating a duplicate lead.
  const since = new Date(Date.now() - DUPLICATE_WINDOW_HOURS * 3600_000).toISOString();
  const { data: existing, error: dupError } = await db
    .from("leads")
    .select("id")
    .eq("interest", lead.interest)
    .or(`email.eq."${lead.email}",phone.eq."${phone}"`) // both values are validated; quoted for safety
    .gte("created_at", since)
    .limit(1);
  if (dupError) console.error("[leads] duplicate check failed", dupError.message);
  if (existing && existing.length > 0) {
    return json({ ok: true, duplicate: true }, 200);
  }

  const pagePath = meta.data.pagePath?.startsWith("/") ? meta.data.pagePath : "/";
  const { data: inserted, error } = await db
    .from("leads")
    .insert({
      full_name: lead.fullName,
      email: lead.email,
      phone,
      interest: lead.interest,
      city: optional(lead.city),
      preferred_contact_method: lead.preferredContactMethod || null,
      message: optional(lead.message),
      consent_given: true,
      consent_timestamp: new Date().toISOString(),
      consent_text: CONSENT_TEXT,
      source: `website${pagePath}`,
      utm_source: optional(meta.data.utm_source),
      utm_medium: optional(meta.data.utm_medium),
      utm_campaign: optional(meta.data.utm_campaign),
    })
    .select("id, full_name, email, phone, interest")
    .single();

  if (error || !inserted) {
    console.error("[leads] insert failed", error?.message);
    return json({ ok: false, error: "Something went wrong saving your details. Please try again." }, 500);
  }

  // The lead is safely stored; notify after the response is sent.
  after(() => notifyNewLead(inserted));

  return json({ ok: true }, 201);
}
