import Image from "next/image";
import { Suspense } from "react";
import { site } from "@/config/site";
import { LoginForm } from "./login-form";

export const metadata = { title: "Admin sign in — Kupi", robots: { index: false } };

const ERRORS: Record<string, string> = {
  unauthorized: "Please sign in with an admin account to continue.",
};

async function LoginContent({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  const next = typeof params.next === "string" ? params.next : "/admin/leads";
  return <LoginForm initialError={error} next={next} />;
}

export default function AdminLoginPage(props: PageProps<"/admin/login">) {
  return (
    <main className="khata grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <a href={site.mainUrl} className="mx-auto mb-6 block w-fit">
          <Image src="/brand/logo.png" alt="Kupi" width={1278} height={516} priority className="h-11 w-auto" />
        </a>
        <div className="rounded-[1.75rem] border border-paper-edge bg-white p-6 shadow-[0_24px_60px_-30px_rgb(22_22_58/0.35)]">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ember">Admin</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-night">Sign in to Leads</h1>
          <Suspense fallback={<div className="mt-5 h-40 animate-pulse rounded-xl bg-sand" />}>
            <LoginContent {...props} />
          </Suspense>
        </div>
        <p className="mt-4 text-center text-xs text-ash">Access is limited to authorised Kupi administrators.</p>
      </div>
    </main>
  );
}
