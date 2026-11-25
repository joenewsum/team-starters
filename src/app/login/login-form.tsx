"use client";

import { useActionState } from "react";
import { sendMagicLink, type LoginState } from "./actions";

const initial: LoginState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(sendMagicLink, initial);

  if (state.status === "sent") {
    return (
      <div className="rounded-md border border-line bg-cream p-6">
        <p className="font-semibold text-navy">Check your email</p>
        <p className="mt-2 text-gray-700">
          We sent a sign-in link to <strong>{state.email}</strong>. Open it on
          this device to get to your dashboard.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-navy">Work email</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={state.email}
          placeholder="you@company.com"
          className="mt-1 w-full rounded-md border border-gray-300 px-4 py-3 focus:border-navy focus:outline-none"
        />
      </label>
      {state.status === "error" && (
        <p className="text-sm text-red-700">{state.message}</p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Email me a sign-in link"}
      </button>
      <p className="text-xs text-gray-500">
        No password needed. We only use your email to sign you in and to send your readouts.
      </p>
    </form>
  );
}
