import { sendEmail, esc } from "@/lib/email";
import { isAdmin } from "@/lib/admin";
import { siteUrl } from "@/lib/site";
import { adminClient } from "@/lib/supabase/admin";

// Emails Joe when a leader signs up or starts a survey.
// Set ADMIN_NOTIFY_EMAIL in Vercel to send these somewhere else.
const to = () => process.env.ADMIN_NOTIFY_EMAIL ?? "joe@stratechi.com";

async function send(subject: string, rows: [string, string | null | undefined][]) {
  const shown = rows.filter(([, v]) => v);
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#0f1f3d;">
<table style="border-collapse:collapse;">${shown
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 16px 4px 0;color:#6b6b6b;">${esc(k)}</td><td style="padding:4px 0;font-weight:600;">${esc(String(v))}</td></tr>`,
    )
    .join("")}</table>
<p style="margin:20px 0 0;"><a href="${siteUrl}/dashboard/admin" style="color:#8a6a2e;">Open the admin page</a></p></div>`;
  const text = shown.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nAdmin page: ${siteUrl}/dashboard/admin`;
  try {
    await sendEmail({ to: to(), subject, html, text });
  } catch (e) {
    console.error("Admin notify failed", e);
  }
}

async function count(table: "leaders" | "surveys") {
  const db = adminClient();
  if (!db) return null;
  const { count } = await db.from(table).select("id", { count: "exact", head: true });
  return count ?? null;
}

type Profile = { function?: string | null; level?: string | null; industry?: string | null; company_size?: string | null };

export async function notifyNewLeader(email: string, p: Profile) {
  if (isAdmin(email)) return;
  const total = await count("leaders");
  await send(`New Team Starters leader: ${email}`, [
    ["Email", email],
    ["Role", p.level],
    ["Function", p.function],
    ["Industry", p.industry],
    ["Company size", p.company_size],
    ["Total leaders", total !== null ? String(total) : null],
  ]);
}

export async function notifyNewSurvey(
  email: string,
  s: { teamName: string; template: string; teamSize: number | null; closeDate: string | null },
  p: Profile,
) {
  if (isAdmin(email) || s.teamName.startsWith("Sim:")) return;
  const total = await count("surveys");
  await send(`New survey: ${s.teamName} (${email})`, [
    ["Leader", email],
    ["Team", s.teamName],
    ["Survey", s.template],
    ["Team size", s.teamSize !== null ? String(s.teamSize) : null],
    ["Closes", s.closeDate],
    ["Role", p.level],
    ["Function", p.function],
    ["Industry", p.industry],
    ["Company size", p.company_size],
    ["Total surveys", total !== null ? String(total) : null],
  ]);
}
