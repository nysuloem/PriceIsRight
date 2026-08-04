import { randomUUID } from "crypto";
import {
  buildLineup, computeAIBid, computeWinners, STRATEGIES, shuffle,
} from "./gameLogic.js";
import { getPrizePool, pickRandomItem } from "./prizeSource.js";

const rooms = new Map();
const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_PLAYERS = 8;   // how many humans can join

function genCode() {
  let code;
  do {
    code = Array.from(
      { length: 4 },
      () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

export function createRoom() {
  const code = genCode();
  const room = {
    code,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    phase: "lobby",
    players: [],
    contestants: [],
    item: null,
    callIndex: -1,
    turn: 0,
    winnerIndices: [],
    hostLine: { seq: 0, text: "", type: "welcome" },
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  const room = rooms.get((code || "").toUpperCase());
  if (room) room.updatedAt = Date.now();
  return room || null;
}

// Strip base64 photo from public state to keep polling payloads small;
// the photo is sent once at join time and the client caches it locally.
export function publicState(room) {
  return {
    code: room.code,
    phase: room.phase,
    players: room.players.map(({ id, name, hasPhoto }) => ({ id, name, hasPhoto: !!hasPhoto })),
    contestants: room.contestants.map((c) => ({
      ...c,
      photo: c.isAI ? c.photo : undefined, // AI avatars are a URL (small), human photos excluded
    })),
    item: room.item,
    callIndex: room.callIndex,
    turn: room.turn,
    hostLine: room.hostLine,
    winnerIndices: room.winnerIndices,
    revealType: room.revealType || null,
  };
}

function setHostLine(room, text, type) {
  room.hostLine = { seq: room.hostLine.seq + 1, text, type };
}

export function joinRoom(room, name, photoDataUrl) {
  if (room.phase !== "lobby") throw new Error("Game already started");
  if (room.players.length >= MAX_PLAYERS) throw new Error("Room is full");
  const cleanName = (name || "").trim().slice(0, 24) || "Player";
  // Validate photo is a data URL if provided; silently drop if malformed.
  let photo = null;
  if (photoDataUrl && typeof photoDataUrl === "string" && photoDataUrl.startsWith("data:image/")) {
    // Limit size to ~2MB base64
    if (photoDataUrl.length < 2_800_000) photo = photoDataUrl;
  }
  const player = { id: randomUUID(), name: cleanName, photo, hasPhoto: !!photo };
  room.players.push(player);
  return player;
}

// Called by the host to fetch a specific player's photo (for podium display).
export function getPlayerPhoto(room, playerId) {
  const p = room.players.find((pl) => pl.id === playerId);
  return p?.photo || null;
}

export async function startGame(room) {
  if (room.phase !== "lobby") throw new Error("Already started");
  const pool = await getPrizePool();
  room.contestants = buildLineup(room.players);
  room.item = pickRandomItem(pool);
  room.callIndex = -1;
  room.turn = 0;
  room.winnerIndices = [];
  room.phase = "calling";
  setHostLine(room, "Let's meet today's contestants!", "welcome");
}

export function callNext(room) {
  if (room.phase !== "calling") throw new Error("Not in calling phase");
  if (room.callIndex < room.contestants.length - 1) {
    room.callIndex += 1;
    const c = room.contestants[room.callIndex];
    const extra = c.isAI ? " You're our newest AI contestant on the Bidding Game." : "";
    setHostLine(room, `${c.name}, come on down!${extra}`, "call");
  }
}

function promptTurn(room) {
  const c = room.contestants[room.turn];
  setHostLine(room, `Alright ${c.name} — what's your bid?`, "prompt");
}

function revealLine(room) {
  const { item, contestants, winnerIndices } = room;
  const price = item.price;

  // Check for exact bid
  const exactBidder = contestants.find(c => c.bid === price);
  if (exactBidder) {
    return { text: `The actual retail price is $${price}! And ${exactBidder.name} bid EXACTLY that! That is an exact bid — ${exactBidder.name} wins an extra one hundred dollars!`, type: "exactBid" };
  }

  // All overbid
  if (winnerIndices.length === 0) {
    const bids = contestants.map(c => c.bid).filter(b => b != null);
    const lowest = Math.min(...bids);
    const lowestName = contestants.find(c => c.bid === lowest)?.name || "someone";
    return { text: `The actual retail price is $${price}. You have all overbid! The lowest bid was ${lowestName} at $${lowest}. Nobody wins — let's try again!`, type: "overbid" };
  }

  // Normal winner
  const names = winnerIndices.map((i) => contestants[i].name).join(" and ");
  const winLine = winnerIndices.length > 1 ? `${names} both win it!` : `${names} wins it!`;
  return { text: `The actual retail price is $${price}! ${winLine}`, type: "reveal" };
}

export function advance(room, to) {
  if (to === "item") {
    if (room.phase !== "calling" && room.phase !== "item") throw new Error("Bad phase for 'item'");
    room.phase = "item";
    // "||" separates host line from announcer description — client splits on it
    const hostLine = "Here's the first prize up for bids!";
    setHostLine(room, `${hostLine}||${room.item.hostDescription}`, "itemIntro");
  } else if (to === "bidding") {
    if (room.phase !== "item") throw new Error("Bad phase for 'bidding'");
    room.phase = "bidding";
    room.turn = 0;
    promptTurn(room);
  } else if (to === "reveal") {
    if (room.phase !== "bidding") throw new Error("Bad phase for 'reveal'");
    room.phase = "reveal";
    room.winnerIndices = computeWinners(room.contestants, room.item.price);
    const reveal = revealLine(room);
    room.revealType = reveal.type; // "reveal" | "overbid" | "exactBid"
    setHostLine(room, reveal.text, reveal.type);
  } else {
    throw new Error(`Unknown target: ${to}`);
  }
}

export function submitBid(room, playerId, amount) {
  if (room.phase !== "bidding") throw new Error("Bidding isn't open");
  const c = room.contestants[room.turn];
  if (!c || c.id !== playerId) throw new Error("Not your turn");
  if (c.bid != null) throw new Error("Already bid");
  c.bid = Math.max(0, Math.min(9999, Math.round(Number(amount) || 0)));
  setHostLine(room, `${c.name} bids $${c.bid}!`, "bidResult");
}

export function resolveAITurn(room) {
  if (room.phase !== "bidding") throw new Error("Bidding isn't open");
  const c = room.contestants[room.turn];
  if (!c || !c.isAI || c.bid != null) throw new Error("Invalid AI turn");
  const prevBids = room.contestants.slice(0, room.turn).map((x) => x.bid);
  c.bid = computeAIBid(c.strategy, room.item.price, prevBids);
  setHostLine(room, `${c.name} bids $${c.bid}!`, "bidResult");
}

// Reset all bids and return to bidding phase (used after all-overbid)
export function resetBids(room) {
  if (room.phase !== "reveal") throw new Error("Not in reveal phase");
  room.contestants.forEach(c => { c.bid = null; });
  room.phase = "bidding";
  room.turn = 0;
  room.winnerIndices = [];
  room.revealType = null;
  const c = room.contestants[0];
  setHostLine(room, `Alright ${c.name} — what's your bid this time?`, "prompt");
}

export function nextTurn(room) {
  if (room.phase !== "bidding") throw new Error("Bidding isn't open");
  const c = room.contestants[room.turn];
  if (!c || c.bid == null) throw new Error("Current bid not set yet");
  if (room.turn >= room.contestants.length - 1) throw new Error("Already at last turn");
  room.turn += 1;
  promptTurn(room);
}

export async function restart(room, mode) {
  if (mode === "newPlayers") {
    room.phase = "lobby";
    room.players = [];
    room.contestants = [];
    room.item = null;
    room.callIndex = -1;
    room.turn = 0;
    room.winnerIndices = [];
    setHostLine(room, "", "welcome");
  } else {
    const pool = await getPrizePool();
    room.contestants = room.contestants.map((c) => ({
      ...c,
      bid: null,
      strategy: c.isAI ? shuffle(STRATEGIES)[0] : c.strategy,
    }));
    room.item = pickRandomItem(pool, room.item?.id);
    room.turn = 0;
    room.winnerIndices = [];
    room.phase = "item";
    setHostLine(room, room.item.hostDescription, "itemIntro");
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > ROOM_TTL_MS) rooms.delete(code);
  }
}, 30 * 60 * 1000);
