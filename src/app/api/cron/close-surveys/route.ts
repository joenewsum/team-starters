import { NextResponse, connection } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { finishSurvey } from "@/lib/finish";

// Runs once a day (see vercel.json): closes surveys whose close date has passed
// and emails their readouts.
export const maxDuration = 300;

export async function GET(request: Request) {
  await connection(); // run on every request, never at build time
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = adminClient();
  if (!db) return NextResponse.json({ skipped: "no service key" });

  const today = new Date().toISOString().slice(0, 10);
  const { data } = await db
    .from("surveys")
    .select("id")
    .eq("status", "open")
    .lt("close_date", today)
    .limit(20);
  const ids = (data ?? []).map((r) => r.id as string);
  for (const id of ids) await finishSurvey(id);
  return NextResponse.json({ finished: ids.length });
}
