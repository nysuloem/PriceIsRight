import test from "node:test";
import assert from "node:assert/strict";
import { clearDeferredPrice, createPricingGameForType, playPricingGame, publicPricingGame, revealDeferredPrice, settlePricingAnimation } from "./pricingGames.js";

const player = { id: "human-1", name: "Test Player" };
const types = ["plinko","cliffHangers","punchABunch","diceGame","groceryGame","oneAway","clockGame","anyNumber","grandGame","shellGame","moneyGame","luckySeven"];

test("all twelve pricing games can be created without leaking answers", () => {
  for (const type of types) {
    const game = createPricingGameForType(type, player);
    assert.equal(game.type, type);
    assert.equal(game.status, "playing");
    assert.doesNotMatch(JSON.stringify(publicPricingGame(game)), /"_/);
  }
});

test("all twelve pricing game engines can reach a result", () => {
  let g = createPricingGameForType("plinko", player); while(g.stage === "qualify") { playPricingGame(g,{choice:g._qualifierCorrect[g.qualifierIndex]}); g.pendingPrizeAnnouncement=null; } while(g.status === "playing") { playPricingGame(g,{position:5}); settlePricingAnimation(g); } assert.notEqual(g.status,"playing");
  g = createPricingGameForType("cliffHangers", player); for (const price of [...g._prices]) playPricingGame(g,{value:price}); assert.equal(g.status,"won");
  g = createPricingGameForType("punchABunch", player); while(g.stage === "qualify") { const i=g.qualifierIndex; playPricingGame(g,{choice:g._qualifierPrices[i]>g.qualifiers[i].shownPrice?"Higher":"Lower"}); } playPricingGame(g,{choice:"1"}); if(g.stage === "decision") playPricingGame(g,{choice:"Keep it"}); assert.equal(g.status,"won");
  g = createPricingGameForType("diceGame", player); while(g.status === "playing") { if(g.stage === "roll") playPricingGame(g,{choice:"Roll"}); else if(g.stage === "direction") { const i=g.digitIndex; playPricingGame(g,{choice:g._digits[i]>g.rolls[i]?"Higher":"Lower"}); } else playPricingGame(g,{choice:"Reveal next digit"}); } assert.equal(g.status,"won");
  g = createPricingGameForType("groceryGame", player); playPricingGame(g,{choice:g.options[0]}); playPricingGame(g,{value:20}); assert.notEqual(g.status,"playing");
  g = createPricingGameForType("oneAway", player); while(g.stage === "choose"&&g.status==="playing") { const i=g.digitIndex; playPricingGame(g,{choice:g._digits[i]>g.shownDigits[i]?"Higher":"Lower"}); } if(g.status==="playing")playPricingGame(g,{answers:g.answers}); assert.equal(g.status,"won");
  g = createPricingGameForType("clockGame", player); g._startedAt=Date.now(); playPricingGame(g,{value:g._prices[0]}); playPricingGame(g,{value:g._prices[1]}); assert.equal(g.status,"won");
  g = createPricingGameForType("anyNumber", player); for (const digit of g._answers[0].slice(1)) { if(g.status === "playing") playPricingGame(g,{choice:String(digit)}); } assert.equal(g.status,"won");
  g = createPricingGameForType("grandGame", player); for (const i of g._prices.map((p,i)=>p<g.target?i:-1).filter(i=>i>=0)) { if(g.status === "playing") playPricingGame(g,{choice:`${i+1}. item`}); } assert.equal(g.status,"won");
  g = createPricingGameForType("shellGame", player); while(g.stage === "prices") { const i=g.itemIndex; playPricingGame(g,{choice:g._prices[i]>g.items[i].shownPrice?"Higher":"Lower"}); } assert.equal(g.stage,"bonusGuess"); playPricingGame(g,{choice:String(g._ball+1)}); assert.equal(g.status,"won");
  g = createPricingGameForType("moneyGame", player); playPricingGame(g,{choice:g._front}); playPricingGame(g,{choice:g._back}); assert.equal(g.status,"won");
  g = createPricingGameForType("luckySeven", player); for(let i=1;i<5;i++)playPricingGame(g,{choice:String(g._digits[i])}); assert.equal(g.status,"won");
});

test("higher/lower prizes wait for an on-screen price reveal before the result", () => {
  const g=createPricingGameForType("punchABunch",player);
  const i=g.qualifierIndex, actual=g._qualifierPrices[i];
  playPricingGame(g,{choice:actual>g.qualifiers[i].shownPrice?"Higher":"Lower"});
  assert.equal(g.priceReveal.actual,null);
  assert.equal(g.lastOutcome,null);
  revealDeferredPrice(g);
  assert.equal(g.priceReveal.actual,actual);
  assert.equal(g.priceReveal.correct,true);
  assert.equal(g.lastOutcome.kind,"success");
  clearDeferredPrice(g);
  assert.equal(g.priceReveal,null);
});

test("car games avoid cars already used during the show",()=>{
  const first=createPricingGameForType("oneAway",player);
  const second=createPricingGameForType("oneAway",player,[first.car.name]);
  assert.notEqual(second.car.name,first.car.name);
});

test("every car game uses the new-car announcement",()=>{
  for(const type of ["diceGame","oneAway","anyNumber","moneyGame","luckySeven"]){
    const game=createPricingGameForType(type,player);
    assert.match(game.introPrizes[0].announcerText,/IT'S A NEW CAR/i);
  }
});

test("Money Game always displays a complete five-digit car price",()=>{
  const g=createPricingGameForType("moneyGame",player);
  assert.equal(String(g._front).length,2);
  assert.equal(String(g.middleDigit).length,1);
  assert.equal(String(g._back).length,2);
  assert.equal(`${g._front}${g.middleDigit}${g._back}`,g._digits.join(""));
});

test("One Away wins immediately when all five first choices are correct",()=>{
  const g=createPricingGameForType("oneAway",player);
  while(g.status==="playing"&&g.stage==="choose"){
    const i=g.digitIndex;playPricingGame(g,{choice:g._digits[i]>g.shownDigits[i]?"Higher":"Lower"});
  }
  assert.equal(g.status,"won");
  assert.match(g.result,/ALL FIVE/i);
});

test("Clock Game accepts the exact integer between adjacent clues and allows 90 seconds",()=>{
  const g=createPricingGameForType("clockGame",player);g._startedAt=Date.now();g._prices[0]=66;
  playPricingGame(g,{value:65});assert.equal(g.clue,"Higher!");
  playPricingGame(g,{value:67});assert.equal(g.clue,"Lower!");
  playPricingGame(g,{value:66});assert.equal(g.itemIndex,1);
  assert.ok(g.secondsLeft>=89);
});

test("Shell Game asks for another shell and exposes the ball for the final lift",()=>{
  const g=createPricingGameForType("shellGame",player);g.stage="shell";g.shells=2;g.wonSmallValue=127;g.chosenShells=[];g.options=["1","2","3","4"];g._ball=3;
  playPricingGame(g,{choice:"1"});assert.equal(g.prompt,"Pick another shell.");
  playPricingGame(g,{choice:"2"});assert.equal(g.status,"lost");assert.equal(g.revealedBall,4);assert.equal(g.winnings,127);
});

test("four correct Shell Game prices guarantee the bonus prize and unlock its equal cash bonus",()=>{
  const g=createPricingGameForType("shellGame",player);
  while(g.stage==="prices"){const i=g.itemIndex;playPricingGame(g,{choice:g._prices[i]>g.items[i].shownPrice?"Higher":"Lower"});}
  assert.equal(g.stage,"bonusGuess");assert.equal(g.mainPrizeWon,true);assert.equal(g.shells,4);
  const smallTotal=g.wonSmallValue,bonus=g._bonusPrice;
  playPricingGame(g,{choice:String(g._ball+1)});
  assert.equal(g.status,"won");assert.equal(g.cashBonus,bonus);assert.equal(g.winnings,smallTotal+bonus*2);
});
