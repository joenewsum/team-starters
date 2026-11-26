"use client";

import { useActionState } from "react";
import { createSurvey, type NewSurveyState } from "../actions";

export function NewSurveyForm({ defaultClose, minDate }: { defaultClose: string; minDate: string }) {
  const [state, action, pending] = useActionState<NewSurveyState, FormData>(createSurvey, {});

  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="text-sm font-semibold text-navy">Team Starter</legend>
        <label className="mt-2 flex cursor-pointer gap-3 rounded-md border-2 border-navy bg-cream p-4">
          <input type="radio" name="template_id" value="value-starter" defaultChecked className="mt-1" />
          <span>
            <span className="block font-semibold text-navy">Value Starter</span>
            <span className="block text-sm text-gray-700">
              Who your customers are, the value you create, and where the week goes. 10 questions,
              10 to 15 minutes.
            </span>
          </span>
        </label>
        <p className="mt-2 text-xs text-gray-500">More Team Starters are on the way.</p>
      </fieldset>

      <label className="block">
        <span className="text-sm font-semibold text-navy">Team name</span>
        <input
          name="team_name"
          required
          maxLength={120}
          defaultValue={state.teamName}
          placeholder="e.g. Customer Success"
          className="mt-1 w-full rounded-md border border-gray-300 px-4 py-3 focus:border-navy focus:outline-none"
        />
        <span className="mt-1 block text-xs text-gray-500">Your team sees this at the top of the survey.</span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-navy">How many people will you send it to?</span>
        <input
          name="team_size"
          type="number"
          min={3}
          max={500}
          defaultValue={state.teamSize}
          placeholder="e.g. 8"
          className="mt-1 w-full rounded-md border border-gray-300 px-4 py-3 focus:border-navy focus:outline-none"
        />
        <span className="mt-1 block text-xs text-gray-500">
          Not counting you. When everyone has answered, the survey closes and your readout is emailed to you.
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-navy">Close date</span>
        <input
          name="close_date"
          type="date"
          min={minDate}
          defaultValue={state.closeDate ?? defaultClose}
          className="mt-1 w-full rounded-md border border-gray-300 px-4 py-3 focus:border-navy focus:outline-none"
        />
        <span className="mt-1 block text-xs text-gray-500">
          If not everyone has answered by then, the survey closes on this date and your readout is
          emailed to you. You can also close it early.
        </span>
      </label>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create survey and get the link"}
      </button>
    </form>
  );
}
