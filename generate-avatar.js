// Vercel serverless function.
// Receives a selfie photo from the browser, sends it to OpenAI's image
// editing API to generate a stylized cartoon avatar, and returns the result.
// The OpenAI API key lives only here, as a server-side environment variable
// (set in Vercel project settings) — it is never sent to the browser.

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, mimeType } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "Missing imageBase64 in request body." });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing OPENAI_API_KEY. Add it under your Vercel project's Settings → Environment Variables, then redeploy.",
    });
  }

  try {
    const buffer = Buffer.from(imageBase64, "base64");
    const blob = new Blob([buffer], { type: mimeType || "image/jpeg" });

    const form = new FormData();
    form.append("model", "gpt-image-1");
    form.append("image", blob, "selfie.jpg");
    form.append(
      "prompt",
      "Turn this person into a cute chibi-style cartoon travel avatar: big head, small rounded body, soft warm pastel colors, friendly expression, simple flat illustration style, plain light cream background, in the style of a cute app profile icon. Keep it recognizable as the same person's general look (hair color, skin tone) but stylized and cartoonish, not photorealistic."
    );
    form.append("size", "1024x1024");

    const openaiRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return res.status(openaiRes.status).json({ error: `OpenAI API error: ${errText}` });
    }

    const data = await openaiRes.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(500).json({ error: "OpenAI did not return an image. Try a different photo." });
    }

    return res.status(200).json({ avatarDataUrl: `data:image/png;base64,${b64}` });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unknown error generating avatar." });
  }
}
