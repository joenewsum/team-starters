export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
// Supabase now calls this the publishable key; older projects call it the anon key.
export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
