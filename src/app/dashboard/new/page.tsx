import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { NewSurveyForm } from "./new-survey-form";

export const metadata = { title: "New survey | Team Starters" };

export default function NewSurveyPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/dashboard" className="text-sm text-gray-600 hover:text-navy">
        &larr; Back to your dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-navy">Start a new survey</h1>
      <p className="mt-2 mb-8 text-gray-700">
        You&apos;ll get one link to share with your team. Take it yourself too, so the readout can
        compare your view with theirs.
      </p>
      <Suspense>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  await connection();
  const today = new Date();
  const inTwoWeeks = new Date(today.getTime() + 14 * 86400000);
  return (
    <NewSurveyForm
      minDate={today.toISOString().slice(0, 10)}
      defaultClose={inTwoWeeks.toISOString().slice(0, 10)}
    />
  );
}
