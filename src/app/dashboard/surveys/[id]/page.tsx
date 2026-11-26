import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MIN_RESPONSES_FOR_READOUT, shareLink } from "@/lib/site";
import { closeSurvey, createReadout, reopenSurvey } from "../../actions";
import { SubmitButton } from "./submit-button";
import { DeleteButton } from "./delete-button";
import { CopyLink } from "./copy-link";

export const metadata = { title: "Survey | Team Starters" };
export const maxDuration = 120;

export default function SurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; error?: string; sim?: string }>;
}) {
  return (
    <div>
      <Link href="/dashboard" className="text-sm text-gray-600 hover:text-navy">
        &larr; Back to your dashboard
      </Link>
      <Suspense fallback={<p className="mt-6 text-gray-500">Loading...</p>}>
        <SurveyDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SurveyDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string; error?: string; sim?: string }>;
}) {
  const { id } = await params;
  const { new: isNew, error, sim } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: survey } = await supabase
    .from("surveys")
    .select("id, team_name, status, close_date, share_token, created_at, closed_at, templates(name)")
    .eq("id", id)
    .single();
  if (!survey) notFound();

  const [{ count: total }, { count: leaderCount }] = await Promise.all([
    supabase.from("responses").select("id", { count: "exact", head: true }).eq("survey_id", id),
    supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("survey_id", id)
      .eq("role", "leader"),
  ]);
  const responses = total ?? 0;
  const { data: latest } = await supabase
    .from("readouts")
    .select("id, response_count, created_at")
    .eq("survey_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const teamResponses = responses - (leaderCount ?? 0);
  const open = survey.status === "open";
  const template = (survey.templates as unknown as { name: string } | null)?.name ?? "Team Starter";
  const url = shareLink(survey.share_token);

  return (
    <div className="mt-4">
      {sim && (
        <div className="mb-6 rounded-md border border-gold bg-cream p-4 text-navy">
          Simulation done: {sim} answers added. Create the readout below to see how it reads.
        </div>
      )}
      {isNew && (
        <div className="mb-6 rounded-md border border-gold bg-cream p-4 text-navy">
          Your survey is ready. Copy the link below and send it to your team.
        </div>
      )}
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">{template}</p>
      <h1 className="mt-1 text-3xl font-bold text-navy">{survey.team_name}</h1>
      <p className="mt-1 text-gray-600">
        {open
          ? survey.close_date
            ? `Open until ${survey.close_date}`
            : "Open"
          : `Closed${survey.closed_at ? ` on ${survey.closed_at.slice(0, 10)}` : ""}`}
      </p>

      {open && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-navy">Share this link with your team</h2>
          <p className="mt-1 mb-3 text-sm text-gray-600">
            Send it by email, Slack, or Teams. No one needs an account, and answers are anonymous.
          </p>
          <CopyLink url={url} />
        </section>
      )}

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-md border border-line p-5">
        <div>
          <h2 className="text-lg font-bold text-navy">Your answers</h2>
          <p className="mt-1 text-sm text-gray-600">
            {leaderCount
              ? "Done. The readout shows your view next to the team's."
              : "Answer the same questions yourself. The readout compares your view with the team's."}
          </p>
        </div>
        {open && (
          <Link
            href={`/dashboard/surveys/${survey.id}/take`}
            className={`rounded-md px-5 py-2 font-semibold ${
              leaderCount ? "border border-navy text-navy hover:bg-cream" : "bg-navy text-white hover:bg-navy-2"
            }`}
          >
            {leaderCount ? "Update my answers" : "Take it yourself"}
          </Link>
        )}
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Team responses" value={teamResponses} />
        <Stat label="Your answers" value={leaderCount ? "Done" : "Not yet"} />
        <Stat label="Total" value={responses} />
      </section>

      <section className="mt-8 rounded-md border border-line p-6">
        <h2 className="text-lg font-bold text-navy">Readout</h2>
        {error && (
          <p className="mt-2 rounded-md bg-red-50 p-3 text-sm text-red-800">
            {ERRORS[error] ?? "Something went wrong. Try again."}
          </p>
        )}
        {teamResponses < MIN_RESPONSES_FOR_READOUT ? (
          <p className="mt-2 text-gray-600">
            The readout and the answers open once at least {MIN_RESPONSES_FOR_READOUT} team members
            have answered, so no one can be identified.{" "}
            {MIN_RESPONSES_FOR_READOUT - teamResponses} more to go.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            {latest ? (
              <p className="text-gray-600">
                Your readout covers {latest.response_count} responses.{" "}
                {latest.response_count < responses &&
                  `${responses - latest.response_count} more have come in since. Create a new readout to include them.`}
              </p>
            ) : (
              <p className="text-gray-600">
                {open
                  ? "You can create the readout now, or wait until everyone has answered. Close the survey when you're done."
                  : "Everyone's in. Create the readout to see what your team said."}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              {latest && (
                <Link
                  href={`/dashboard/surveys/${survey.id}/readout`}
                  className="rounded-md bg-navy px-5 py-2 font-semibold text-white hover:bg-navy-2"
                >
                  View readout
                </Link>
              )}
              <Link
                href={`/dashboard/surveys/${survey.id}/answers`}
                className="rounded-md border border-navy px-5 py-2 font-semibold text-navy hover:bg-cream"
              >
                See all answers
              </Link>
              {(!latest || latest.response_count !== responses || leaderCount) && (
                <form action={createReadout}>
                  <input type="hidden" name="id" value={survey.id} />
                  <SubmitButton
                    label={latest ? "Create a new readout" : "Create readout"}
                    pendingLabel="Writing your readout... (about a minute)"
                  />
                </form>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        {open ? (
          <form action={closeSurvey}>
            <input type="hidden" name="id" value={survey.id} />
            <button className="rounded-md bg-gold px-5 py-2 font-semibold text-navy hover:opacity-90">
              Close survey now
            </button>
          </form>
        ) : (
          <form action={reopenSurvey}>
            <input type="hidden" name="id" value={survey.id} />
            <button className="rounded-md border border-navy px-5 py-2 font-semibold text-navy hover:bg-cream">
              Reopen survey
            </button>
          </form>
        )}
        <DeleteButton id={survey.id} />
      </section>
    </div>
  );
}

const ERRORS: Record<string, string> = {
  setup: "The readout isn't set up yet. The AI key still needs to be added.",
  ai: "The readout couldn't be written just now. Try again in a minute.",
  ai_key: "The AI key was rejected. Check that the full key is saved in Vercel, then redeploy.",
  ai_credit: "The AI account is out of credits. Add credits under Billing at platform.claude.com.",
  ai_model: "The AI model wasn't found. This one is on our side.",
  ai_busy: "The AI service is busy. Try again in a minute.",
  save: "The readout was written but couldn't be saved. Try again.",
  limit: "You've reached today's limit of readouts. Try again tomorrow.",
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-line p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}
