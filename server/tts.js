// tts.js — OpenAI TTS using the same pattern as Match Game.
// Model: gpt-4o-mini-tts, default voice: onyx (override with HOST_VOICE env var).
// Returns an mp3 Buffer, or null if OPENAI_API_KEY isn't set.

import OpenAI from "openai";

let _client = null;
function client() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) return null;
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

const TTS_MODEL = "gpt-4o-mini-tts";
const cache = new Map();

export async function getTTS(text, voice = "onyx") {
  const key = `${voice}::${text}`;
  if (cache.has(key)) return cache.get(key);

  const openai = client();
  if (!openai) return null;

  try {
    const response = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice,
      input: text.slice(0, 4096),
      speed: 0.95,
    });
    const buf = Buffer.from(await response.arrayBuffer());
    cache.set(key, buf);
    return buf;
  } catch (err) {
    console.error("[tts] OpenAI error:", err.message);
    return null;
  }
}
