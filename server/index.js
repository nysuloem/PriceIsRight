import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import {
  createRoom,
  getRoom,
  publicState,
  joinRoom,
  startGame,
  callNext,
  advance,
  submitBid,
  resolveAITurn,
  nextTurn,
  restart,
} from "./rooms.js";
import { getTTS } from "./tts.js";
import { getPrizePool } from "./prizeSource.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

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
    const player = joinRoom(room, req.body?.name);
    res.json({ playerId: player.id, ...publicState(room) });
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
    const voice = (req.query.voice || process.env.HOST_VOICE || "onyx").toString();
    const audio = await getTTS(text, voice);
    if (!audio) return res.status(503).json({ error: "TTS unavailable" });
    res.set("Content-Type", "audio/mpeg");
    res.set("Cache-Control", "public, max-age=86400");
    res.send(audio);
  })
);

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
