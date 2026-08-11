import test from "node:test";
import assert from "node:assert/strict";
import { buildLineup } from "./gameLogic.js";

test("Contestants' Row is limited to four while extra humans wait", () => {
  const players = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
  const lineup = buildLineup(players);
  assert.equal(lineup.length, 4);
  assert.deepEqual(lineup.map(p => p.id), ["p0", "p1", "p2", "p3"]);
});

test("a short lineup contains humans only and is never padded with AI", () => {
  const players = [{ id: "p1", name: "One" }, { id: "p2", name: "Two" }];
  const lineup = buildLineup(players);
  assert.equal(lineup.length, 2);
  assert.ok(lineup.every(player => player.isAI === false));
});
