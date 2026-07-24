// Vercel serverless function.
// Proxies requests to Anthropic's Messages API (used by the receipt scanner
// and the AI currency lookup), attaching the API key server-side so it is
// never exposed in browser code. The browser sends the same request body it
// would send directly to Anthropic (model, max_tokens, messages, etc.) and
// this just forwards it along with the key attached, then relays the
// response back unchanged.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY. Add it under your Vercel project's Settings → Environment Variables, then redeploy.",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  try {
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const text = await anthropicRes.text();
    res.status(anthropicRes.status);
    res.setHeader("Content-Type", "application/json");
    return res.send(text);
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Unknown error calling Claude API." });
  }
}
