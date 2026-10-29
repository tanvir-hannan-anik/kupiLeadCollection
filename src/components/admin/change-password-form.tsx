"use client";

import { useActionState, useEffect, useRef } from "react";
import { changeOwnPassword, type ActionResult } from "@/app/admin/(dashboard)/actions";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "./submit-button";

export function ChangePasswordForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(changeOwnPassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          Current password
          <input name="current" type="password" autoComplete="current-password" required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          New password (10+ characters)
          <input name="next" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          Repeat new password
          <input name="confirm" type="password" autoComplete="new-password" minLength={10} required className={inputClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className={`text-sm ${state?.ok === false ? "text-shapla-ink" : "text-kolapata"}`}>
          {state?.message}
        </p>
        <SubmitButton variant="dark" pendingLabel="Saving…">Change my password</SubmitButton>
      </div>
    </form>
  );
}
