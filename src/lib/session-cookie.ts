import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from "@/lib/session";

/**
 * Issues the admin session cookie. Deliberately NOT in a "use server" file:
 * every export there becomes a publicly callable Server Action, and this must
 * only ever run after a password has been verified.
 */
export async function setSessionCookie(email: string, version: number) {
  (await cookies()).set(SESSION_COOKIE, await signSession(email, version), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // "lax" so links from emails open the dashboard; Server Actions already
    // reject cross-origin requests, so this doesn't open a CSRF hole.
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}
