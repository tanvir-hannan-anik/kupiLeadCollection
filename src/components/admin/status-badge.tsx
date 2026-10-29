import type { LeadStatus } from "@/config/lead-form";

export const STATUS_STYLES: Record<LeadStatus, string> = {
  New: "bg-padma-soft text-padma-ink ring-padma/25",
  Contacted: "bg-flame-soft text-ember-ink ring-flame/40",
  Interested: "bg-shapla-soft text-shapla-ink ring-shapla/25",
  Converted: "bg-kolapata-soft text-kolapata ring-kolapata/25",
  Closed: "bg-sand text-ash ring-ash/20",
};

export function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status as LeadStatus] ?? STATUS_STYLES.Closed;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${style}`}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
