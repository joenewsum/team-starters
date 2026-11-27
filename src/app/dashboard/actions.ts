"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { finishSurvey } from "@/lib/finish";
import { notifyNewSurvey } from "@/lib/admin-notify";
import { adminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MIN_RESPONSES_FOR_READOUT } from "@/lib/site";
import type { Question } from "@/lib/templates";
import { getStarter } from "@/lib/starters";
import type { ResponseRow } from "@/lib/readout/stats";
import { generateReadout } from "@/lib/readout/generate";

export type NewSurveyState = { error?: string; teamName?: string; closeDate?: string; teamSize?: string };

const MAX_OPEN_SURVEYS = 10;

export async function createSurvey(
  _prev: NewSurveyState,
  formData: FormData,
): Promise<NewSurveyState> {
  const teamName = String(formData.get("team_name") ?? "").trim();
  const closeDate = String(formData.get("close_date") ?? "").trim();
  const templateId = String(formData.get("template_id") ?? "value-starter");
  const teamSizeRaw = String(formData.get("team_size") ?? "").trim();
  const keep = { teamName, closeDate, teamSize: teamSizeRaw };
  const teamSize = teamSizeRaw ? Number(teamSizeRaw) : null;
  if (teamSize !== null && (!Number.isInteger(teamSize) || teamSize < 3 || teamSize > 500)) {
    return { ...keep, error: "Team size should be a number from 3 to 500, not counting you." };
  }

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

  const template = getStarter(templateId);
  if (!template) return { ...keep, error: "That Team Starter isn't available." };

  const { data: profile } = await supabase
    .from("leaders")
    .select("function, level, industry, company_size, profile_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.profile_completed_at) redirect("/dashboard/welcome?next=/dashboard/new");

  const { data, error } = await supabase
    .from("surveys")
    .insert({
      leader_id: user.id,
      template_id: template.id,
      template_version: template.version,
      questions: template.questions,
      team_name: teamName,
      close_date: closeDate || null,
      team_size: teamSize,
      meta: {
        function: profile.function,
        level: profile.level,
        industry: profile.industry,
        company_size: profile.company_size,
      },
    })
    .select("id")
    .single();

  if (error || !data) return { ...keep, error: "Something went wrong. Try again." };

  if (user.email) {
    const email = user.email;
    after(() =>
      notifyNewSurvey(
        email,
        { teamName, template: template.name, teamSize, closeDate: closeDate || null },
        profile,
      ),
    );
  }
  revalidatePath("/dashboard");
  redirect(`/dashboard/surveys/${data.id}?new=1`);
}

export async function closeSurvey(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { data: closed } = await supabase
    .from("surveys")
    .update({ status: "closed", closed_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  revalidatePath("/dashboard");
  if (closed && adminClient()) {
    after(() => finishSurvey(id));
    redirect(`/dashboard/surveys/${id}?closed=1`);
  }
  redirect(`/dashboard/surveys/${id}`);
}

export async function reopenSurvey(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("surveys")
    .update({ status: "open", closed_at: null, close_date: null, readout_sent_at: null, notified_at: null })
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
    .select("id, team_name, status, questions, templates(questions)")
    .eq("id", id)
    .single();
  if (!survey) redirect("/dashboard");

  const { data: rows } = await supabase.from("responses").select("role, answers").eq("survey_id", id);
  const responses = (rows ?? []) as ResponseRow[];
  if (responses.filter((r) => r.role === "team").length < MIN_RESPONSES_FOR_READOUT) {
    redirect(`/dashboard/surveys/${id}`);
  }

  const since = new Date(Date.now() - 86400000).toISOString();
  const { count } = await supabase
    .from("readouts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_READOUTS_PER_DAY) redirect(`/dashboard/surveys/${id}?error=limit`);

  const questions = (survey.questions ??
    (survey.templates as unknown as { questions: Question[] } | null)?.questions ??
    []) as Question[];

  let failed: string | null = null;
  try {
    await generateReadout(supabase, { id, team_name: survey.team_name, questions }, responses);
  } catch (e) {
    console.error("Readout AI error", e);
    failed = e instanceof Error && e.message === "SAVE_FAILED" ? "save" : aiErrorCode(e);
  }
  if (failed) redirect(`/dashboard/surveys/${id}?error=${failed}`);

  revalidatePath(`/dashboard/surveys/${id}`);
  redirect(`/dashboard/surveys/${id}/readout`);
}

function aiErrorCode(e: unknown): string {
  if (e instanceof Error && e.message === "NO_API_KEY") return "setup";
  const err = e as { status?: number; message?: string };
  const msg = (err?.message ?? "").toLowerCase();
  if (err?.status === 401 || err?.status === 403) return "ai_key";
  if (msg.includes("credit") || msg.includes("billing")) return "ai_credit";
  if (err?.status === 404 || msg.includes("model")) return "ai_model";
  if (err?.status === 429) return "ai_busy";
  if (err?.status === 529 || (err?.status ?? 0) >= 500) return "ai_busy";
  return "ai";
}

export async function setReadoutSharing(surveyId: string, on: boolean) {
  const supabase = await createClient();
  const token = on
    ? Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("")
    : null;
  await supabase.from("surveys").update({ readout_share_token: token }).eq("id", surveyId);
  revalidatePath(`/dashboard/surveys/${surveyId}/readout`);
}

export async function updateCloseDate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const closeDate = String(formData.get("close_date") ?? "").trim();
  const sizeRaw = String(formData.get("team_size") ?? "").trim();
  const size = sizeRaw ? Number(sizeRaw) : null;
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  await supabase
    .from("surveys")
    .update({
      close_date: closeDate && closeDate >= today ? closeDate : null,
      team_size: size !== null && Number.isInteger(size) && size >= 3 && size <= 500 ? size : null,
    })
    .eq("id", id);
  revalidatePath(`/dashboard/surveys/${id}`);
  redirect(`/dashboard/surveys/${id}`);
}

export async function setWantsUpdates(on: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("leaders").update({ wants_updates: on }).eq("id", user.id);
  revalidatePath("/dashboard");
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("Delete account error", error);
    redirect("/dashboard/account?error=1");
  }
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
