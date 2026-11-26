import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./profile-form";

export const metadata = { title: "Welcome | Team Starters" };

export default function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string; edit?: string }> }) {
  return (
    <div className="mx-auto max-w-md">
      <Suspense>
        <Welcome searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Welcome({ searchParams }: { searchParams: Promise<{ next?: string; edit?: string }> }) {
  const { next, edit } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: leader } = await supabase
    .from("leaders")
    .select("function, level, industry, company_size")
    .eq("id", user.id)
    .maybeSingle();
  const isEdit = edit === "1";
  return (
    <>
      <h1 className="text-3xl font-bold text-navy">{isEdit ? "About you and your team" : "Welcome to Team Starters"}</h1>
      <p className="mt-2 mb-8 text-gray-700">
        {isEdit
          ? "Update these if your role or team changes."
          : "Four quick questions, once. They let us show how your team compares with teams like yours, once enough teams have run a survey."}{" "}
        We only use them in totals across many teams, never with your name.
      </p>
      <ProfileForm
        initial={(leader ?? {}) as Record<string, string>}
        next={next && next.startsWith("/dashboard") ? next : "/dashboard"}
        edit={isEdit}
      />
    </>
  );
}
