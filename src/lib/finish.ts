import { adminClient } from "@/lib/supabase/admin";
import { siteUrl, MIN_RESPONSES_FOR_READOUT } from "@/lib/site";
import type { Question } from "@/lib/templates";
import type { ResponseRow, Stats } from "@/lib/readout/stats";
import type { Synthesis } from "@/lib/readout/synthesize";
import { generateReadout } from "@/lib/readout/generate";
import { readoutPdfBuffer } from "@/lib/readout/pdf";
import { esc, sendEmail } from "@/lib/email";

// A survey finishes when everyone has answered, when its close date passes, or
// when the leader closes it. Finishing closes it, writes the readout (unless an
// up-to-date one exists), and emails it to the leader with the PDF attached.
export async function finishSurvey(surveyId: string): Promise<void> {
  const db = adminClient();
  if (!db) return;

  // Claim the job, so two triggers at once don't send two emails.
  const stale = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: claimed } = await db
    .from("surveys")
    .update({ finishing_at: new Date().toISOString() })
    .eq("id", surveyId)
    .or(`finishing_at.is.null,finishing_at.lt.${stale}`)
    .select("id, team_name, status, closed_at, questions, leader_id, templates(name)")
    .maybeSingle();
  if (!claimed) return;

  try {
    if (claimed.status === "open") {
      await db.from("surveys").update({ status: "closed", closed_at: new Date().toISOString() }).eq("id", surveyId);
    }
    const [{ data: leader }, { data: rows }, { data: latest }] = await Promise.all([
      db.from("leaders").select("email").eq("id", claimed.leader_id).single(),
      db.from("responses").select("role, answers").eq("survey_id", surveyId),
      db
        .from("readouts")
        .select("stats, synthesis, response_count, created_at")
        .eq("survey_id", surveyId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (!leader?.email) return;
    const responses = (rows ?? []) as ResponseRow[];
    const teamCount = responses.filter((r) => r.role === "team").length;
    const surveyLink = `${siteUrl}/dashboard/surveys/${surveyId}`;
    const template = (claimed.templates as unknown as { name: string } | null)?.name ?? "Team Starter";

    if (teamCount < MIN_RESPONSES_FOR_READOUT) {
      await sendEmail({
        to: leader.email,
        subject: `${claimed.team_name}: your survey closed with ${teamCount} answers`,
        text: `Your ${template} for ${claimed.team_name} closed with ${teamCount} team answers. The readout needs at least ${MIN_RESPONSES_FOR_READOUT}, so no one can be identified.\n\nReopen it and send a reminder: ${surveyLink}`,
        html: `<p>Your ${esc(template)} for <strong>${esc(claimed.team_name)}</strong> closed with ${teamCount} team answers. The readout needs at least ${MIN_RESPONSES_FOR_READOUT}, so no one can be identified.</p><p><a href="${surveyLink}">Reopen it and send a reminder</a></p>`,
      });
      return;
    }

    let readout: { stats: Stats; synthesis: Synthesis; created_at: string };
    if (latest && latest.response_count === responses.length) {
      readout = latest as unknown as typeof readout;
    } else {
      readout = await generateReadout(
        db,
        { id: surveyId, team_name: claimed.team_name, questions: (claimed.questions ?? []) as Question[] },
        responses,
      );
    }

    const pdf = await readoutPdfBuffer({
      teamName: claimed.team_name,
      template,
      stats: readout.stats,
      synthesis: readout.synthesis,
      createdAt: readout.created_at,
    });
    const email = readoutEmail({
      teamName: claimed.team_name,
      template,
      stats: readout.stats,
      s: readout.synthesis,
      readoutLink: `${surveyLink}/readout`,
      answersLink: `${surveyLink}/answers`,
    });
    const sent = await sendEmail({
      to: leader.email,
      subject: `Your ${claimed.team_name} readout`,
      html: email.html,
      text: email.text,
      attachments: [
        {
          filename: `${claimed.team_name.replace(/[^\w -]/g, "").trim() || "Team"} readout.pdf`,
          content: pdf.toString("base64"),
        },
      ],
    });
    if (sent) await db.from("surveys").update({ readout_sent_at: new Date().toISOString() }).eq("id", surveyId);
  } catch (e) {
    console.error("Finish survey error", surveyId, e);
  } finally {
    await db.from("surveys").update({ finishing_at: null }).eq("id", surveyId);
  }
}

// Called after each team answer: finish the survey once everyone is in.
export async function finishIfEveryoneAnswered(shareToken: string): Promise<void> {
  const db = adminClient();
  if (!db) return;
  const { data: survey } = await db
    .from("surveys")
    .select("id, status, team_size")
    .eq("share_token", shareToken)
    .maybeSingle();
  if (!survey || survey.status !== "open" || !survey.team_size) return;
  const { count } = await db
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("survey_id", survey.id)
    .eq("role", "team");
  if ((count ?? 0) >= survey.team_size) await finishSurvey(survey.id);
}

export function readoutEmail(p: {
  teamName: string;
  template: string;
  stats: Stats;
  s: Synthesis;
  readoutLink: string;
  answersLink: string;
}) {
  const score = p.stats.scales?.[0];
  const changes = (p.s.one_change ?? []).slice(0, 3).map((t) => t.theme);
  const btn = (href: string, label: string, primary: boolean) =>
    `<a href="${href}" style="display:inline-block;margin:0 8px 8px 0;padding:11px 20px;border-radius:6px;font-weight:700;text-decoration:none;${
      primary ? "background:#0f1f3d;color:#ffffff;" : "border:1px solid #0f1f3d;color:#0f1f3d;"
    }">${label}</a>`;
  const html = `<div style="font-family:Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.6;">
<p style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#8a6a2e;margin:0 0 8px;">${esc(p.template)} readout</p>
<h1 style="font-size:24px;color:#0f1f3d;margin:0 0 4px;">${esc(p.teamName)}</h1>
<p style="color:#6b6b6b;margin:0 0 18px;">${p.stats.teamCount} team members${p.stats.leaderCount ? " and you" : ""} answered. The full readout is attached as a PDF.</p>
<p style="font-size:17px;color:#0f1f3d;margin:0 0 20px;">${esc(p.s.headline)}</p>
${
  score
    ? `<p style="margin:0 0 16px;"><strong>The score:</strong> the team says ${score.teamAvg ?? "-"} out of 10${
        score.leader !== null ? `, you said ${score.leader}` : ""
      }.</p>`
    : ""
}
<p style="margin:0 0 6px;"><strong>A draft value statement:</strong></p>
<p style="background:#faf6ee;padding:12px 14px;color:#0f1f3d;margin:0 0 16px;">${esc(p.s.value_statement)}</p>
${
  changes.length
    ? `<p style="margin:0 0 6px;"><strong>Where the team wants to start:</strong></p><ol style="margin:0 0 20px;padding-left:20px;">${changes
        .map((c) => `<li>${esc(c)}</li>`)
        .join("")}</ol>`
    : ""
}
<p style="margin:0 0 20px;">${btn(p.readoutLink, "Open your readout", true)}${btn(p.answersLink, "Read every answer", false)}</p>
<p style="font-size:14px;margin:0 0 6px;">Next, bring it to your team. The one-hour session walks you through it: <a href="https://www.stratechi.com/agree-on-our-value/" style="color:#8a6a2e;">Agree on our value</a>.</p>
<p style="font-size:13px;color:#6b6b6b;margin:20px 0 0;">Your team's individual answers stay in your account, shuffled and without names.</p>
</div>`;
  const text = `${p.template} readout: ${p.teamName}

${p.s.headline}

${score ? `The score: the team says ${score.teamAvg ?? "-"} out of 10${score.leader !== null ? `, you said ${score.leader}` : ""}.\n\n` : ""}A draft value statement: ${p.s.value_statement}

${changes.length ? `Where the team wants to start:\n${changes.map((c, i) => `${i + 1}. ${c}`).join("\n")}\n\n` : ""}Open your readout: ${p.readoutLink}
Read every answer: ${p.answersLink}

The full readout is attached as a PDF.`;
  return { html, text };
}
