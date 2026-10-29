"use client";

import { useActionState, useEffect, useRef } from "react";
import { addAdmin, type ActionResult } from "@/app/admin/(dashboard)/actions";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "./submit-button";

export function AddAdminForm() {
  const [state, action] = useActionState<ActionResult | null, FormData>(addAdmin, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="new-admin" className="sr-only">Admin email</label>
        <input
          id="new-admin"
          name="email"
          type="email"
          required
          placeholder="name@example.com"
          aria-describedby="add-admin-status"
          className={inputClass}
        />
        <SubmitButton pendingLabel="Adding…" className="h-11 shrink-0">Add admin</SubmitButton>
      </div>
      <p id="add-admin-status" role="status" className={`text-sm ${state?.ok === false ? "text-shapla-ink" : "text-kolapata"}`}>
        {state?.message}
      </p>
    </form>
  );
}
