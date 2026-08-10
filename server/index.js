import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
  createRoom,
  getRoom,
  publicState,
  joinRoom,
  getPlayerPhoto,
  startGame,
  callNext,
  advance,
  submitBid,
  resolveAITurn,
  nextTurn,
  restart,
  resetBids,
  startPricingGame,
  pricingGameAction,
  beginPricingGame,
  createPricingGameDemo,
  revealReplacement,
} from "./rooms.js";
import { getTTS } from "./tts.js";
import { getPrizePool } from "./prizeSource.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "4mb" })); // allow base64 photo uploads

// Wraps a route handler so thrown errors become JSON error responses
// instead of crashing the process.
function wrap(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message });
    }
  };
}

function requireRoom(req) {
  const room = getRoom(req.params.code);
  if (!room) {
    const err = new Error("Room not found");
    err.status = 404;
    throw err;
  }
  return room;
}

app.post(
  "/api/rooms",
  wrap(async (req, res) => {
    const room = createRoom();
    res.json({ code: room.code });
  })
);

app.post(
  "/api/rooms/:code/join",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    const player = joinRoom(room, req.body?.name, req.body?.photo);
    res.json({ playerId: player.id, ...publicState(room) });
  })
);

// Serve a player's photo by ID — called by the host view for podium display.
// Separate from publicState to keep polling payloads small.
app.get(
  "/api/rooms/:code/photo/:playerId",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    const photo = getPlayerPhoto(room, req.params.playerId);
    if (!photo) return res.status(404).json({ error: "No photo" });
    // photo is a data URL like "data:image/jpeg;base64,..."
    const [header, b64] = photo.split(",");
    const mime = header.replace("data:", "").replace(";base64", "");
    const buf = Buffer.from(b64, "base64");
    res.set("Content-Type", mime);
    res.set("Cache-Control", "public, max-age=3600");
    res.send(buf);
  })
);

app.get(
  "/api/rooms/:code/state",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/start",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    await startGame(room);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/call-next",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    callNext(room);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/advance",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    advance(room, req.body?.to);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/bid",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    submitBid(room, req.body?.playerId, req.body?.amount);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/resolve-ai-turn",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    resolveAITurn(room);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/next-turn",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    nextTurn(room);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/reset-bids",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    resetBids(room);
    res.json(publicState(room));
  })
);

app.post(
  "/api/pricing-games/demo",
  wrap(async (req, res) => {
    const { room, player } = createPricingGameDemo(req.body?.type);
    res.json({ code: room.code, playerId: player?.id || null, ...publicState(room) });
  })
);

app.post(
  "/api/rooms/:code/replacement/reveal",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    revealReplacement(room);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/pricing-game/start",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    startPricingGame(room);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/pricing-game/action",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    pricingGameAction(room, req.body?.playerId, req.body?.action);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/pricing-game/begin",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    beginPricingGame(room);
    res.json(publicState(room));
  })
);

app.post(
  "/api/rooms/:code/restart",
  wrap(async (req, res) => {
    const room = requireRoom(req);
    await restart(room, req.body?.mode);
    res.json(publicState(room));
  })
);

// Host-line text-to-speech. Returns 503 if OPENAI_API_KEY isn't set or the
// TTS request fails — the client falls back to timed pacing without audio.
app.get(
  "/api/tts",
  wrap(async (req, res) => {
    const text = (req.query.text || "").toString().trim().slice(0, 600);
    if (!text) return res.status(400).json({ error: "Missing text" });
    const style = (req.query.style || "host").toString();
    const defaultVoice = style === "announcer" ? "onyx" : "coral";
    const voice = (req.query.voice || (style === "announcer" ? process.env.ANNOUNCER_VOICE : process.env.HOST_VOICE) || defaultVoice).toString();
    const audio = await getTTS(text, voice, style);
    if (!audio) return res.status(503).json({ error: "TTS unavailable" });
    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(audio);
  })
);

// Config — exposes host name and voice to the client.
app.get("/api/config", (req, res) => {
  res.json({
    hostName: process.env.HOST_NAME || "Robbie Archer",
    announcerVoice: process.env.ANNOUNCER_VOICE || "onyx",
    hostVoice: process.env.HOST_VOICE || "coral",
  });
});

// Inspect the current live prize pool. ?refresh=1 forces a re-fetch.
app.get(
  "/api/prizes",
  wrap(async (req, res) => {
    const pool = await getPrizePool(req.query.refresh === "1");
    res.json(pool);
  })
);

// Serve the built client (production). In dev, run the Vite dev server
// separately (see README) — it proxies /api to this server.
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(200).send("Price is Right server is running.");
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Price is Right server listening on :${PORT}`);
  // Warm the prize pool cache at startup so the first game doesn't wait.
  getPrizePool()
    .then((items) => {
      const live = items.filter((i) => i.priceIsLive).length;
      console.log(`Loaded ${items.length} prizes (${live} with live prices)`);
    })
    .catch((err) => console.error("[prizeSource] startup fetch failed:", err.message));
});
