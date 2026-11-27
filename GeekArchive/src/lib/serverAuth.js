// Server-side check of who is calling an API route.
//
// With Supabase configured (a real deployment), routes require the caller's Supabase
// access token (Authorization: Bearer <token>). The token is verified with Supabase,
// and the caller's role/verification is read through row-level security as that user,
// so nobody can spend the site's AI budget or scrape GitHub through it anonymously.
// In local demo mode (no Supabase keys) the checks are skipped.
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const authEnforced = Boolean(url && anonKey);

const deny = (status, error) => ({ ok: false, response: Response.json({ error }, { status }) });

/**
 * @param {Request} request
 * @param {{ requireVerified?: boolean, roles?: string[] }} options
 * @returns {Promise<{ ok: true, userId: string|null, role: string|null } | { ok: false, response: Response }>}
 */
export async function requireUser(request, { requireVerified = false, roles = null } = {}) {
  if (!authEnforced) return { ok: true, userId: null, role: null, demo: true };

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return deny(401, "Please sign in to use this feature.");

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) return deny(401, "Your session has expired. Please sign in again.");
  const userId = userData.user.id;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  const role = profile?.role || null;
  if (roles && !roles.includes(role)) return deny(403, "Your account type can't use this feature.");

  if (requireVerified) {
    const { data: verified, error } = await supabase.rpc("is_verified", { p_user_id: userId });
    if (error) return deny(500, "Couldn't check your verification. Please try again.");
    if (!verified) return deny(403, "Please verify your account to use this feature.");
  }
  return { ok: true, userId, role };
}

/** Rate-limit key: the signed-in user when known, otherwise the client IP. */
export function rateKey(request, auth) {
  return auth?.userId || (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
}
