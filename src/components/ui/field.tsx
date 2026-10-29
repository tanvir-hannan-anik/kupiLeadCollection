import type { ReactNode } from "react";

export const inputClass =
  // 16px text on phones stops iOS Safari from zooming in when a field is focused.
  "w-full h-10 sm:h-11 rounded-xl border-2 border-paper-edge bg-white px-3 sm:px-3.5 text-base sm:text-[15px] text-ink " +
  "placeholder:text-ash/60 transition-[border-color,box-shadow] duration-150 outline-none " +
  "hover:border-ash/40 focus:border-night focus:ring-4 focus:ring-flame/35 " +
  "aria-[invalid=true]:border-shapla aria-[invalid=true]:focus:ring-shapla/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const selectClass =
  inputClass +
  " appearance-none pr-10 bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2316163A'%3E%3Cpath d='M5.5 7.5 10 12l4.5-4.5'/%3E%3C/svg%3E\")] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

/** Label + control + inline error, wired up for screen readers. */
export function Field({ id, label, required, error, hint, className = "", children }: FieldProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-1 ${className}`}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="truncate text-[13px] font-semibold text-ink sm:text-sm">
          {label}
          {required ? (
            <span className="ml-0.5 text-shapla" aria-hidden="true">*</span>
          ) : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
        {!required ? (
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-ash/80 sm:text-[11px]">Optional</span>
        ) : (
          hint
        )}
      </div>
      {children}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p
      id={id}
      role={message ? "alert" : undefined}
      // Phones: no reserved space until there is an error. Larger screens: reserve
      // one line so the layout doesn't jump.
      className={`text-xs leading-4 font-medium text-shapla-ink transition-opacity duration-150 sm:min-h-4 ${message ? "opacity-100" : "hidden opacity-0 sm:block"}`}
    >
      {message ?? ""}
    </p>
  );
}
