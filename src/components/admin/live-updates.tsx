"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { interestLabel } from "@/config/lead-form";
import { getLeadSummary } from "@/app/admin/(dashboard)/actions";

type Toast = { id: string; leadId: string; name: string; interest: string };
type Status = "connecting" | "live" | "offline";

const BASE_TITLE = "Leads dashboard — Kupi";

/**
 * Keeps every admin page fresh.
 *
 * The browser opens a Server-Sent Events stream to /api/admin/events, which
 * checks the admin's JWT and relays changes from a PRIVATE Supabase Realtime
 * channel. Messages carry only { table, op, id }; details are fetched through
 * the JWT-checked server. Refreshes are throttled and toasts de-duplicated, so
 * even a burst of events can't hammer the dashboard.
 */
const REFRESH_EVERY_MS = 2000;

export function LiveUpdates() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRefresh = useRef(0);
  const seenLeads = useRef(new Set<string>());
  const unseen = useRef(0);

  useEffect(() => {
    // Throttle: at most one server re-render every REFRESH_EVERY_MS.
    const scheduleRefresh = () => {
      if (refreshTimer.current) return;
      const wait = Math.max(0, lastRefresh.current + REFRESH_EVERY_MS - Date.now());
      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        lastRefresh.current = Date.now();
        router.refresh();
      }, Math.max(wait, 300));
    };

    const onVisible = () => {
      if (!document.hidden) {
        unseen.current = 0;
        document.title = BASE_TITLE;
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const showNewLead = async (leadId: string) => {
      if (seenLeads.current.has(leadId) || seenLeads.current.size > 200) return;
      seenLeads.current.add(leadId);
      const lead = await getLeadSummary(leadId).catch(() => null);
      if (!lead) return;
      const toast = { id: crypto.randomUUID(), leadId, name: lead.name, interest: lead.interest };
      setToasts((t) => [...t.slice(-2), toast]);
      setTimeout(() => setToasts((t) => t.filter((x) => x.id !== toast.id)), 8000);
      if (document.hidden) {
        unseen.current += 1;
        document.title = `(${unseen.current}) New lead — Kupi`;
      }
    };

    let failures = 0;
    const source = new EventSource("/api/admin/events");
    source.addEventListener("ready", () => {
      failures = 0;
      setStatus("live");
    });
    source.addEventListener("change", (event) => {
      try {
        const change = JSON.parse((event as MessageEvent<string>).data) as { table?: string; op?: string; id?: string };
        if (change.table === "leads" && change.op === "INSERT" && change.id) void showNewLead(change.id);
        scheduleRefresh();
      } catch {
        // ignore malformed messages
      }
    });
    source.onerror = () => {
      failures += 1;
      setStatus(failures > 3 ? "offline" : "connecting");
      // Repeated failures usually mean the session ended: re-render, which
      // redirects to the login page if the JWT is no longer valid.
      if (failures === 4) router.refresh();
    };

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      source.close();
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
