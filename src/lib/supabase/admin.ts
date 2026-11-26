import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "./env";

// Server-only client with full access. Used for work no signed-in user is
// present for: finishing surveys, sending emails, the daily close check.
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !supabaseUrl) return null;
  return createClient(supabaseUrl, key, { auth: { persistSession: false } });
}
