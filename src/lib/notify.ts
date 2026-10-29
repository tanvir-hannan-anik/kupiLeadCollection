import "server-only";
import { interestLabel } from "@/config/lead-form";
import { emailProvider, sendEmail } from "@/lib/email";
import { escapeHtml } from "@/lib/follow-up";

type NewLead = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  interest: string;
};

export function isEmailConfigured(): boolean {
  return Boolean(emailProvider() && process.env.LEAD_NOTIFY_EMAIL);
}

/**
 * Internal heads-up to the business admin(s) about a new lead.
 * This is a transactional notice to staff only — visitors never receive
 * marketing email from this system.
 *
 * Never throws: a failed notification must not affect the stored lead.
 */
export async function notifyNewLead(lead: NewLead): Promise<void> {
  if (!isEmailConfigured()) return;

  const to = process.env.LEAD_NOTIFY_EMAIL!.split(",").map((s) => s.trim()).filter(Boolean);
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  const link = appUrl ? `${appUrl}/admin/leads/${lead.id}` : null;
  const interest = interestLabel(lead.interest);

  const rows: [string, string][] = [
    ["Name", lead.full_name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Interested in", interest],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;color:#16163A;max-width:520px">
      <h2 style="margin:0 0 12px">New lead from the Kupi website</h2>
      <table style="border-collapse:collapse;width:100%">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:6px 12px 6px 0;color:#5E5B73">${k}</td><td style="padding:6px 0;font-weight:600">${escapeHtml(v)}</td></tr>`,
          )
          .join("")}
      </table>
      ${link ? `<p style="margin-top:16px"><a href="${escapeHtml(link)}" style="background:#FFB020;color:#16163A;padding:10px 16px;border-radius:999px;text-decoration:none;font-weight:700">Open in dashboard</a></p>` : ""}
    </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n") + (link ? `\n\n${link}` : "");

  const result = await sendEmail({ to, subject: `New lead: ${lead.full_name} — ${interest}`, html, text });
  if (!result.ok) console.error("[notify] failed to send lead notification:", result.error);
}
