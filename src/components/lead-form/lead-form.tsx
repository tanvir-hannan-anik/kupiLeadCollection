"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import {
  CONSENT_TEXT,
  CONTACT_METHODS,
  DEFAULT_PHONE_COUNTRY,
  INTEREST_OPTIONS,
  PHONE_COUNTRIES,
} from "@/config/lead-form";
import { site } from "@/config/site";
import { Field, FieldError, inputClass, selectClass } from "@/components/ui/field";
import { KupiCard } from "./kupi-card";
import {
  leadFormSchema,
  type LeadFormInput,
  type LeadFormValues,
} from "@/lib/validation/lead";

const MESSAGE_MAX = 1000;

const defaultValues: LeadFormInput = {
  fullName: "",
  email: "",
  phoneCountry: DEFAULT_PHONE_COUNTRY,
  phone: "",
  interest: "" as LeadFormInput["interest"],
  city: "",
  preferredContactMethod: "",
  message: "",
  consent: false,
};

type Outcome = "success" | "duplicate" | null;

function readUtm() {
  const params = new URLSearchParams(window.location.search);
  const pick = (k: string) => params.get(k)?.slice(0, 150) || undefined;
  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
  };
}

export function LeadForm() {
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submittedName, setSubmittedName] = useState("");
  const startedAt = useRef(0);
  const honeypot = useRef<HTMLInputElement>(null);
  const successRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormInput, unknown, LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues,
    mode: "onTouched",
  });

  useEffect(() => {
    startedAt.current = Date.now();
  }, [outcome]);

  useEffect(() => {
    if (outcome) successRef.current?.focus();
  }, [outcome]);

  const messageLength = useWatch({ control, name: "message" })?.length ?? 0;
  const phoneCountry = useWatch({ control, name: "phoneCountry" });

  const onSubmit = async (values: LeadFormValues) => {
    setServerError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          website: honeypot.current?.value ?? "",
          elapsedMs: Date.now() - startedAt.current,
          pagePath: window.location.pathname,
          ...readUtm(),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        duplicate?: boolean;
        error?: string;
        fieldErrors?: Partial<Record<keyof LeadFormInput, string[]>>;
      } | null;

      if (res.ok && data?.ok) {
        setSubmittedName(values.fullName);
        setOutcome(data.duplicate ? "duplicate" : "success");
        reset(defaultValues);
        return;
      }

      if (data?.fieldErrors) {
        let first: keyof LeadFormInput | null = null;
        for (const [name, messages] of Object.entries(data.fieldErrors)) {
          if (!messages?.length) continue;
          const key = name as keyof LeadFormInput;
          setError(key, { type: "server", message: messages[0] });
          first ??= key;
        }
        if (first) setFocus(first);
      }
      setServerError(
        data?.error ?? "We couldn't submit your details. Please try again in a moment.",
      );
    } catch {
      setServerError("Network problem — please check your connection and try again.");
    }
  };

  if (outcome) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="flex flex-col items-center px-1 py-4 text-center outline-none animate-rise sm:px-4 sm:py-2"
      >
        <h2 className="font-display text-3xl font-extrabold text-night">
          {outcome === "duplicate" ? "We already have your request!" : "You're all set!"}
        </h2>
        <p className="mt-2 max-w-sm text-base text-ink-soft">
          {outcome === "duplicate"
            ? "We received the same enquiry from you recently. Our team will contact you soon — no need to submit again."
            : "Thank you for your interest! Our team will contact you soon."}
        </p>
        <div className="mt-5 w-full">
          <KupiCard name={submittedName} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <a
            href={site.mainUrl}
            className="inline-flex h-11 items-center rounded-full bg-night px-5 text-sm font-semibold text-paper transition hover:bg-panel focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
          >
            Explore Kupi
          </a>
          <button
            type="button"
            onClick={() => setOutcome(null)}
            className="inline-flex h-11 items-center rounded-full border-2 border-paper-edge px-5 text-sm font-semibold text-night transition hover:border-night focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-flame/50"
          >
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  const describedBy = (name: string, extra?: string) =>
    [errors[name as keyof LeadFormInput] ? `${name}-error` : null, extra].filter(Boolean).join(" ") ||
    undefined;

  return (
    <form
      onSubmit={(e) => handleSubmit(onSubmit)(e)}
      noValidate
      aria-busy={isSubmitting}
      className="animate-rise"
    >
      <p className="mb-3 hidden text-xs text-ash sm:block">
        Fields marked <span className="font-bold text-shapla">*</span> are required.
      </p>

      {serverError ? (
        <div
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-xl border border-shapla/30 bg-shapla-soft px-3 py-2 text-[13px] sm:px-3.5 sm:py-2.5 sm:text-sm text-shapla-ink animate-rise"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 fill-current">
            <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm-.9 4.5h1.8v5.5H9.1V6Zm0 7h1.8v1.8H9.1V13Z" />
          </svg>
          <span>{serverError}</span>
        </div>
      ) : null}

      {/* Honeypot — invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input ref={honeypot} id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <fieldset disabled={isSubmitting} className="grid grid-cols-2 gap-x-2.5 gap-y-2.5 sm:gap-x-4 sm:gap-y-0">
        <legend className="sr-only">Your details</legend>

        <Field id="fullName" label="Full Name" required error={errors.fullName?.message} className="col-span-2 sm:col-span-1">
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            placeholder="e.g. Rahim Uddin"
            aria-invalid={!!errors.fullName}
            aria-describedby={describedBy("fullName")}
            className={inputClass}
            {...register("fullName")}
          />
        </Field>

        <Field id="email" label="Email Address" required error={errors.email?.message} className="col-span-2 sm:col-span-1">
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={describedBy("email")}
            className={inputClass}
            {...register("email")}
          />
        </Field>

        <Field id="phone" label="Phone Number" required error={errors.phone?.message ?? errors.phoneCountry?.message} className="col-span-2 sm:col-span-1">
          <div className="flex gap-2">
            <label htmlFor="phoneCountry" className="sr-only">Country code</label>
            <select
              id="phoneCountry"
              autoComplete="tel-country-code"
              className={`${selectClass} max-w-32 shrink-0 font-mono text-sm`}
              {...register("phoneCountry")}
            >
              {PHONE_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} {c.dial}
                </option>
              ))}
            </select>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={phoneCountry === "BD" ? "01712-345678" : "Phone number"}
              aria-invalid={!!errors.phone}
              aria-describedby={describedBy("phone")}
              className={inputClass}
              {...register("phone")}
            />
          </div>
        </Field>

        <Field id="interest" label="Interested In" required error={errors.interest?.message} className="col-span-1">
          <select
            id="interest"
            aria-invalid={!!errors.interest}
            aria-describedby={describedBy("interest")}
            className={selectClass}
            {...register("interest")}
          >
            <option value="" disabled>
              Choose one
            </option>
            {INTEREST_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="city" label="City / Location" error={errors.city?.message} className="col-span-1">
          <input
            id="city"
            type="text"
            autoComplete="address-level2"
            placeholder="e.g. Dhaka"
            aria-invalid={!!errors.city}
            aria-describedby={describedBy("city")}
            className={inputClass}
            {...register("city")}
          />
        </Field>

        <fieldset className="col-span-2 flex min-w-0 flex-col gap-1 sm:col-span-1">
          <legend className="mb-1 flex w-full items-baseline justify-between text-[13px] font-semibold text-ink sm:text-sm">
            Preferred Contact Method
            <span className="font-mono text-[10px] font-normal uppercase tracking-wider text-ash/80 sm:text-[11px]">Optional</span>
          </legend>
          <div className="grid h-10 grid-cols-3 gap-1 rounded-xl sm:h-11 border-2 border-paper-edge bg-white p-1">
            {CONTACT_METHODS.map((m) => (
              <label key={m.value} className="relative">
                <input
                  type="radio"
                  value={m.value}
                  className="peer sr-only"
                  {...register("preferredContactMethod")}
                />
                <span className="flex h-full cursor-pointer items-center justify-center rounded-lg text-sm font-semibold text-ash transition-colors duration-150 hover:bg-sand peer-checked:bg-night peer-checked:text-paper peer-focus-visible:ring-4 peer-focus-visible:ring-flame/40">
                  {m.label}
                </span>
              </label>
            ))}
          </div>
          <span className="hidden min-h-4 sm:block" />
        </fieldset>

        <Field
          id="message"
          label="Message / Additional Requirements"
          error={errors.message?.message}
          className="col-span-2"
        >
          <textarea
            id="message"
            rows={2}
            placeholder="Tell us a little about what you need…"
            aria-invalid={!!errors.message}
            aria-describedby={describedBy("message", "message-count")}
            className={`${inputClass} h-auto min-h-16 resize-none py-2 leading-6 sm:min-h-17 sm:py-2.5`}
            maxLength={MESSAGE_MAX}
            {...register("message")}
          />
          <span id="message-count" className="sr-only">
            {messageLength} of {MESSAGE_MAX} characters used
          </span>
        </Field>

        <div className="col-span-2">
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border-2 border-transparent text-[13px] leading-snug text-ink-soft sm:gap-3 sm:text-sm sm:leading-normal has-focus-visible:border-flame/60">
            <input
              type="checkbox"
              aria-invalid={!!errors.consent}
              aria-describedby={describedBy("consent")}
              className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-night"
              {...register("consent")}
            />
            <span>
              {CONSENT_TEXT}{" "}
              <span className="text-shapla" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>{" "}
              Read our{" "}
              <a
                href={site.privacyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-padma underline decoration-padma/40 underline-offset-2 hover:decoration-padma"
              >
                Privacy Policy
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </span>
          </label>
          <FieldError id="consent-error" message={errors.consent?.message} />
        </div>
      </fieldset>

      <div className="mt-3 flex flex-col-reverse items-stretch gap-3 sm:mt-1 sm:flex-row sm:items-center sm:justify-between">
        <p className="hidden text-xs text-ash sm:block">
          <span className="font-mono">{messageLength}/{MESSAGE_MAX}</span> · We never share your details.
        </p>
        <button
          type="submit"
          disabled={isSubmitting}
          className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-flame px-7 font-display text-lg font-bold text-night shadow-[0_4px_0_0_var(--color-ember)] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_0_0_var(--color-ember)] active:translate-y-0.5 active:shadow-[0_1px_0_0_var(--color-ember)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-night/30 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70 disabled:shadow-[0_2px_0_0_var(--color-ember)]"
        >
          {isSubmitting ? (
            <>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 animate-spin">
                <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                <path d="M21 12a9 9 0 0 0-9-9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              Submitting…
            </>
          ) : (
            <>
              Submit My Interest
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-current transition-transform group-hover:translate-x-0.5">
                <path d="M11.3 4.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 1 1-1.4-1.4l3.3-3.3H3a1 1 0 1 1 0-2h11.6l-3.3-3.3a1 1 0 0 1 0-1.4Z" />
              </svg>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
