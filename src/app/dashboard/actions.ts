"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MIN_RESPONSES_FOR_READOUT } from "@/lib/site";
import type { Question } from "@/lib/templates";
import { computeStats, textAnswers, type ResponseRow } from "@/lib/readout/stats";
import { synthesize, type Synthesis } from "@/lib/readout/synthesize";

export type NewSurveyState = { error?: string; teamName?: string; closeDate?: string };

const MAX_OPEN_SURVEYS = 10;

export async function createSurvey(
  _prev: NewSurveyState,
  formData: FormData,
): Promise<NewSurveyState> {
  const teamName = String(formData.get("team_name") ?? "").trim();
  const closeDate = String(formData.get("close_date") ?? "").trim();
  const templateId = String(formData.get("template_id") ?? "value-starter");
  const keep = { teamName, closeDate };

  if (!teamName) return { ...keep, error: "Give your team a name." };
  if (teamName.length > 120) return { ...keep, error: "Keep the team name under 120 characters." };

  const today = new Date().toISOString().slice(0, 10);
  if (closeDate && closeDate < today) {
    return { ...keep, error: "Pick a close date from today on." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("surveys")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  if ((count ?? 0) >= MAX_OPEN_SURVEYS) {
    return { ...keep, error: `You can have up to ${MAX_OPEN_SURVEYS} open surveys. Close one first.` };
  }

  const { data: template } = await supabase
    .from("templates")
    .select("id, version")
    .eq("id", templateId)
    .single();
  if (!template) return { ...keep, error: "That Team Starter isn't available." };

  const { data, error } = await supabase
    .from("surveys")
    .insert({
      leader_id: user.id,
      template_id: template.id,
      template_version: template.version,
      team_name: teamName,
      close_date: closeDate || null,
    })
    .select("id")
    .single();

  if (error || !data) return { ...keep, error: "Something went wrong. Try again." };

  revalidatePath("/dashboard");
  redirect(`/dashboard/surveys/${data.id}?new=1`);
}

export async function closeSurvey(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("surveys")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/dashboard");
  redirect(`/dashboard/surveys/${id}`);
}

export async function reopenSurvey(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("surveys")
    .update({ status: "open", closed_at: null, close_date: null })
    .eq("id", id);
  revalidatePath("/dashboard");
  redirect(`/dashboard/surveys/${id}`);
}

export async function deleteSurvey(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("surveys").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

const MAX_READOUTS_PER_DAY = 10;

export async function createReadout(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, team_name, status, templates(questions)")
    .eq("id", id)
    .single();
  if (!survey) redirect("/dashboard");

  const { data: rows } = await supabase.from("responses").select("role, answers").eq("survey_id", id);
  const responses = (rows ?? []) as ResponseRow[];
  if (responses.length < MIN_RESPONSES_FOR_READOUT) redirect(`/dashboard/surveys/${id}`);

  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase
    .from("readouts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_READOUTS_PER_DAY) redirect(`/dashboard/surveys/${id}?error=limit`);

  const questions = ((survey.templates as unknown as { questions: Question[] } | null)?.questions ?? []) as Question[];
  const stats = computeStats(questions, responses);

  let synthesis: Synthesis;
  try {
    synthesis = await synthesize({
      teamName: survey.team_name,
      stats,
      texts: textAnswers(questions, responses),
    });
  } catch (e) {
    const code = e instanceof Error && e.message === "NO_API_KEY" ? "setup" : "ai";
    redirect(`/dashboard/surveys/${id}?error=${code}`);
  }

  const { error } = await supabase.from("readouts").insert({
    survey_id: id,
    response_count: responses.length,
    stats,
    synthesis,
  });
  if (error) redirect(`/dashboard/surveys/${id}?error=save`);

  revalidatePath(`/dashboard/surveys/${id}`);
  redirect(`/dashboard/surveys/${id}/readout`);
}
