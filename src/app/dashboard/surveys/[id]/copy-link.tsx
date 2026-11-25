"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        onFocus={(e) => e.currentTarget.select()}
        className="w-full rounded-md border border-gray-300 bg-white px-4 py-3 font-mono text-sm"
      />
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="shrink-0 rounded-md bg-navy px-5 py-3 font-semibold text-white hover:bg-navy-2"
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
