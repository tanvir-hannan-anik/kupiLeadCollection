"use client";

import { useActionState, useEffect, useRef } from "react";
import { addLeadNote, type ActionResult } from "@/app/admin/(dashboard)/actions";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "./submit-button";

export function NoteForm({ leadId }: { leadId: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(addLeadNote, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <label htmlFor="note-body" className="sr-only">New note</label>
      <textarea
        id="note-body"
        name="body"
        rows={3}
        maxLength={2000}
        required
        placeholder="e.g. Called on 29 Oct — wants pricing for 3 students."
        aria-describedby="note-status"
        className={`${inputClass} h-auto sm:h-auto resize-y py-2.5 leading-6`}
      />
      <div className="flex items-center justify-between gap-3">
        <p
          id="note-status"
          role="status"
          className={`text-xs ${state?.ok === false ? "text-shapla-ink" : "text-kolapata"}`}
        >
          {state?.message}
        </p>
        <SubmitButton variant="dark" pendingLabel="Saving…">Add note</SubmitButton>
      </div>
    </form>
  );
}
