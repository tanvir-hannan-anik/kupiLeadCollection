"use client";

import { useActionState, useState } from "react";
import { sendFollowUp, type ActionResult } from "@/app/admin/(dashboard)/actions";
import { FOLLOW_UP_TEMPLATES } from "@/config/follow-up-templates";
import type { InterestValue } from "@/config/lead-form";
import { inputClass, selectClass } from "@/components/ui/field";
import { followUpHtml, renderFollowUp, type FollowUpLead, type FollowUpLinks } from "@/lib/follow-up";
import { SubmitButton } from "./submit-button";

type Props = {
  leadId: string;
  leadEmail: string;
  lead: FollowUpLead;
  initialTemplate: InterestValue;
  sender: string;
  links: FollowUpLinks;
  /** Name of the configured provider, or null when sending isn't set up. */
  provider: string | null;
};

const BODY_MAX = 5000;

export function FollowUpComposer({ leadId, leadEmail, lead, initialTemplate, sender, links, provider }: Props) {
  const initial = renderFollowUp(initialTemplate, lead, sender, links);
  const [template, setTemplate] = useState<InterestValue>(initialTemplate);
  const [subject, setSubject] = useState(initial.subject);
  const [body, setBody] = useState(initial.body);
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, action] = useActionState<ActionResult | null, FormData>(sendFollowUp, null);

  const applyTemplate = (key: InterestValue) => {
    const filled = renderFollowUp(key, lead, sender, links);
    setTemplate(key);
    setSubject(filled.subject);
    setBody(filled.body);
  };

  const mailto = `mailto:${leadEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the admin can still select the text manually.
    }
  };

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="template" value={template} />

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
          Template
          <select
            value={template}
            onChange={(e) => applyTemplate(e.target.value as InterestValue)}
            className={selectClass}
          >
            {(Object.keys(FOLLOW_UP_TEMPLATES) as InterestValue[]).map((key) => (
              <option key={key} value={key}>
                {FOLLOW_UP_TEMPLATES[key].label}
                {key === initialTemplate ? " (matches interest)" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1 text-xs font-semibold text-ash">
          To
          <p className="flex h-10 items-center truncate rounded-xl border-2 border-paper-edge bg-paper/60 px-3 font-mono text-sm text-ink-soft sm:h-11" title={leadEmail}>
            {leadEmail}
          </p>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-xs font-semibold text-ash">
        Subject
        <input name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={200} required className={inputClass} />
      </label>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-xs font-semibold text-ash">
          <label htmlFor="follow-up-body">{preview ? "Preview" : "Message"}</label>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => applyTemplate(template)} className="font-semibold text-padma hover:underline">
              Reset to template
            </button>
            <button
              type="button"
              onClick={() => setPreview((p) => !p)}
              aria-pressed={preview}
              className="rounded-full border border-paper-edge px-2.5 py-0.5 font-semibold text-night hover:border-night"
            >
              {preview ? "Edit" : "Preview"}
            </button>
          </div>
        </div>
        {/* Keep the textarea mounted so the form always submits the body. */}
        <textarea
          id="follow-up-body"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          maxLength={BODY_MAX}
          required
          className={`${inputClass} h-auto sm:h-auto resize-y py-2.5 font-sans leading-6 ${preview ? "hidden" : ""}`}
        />
        {preview ? (
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={followUpHtml(body, links)}
            className="h-[30rem] w-full rounded-xl border-2 border-paper-edge bg-paper"
          />
        ) : null}
        <p className="text-right font-mono text-[11px] text-ash">{body.length}/{BODY_MAX}</p>
      </div>

      {state?.message ? (
        <p
          role="status"
          className={`rounded-xl px-3.5 py-2.5 text-sm ${state.ok ? "bg-kolapata-soft text-kolapata" : "bg-shapla-soft text-shapla-ink"}`}
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <a
            href={mailto}
            className="inline-flex h-10 items-center rounded-full border-2 border-paper-edge px-4 text-sm font-semibold text-night transition hover:border-night focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
          >
            Open in my email app
          </a>
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold text-ash hover:text-night"
          >
            {copied ? "Copied ✓" : "Copy text"}
          </button>
        </div>
        {provider ? (
          <SubmitButton pendingLabel="Sending…">Send follow-up</SubmitButton>
        ) : (
          <span className="text-xs text-ash" title="Set SMTP_* or RESEND_API_KEY plus EMAIL_FROM in .env.local">
            Direct sending isn&apos;t configured yet
          </span>
        )}
      </div>
      {provider ? (
        <p className="text-xs text-ash">
          Sent from the Kupi address via {provider}. Replies go to <span className="font-mono">{sender}</span>.
          A <strong>New</strong> lead is marked <strong>Contacted</strong> automatically.
        </p>
      ) : null}
    </form>
  );
}
