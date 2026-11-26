"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { validateAnswers, type Question } from "@/lib/templates";

export type LeaderResult = { ok: boolean; error?: string };

export async function submitLeaderResponse(surveyId: string, rawAnswers: unknown): Promise<LeaderResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: survey } = await supabase
    .from("surveys")
    .select("id, status, share_token, questions")
    .eq("id", surveyId)
    .single();
  if (!survey) return { ok: false, error: "Survey not found." };
  if (survey.status !== "open") return { ok: false, error: "This survey is closed. Reopen it to change your answers." };

  const questions = (survey.questions ?? []) as Question[];
  const result = validateAnswers(questions, rawAnswers);
  if (!result.ok) return { ok: false, error: result.error };

  const { data, error } = await supabase.rpc("submit_response", {
    p_token: survey.share_token,
    p_role: "leader",
    p_answers: result.answers,
  });
  if (error || data !== true) {
    console.error("Leader response error", error);
    return { ok: false, error: "We couldn't save your answers. Try again." };
  }
  revalidatePath(`/dashboard/surveys/${surveyId}`);
  return { ok: true };
}
