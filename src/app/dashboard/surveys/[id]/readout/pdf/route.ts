import { createClient } from "@/lib/supabase/server";
import type { Stats } from "@/lib/readout/stats";
import type { Synthesis } from "@/lib/readout/synthesize";
import { readoutPdfBuffer } from "@/lib/readout/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });
  const supabase = await createClient();
  const [{ data: survey }, { data: readout }] = await Promise.all([
    supabase.from("surveys").select("team_name, templates(name)").eq("id", id).single(),
    supabase
      .from("readouts")
      .select("stats, synthesis, created_at")
      .eq("survey_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (!survey || !readout) return new Response("Not found", { status: 404 });
  const pdf = await readoutPdfBuffer({
    teamName: survey.team_name,
    template: (survey.templates as unknown as { name: string } | null)?.name ?? "Team Starter",
    stats: readout.stats as Stats,
    synthesis: readout.synthesis as Synthesis,
    createdAt: readout.created_at,
  });
  const name = `${survey.team_name.replace(/[^\w -]/g, "").trim() || "Team"} readout.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  });
}
