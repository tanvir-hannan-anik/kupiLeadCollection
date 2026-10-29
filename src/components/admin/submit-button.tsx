"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

const variants = {
  primary:
    "bg-flame text-night shadow-[0_3px_0_0_var(--color-ember)] hover:-translate-y-px active:translate-y-px",
  dark: "bg-night text-paper hover:bg-panel",
  ghost: "border-2 border-paper-edge text-night hover:border-night",
  danger: "border-2 border-shapla/30 text-shapla-ink hover:bg-shapla-soft",
};

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className = "",
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: keyof typeof variants;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50 disabled:cursor-wait disabled:opacity-60 ${variants[variant]} ${className}`}
    >
      {pending ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 animate-spin">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
