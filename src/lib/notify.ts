import { createClient } from "@supabase/supabase-js";
import { siteUrl } from "@/lib/site";
import { supabaseUrl } from "@/lib/supabase/env";

// Emails the leader once, when the third team member answers.
// Turns on when SUPABASE_SERVICE_ROLE_KEY and RESEND_API_KEY are set in Vercel.
export async function notifyIfReady(shareToken: string) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!serviceKey || !resendKey || !supabaseUrl) return;

  try {
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const { data } = await admin.rpc("claim_ready_notification", { p_token: shareToken });
    const row = Array.isArray(data) ? data[0] : null;
    if (!row?.email) return;

    const link = `${siteUrl}/dashboard/surveys/${row.survey_id}`;
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Team Starters <starters@stratechi.com>",
        to: [row.email],
        subject: `Your ${row.team_name} readout is ready`,
        text: `Three people on ${row.team_name} have answered, so your readout is ready to create.\n\nOpen your survey: ${link}\n\nYou can create it now, or wait for more answers and create it then.\n\nTeam Starters by Stratechi`,
      }),
    });
    if (!res.ok) console.error("Readout-ready email failed", res.status, await res.text());
  } catch (e) {
    console.error("Readout-ready email error", e);
  }
}
