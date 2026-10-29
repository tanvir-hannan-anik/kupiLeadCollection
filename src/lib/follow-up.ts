import { DEFAULT_TEMPLATE, FOLLOW_UP_TEMPLATES } from "@/config/follow-up-templates";
import { interestLabel, type InterestValue } from "@/config/lead-form";

export type FollowUpLead = {
  full_name: string;
  interest: string;
  city: string | null;
  message: string | null;
  created_at: string;
};

export type FollowUpLinks = { siteUrl: string; signupUrl: string };

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function templateKeyFor(interest: string): InterestValue {
  return interest in FOLLOW_UP_TEMPLATES ? (interest as InterestValue) : DEFAULT_TEMPLATE;
}

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" });

/** Fills a template for one lead. Lines whose placeholders end up empty are dropped. */
export function renderFollowUp(
  key: InterestValue,
  lead: FollowUpLead,
  sender: string,
  links: FollowUpLinks,
): { subject: string; body: string } {
  const template = FOLLOW_UP_TEMPLATES[key];
  const vars: Record<string, string> = {
    name: lead.full_name,
    interest: interestLabel(lead.interest),
    city: lead.city?.trim() || "your area",
    message: lead.message?.trim().replace(/\s+/g, " ") ?? "",
    date: dateFmt.format(new Date(lead.created_at)),
    site_url: links.siteUrl,
    signup_url: links.signupUrl,
    sender,
  };
  const fill = (text: string) =>
    text
      .split("\n")
      .filter((line) => !/\{\{\s*(\w+)\s*\}\}/.test(line) || [...line.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].every((m) => vars[m[1]]))
      .join("\n")
      .replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => vars[k] ?? "")
      .replace(/\n{3,}/g, "\n\n");
  return { subject: fill(template.subject).trim(), body: fill(template.body).trim() };
}

/** Turns the plain-text body an admin edited into a branded, safe HTML email. */
export function followUpHtml(body: string, links: FollowUpLinks): string {
  const linkify = (s: string) =>
    s.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)"']/g, (url) => `<a href="${url}" style="color:#2459C7">${url}</a>`);
  const paragraphs = escapeHtml(body)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;line-height:1.6">${linkify(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `<!doctype html>
<html><body style="margin:0;background:#FBF5E9;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#16163A">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E3D5B6;border-radius:16px;overflow:hidden">
    <tr><td style="background:#16163A;padding:18px 24px">
      <span style="font-size:22px;font-weight:800;color:#FBF5E9;letter-spacing:.3px">Kupi</span><span style="color:#FFB020;font-size:22px"> &#9679;</span>
    </td></tr>
    <tr><td style="padding:24px 24px 8px;font-size:15px">${paragraphs}</td></tr>
    <tr><td style="padding:0 24px 24px">
      <a href="${escapeHtml(links.siteUrl)}" style="display:inline-block;background:#FFB020;color:#16163A;padding:11px 20px;border-radius:999px;text-decoration:none;font-weight:700;font-size:14px">Visit Kupi</a>
    </td></tr>
    <tr><td style="padding:14px 24px;background:#F3EAD6;font-size:12px;color:#5E5B73">
      You're receiving this because you contacted Kupi through our website. Just reply if you have any questions.
    </td></tr>
  </table>
</body></html>`;
}
