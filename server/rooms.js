// rooms.js
//
// In-memory room store + the bidding game's state machine. Each room moves
// through: lobby -> calling -> item -> bidding -> reveal. The host client
// drives progression by calling the action functions below in response to
// `hostLine` changes (see HostView for the orchestration logic).

import { randomUUID } from "crypto";
import {
  buildLineup,
  computeAIBid,
  computeWinners,
  STRATEGIES,
  shuffle,
} from "./gameLogic.js";
import { getPrizePool, pickRandomItem } from "./prizeSource.js";

const rooms = new Map();
const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O, avoids confusion

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
    phase: "lobby", // lobby | calling | item | bidding | reveal
    players: [], // humans who joined: { id, name }
    contestants: [], // 4 seats, built at start: { id, name, isAI, strategy?, bid }
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

export function publicState(room) {
  return {
    code: room.code,
    phase: room.phase,
    players: room.players,
    contestants: room.contestants,
    item: room.item,
    callIndex: room.callIndex,
    turn: room.turn,
    hostLine: room.hostLine,
    winnerIndices: room.winnerIndices,
  };
}

function setHostLine(room, text, type) {
  room.hostLine = { seq: room.hostLine.seq + 1, text, type };
}

export function joinRoom(room, name) {
  if (room.phase !== "lobby") throw new Error("Game already started");
  if (room.players.length >= 4) throw new Error("Room is full");
  const cleanName = (name || "").trim().slice(0, 24) || "Player";
  const player = { id: randomUUID(), name: cleanName };
  room.players.push(player);
  return player;
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
    const extra = c.isAI
      ? " You're our newest AI contestant on the Bidding Game."
      : "";
    setHostLine(room, `${c.name}, come on down!${extra}`, "call");
  }
}

function promptTurn(room) {
  const c = room.contestants[room.turn];
  setHostLine(room, `${c.name}, what's your bid?`, "prompt");
}

function revealLine(room) {
  const { item, contestants, winnerIndices } = room;
  let line = `The actual retail price is $${item.price}!`;
  if (winnerIndices.length === 0) {
    line += " Everybody went over. Nobody's winning this one tonight.";
  } else {
    const names = winnerIndices.map((i) => contestants[i].name).join(" and ");
    line +=
      winnerIndices.length > 1 ? ` ${names} both win it!` : ` ${names} wins it!`;
  }
  return line;
}

export function advance(room, to) {
  if (to === "item") {
    if (room.phase !== "calling") throw new Error("Bad phase for 'item'");
    room.phase = "item";
    setHostLine(room, room.item.hostDescription, "itemIntro");
  } else if (to === "bidding") {
    if (room.phase !== "item") throw new Error("Bad phase for 'bidding'");
    room.phase = "bidding";
    room.turn = 0;
    promptTurn(room);
  } else if (to === "reveal") {
    if (room.phase !== "bidding") throw new Error("Bad phase for 'reveal'");
    room.phase = "reveal";
    room.winnerIndices = computeWinners(room.contestants, room.item.price);
    setHostLine(room, revealLine(room), "reveal");
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

export function nextTurn(room) {
  if (room.phase !== "bidding") throw new Error("Bidding isn't open");
  const c = room.contestants[room.turn];
  if (!c || c.bid == null) throw new Error("Current bid not set yet");
  if (room.turn >= room.contestants.length - 1)
    throw new Error("Already at the last turn");
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

// Periodically clear out stale rooms.
setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > ROOM_TTL_MS) rooms.delete(code);
  }
}, 30 * 60 * 1000);
