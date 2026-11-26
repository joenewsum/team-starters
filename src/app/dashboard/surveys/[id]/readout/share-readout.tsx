"use client";

import { useTransition } from "react";
import { setReadoutSharing } from "../../../actions";
import { CopyLink } from "../copy-link";

export function ShareReadout({ surveyId, shareUrl }: { surveyId: string; shareUrl: string | null }) {
  const [pending, start] = useTransition();
  return (
    <div className="mt-6 rounded-md border border-line p-4 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-navy">Share the readout with your team</p>
          <p className="text-sm text-gray-600">
            {shareUrl
              ? "Anyone with this link can read the readout. It doesn't include the individual answers."
              : "Get a read-only link to the readout. The individual answers stay with you."}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(() => setReadoutSharing(surveyId, !shareUrl))}
          className={`rounded-md px-4 py-2 text-sm font-semibold ${
            shareUrl ? "text-red-700 underline" : "bg-navy text-white hover:bg-navy-2"
          } disabled:opacity-60`}
        >
          {shareUrl ? "Stop sharing" : "Get a share link"}
        </button>
      </div>
      {shareUrl && (
        <div className="mt-3">
          <CopyLink url={shareUrl} />
        </div>
      )}
    </div>
  );
}
