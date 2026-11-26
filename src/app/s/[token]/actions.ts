"use server";

import { createClient } from "@/lib/supabase/server";
import { validateAnswers, type Question } from "@/lib/templates";
import { passesTurnstile } from "@/lib/turnstile";
import { after } from "next/server";
import { notifyIfReady } from "@/lib/notify";
import { finishIfEveryoneAnswered } from "@/lib/finish";

export type SubmitResult = { ok: boolean; error?: string };

export async function submitResponse(
  token: string,
  rawAnswers: unknown,
  botCheck?: string,
): Promise<SubmitResult> {
  if (!/^[0-9a-f]{24}$/.test(token)) return { ok: false, error: "This link isn't valid." };
  if (!(await passesTurnstile(botCheck))) {
    return { ok: false, error: "Please finish the quick check above the button, then submit again." };
  }

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_open_survey", { p_token: token });
  const survey = Array.isArray(data) ? data[0] : null;
  if (!survey) return { ok: false, error: "This survey is closed." };

  const result = validateAnswers(survey.questions as Question[], rawAnswers);
  if (!result.ok) return { ok: false, error: result.error };

  // Everyone with the share link answers as a team member. The leader answers
  // from their dashboard. (Older surveys asked for the role; treat them as team.)
  const role = "team";
  const { data: saved, error } = await supabase.rpc("submit_response", {
    p_token: token,
    p_role: role,
    p_answers: result.answers,
  });
  if (error || saved !== true) {
    return { ok: false, error: "We couldn't save your answers. The survey may be closed or full." };
  }
  after(async () => {
    await notifyIfReady(token);
    await finishIfEveryoneAnswered(token);
  });
  return { ok: true };
}
