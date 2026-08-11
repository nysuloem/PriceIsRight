import test from "node:test";
import assert from "node:assert/strict";
import { buildLineup, computeAIBid } from "./gameLogic.js";

test("Contestants' Row is limited to four while extra humans wait", () => {
  const players = Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));
  const lineup = buildLineup(players);
  assert.equal(lineup.length, 4);
  assert.deepEqual(lineup.map(p => p.id), ["p0", "p1", "p2", "p3"]);
});

test("last AI bids $1 when all existing bids look too high", () => {
  const original = Math.random;
  Math.random = () => 0; // private estimate = 72% of retail
  try { assert.equal(computeAIBid("confident", 1000, [800, 900, 1100], 3, 4), 1); }
  finally { Math.random = original; }
});

test("last AI bids one dollar above the strongest plausible bid", () => {
  const original = Math.random;
  Math.random = () => 0.5; // private estimate = 93% of retail
  try { assert.equal(computeAIBid("confident", 1000, [600, 850, 950], 3, 4), 851); }
  finally { Math.random = original; }
});

test("AI category strength narrows the estimate without making it exact",()=>{
  const oldRandom=Math.random;Math.random=()=>.1;
  try{
    const strong=computeAIBid("confident",1000,[],0,4,"Electronics",{strengths:["Electronics"]});
    const weak=computeAIBid("confident",1000,[],0,4,"Electronics",{strengths:["Home & Kitchen"]});
    assert.ok(Math.abs(1000-strong)<Math.abs(1000-weak));
    assert.notEqual(strong,1000);
  }finally{Math.random=oldRandom;}
});
