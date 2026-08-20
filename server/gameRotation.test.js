import test from "node:test";
import assert from "node:assert/strict";
import { PRICING_GAME_TYPES, CAR_PRICING_GAME_TYPES, NON_CAR_PRICING_GAME_TYPES } from "./pricingGames.js";
import { markPricingGamePlayed, pricingGameCandidates, pricingGameRotationStatus, resetPricingGameRotationForTests } from "./gameRotation.js";

test("the persistent rotation covers every pricing game before any repeat",()=>{
  resetPricingGameRotationForTests(null);
  const selected=[];
  for(let index=0;index<PRICING_GAME_TYPES.length;index+=1){
    const preferred=index%3===0?CAR_PRICING_GAME_TYPES:NON_CAR_PRICING_GAME_TYPES;
    const type=pricingGameCandidates(preferred,PRICING_GAME_TYPES)[0];
    assert.ok(!selected.includes(type),`${type} repeated before the cycle was complete`);
    selected.push(type);markPricingGamePlayed(type);
  }
  assert.equal(new Set(selected).size,PRICING_GAME_TYPES.length);
  assert.equal(pricingGameRotationStatus().played.length,PRICING_GAME_TYPES.length);
  const next=pricingGameCandidates(CAR_PRICING_GAME_TYPES,PRICING_GAME_TYPES)[0];
  assert.ok(PRICING_GAME_TYPES.includes(next));
  assert.equal(pricingGameRotationStatus().cycle,2);
});
