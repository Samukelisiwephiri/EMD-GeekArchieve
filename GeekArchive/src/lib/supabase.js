import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Demo mode (fake sign-in, data kept in the browser) is for local development only.
// A production build without Supabase keys shows a setup screen instead, unless the
// operator deliberately sets NEXT_PUBLIC_DEMO_MODE=true (e.g. for a pitch demo).
export const demoModeAllowed =
  !isSupabaseConfigured &&
  (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_MODE === "true");
