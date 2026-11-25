import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MIN_RESPONSES_FOR_READOUT, shareLink } from "@/lib/site";
import { closeSurvey, reopenSurvey } from "../../actions";
import { DeleteButton } from "./delete-button";
import { CopyLink } from "./copy-link";

export const metadata = { title: "Survey | Team Starters" };

export default function SurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
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
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
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
  const teamResponses = responses - (leaderCount ?? 0);
  const open = survey.status === "open";
  const template = (survey.templates as unknown as { name: string } | null)?.name ?? "Team Starter";
  const url = shareLink(survey.share_token);

  return (
    <div className="mt-4">
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
            Take it yourself too and choose &quot;Leader&quot; on the first question.
          </p>
          <CopyLink url={url} />
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Responses" value={responses} />
        <Stat label="Team members" value={teamResponses} />
        <Stat label="Leader" value={leaderCount ? "Done" : "Not yet"} />
      </section>

      <section className="mt-8 rounded-md border border-line p-6">
        <h2 className="text-lg font-bold text-navy">Readout</h2>
        {responses < MIN_RESPONSES_FOR_READOUT ? (
          <p className="mt-2 text-gray-600">
            The readout needs at least {MIN_RESPONSES_FOR_READOUT} responses so no one can be
            identified. {MIN_RESPONSES_FOR_READOUT - responses} more to go.
          </p>
        ) : open ? (
          <p className="mt-2 text-gray-600">
            Close the survey when everyone has answered, and the readout will be ready.
          </p>
        ) : (
          <p className="mt-2 text-gray-600">The readout is coming in the next build step.</p>
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-md border border-line p-4">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-bold text-navy">{value}</p>
    </div>
  );
}
