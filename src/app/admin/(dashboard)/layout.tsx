import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { LiveUpdates } from "@/components/admin/live-updates";
import { site } from "@/config/site";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "../login/actions";

export const metadata = { title: "Leads dashboard — Kupi", robots: { index: false } };

async function AdminChip() {
  const { email } = await requireAdmin();
  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-48 truncate font-mono text-xs text-paper/70 sm:inline" title={email}>
        {email}
      </span>
      <form action={signOut}>
        <button
          type="submit"
          className="h-8 rounded-full border border-panel-line px-3 text-xs font-semibold text-paper transition hover:border-flame hover:text-flame focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

const navLink =
  "rounded-full px-3 py-1.5 text-sm font-semibold text-paper/80 transition hover:bg-panel hover:text-paper focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-paper">
      <header className="sticky top-0 z-20 bg-night text-paper">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-5">
            <Link href="/admin/leads" className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50">
              <Image src="/brand/logo-on-dark.jpg" alt="Kupi admin" width={1278} height={516} loading="eager" className="h-8 w-auto" />
            </Link>
            <nav aria-label="Admin" className="flex items-center gap-1">
              <Link href="/admin/leads" className={navLink}>Leads</Link>
              <Link href="/admin/admins" className={navLink}>Admins</Link>
              <a href={site.mainUrl} className={`${navLink} hidden md:inline`}>Website ↗</a>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <LiveUpdates />
            <Suspense fallback={<div className="h-8 w-20 animate-pulse rounded-full bg-panel" />}>
              <AdminChip />
            </Suspense>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
    </div>
  );
}
