"use client";

import { useEffect, useState, useTransition } from "react";
import Script from "next/script";
import type { Question } from "@/lib/templates";
import Link from "next/link";
import { submitResponse } from "./actions";
import { submitLeaderResponse } from "@/app/dashboard/surveys/[id]/take/actions";

type Values = Record<string, string | number | string[] | Record<string, number> | Record<string, string>>;

type Props =
  | { mode?: "team"; token: string; questions: Question[]; initial?: Values; surveyId?: never }
  | { mode: "leader"; surveyId: string; questions: Question[]; initial?: Values; token?: never };

export function SurveyForm(props: Props) {
  const { questions } = props;
  const [values, setValues] = useState<Values>(() => {
    const v: Values = { ...(props.initial ?? {}) };
    for (const q of questions) {
      if (v[q.id] !== undefined) {
        if (q.type === "list") {
          const have = (v[q.id] as string[]) ?? [];
          v[q.id] = Array.from({ length: q.count }, (_, k) => have[k] ?? "");
        }
        continue;
      }
      if (q.type === "mix") v[q.id] = Object.fromEntries(q.parts.map((p) => [p.id, 0]));
      if (q.type === "buckets") v[q.id] = Object.fromEntries(q.parts.map((p) => [p.id, ""]));
      if (q.type === "list") v[q.id] = Array.from({ length: q.count }, () => "");
    }
    return v;
  });
  const [error, setError] = useState<string>();
  const [done, setDone] = useState(false);
  const [answeredBefore, setAnsweredBefore] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
  const storeKey = props.mode === "leader" ? "" : `ts-answered-${props.token}`;

  useEffect(() => {
    if (!storeKey) return;
    try {
      // Reading device storage after mount; it isn't available during server rendering.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(storeKey)) setAnsweredBefore(true);
    } catch {}
  }, [storeKey]);
  const [pending, start] = useTransition();

  const set = (id: string, val: Values[string]) =>
    setValues((prev) => ({ ...prev, [id]: val }));

  if (done && props.mode === "leader") {
    return (
      <div className="rounded-md border border-gold bg-cream p-8 text-center">
        <p className="text-2xl font-bold text-navy">Your answers are in</p>
        <p className="mt-2 text-gray-700">
          The readout will show your view next to the team&apos;s. You can update your answers
          any time while the survey is open.
        </p>
        <Link
          href={`/dashboard/surveys/${props.surveyId}`}
          className="mt-6 inline-block rounded-md bg-navy px-5 py-2 font-semibold text-white hover:bg-navy-2"
        >
          Back to the survey
        </Link>
      </div>
    );
  }

  if (answeredBefore && !done) {
    return (
      <div className="rounded-md border border-line p-8 text-center">
        <p className="text-xl font-bold text-navy">You&apos;ve already answered on this device</p>
        <p className="mt-2 text-gray-700">
          Thanks for taking part. If someone else is using this device, they can answer too.
        </p>
        <button
          type="button"
          onClick={() => setAnsweredBefore(false)}
          className="mt-6 rounded-md border border-navy px-5 py-2 font-semibold text-navy hover:bg-cream"
        >
          Answer as someone else
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="rounded-md border border-gold bg-cream p-8 text-center">
        <p className="text-2xl font-bold text-navy">Thank you</p>
        <p className="mt-2 text-gray-700">
          Your answers are in, along with the rest of the team&apos;s.
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
        const botCheck = String(new FormData(e.currentTarget).get("cf-turnstile-response") ?? "");
        start(async () => {
          const res =
            props.mode === "leader"
              ? await submitLeaderResponse(props.surveyId, values)
              : await submitResponse(props.token, values, botCheck);
          if (res.ok) {
            try {
              if (storeKey) localStorage.setItem(storeKey, "1");
            } catch {}
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
              {q.ranked && <p className="text-xs text-gray-500">1 = most important</p>}
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
              {q.parts.map((p, i) => (
                <label key={p.id} className="block">
                  <span className="text-sm font-semibold text-gray-800">{p.label}</span>
                  <textarea
                    rows={1}
                    maxLength={1000}
                    placeholder={i === 0 ? q.placeholder : undefined}
                    style={{ fieldSizing: "content" } as React.CSSProperties}
                    value={(values[q.id] as Record<string, string>)?.[p.id] ?? ""}
                    onChange={(e) =>
                      set(q.id, { ...(values[q.id] as Record<string, string>), [p.id]: e.target.value })
                    }
                    className="mt-1 min-h-11 w-full resize-none rounded-md border border-gray-300 px-4 py-2 placeholder:text-gray-400 focus:border-navy focus:outline-none"
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

      {props.mode !== "leader" && siteKey && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div className="cf-turnstile" data-sitekey={siteKey} />
        </>
      )}

      {error && <p className="text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-navy px-6 py-4 text-lg font-semibold text-white hover:bg-navy-2 disabled:opacity-60"
      >
        {pending ? "Sending..." : props.mode === "leader" ? "Save my answers" : "Submit my answers"}
      </button>
      <p className="text-center text-xs text-gray-500">
        {props.mode === "leader"
          ? "Your answers show as the leader's view in the readout."
          : "Anonymous. We don't store your name, email, or IP address with your answers."}
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
