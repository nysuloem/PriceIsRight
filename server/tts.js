// tts.js — OpenAI TTS with style instructions for enthusiasm.
// gpt-4o-mini-tts supports an "instructions" field that controls delivery.

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

// Two delivery styles — announcer is big and hype, host is warm but still excited
const STYLES = {
  announcer: `You are a classic TV game show announcer — think The Price is Right. 
Speak with enormous enthusiasm, energy, and excitement. Big voice, punchy delivery. 
Really lean into names — make each contestant feel like a star. 
Speed up slightly on the fun parts, pause dramatically before reveals.`,

  host: `You are a charismatic, warm, enthusiastic TV game show host.
Friendly and exciting — like you genuinely can't wait to give away prizes.
Upbeat, clear, and energetic. Never flat or monotone.`,
};

export async function getTTS(text, voice = "echo", style = "host") {
  const key = `${voice}::${style}::${text}`;
  if (cache.has(key)) return cache.get(key);

  const openai = client();
  if (!openai) return null;

  try {
    const response = await openai.audio.speech.create({
      model: TTS_MODEL,
      voice,
      input: text.slice(0, 4096),
      instructions: STYLES[style] || STYLES.host,
      speed: 1.05,
    });
    const buf = Buffer.from(await response.arrayBuffer());
    cache.set(key, buf);
    return buf;
  } catch (err) {
    console.error("[tts] OpenAI error:", err.message);
    return null;
  }
}
