"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { interestLabel } from "@/config/lead-form";
import { createBrowserSupabase } from "@/lib/supabase/browser";

type Toast = { id: string; leadId: string; name: string; interest: string };
type Status = "connecting" | "live" | "offline";

const BASE_TITLE = "Leads dashboard — Kupi";

/**
 * Subscribes to Supabase Realtime for lead changes and keeps every admin page
 * fresh: new leads pop a toast, and stats/tables re-render in place.
 * RLS applies to realtime too, so only admins receive these events.
 */
export function LiveUpdates() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unseen = useRef(0);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) return;

    // Coalesce bursts of events into a single server re-render.
    const scheduleRefresh = () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(() => router.refresh(), 400);
    };

    const onVisible = () => {
      if (!document.hidden) {
        unseen.current = 0;
        document.title = BASE_TITLE;
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    let cancelled = false;
    const channel = supabase.channel("admin-leads");

    (async () => {
      // Make sure realtime authenticates as the signed-in admin, not anon.
      const { data } = await supabase.auth.getSession();
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;

      channel
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
          const row = payload.new as { id: string; full_name: string; interest: string };
          const toast = { id: crypto.randomUUID(), leadId: row.id, name: row.full_name, interest: row.interest };
          setToasts((t) => [...t.slice(-2), toast]);
          setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 8000);
          if (document.hidden) {
            unseen.current += 1;
            document.title = `(${unseen.current}) New lead — Kupi`;
          }
          scheduleRefresh();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "leads" }, scheduleRefresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead_notes" }, scheduleRefresh)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "lead_emails" }, scheduleRefresh)
        .subscribe((s) => {
          setStatus(s === "SUBSCRIBED" ? "live" : s === "CLOSED" || s === "CHANNEL_ERROR" || s === "TIMED_OUT" ? "offline" : "connecting");
        });
    })();

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  const label = { live: "Live", connecting: "Connecting…", offline: "Offline" }[status];
  const dot = { live: "bg-kolapata-glow", connecting: "bg-flame", offline: "bg-shapla" }[status];

  return (
    <>
      <span
        className="inline-flex items-center gap-1.5 rounded-full border border-panel-line px-2.5 py-1 text-xs font-semibold text-paper/80"
        title={status === "live" ? "New leads appear automatically" : "Realtime updates are not connected"}
      >
        <span className="relative flex size-2">
          {status === "live" ? (
            <span className={`absolute inline-flex size-full animate-ping rounded-full opacity-60 ${dot}`} />
          ) : null}
          <span className={`relative inline-flex size-2 rounded-full ${dot}`} />
        </span>
        <span className="hidden sm:inline">{label}</span>
        <span className="sr-only sm:hidden">Realtime: {label}</span>
      </span>

      <div aria-live="polite" className="fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="flex w-full max-w-sm animate-rise items-center gap-3 rounded-2xl border border-flame/40 bg-night p-3 pr-2 text-paper shadow-xl"
          >
            <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-flame/15 text-lg">🪔</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-flame">New lead</p>
              <p className="truncate text-sm font-semibold">{t.name}</p>
              <p className="truncate text-xs text-paper/70">{interestLabel(t.interest)}</p>
            </div>
            <Link
              href={`/admin/leads/${t.leadId}`}
              className="rounded-full bg-flame px-3 py-1.5 text-xs font-bold text-night hover:bg-flame-light focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
            >
              View
            </Link>
            <button
              type="button"
              onClick={() => setToasts((all) => all.filter((x) => x.id !== t.id))}
              aria-label="Dismiss"
              className="grid size-7 place-items-center rounded-full text-paper/60 hover:bg-panel hover:text-paper"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
