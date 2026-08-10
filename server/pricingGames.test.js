import test from "node:test";
import assert from "node:assert/strict";
import { createPricingGameForType, playPricingGame, publicPricingGame } from "./pricingGames.js";

const player = { id: "human-1", name: "Test Player" };
const types = ["plinko","cliffHangers","punchABunch","diceGame","groceryGame","holeInOne","clockGame","anyNumber","grandGame","shellGame"];

test("all ten pricing games can be created without leaking answers", () => {
  for (const type of types) {
    const game = createPricingGameForType(type, player);
    assert.equal(game.type, type);
    assert.equal(game.status, "playing");
    assert.doesNotMatch(JSON.stringify(publicPricingGame(game)), /"_/);
  }
});

test("all ten pricing game engines can reach a result", () => {
  let g = createPricingGameForType("plinko", player); for (let i=0;i<3;i++) playPricingGame(g,{choice:"5"}); assert.notEqual(g.status,"playing");
  g = createPricingGameForType("cliffHangers", player); for (const price of [...g._prices]) playPricingGame(g,{value:price}); assert.equal(g.status,"won");
  g = createPricingGameForType("punchABunch", player); playPricingGame(g,{choice:"1"}); assert.equal(g.status,"won");
  g = createPricingGameForType("diceGame", player); while(g.status === "playing") { playPricingGame(g,{choice:"Roll"}); if(g.stage === "direction") playPricingGame(g,{choice:g._digits[g.digitIndex] > g.roll ? "Higher" : "Lower"}); } assert.equal(g.status,"won");
  g = createPricingGameForType("groceryGame", player); playPricingGame(g,{choice:g.options[0]}); playPricingGame(g,{value:20}); assert.notEqual(g.status,"playing");
  g = createPricingGameForType("holeInOne", player); const order=g._prices.map((_,i)=>i).sort((a,b)=>g._prices[a]-g._prices[b]); playPricingGame(g,{order}); while(g.status === "playing") playPricingGame(g,{choice:"Centre"}); assert.notEqual(g.status,"playing");
  g = createPricingGameForType("clockGame", player); playPricingGame(g,{value:g._prices[0]}); playPricingGame(g,{value:g._prices[1]}); assert.equal(g.status,"won");
  g = createPricingGameForType("anyNumber", player); for (const digit of g._answers[0].slice(1)) { if(g.status === "playing") playPricingGame(g,{choice:String(digit)}); } assert.equal(g.status,"won");
  g = createPricingGameForType("grandGame", player); for (const i of g._prices.map((p,i)=>p<g.target?i:-1).filter(i=>i>=0)) { if(g.status === "playing") playPricingGame(g,{choice:`${i+1}. item`}); } assert.equal(g.status,"won");
  g = createPricingGameForType("shellGame", player); while(g.stage === "prices") { const i=g.itemIndex; playPricingGame(g,{choice:g._prices[i]>g.items[i].shownPrice?"Higher":"Lower"}); } playPricingGame(g,{choice:String(g._ball+1)}); assert.equal(g.status,"won");
});
