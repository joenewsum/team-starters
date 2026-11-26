"use client";

import { useState, useTransition } from "react";
import { setWantsUpdates } from "./actions";

export function UpdatesToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-4">
      <input
        type="checkbox"
        checked={on}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.checked;
          setOn(next);
          start(() => setWantsUpdates(next));
        }}
        className="mt-1"
      />
      <span>
        <span className="block font-semibold text-navy">Keep me posted</span>
        <span className="block text-sm text-gray-600">
          Get an occasional email from Stratechi when new Team Starters and guides come out. Unsubscribe any time.
        </span>
      </span>
    </label>
  );
}
