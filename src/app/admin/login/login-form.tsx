"use client";

import { useActionState, useState } from "react";
import { inputClass } from "@/components/ui/field";
import { SubmitButton } from "@/components/admin/submit-button";
import { login, type LoginState } from "./actions";

export function LoginForm({ initialError, next }: { initialError?: string; next: string }) {
  const [state, action] = useActionState<LoginState, FormData>(login, { error: initialError });
  const [showPassword, setShowPassword] = useState(false);
  const error = state.error;

  return (
    <form action={action} className="mt-5 flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />

      <label htmlFor="email" className="text-sm font-semibold">Email</label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="username"
        placeholder="you@diu.edu.bd"
        required
        defaultValue={state.email}
        aria-invalid={!!error}
        aria-describedby={error ? "login-error" : undefined}
        className={inputClass}
      />

      <div className="flex items-baseline justify-between">
        <label htmlFor="password" className="text-sm font-semibold">Password</label>
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-controls="password"
          aria-pressed={showPassword}
          className="text-xs font-semibold text-padma hover:underline"
        >
          {showPassword ? "Hide" : "Show"}
        </button>
      </div>
      <input
        id="password"
        name="password"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        required
        aria-invalid={!!error}
        aria-describedby={error ? "login-error" : undefined}
        className={inputClass}
      />

      {error ? <p id="login-error" role="alert" className="text-sm text-shapla-ink">{error}</p> : null}
      <SubmitButton pendingLabel="Signing in…" className="mt-1 h-11">Sign in</SubmitButton>
    </form>
  );
}
