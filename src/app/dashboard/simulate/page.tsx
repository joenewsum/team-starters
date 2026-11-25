import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { SCENARIOS, TEAM_TYPES } from "@/lib/simulate";
import { SimForm } from "./sim-form";

export const metadata = { title: "Simulate a team | Team Starters" };
export const maxDuration = 300;

export default function SimulatePage() {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/dashboard" className="text-sm text-gray-600 hover:text-navy">
        &larr; Back to your dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-navy">Simulate a team</h1>
      <p className="mt-2 mb-8 text-gray-700">
        Test tool, only visible to you. Claude writes Value Starter answers for a made-up team, then
        you create the readout as usual. Each run costs a few cents.
      </p>
      <Suspense>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email)) redirect("/dashboard");
  return <SimForm teams={TEAM_TYPES} scenarios={SCENARIOS} />;
}
