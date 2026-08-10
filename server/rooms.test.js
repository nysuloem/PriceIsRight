import test from "node:test";
import assert from "node:assert/strict";
import { createPricingGameDemo, createRoom, publicState, revealReplacement } from "./rooms.js";

test("pricing game demos launch the requested game with a connected tester", () => {
  const { room, player } = createPricingGameDemo("plinko");
  const state = publicState(room);
  assert.equal(state.phase, "pricingGame");
  assert.equal(state.pricingGame.type, "plinko");
  assert.equal(state.pricingGame.playerId, player.id);
  assert.equal(state.isDemo, true);
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
