import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

export type OutgoingEmail = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendResult = { ok: true; id: string | null } | { ok: false; error: string };

type Provider = "smtp" | "resend";

/**
 * Which provider is configured. SMTP wins when both are set.
 * - SMTP (e.g. Gmail with an App Password): SMTP_HOST, SMTP_USER, SMTP_PASS
 * - Resend: RESEND_API_KEY
 * Both need EMAIL_FROM.
 */
export function emailProvider(): Provider | null {
  if (!process.env.EMAIL_FROM) return null;
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  if (process.env.RESEND_API_KEY) return "resend";
  return null;
}

let transporter: Transporter | null = null;

function smtp() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT ?? 465);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
  }
  return transporter;
}

/** Sends one email. Never throws — failures come back as `{ ok: false }`. */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const provider = emailProvider();
  if (!provider) return { ok: false, error: "Email sending is not configured." };
  const from = process.env.EMAIL_FROM!;

  try {
    if (provider === "smtp") {
      const info = await smtp().sendMail({ from, ...email });
      return { ok: true, id: info.messageId ?? null };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: email.to,
        subject: email.subject,
        html: email.html,
        text: email.text,
        reply_to: email.replyTo,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    if (!res.ok) return { ok: false, error: body.message ?? `Resend error ${res.status}` };
    return { ok: true, id: body.id ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Unknown email error" };
  }
}
