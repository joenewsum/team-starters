"use client";

import { deleteSurvey } from "../../actions";

export function DeleteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteSurvey}
      onSubmit={(e) => {
        if (!confirm("Delete this survey and all its answers? This can't be undone.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded-md px-5 py-2 text-sm text-red-700 underline hover:text-red-900">
        Delete survey and all answers
      </button>
    </form>
  );
}
