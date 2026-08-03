// tts.js
//
// Thin wrapper around OpenAI's text-to-speech endpoint for the host voice.
// If OPENAI_API_KEY isn't set, getTTS just returns null and the client
// falls back to timed pacing without audio — the game still works fine.

const cache = new Map();

export async function getTTS(text, voice = "onyx") {
  const key = `${voice}::${text}`;
  if (cache.has(key)) return cache.get(key);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  let res;
  try {
    res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice,
        input: text,
        response_format: "mp3",
      }),
      signal: AbortSignal.timeout(20000),
    });
  } catch (err) {
    console.error("[tts] request failed:", err.message);
    return null;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[tts] OpenAI error", res.status, body.slice(0, 300));
    return null;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  cache.set(key, buf);
  return buf;
}
