"use client";

import { deleteAccount } from "../actions";

export function DeleteAccountButton() {
  return (
    <form
      action={deleteAccount}
      onSubmit={(e) => {
        if (!confirm("Delete your account and everything in it? This can't be undone.")) e.preventDefault();
      }}
    >
      <button className="mt-4 rounded-md bg-red-700 px-5 py-2 font-semibold text-white hover:bg-red-800">
        Delete my account
      </button>
    </form>
  );
}
