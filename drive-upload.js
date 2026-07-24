// Vercel serverless function.
// Uploads a photo into the signed-in user's own Google Drive (into an
// app-created "Wayfarer App Photos" folder — never touching their existing
// files, per the drive.file scope), then saves a reference to it in
// Supabase so the app can find it again after a refresh.
//
// Flow: verify the caller's Supabase session -> look up their stored Google
// refresh token -> exchange it for a short-lived Drive access token ->
// find/create the app's folder -> upload the file -> make it link-viewable
// (not editable, not publicly indexed — just enough for the app to display
// it) -> save the reference.

import { createClient } from "@supabase/supabase-js";

const FOLDER_NAME = "Wayfarer App Photos";

async function getFreshAccessToken(refreshToken) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const data = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(data.error_description || data.error || "Failed to refresh Google access token.");
  return data.access_token;
}

async function findOrCreateFolder(accessToken) {
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) return searchData.files[0].id;

  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  const createData = await createRes.json();
  if (!createRes.ok) throw new Error(createData.error?.message || "Failed to create Wayfarer folder in Drive.");
  return createData.id;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return res.status(500).json({ error: "Server is missing Supabase configuration." });
  }
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: "Server is missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { accessToken, imageBase64, mimeType, fileName, tripId, dayId, caption } = body || {};
  if (!accessToken || !imageBase64) {
    return res.status(400).json({ error: "Missing accessToken or imageBase64." });
  }

  try {
    const authClient = createClient(supabaseUrl, anonKey);
    const { data: userData, error: userErr } = await authClient.auth.getUser(accessToken);
    if (userErr || !userData?.user) {
      return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: tokenRow, error: tokenErr } = await admin
      .from("user_google_tokens")
      .select("refresh_token")
      .eq("user_id", userId)
      .single();
    if (tokenErr || !tokenRow) {
      return res.status(400).json({ error: "No Google Drive connection found for your account. Try signing out and signing back in to reconnect Drive." });
    }

    const googleAccessToken = await getFreshAccessToken(tokenRow.refresh_token);
    const folderId = await findOrCreateFolder(googleAccessToken);

    const buffer = Buffer.from(imageBase64, "base64");
    const boundary = "wayfarer" + Date.now();
    const metadata = { name: fileName || `photo-${Date.now()}.jpg`, parents: [folderId] };
    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType || "image/jpeg"}\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
      method: "POST",
      headers: { Authorization: `Bearer ${googleAccessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(uploadData.error?.message || "Drive upload failed.");
    const fileId = uploadData.id;

    // Link-viewable only (not "editable", not search-indexed) so the app can display it as an image.
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${googleAccessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });

    const driveViewUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;

    const { data: photoRow, error: insertErr } = await admin
      .from("photos")
      .insert({
        user_id: userId,
        trip_id: tripId ? String(tripId) : null,
        day_id: dayId ? String(dayId) : null,
        drive_file_id: fileId,
        drive_view_url: driveViewUrl,
        caption: caption || "",
        is_private: false,
      })
      .select()
      .single();
    if (insertErr) throw new Error(insertErr.message);

    return res.status(200).json({ photo: photoRow });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unknown error uploading photo." });
  }
}
