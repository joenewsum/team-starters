import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/templates";
import { SurveyForm } from "@/app/s/[token]/survey-form";

export const metadata = { title: "Your answers | Team Starters" };

export default function TakePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<p className="text-gray-500">Loading...</p>}>
        <Take params={params} />
      </Suspense>
    </div>
  );
}

async function Take({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: survey }, { data: mine }] = await Promise.all([
    supabase.from("surveys").select("id, team_name, status, questions, templates(name)").eq("id", id).single(),
    supabase.from("responses").select("answers").eq("survey_id", id).eq("role", "leader").maybeSingle(),
  ]);
  if (!survey) notFound();
  const name = (survey.templates as unknown as { name: string } | null)?.name ?? "Team Starter";

  return (
    <>
      <Link href={`/dashboard/surveys/${id}`} className="text-sm text-gray-600 hover:text-navy">
        &larr; Back to the survey
      </Link>
      <p className="mt-4 text-sm font-semibold uppercase tracking-widest text-gold-dark">{name} &middot; your answers</p>
      <h1 className="mt-2 text-3xl font-bold text-navy">{survey.team_name}</h1>
      <p className="mt-3 mb-8 text-gray-700">
        Answer the same questions as your team. The readout shows your view next to theirs, and the
        gaps are often the most useful part.{" "}
        {mine ? "You've already answered. Change anything and save to update." : ""}
      </p>
      {survey.status === "open" ? (
        <SurveyForm
          mode="leader"
          surveyId={id}
          questions={(survey.questions ?? []) as Question[]}
          initial={(mine?.answers as Record<string, never>) ?? undefined}
        />
      ) : (
        <p className="rounded-md border border-line p-6 text-gray-600">
          This survey is closed. Reopen it from the survey page to change your answers.
        </p>
      )}
    </>
  );
}
