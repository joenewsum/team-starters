import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DeleteAccountButton } from "./delete-button";

export const metadata = { title: "Your account | Team Starters" };

export default function AccountPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  return (
    <div className="mx-auto max-w-xl">
      <Link href="/dashboard" className="text-sm text-gray-600 hover:text-navy">
        &larr; Back to your dashboard
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-navy">Your account</h1>
      <Suspense>
        <Account searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Account({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <>
      <p className="mt-2 text-gray-700">Signed in as {user.email}</p>
      <section className="mt-10 rounded-md border border-red-200 p-6">
        <h2 className="text-lg font-bold text-navy">Delete your account</h2>
        <p className="mt-2 text-sm text-gray-700">
          This deletes your account and every survey, answer, and readout in it. It can&apos;t be undone.
        </p>
        {error && <p className="mt-3 text-sm text-red-700">Something went wrong. Try again.</p>}
        <DeleteAccountButton />
      </section>
    </>
  );
}
