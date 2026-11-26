import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export const metadata = { title: "Admin | Team Starters" };

type AdminStats = {
  leaders: number;
  leaders_7d: number;
  surveys: number;
  surveys_7d: number;
  responses: number;
  readouts: number;
  opted_in: { email: string; since: string }[];
};

export default function AdminPage() {
  return (
    <div>
      <Link href="/dashboard" className="text-sm text-gray-600 hover:text-navy">
        &larr; Back to your dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-navy">Team Starters at a glance</h1>
      <p className="mt-1 text-gray-600">Simulated surveys are left out of the counts.</p>
      <Suspense fallback={<p className="mt-6 text-gray-500">Loading...</p>}>
        <Stats />
      </Suspense>
    </div>
  );
}

async function Stats() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) redirect("/dashboard");
  const { data, error } = await supabase.rpc("admin_stats");
  if (error || !data) {
    return <p className="mt-6 text-red-700">The counts aren&apos;t available yet. The 0009 database update may not have run.</p>;
  }
  const s = data as AdminStats;
  const tiles: [string, number, string][] = [
    ["Leaders signed up", s.leaders, `${s.leaders_7d} in the last 7 days`],
    ["Surveys created", s.surveys, `${s.surveys_7d} in the last 7 days`],
    ["Responses", s.responses, s.surveys ? `${Math.round(s.responses / s.surveys)} per survey` : ""],
    ["Readouts created", s.readouts, ""],
  ];
  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-4">
        {tiles.map(([label, n, sub]) => (
          <div key={label} className="rounded-md border border-line p-4">
            <p className="text-sm text-gray-600">{label}</p>
            <p className="mt-1 text-3xl font-bold text-navy">{n}</p>
            <p className="text-xs text-gray-500">{sub}</p>
          </div>
        ))}
      </div>
      <section className="mt-10">
        <h2 className="text-xl font-bold text-navy">Leaders who want updates ({s.opted_in.length})</h2>
        {s.opted_in.length === 0 ? (
          <p className="mt-3 text-gray-500">No one yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-md border border-line">
            {s.opted_in.map((o) => (
              <li key={o.email} className="flex justify-between p-3 text-sm">
                <span className="text-navy">{o.email}</span>
                <span className="text-gray-500">{o.since.slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
