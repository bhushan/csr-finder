"use client";

import { useActionState } from "react";
import { login, type ActionState } from "@/app/settings/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(login, {});
  return (
    <form action={action} className="max-w-sm rounded-lg border border-line bg-surface p-6">
      <label htmlFor="passcode" className="block text-sm font-medium">Admin passcode</label>
      <p className="mt-1 text-sm text-muted">Settings and on-demand runs are limited to your team. The digest itself is public.</p>
      <input id="passcode" name="passcode" type="password" required autoComplete="current-password"
        className="mt-3 w-full rounded-md border border-line bg-bg px-3 py-2" />
      {state.error && <p role="alert" className="mt-2 text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
