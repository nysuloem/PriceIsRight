// tts.js — OpenAI TTS with style instructions for enthusiasm.
// gpt-4o-mini-tts supports an "instructions" field that controls delivery.

import OpenAI from "openai";

let _client = null;
function client() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) return null;
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 10000, maxRetries: 1 });
  }
  return _client;
}

const TTS_MODEL = "gpt-4o-mini-tts";
const cache = new Map();

// Two delivery styles — announcer is big and hype, host is warm but still excited
const STYLES = {
  announcer: `Perform like an exuberant 1980s television game-show announcer at the climax of the broadcast.
Use HUGE, joyful energy from the first word. Project to a packed studio audience. Smile audibly.
Punch important words, rise dramatically into contestant names, and make every "COME ON DOWN!" explosive and celebratory.
Use brisk broadcast pacing, theatrical pauses, and emphatic exclamations. Never sound conversational, restrained, calm, or like a narrator.`,

  host: `Perform as an exceptionally enthusiastic classic television game-show host speaking to a roaring studio audience.
Sound delighted, spontaneous, warm, and genuinely thrilled to give away every prize.
Use strong vocal variety, punchy emphasis, audible smiles, excited upward inflections, and celebratory exclamations.
Keep the pace lively and confident. Never sound calm, flat, formal, restrained, or like you are reading copy.`,
};

export async function getTTS(text, voice = "coral", style = "host") {
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
      speed: style === "announcer" ? 1.12 : 1.08,
    });
    const buf = Buffer.from(await response.arrayBuffer());
    cache.set(key, buf);
    return buf;
  } catch (err) {
    console.error("[tts] OpenAI error:", err.message);
    return null;
  }
}

const FALLBACK_CLOSINGS=["Keep your guesses bold and your family close!","Be kind, play fair, and always leave room for dessert!","Keep smiling, keep cheering, and take good care of each other!"];
export async function generateClosingLine(){
  const fallback=FALLBACK_CLOSINGS[Math.floor(Math.random()*FALLBACK_CLOSINGS.length)],openai=client();if(!openai)return fallback;
  try{const response=await openai.chat.completions.create({model:"gpt-4o-mini",temperature:1,max_tokens:35,messages:[{role:"system",content:"Write one warm, pithy, family-friendly game-show sign-off. It should be an original practical or playful reminder, 12 words maximum. Do not mention prices, bidding, spaying, neutering, or Bob Barker. Output only the sentence."}]});return response.choices?.[0]?.message?.content?.trim().replace(/^['\"]|['\"]$/g,"").slice(0,140)||fallback;}catch(err){console.warn("[closing] generation failed:",err.message);return fallback;}
}
