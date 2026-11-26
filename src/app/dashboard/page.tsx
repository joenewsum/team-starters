import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { UpdatesToggle } from "./updates-toggle";

export const metadata = { title: "Dashboard | Team Starters" };

type SurveyRow = {
  id: string;
  team_name: string;
  status: "open" | "closed";
  close_date: string | null;
  created_at: string;
  templates: { name: string } | null;
};

export default function Dashboard() {
  return (
    <Suspense
      fallback={<p className="text-gray-500">Loading your surveys...</p>}
    >
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: leader } = await supabase
    .from("leaders")
    .select("wants_updates, profile_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  if (leader && !leader.profile_completed_at) redirect("/dashboard/welcome");
  const { data } = await supabase
    .from("surveys")
    .select("id, team_name, status, close_date, created_at, templates(name)")
    .order("created_at", { ascending: false });
  const surveys = (data ?? []) as unknown as SurveyRow[];
  const current = surveys.filter((s) => s.status === "open");
  const past = surveys.filter((s) => s.status === "closed");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy">Your Team Starters</h1>
          <p className="mt-1 text-gray-600">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-4">
          {isAdmin(user.email) && (
            <>
              <Link href="/dashboard/admin" className="text-sm font-semibold text-gold-dark underline">
                Admin
              </Link>
              <Link href="/dashboard/simulate" className="text-sm font-semibold text-gold-dark underline">
                Simulate a team
              </Link>
            </>
          )}
          <Link href="/dashboard/account" className="text-sm text-gray-600 underline hover:text-navy">
            Account
          </Link>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-gray-600 underline hover:text-navy">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-navy">Current surveys</h2>
          <Link
            href="/dashboard/new"
            className="rounded-md bg-gold px-4 py-2 text-sm font-semibold text-navy hover:opacity-90"
          >
            Start a new survey
          </Link>
        </div>
        <SurveyList
          items={current}
          empty="No open surveys yet. Start one to get your team's view."
        />
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-navy">
          Past surveys and readouts
        </h2>
        <SurveyList
          items={past}
          empty="Closed surveys and their readouts will show up here."
        />
      </section>

      <section className="mt-10">
        <UpdatesToggle initial={Boolean(leader?.wants_updates)} />
      </section>
    </div>
  );
}

function SurveyList({ items, empty }: { items: SurveyRow[]; empty: string }) {
  if (items.length === 0) {
    return (
      <p className="mt-4 rounded-md border border-dashed border-line p-6 text-gray-500">
        {empty}
      </p>
    );
  }
  return (
    <ul className="mt-4 divide-y divide-line rounded-md border border-line">
      {items.map((s) => (
        <li key={s.id}>
          <Link
            href={`/dashboard/surveys/${s.id}`}
            className="flex items-center justify-between p-4 hover:bg-cream"
          >
            <div>
              <p className="font-semibold text-navy">{s.team_name}</p>
              <p className="text-sm text-gray-600">
                {s.templates?.name ?? "Team Starter"}
              </p>
            </div>
            <p className="text-sm text-gray-500">
              {s.status === "open"
                ? s.close_date
                  ? `Closes ${s.close_date}`
                  : "Open"
                : `Started ${s.created_at.slice(0, 10)}`}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
