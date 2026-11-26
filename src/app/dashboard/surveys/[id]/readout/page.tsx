import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Stats } from "@/lib/readout/stats";
import type { Synthesis } from "@/lib/readout/synthesize";
import { siteUrl } from "@/lib/site";
import { PrintButton } from "./print-button";
import { ReadoutView } from "./readout-view";
import { ShareReadout } from "./share-readout";

export const metadata = { title: "Readout | Team Starters" };

export default function ReadoutPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading your readout...</p>}>
      <Readout params={params} />
    </Suspense>
  );
}

async function Readout({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: survey }, { data: readout }] = await Promise.all([
    supabase.from("surveys").select("id, team_name, templates(name)").eq("id", id).single(),
    supabase
      .from("readouts")
      .select("stats, synthesis, response_count, created_at")
      .eq("survey_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!survey || !readout) notFound();
  const template = (survey.templates as unknown as { name: string } | null)?.name ?? "Team Starter";
  // Separate query, so the readout still shows if the sharing update hasn't run yet.
  const { data: share } = await supabase.from("surveys").select("readout_share_token").eq("id", id).maybeSingle();
  const shareToken = (share as { readout_share_token?: string | null } | null)?.readout_share_token ?? null;
  const shareUrl = shareToken ? `${siteUrl}/r/${shareToken}` : null;

  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between print:hidden">
        <Link href={`/dashboard/surveys/${id}`} className="text-sm text-gray-600 hover:text-navy">
          &larr; Back to the survey
        </Link>
        <PrintButton />
      </div>
      <ShareReadout surveyId={id} shareUrl={shareUrl} />
      <ReadoutView
        teamName={survey.team_name}
        template={template}
        stats={readout.stats as Stats}
        synthesis={readout.synthesis as Synthesis}
        createdAt={readout.created_at}
      />
    </article>
  );
}
