"use client";

import { useActionState } from "react";
import { runSimulation, type SimState } from "./actions";

export function SimForm({ teams, scenarios }: { teams: string[]; scenarios: Record<string, string> }) {
  const [state, action, pending] = useActionState<SimState, FormData>(runSimulation, {});
  const field = "mt-1 w-full rounded-md border border-gray-300 px-4 py-3 focus:border-navy focus:outline-none";
  return (
    <form action={action} className="space-y-6">
      <label className="block">
        <span className="text-sm font-semibold text-navy">Team type</span>
        <select name="team_type" className={field} defaultValue={teams[0]}>
          {teams.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-navy">Or describe your own team</span>
        <input name="custom_team" placeholder="e.g. Claims team at an insurer, 12 adjusters" className={field} />
      </label>
      <fieldset>
        <legend className="text-sm font-semibold text-navy">Situation</legend>
        <div className="mt-2 space-y-2">
          {Object.entries(scenarios).map(([k, v], i) => (
            <label key={k} className="flex cursor-pointer gap-3 rounded-md border border-gray-300 p-3">
              <input type="radio" name="scenario" value={k} defaultChecked={i === 0} className="mt-1" />
              <span>
                <span className="block font-semibold capitalize text-navy">{k.replaceAll("_", " ")}</span>
                <span className="block text-sm text-gray-600">{v}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="text-sm font-semibold text-navy">People answering (including the leader)</span>
        <input name="size" type="number" min={3} max={12} defaultValue={7} className={field} />
      </label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button
        disabled={pending}
        className="w-full rounded-md bg-navy px-6 py-3 font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
      >
        {pending ? "Writing the team's answers... (about a minute)" : "Simulate this team"}
      </button>
    </form>
  );
}
