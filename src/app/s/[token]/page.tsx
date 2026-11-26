import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Question } from "@/lib/templates";
import { SurveyForm } from "./survey-form";

// Room to write and email the readout after the last answer comes in.
export const maxDuration = 300;

export const metadata = {
  title: "Team survey | Team Starters",
  robots: { index: false, follow: false },
};

export default function RespondPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Suspense fallback={<p className="text-gray-500">Loading the survey...</p>}>
        <Survey params={params} />
      </Suspense>
    </div>
  );
}

async function Survey({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = /^[0-9a-f]{24}$/.test(token)
    ? await supabase.rpc("get_open_survey", { p_token: token })
    : { data: null };
  const survey = Array.isArray(data) ? data[0] : null;

  if (!survey) {
    return (
      <div className="rounded-md border border-line p-8 text-center">
        <p className="text-xl font-bold text-navy">This survey is closed</p>
        <p className="mt-2 text-gray-600">
          It may have reached its close date, or the link may be wrong. Check with your team leader.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark">
        {survey.template_name}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-navy">{survey.team_name}</h1>
      <p className="mt-3 mb-8 text-gray-700">
        This short survey asks for your honest view of who we serve, the value we create, and where
        our time goes. It takes 10 to 15 minutes. Your answers are anonymous: responses are shuffled
        and shared without names, so no one can tell who said what. Write in your own words. There
        are no right answers.
      </p>
      <SurveyForm token={token} questions={survey.questions as Question[]} />
    </>
  );
}
