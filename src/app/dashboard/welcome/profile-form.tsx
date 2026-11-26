"use client";

import { useActionState } from "react";
import { PROFILE_FIELDS } from "@/lib/profile";
import { saveProfile, type ProfileState } from "./actions";

export function ProfileForm({ initial, next, edit }: { initial: Record<string, string>; next: string; edit: boolean }) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(saveProfile, {});
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {PROFILE_FIELDS.map((f) => (
        <label key={f.id} className="block">
          <span className="text-sm font-semibold text-navy">{f.label}</span>
          <select
            name={f.id}
            required
            defaultValue={initial[f.id] ?? ""}
            className="mt-1 w-full rounded-md border border-gray-300 bg-white px-4 py-3 focus:border-navy focus:outline-none"
          >
            <option value="" disabled>
              Choose one
            </option>
            {f.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      ))}
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-md bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
      >
        {pending ? "Saving..." : edit ? "Save" : "Continue to your dashboard"}
      </button>
    </form>
  );
}
