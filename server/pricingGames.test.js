import test from "node:test";
import assert from "node:assert/strict";
import { createPricingGameForType, playPricingGame, publicPricingGame, settlePricingAnimation } from "./pricingGames.js";

const player = { id: "human-1", name: "Test Player" };
const types = ["plinko","cliffHangers","punchABunch","diceGame","groceryGame","oneAway","clockGame","anyNumber","grandGame","shellGame"];

test("all ten pricing games can be created without leaking answers", () => {
  for (const type of types) {
    const game = createPricingGameForType(type, player);
    assert.equal(game.type, type);
    assert.equal(game.status, "playing");
    assert.doesNotMatch(JSON.stringify(publicPricingGame(game)), /"_/);
  }
});

test("all ten pricing game engines can reach a result", () => {
  let g = createPricingGameForType("plinko", player); while(g.stage === "qualify") { playPricingGame(g,{choice:g._qualifierCorrect[g.qualifierIndex]}); g.pendingPrizeAnnouncement=null; } while(g.status === "playing") { playPricingGame(g,{position:5}); settlePricingAnimation(g); } assert.notEqual(g.status,"playing");
  g = createPricingGameForType("cliffHangers", player); for (const price of [...g._prices]) playPricingGame(g,{value:price}); assert.equal(g.status,"won");
  g = createPricingGameForType("punchABunch", player); while(g.stage === "qualify") { const i=g.qualifierIndex; playPricingGame(g,{choice:g._qualifierPrices[i]>g.qualifiers[i].shownPrice?"Higher":"Lower"}); } playPricingGame(g,{choice:"1"}); if(g.stage === "decision") playPricingGame(g,{choice:"Keep it"}); assert.equal(g.status,"won");
  g = createPricingGameForType("diceGame", player); while(g.status === "playing") { if(g.stage === "roll") playPricingGame(g,{choice:"Roll"}); else if(g.stage === "direction") { const i=g.digitIndex; playPricingGame(g,{choice:g._digits[i]>g.rolls[i]?"Higher":"Lower"}); } else playPricingGame(g,{choice:"Reveal next digit"}); } assert.equal(g.status,"won");
  g = createPricingGameForType("groceryGame", player); playPricingGame(g,{choice:g.options[0]}); playPricingGame(g,{value:20}); assert.notEqual(g.status,"playing");
  g = createPricingGameForType("oneAway", player); while(g.stage === "choose") { const i=g.digitIndex; playPricingGame(g,{choice:g._digits[i]>g.shownDigits[i]?"Higher":"Lower"}); } playPricingGame(g,{answers:g.answers}); assert.equal(g.status,"won");
  g = createPricingGameForType("clockGame", player); g._startedAt=Date.now(); playPricingGame(g,{value:g._prices[0]}); playPricingGame(g,{value:g._prices[1]}); assert.equal(g.status,"won");
  g = createPricingGameForType("anyNumber", player); for (const digit of g._answers[0].slice(1)) { if(g.status === "playing") playPricingGame(g,{choice:String(digit)}); } assert.equal(g.status,"won");
  g = createPricingGameForType("grandGame", player); for (const i of g._prices.map((p,i)=>p<g.target?i:-1).filter(i=>i>=0)) { if(g.status === "playing") playPricingGame(g,{choice:`${i+1}. item`}); } assert.equal(g.status,"won");
  g = createPricingGameForType("shellGame", player); while(g.stage === "prices") { const i=g.itemIndex; playPricingGame(g,{choice:g._prices[i]>g.items[i].shownPrice?"Higher":"Lower"}); } playPricingGame(g,{choice:String(g._ball+1)}); assert.equal(g.status,"won");
});
