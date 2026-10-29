"use client";

import { useActionState } from "react";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/admin/submit-button";
import { login, type LoginState } from "./actions";

export function LoginForm({ initialError, next }: { initialError?: string; next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, {
    step: "email",
    error: initialError,
  });
  const error = state.error;
  const errorText = error ? (
    <p id="login-error" role="alert" className="text-sm text-shapla-ink">{error}</p>
  ) : null;

  if (state.step === "code") {
    return (
      <>
      <form action={action} className="mt-5 flex flex-col gap-3">
        {state.message ? (
          <p role="status" className="rounded-xl bg-kolapata-soft px-3.5 py-2.5 text-sm text-kolapata">
            {state.message}
          </p>
        ) : null}
        <p className="text-sm text-ink-soft">
          Click the link in the email, or enter the code below. Sent to{" "}
          <strong className="break-all text-night">{state.email}</strong>.
        </p>
        <input type="hidden" name="email" value={state.email} />
        <input type="hidden" name="next" value={next} />
        <label htmlFor="token" className="text-sm font-semibold">Sign-in code</label>
        <input
          id="token"
          name="token"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          required
          autoFocus
          aria-invalid={!!error}
          aria-describedby={error ? "login-error" : undefined}
          className={`${inputClass} font-mono tracking-[0.3em]`}
        />
        {errorText}
        <input type="hidden" name="intent" value="verify" />
        <SubmitButton pendingLabel="Verifying…">Verify &amp; sign in</SubmitButton>
      </form>
      <form action={action} className="mt-3 text-center">
        <input type="hidden" name="intent" value="restart" />
        <button type="submit" className="text-sm font-semibold text-padma underline-offset-2 hover:underline">
          Use a different email
        </button>
      </form>
      </>
    );
  }

  return (
    <form action={action} className="mt-5 flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="intent" value="send" />
      <label htmlFor="email" className="text-sm font-semibold">Admin email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@diu.edu.bd"
        required
        defaultValue={state.email}
        aria-invalid={!!error}
        aria-describedby={error ? "login-error" : undefined}
        className={inputClass}
      />
      {errorText}
      <SubmitButton pendingLabel="Sending…">Email me a sign-in link</SubmitButton>
    </form>
  );
}
