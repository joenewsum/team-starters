"use client";

import { useState, useTransition } from "react";
import type { Question } from "@/lib/templates";
import { submitResponse } from "./actions";

type Values = Record<string, string | number | string[] | Record<string, number> | Record<string, string>>;

export function SurveyForm({ token, questions }: { token: string; questions: Question[] }) {
  const [values, setValues] = useState<Values>(() => {
    const v: Values = {};
    for (const q of questions) {
      if (q.type === "mix") v[q.id] = Object.fromEntries(q.parts.map((p) => [p.id, 0]));
      if (q.type === "buckets") v[q.id] = Object.fromEntries(q.parts.map((p) => [p.id, ""]));
      if (q.type === "list") v[q.id] = Array.from({ length: q.count }, () => "");
    }
    return v;
  });
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const set = (id: string, val: Values[string]) =>
    setValues((prev) => ({ ...prev, [id]: val }));

  if (done) {
    return (
      <div className="rounded-md border border-gold bg-cream p-8 text-center">
        <p className="text-2xl font-bold text-navy">Thank you</p>
        <p className="mt-2 text-gray-700">
          Your answers are in. Your leader will share what the team said.
        </p>
        <a
          href="https://www.stratechi.com/exceptional-leadership/"
          className="mt-6 inline-block text-sm font-semibold text-gold-dark underline"
        >
          See how exceptional teams create more value
        </a>
      </div>
    );
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(e) => {
        e.preventDefault();
        setError(undefined);
        start(async () => {
          const res = await submitResponse(token, values);
          if (res.ok) {
            setDone(true);
            window.scrollTo({ top: 0 });
          } else setError(res.error);
        });
      }}
    >
      {questions.map((q, i) => (
        <fieldset key={q.id} className="rounded-md border border-line p-5">
          <legend className="px-1 text-sm font-semibold text-gold-dark">
            {i + 1} of {questions.length}
          </legend>
          <p className="font-semibold text-navy">{q.text}</p>
          {q.hint && <p className="mt-1 text-sm text-gray-500">{q.hint}</p>}

          {q.type === "text" && (
            <textarea
              required={q.required}
              maxLength={2000}
              rows={3}
              value={(values[q.id] as string) ?? ""}
              onChange={(e) => set(q.id, e.target.value)}
              className="mt-3 w-full rounded-md border border-gray-300 px-4 py-3 focus:border-navy focus:outline-none"
            />
          )}

          {q.type === "choice" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((o) => (
                <label
                  key={o}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-4 py-3 ${
                    values[q.id] === o ? "border-navy bg-cream" : "border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    value={o}
                    required={q.required}
                    checked={values[q.id] === o}
                    onChange={() => set(q.id, o)}
                  />
                  {o}
                </label>
              ))}
            </div>
          )}

          {q.type === "scale" && (
            <div className="mt-3">
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
                {Array.from({ length: q.max - q.min + 1 }, (_, k) => q.min + k).map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set(q.id, n)}
                    aria-pressed={values[q.id] === n}
                    className={`rounded-md border py-3 font-semibold ${
                      values[q.id] === n
                        ? "border-navy bg-navy text-white"
                        : "border-gray-300 text-navy hover:border-navy"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              {(q.minLabel || q.maxLabel) && (
                <div className="mt-2 flex justify-between text-xs text-gray-500">
                  <span>
                    {q.min} = {q.minLabel}
                  </span>
                  <span>
                    {q.max} = {q.maxLabel}
                  </span>
                </div>
              )}
            </div>
          )}

          {q.type === "list" && (
            <div className="mt-3 space-y-2">
              {(values[q.id] as string[]).map((item, k) => (
                <div key={k} className="flex items-start gap-3">
                  <span className="mt-3 w-5 shrink-0 text-right font-semibold text-gold-dark">{k + 1}</span>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={item}
                    onChange={(e) => {
                      const next = [...(values[q.id] as string[])];
                      next[k] = e.target.value;
                      set(q.id, next);
                    }}
                    className="w-full rounded-md border border-gray-300 px-4 py-2 focus:border-navy focus:outline-none"
                  />
                </div>
              ))}
            </div>
          )}

          {q.type === "buckets" && (
            <div className="mt-3 space-y-3">
              {q.parts.map((p) => (
                <label key={p.id} className="block">
                  <span className="text-sm font-semibold text-gray-800">{p.label}</span>
                  <textarea
                    rows={2}
                    maxLength={1000}
                    value={(values[q.id] as Record<string, string>)?.[p.id] ?? ""}
                    onChange={(e) =>
                      set(q.id, { ...(values[q.id] as Record<string, string>), [p.id]: e.target.value })
                    }
                    className="mt-1 w-full rounded-md border border-gray-300 px-4 py-2 focus:border-navy focus:outline-none"
                  />
                </label>
              ))}
            </div>
          )}

          {q.type === "mix" && (
            <MixInput
              parts={q.parts}
              value={values[q.id] as Record<string, number>}
              onChange={(v) => set(q.id, v)}
            />
          )}
        </fieldset>
      ))}

      {error && <p className="text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-navy px-6 py-4 text-lg font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
      >
        {pending ? "Sending..." : "Submit my answers"}
      </button>
      <p className="text-center text-xs text-gray-500">
        Anonymous. We don&apos;t store your name, email, or IP address with your answers.
      </p>
    </form>
  );
}

function MixInput({
  parts,
  value,
  onChange,
}: {
  parts: { id: string; label: string }[];
  value: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const total = parts.reduce((s, p) => s + (value[p.id] ?? 0), 0);
  const left = 100 - total;
  return (
    <div className="mt-3 space-y-4">
      {parts.map((p) => (
        <div key={p.id}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-800">{p.label}</span>
            <span className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                step={5}
                value={value[p.id] ?? 0}
                onChange={(e) => onChange({ ...value, [p.id]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                className="w-16 rounded border border-gray-300 px-2 py-1 text-right"
                aria-label={`${p.label} percent`}
              />
              %
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={value[p.id] ?? 0}
            onChange={(e) => onChange({ ...value, [p.id]: Number(e.target.value) })}
            className="mt-1 w-full accent-navy"
            aria-label={p.label}
          />
        </div>
      ))}
      <p className={`text-sm font-semibold ${left === 0 ? "text-green-700" : "text-gold-dark"}`}>
        {left === 0 ? "Adds up to 100%" : left > 0 ? `${left}% left to place` : `${-left}% over 100%`}
      </p>
    </div>
  );
}
