// fetch() for the app's own API routes. Adds the signed-in user's Supabase access
// token so the server can check who is calling (see src/lib/serverAuth.js).
import { supabase } from "./supabase";

export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return fetch(path, { ...options, headers });
}
