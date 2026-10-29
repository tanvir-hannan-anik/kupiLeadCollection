"use client";

import { useState, useTransition } from "react";
import { LEAD_STATUSES, type LeadStatus } from "@/config/lead-form";
import { updateLeadStatus } from "@/app/admin/(dashboard)/actions";
import { STATUS_STYLES } from "./status-badge";

/** Status dropdown that saves immediately, with optimistic UI and rollback. */
export function StatusSelect({
  leadId,
  status,
  label,
  size = "sm",
}: {
  leadId: string;
  status: string;
  label: string;
  size?: "sm" | "md";
}) {
  const [value, setValue] = useState(status);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const onChange = (next: string) => {
    const previous = value;
    setValue(next);
    setMessage(null);
    startTransition(async () => {
      const result = await updateLeadStatus(leadId, next);
      if (!result.ok) setValue(previous);
      setMessage({ ok: result.ok, text: result.message ?? "" });
    });
  };

  const style = STATUS_STYLES[value as LeadStatus] ?? STATUS_STYLES.Closed;
  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label={label}
        value={value}
        disabled={pending}
        onChange={(e) => onChange(e.target.value)}
        className={`cursor-pointer appearance-none rounded-full border-0 font-semibold ring-1 ring-inset transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50 disabled:cursor-wait disabled:opacity-60 ${style} ${
          size === "md" ? "h-10 px-4 text-sm" : "h-7 px-3 text-xs"
        }`}
      >
        {LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <span role="status" className={`text-xs ${message?.ok === false ? "text-shapla-ink" : "sr-only"}`}>
        {message?.text}
      </span>
    </div>
  );
}
