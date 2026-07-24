// Vercel serverless function.
// Called once right after a fresh Google sign-in (when a Drive refresh token
// is present). Verifies the caller's Supabase session, then stores the
// refresh token using the service role key — which only this backend has
// access to. The browser itself never has permission to read or write this
// table (see the RLS setup with no policies on user_google_tokens).

import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return res.status(500).json({ error: "Server is missing Supabase configuration (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY)." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { accessToken, refreshToken } = body || {};
  if (!accessToken || !refreshToken) {
    return res.status(400).json({ error: "Missing accessToken or refreshToken." });
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { error: upsertErr } = await admin.from("user_google_tokens").upsert({
      user_id: userData.user.id,
      refresh_token: refreshToken,
      updated_at: new Date().toISOString(),
    });
    if (upsertErr) throw new Error(upsertErr.message);

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unknown error saving Google token." });
  }
}
