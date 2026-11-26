import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Stats } from "@/lib/readout/stats";
import type { Synthesis } from "@/lib/readout/synthesize";
import { ReadoutView } from "@/app/dashboard/surveys/[id]/readout/readout-view";
import { PrintButton } from "@/app/dashboard/surveys/[id]/readout/print-button";

export const metadata = { title: "Team readout | Team Starters", robots: { index: false, follow: false } };

export default function SharedReadoutPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<p className="text-gray-500">Loading the readout...</p>}>
      <Shared params={params} />
    </Suspense>
  );
}

async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{32}$/.test(token)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_shared_readout", { p_token: token });
  const r = Array.isArray(data) ? data[0] : null;
  if (!r) notFound();
  return (
    <article className="mx-auto max-w-3xl">
      <div className="flex justify-end print:hidden">
        <PrintButton />
      </div>
      <ReadoutView
        teamName={r.team_name}
        template={r.template_name}
        stats={r.stats as Stats}
        synthesis={r.synthesis as Synthesis}
        createdAt={r.created_at}
      />
    </article>
  );
}
