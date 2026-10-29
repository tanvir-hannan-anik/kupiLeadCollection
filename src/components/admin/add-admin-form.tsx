"use client";

import { useActionState, useEffect, useRef } from "react";
import { saveAdmin, type ActionResult } from "@/app/admin/(dashboard)/actions";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "./submit-button";

export function AddAdminForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(saveAdmin, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]">
        <label htmlFor="new-admin" className="sr-only">Admin email</label>
        <input
          id="new-admin"
          name="email"
          type="email"
          autoComplete="off"
          required
          placeholder="name@example.com"
          aria-describedby="add-admin-status"
          className={inputClass}
        />
        <label htmlFor="new-admin-password" className="sr-only">Password</label>
        <input
          id="new-admin-password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="Password (8+ characters)"
          aria-describedby="add-admin-status"
          className={inputClass}
        />
        <SubmitButton pendingLabel="Saving…" className="h-11 shrink-0">Save admin</SubmitButton>
      </div>
      <p id="add-admin-status" role="status" className={`text-sm ${state?.ok === false ? "text-shapla-ink" : "text-kolapata"}`}>
        {state?.message}
      </p>
    </form>
  );
}
