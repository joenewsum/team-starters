"use client";

import { useState } from "react";

export function CopyText({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-line bg-gray-50 p-4">
      <p className="whitespace-pre-wrap text-sm text-gray-800">{text}</p>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="mt-3 rounded-md border border-navy px-4 py-1.5 text-sm font-semibold text-navy hover:bg-cream"
      >
        {copied ? "Copied" : label}
      </button>
    </div>
  );
}
