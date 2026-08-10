import test from "node:test";
import assert from "node:assert/strict";
import { beginPricingGame, createPricingGameDemo, createRoom, joinRoom, publicState, revealReplacement } from "./rooms.js";

test("pricing game demos wait for a phone, introduce the game, then unlock controls", () => {
  const { room } = createPricingGameDemo("plinko");
  assert.equal(publicState(room).phase, "demoLobby");
  const player = joinRoom(room, "Game Tester");
  let state = publicState(room);
  assert.equal(state.phase, "pricingIntro");
  assert.equal(state.pricingGame.type, "plinko");
  assert.equal(state.pricingGame.playerId, player.id);
  assert.equal(state.isDemo, true);
  beginPricingGame(room);
  state = publicState(room);
  assert.equal(state.phase, "pricingPrizeIntro");
  assert.equal(state.pricingAnnouncement.name, state.pricingGame.qualifiers[0].name);
  beginPricingGame(room);
  state = publicState(room);
  assert.equal(state.phase, "pricingGame");
});

test("replacement contestant stays off the row until the name call begins", () => {
  const room = createRoom();
  room.phase = "replacement";
  room.contestants = [
    { id: "old", name: "Alice", isAI: true },
    { id: "new", name: "Nathan", isAI: true },
  ];
  room.replacementContestantId = "new";
  room.replacementVisible = false;
  assert.deepEqual(publicState(room).contestants.map(c => c.name), ["Alice"]);
  revealReplacement(room);
  assert.deepEqual(publicState(room).contestants.map(c => c.name), ["Alice", "Nathan"]);
});
