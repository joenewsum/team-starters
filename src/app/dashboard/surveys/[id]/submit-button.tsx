"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-md bg-gold px-5 py-2 font-semibold text-navy hover:opacity-90 disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
