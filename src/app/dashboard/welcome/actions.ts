"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PROFILE_FIELDS } from "@/lib/profile";

export type ProfileState = { error?: string };

export async function saveProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const update: Record<string, string> = {};
  for (const f of PROFILE_FIELDS) {
    const v = String(formData.get(f.id) ?? "");
    if (!(f.options as readonly string[]).includes(v)) return { error: "Please answer all four." };
    update[f.id] = v;
  }
  const { error } = await supabase
    .from("leaders")
    .update({ ...update, profile_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { error: "Something went wrong. Try again." };

  const next = String(formData.get("next") ?? "/dashboard");
  redirect(next.startsWith("/dashboard") ? next : "/dashboard");
}
