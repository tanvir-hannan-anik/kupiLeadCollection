import type { NextRequest } from "next/server";
import { contactMethodLabel, interestLabel } from "@/config/lead-form";
import { getAdmin } from "@/lib/auth";
import { csvRow } from "@/lib/csv";
import { applyLeadFilters, parseLeadFilters } from "@/lib/leads/filters";

const BATCH = 1000;
const MAX_ROWS = 50_000;

const COLUMNS = [
  ["id", "ID"],
  ["created_at", "Received (UTC)"],
  ["full_name", "Full name"],
  ["email", "Email"],
  ["phone", "Phone"],
  ["interest", "Interested in"],
  ["status", "Status"],
  ["city", "City"],
  ["preferred_contact_method", "Preferred contact"],
  ["message", "Message"],
  ["consent_given", "Consent given"],
  ["consent_timestamp", "Consent timestamp (UTC)"],
  ["source", "Source"],
  ["utm_source", "UTM source"],
  ["utm_medium", "UTM medium"],
  ["utm_campaign", "UTM campaign"],
] as const;

const SELECT =
  "id, created_at, full_name, email, phone, interest, status, city, preferred_contact_method, message, consent_given, consent_timestamp, source, utm_source, utm_medium, utm_campaign";

export async function GET(request: NextRequest) {
  const admin = await getAdmin();
  if (!admin) {
    return Response.json({ error: "Admin access required." }, { status: 403 });
  }

  const filters = parseLeadFilters(Object.fromEntries(request.nextUrl.searchParams));
  

  // UTF-8 BOM so Excel shows Bangla names correctly.
  let csv = String.fromCharCode(0xfeff) + csvRow(COLUMNS.map(([, label]) => label));
  for (let from = 0; from < MAX_ROWS; from += BATCH) {
    const { data, error } = await applyLeadFilters(admin.supabase.from("leads").select(SELECT), filters)
      .order("created_at", { ascending: false })
      .order("id")
      .range(from, from + BATCH - 1);
    if (error) {
      console.error("[export] failed", error.message);
      return Response.json({ error: "Export failed. Please try again." }, { status: 500 });
    }
    for (const row of data as unknown as Record<string, unknown>[]) {
      csv += csvRow(
        COLUMNS.map(([key]) => {
          const v = row[key];
          if (key === "interest") return interestLabel(String(v));
          if (key === "preferred_contact_method") return v ? contactMethodLabel(String(v)) : "";
          if (key === "consent_given") return v ? "Yes" : "No";
          return v;
        }),
      );
    }
    if (data.length < BATCH) break;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kupi-leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
