"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { FOLLOW_UP_TEMPLATES } from "@/config/follow-up-templates";
import { LEAD_STATUSES } from "@/config/lead-form";
import { site } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { followUpHtml } from "@/lib/follow-up";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session-cookie";

export type ActionResult = { ok: boolean; message?: string };

const uuid = z.uuid();

const followUpSchema = z.object({
  leadId: uuid,
  subject: z.string().trim().min(1, { error: "Add a subject." }).max(200, { error: "Subject is too long." }),
  body: z.string().trim().min(10, { error: "Write the email first." }).max(5000, { error: "Keep the email under 5000 characters." }),
  template: z.string().refine((t) => t in FOLLOW_UP_TEMPLATES).optional(),
});

/** Minimum gap between follow-ups to the same lead, to stop accidental double sends. */
const FOLLOW_UP_COOLDOWN_MS = 60_000;

export async function sendFollowUp(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, email: sender } = await requireAdmin();
  const parsed = followUpSchema.safeParse({
    leadId: formData.get("leadId"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    template: formData.get("template") || undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const { leadId, subject, body, template } = parsed.data;

  const { data: lead } = await supabase
    .from("leads")
    .select("id, email, status, consent_given")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { ok: false, message: "Lead not found." };
  if (!lead.consent_given) return { ok: false, message: "This lead hasn't consented to be contacted." };

  const { data: recent } = await supabase
    .from("lead_emails")
    .select("created_at")
    .eq("lead_id", leadId)
    .eq("status", "sent")
    .gte("created_at", new Date(Date.now() - FOLLOW_UP_COOLDOWN_MS).toISOString())
    .limit(1);
  if (recent?.length) return { ok: false, message: "A follow-up was just sent to this lead. Please wait a minute." };

  const result = await sendEmail({
    to: lead.email,
    subject,
    text: body,
    html: followUpHtml(body, { siteUrl: site.mainUrl, signupUrl: `${site.mainUrl}/signup` }),
    replyTo: sender, // replies go straight to the admin who wrote the email
  });

  await supabase.from("lead_emails").insert({
    lead_id: leadId,
    sent_by: sender,
    to_email: lead.email,
    subject,
    body,
    template: template ?? null,
    status: result.ok ? "sent" : "failed",
    provider_id: result.ok ? result.id : null,
    error: result.ok ? null : result.error.slice(0, 500),
  });

  if (!result.ok) {
    console.error("[follow-up] send failed:", result.error);
    refresh();
    return { ok: false, message: `Email could not be sent: ${result.error}` };
  }

  // First contact made — move the lead along the pipeline.
  if (lead.status === "New") {
    await supabase.from("leads").update({ status: "Contacted" }).eq("id", leadId);
  }
  refresh();
  return { ok: true, message: `Follow-up sent to ${lead.email}.` };
}

export async function updateLeadStatus(leadId: string, status: string): Promise<ActionResult> {
  const { supabase } = await requireAdmin();
  const parsed = z.object({ leadId: uuid, status: z.enum(LEAD_STATUSES) }).safeParse({ leadId, status });
  if (!parsed.success) return { ok: false, message: "Invalid status." };

  const { error, count } = await supabase
    .from("leads")
    .update({ status: parsed.data.status }, { count: "exact" })
    .eq("id", parsed.data.leadId);
  if (error || count === 0) {
    console.error("[admin] status update failed", error?.message);
    return { ok: false, message: "Couldn't update the status. Please try again." };
  }
  refresh();
  return { ok: true, message: `Status set to ${parsed.data.status}.` };
}

export async function addLeadNote(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, email } = await requireAdmin();
  const parsed = z
    .object({
      leadId: uuid,
      body: z.string().trim().min(1, { error: "Write a note first." }).max(2000, { error: "Keep notes under 2000 characters." }),
    })
    .safeParse({ leadId: formData.get("leadId"), body: formData.get("body") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const { error } = await supabase
    .from("lead_notes")
    .insert({ lead_id: parsed.data.leadId, body: parsed.data.body, author_email: email });
  if (error) {
    console.error("[admin] add note failed", error.message);
    return { ok: false, message: "Couldn't save the note. Please try again." };
  }
  refresh();
  return { ok: true, message: "Note added." };
}

const adminSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address." })),
  password: z
    .string()
    .min(8, { error: "Use at least 8 characters for the password." })
    .max(200, { error: "Password is too long." }),
});

/**
 * Adds a new admin, or sets the first password for an admin who has none yet.
 * It never overwrites an existing password — otherwise one admin could take
 * over another's account. People change their own password with
 * `changeOwnPassword`, which requires the current one.
 */
export async function saveAdmin(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, email: me } = await requireAdmin();
  const parsed = adminSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };
  const { email, password } = parsed.data;

  const { data: existing } = await supabase
    .from("admins")
    .select("email, password_hash")
    .eq("email", email)
    .maybeSingle();
  if (existing?.password_hash) {
    return {
      ok: false,
      message:
        email === me
          ? "Use “Change my password” below to change your own password."
          : "That admin already has a password. Only they can change it (or remove and re-add them).",
    };
  }

  const password_hash = await hashPassword(password);
  const { error } = existing
    ? await supabase.from("admins").update({ password_hash }).eq("email", email)
    : await supabase.from("admins").insert({ email, password_hash, added_by: me });
  if (error) {
    console.error("[admin] save admin failed", error.message);
    return { ok: false, message: "Couldn't save the admin. Please try again." };
  }
  refresh();
  return {
    ok: true,
    message: existing ? `Password set for ${email}.` : `${email} can now sign in with the password you set.`,
  };
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1, { error: "Enter your current password." }).max(200),
    next: z
      .string()
      .min(10, { error: "Use at least 10 characters for the new password." })
      .max(200, { error: "Password is too long." }),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { path: ["confirm"], error: "The new passwords don't match." })
  .refine((d) => d.next !== d.current, { path: ["next"], error: "Choose a password different from the current one." });

/** Changes the signed-in admin's password and signs out every other session. */
export async function changeOwnPassword(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const { supabase, email, sessionVersion } = await requireAdmin();
  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    next: formData.get("next"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message };

  const { data } = await supabase.from("admins").select("password_hash").eq("email", email).maybeSingle();
  if (!(await verifyPassword(parsed.data.current, data?.password_hash))) {
    return { ok: false, message: "Your current password is incorrect." };
  }

  const nextVersion = sessionVersion + 1;
  const { error } = await supabase
    .from("admins")
    .update({ password_hash: await hashPassword(parsed.data.next), session_version: nextVersion })
    .eq("email", email);
  if (error) {
    console.error("[admin] change password failed", error.message);
    return { ok: false, message: "Couldn't change the password. Please try again." };
  }
  await setSessionCookie(email, nextVersion); // keep this session, revoke all others
  return { ok: true, message: "Password changed. Other devices have been signed out." };
}

export async function removeAdmin(formData: FormData): Promise<void> {
  const { supabase, email: me } = await requireAdmin();
  const target = z.string().trim().toLowerCase().pipe(z.email()).safeParse(formData.get("email"));
  if (!target.success || target.data === me) return; // you can't remove yourself
  const { error } = await supabase.from("admins").delete().eq("email", target.data);
  if (error) console.error("[admin] remove admin failed", error.message);
  refresh();
}

/** Name + interest for the "New lead" toast (realtime messages carry only the id). */
export async function getLeadSummary(leadId: string): Promise<{ name: string; interest: string } | null> {
  const { supabase } = await requireAdmin();
  if (!uuid.safeParse(leadId).success) return null;
  const { data } = await supabase.from("leads").select("full_name, interest").eq("id", leadId).maybeSingle();
  return data ? { name: data.full_name, interest: data.interest } : null;
}
