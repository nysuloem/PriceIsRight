import test from "node:test";
import assert from "node:assert/strict";
import { CAR_PRICING_GAME_TYPES, NON_CAR_PRICING_GAME_TYPES, clearDeferredPrice, createPricingGame, createPricingGameForType, playPricingGame, publicPricingGame, revealDeferredPrice, settlePricingAnimation, syncClockGame } from "./pricingGames.js";

const player = { id: "human-1", name: "Test Player" };
const types = ["plinko","cliffHangers","punchABunch","diceGame","groceryGame","oneAway","clockGame","anyNumber","grandGame","shellGame","moneyGame","luckySeven","doublePrices","threeStrikes","switchGame","tenChances"];

test("all twelve pricing games can be created without leaking answers", () => {
  for (const type of types) {
    const game = createPricingGameForType(type, player);
    assert.equal(game.type, type);
    assert.equal(game.status, "playing");
    assert.doesNotMatch(JSON.stringify(publicPricingGame(game)), /"_/);
  }
});

test("pricing-game selection respects a scheduled car or non-car category",()=>{
  const car=createPricingGame(player,[],[],[],CAR_PRICING_GAME_TYPES);
  const nonCar=createPricingGame(player,[],[],[],NON_CAR_PRICING_GAME_TYPES);
  assert.ok(CAR_PRICING_GAME_TYPES.includes(car.type));
  assert.ok(NON_CAR_PRICING_GAME_TYPES.includes(nonCar.type));
});

test("Grocery Game has a grand prize and awards its actual value",()=>{
  const g=createPricingGameForType("groceryGame",player);
  assert.ok(g.bonusPrize?.name);
  assert.ok(g._bonusPrice>0);
  g._prices[0]=1;
  playPricingGame(g,{choice:g.options[0]});
  playPricingGame(g,{value:20});
  assert.equal(g.status,"won");
  assert.equal(g.winnings,g._bonusPrice);
});

test("all twelve pricing game engines can reach a result", () => {
  let g = createPricingGameForType("plinko", player); while(g.stage === "qualify") { playPricingGame(g,{choice:g._qualifierCorrect[g.qualifierIndex]}); g.pendingPrizeAnnouncement=null; } while(g.status === "playing") { playPricingGame(g,{position:5}); settlePricingAnimation(g); } assert.notEqual(g.status,"playing");
  g = createPricingGameForType("cliffHangers", player); for (const price of [...g._prices]) { playPricingGame(g,{value:price}); settlePricingAnimation(g); clearDeferredPrice(g); } assert.equal(g.status,"won");
  g = createPricingGameForType("punchABunch", player); while(g.stage === "qualify") { const i=g.qualifierIndex; playPricingGame(g,{choice:g._qualifierPrices[i]>g.qualifiers[i].shownPrice?"Higher":"Lower"}); } playPricingGame(g,{choice:"1"}); if(g.stage === "decision") playPricingGame(g,{choice:"Keep it"}); assert.equal(g.status,"won");
  g = createPricingGameForType("diceGame", player); while(g.status === "playing") { if(g.stage === "roll") playPricingGame(g,{choice:"Roll"}); else if(g.stage === "direction") { const i=g.digitIndex; playPricingGame(g,{choice:g._digits[i]>g.rolls[i]?"Higher":"Lower"}); } else playPricingGame(g,{choice:"Reveal next digit"}); } assert.equal(g.status,"won");
  g = createPricingGameForType("groceryGame", player); playPricingGame(g,{choice:g.options[0]}); playPricingGame(g,{value:20}); assert.notEqual(g.status,"playing");
  g = createPricingGameForType("oneAway", player); while(g.stage === "choose"&&g.status==="playing") { const i=g.digitIndex; playPricingGame(g,{choice:g._digits[i]>g.shownDigits[i]?"Higher":"Lower"}); } if(g.status==="playing")playPricingGame(g,{answers:g.answers}); assert.equal(g.status,"won");
  g = createPricingGameForType("clockGame", player); g._startedAt=Date.now(); playPricingGame(g,{value:g._prices[0]}); playPricingGame(g,{value:g._prices[1]}); assert.equal(g.status,"won");
  g = createPricingGameForType("anyNumber", player); for (const digit of g._answers[0].slice(1)) { if(g.status === "playing") playPricingGame(g,{choice:String(digit)}); } assert.equal(g.status,"won");
  g = createPricingGameForType("grandGame", player); for (const i of g._prices.map((p,i)=>p<g.target?i:-1).filter(i=>i>=0)) { if(g.status === "playing") playPricingGame(g,{choice:`${i+1}. item`}); } assert.equal(g.status,"won");
  g = createPricingGameForType("shellGame", player); while(g.stage === "prices") { const i=g.itemIndex; playPricingGame(g,{choice:g._prices[i]>g.items[i].shownPrice?"Higher":"Lower"}); } assert.equal(g.stage,"complete"); assert.equal(g.status,"won");
  g = createPricingGameForType("moneyGame", player); playPricingGame(g,{choice:g._front}); playPricingGame(g,{choice:g._back}); assert.equal(g.status,"won");
  g = createPricingGameForType("luckySeven", player); for(let i=1;i<5;i++)playPricingGame(g,{choice:String(g._digits[i])}); assert.equal(g.status,"won");
  g=createPricingGameForType("doublePrices",player);playPricingGame(g,{choice:`$${g._actual}`});assert.equal(g.status,"won");
  g=createPricingGameForType("threeStrikes",player);g._bag=[...g._digits];while(g.status==="playing"){playPricingGame(g,{choice:"DRAW A BALL"});if(g.stage==="place")playPricingGame(g,{choice:`Position ${g._digits.indexOf(g.currentBall)+1}`});}assert.equal(g.status,"won");
  g=createPricingGameForType("switchGame",player);playPricingGame(g,{choice:g.shownPrices[0]===g._prices[0]?"Leave them":"Switch them"});assert.equal(g.status,"won");
  g=createPricingGameForType("tenChances",player);for(const price of g._prices)playPricingGame(g,{value:price});assert.equal(g.status,"won");
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
  for(const type of ["diceGame","oneAway","anyNumber","moneyGame","luckySeven","threeStrikes","tenChances"]){
    const game=createPricingGameForType(type,player);
    const car=type==="tenChances"?game.prizes[2]:game.introPrizes[0];assert.match(car.announcerText,/IT'S A NEW CAR/i);assert.match(car.announcerText,new RegExp(car.name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i"));
  }
});

test("Ten Chances rejects a repeated guess without using a chance",()=>{
  const g=createPricingGameForType("tenChances",player),digits=g.digitSets[0];
  const guesses=digits.flatMap(a=>digits.filter(b=>b!==a).map(b=>Number(`${a}${b}`))).filter(guess=>String(guess).length===2);
  const wrong=guesses.find(guess=>guess!==g._prices[0]);
  playPricingGame(g,{value:wrong});
  assert.equal(g.chancesLeft,9);
  playPricingGame(g,{value:wrong});
  assert.equal(g.chancesLeft,9);
  assert.equal(g.guesses.length,1);
  assert.match(g.prompt,/already tried/i);
  assert.match(g.prompt,/does not use a chance/i);
});

test("Ten Chances ends on chance ten and can never go negative",()=>{
  const g=createPricingGameForType("tenChances",player),digits=g.digitSets[0];
  const wrong=digits.flatMap(a=>digits.filter(b=>b!==a).map(b=>Number(`${a}${b}`))).filter(guess=>String(guess).length===2).find(guess=>guess!==g._prices[0]);
  g.chancesLeft=1;
  playPricingGame(g,{value:wrong});
  assert.equal(g.status,"lost");
  assert.equal(g.chancesLeft,0);
  assert.throws(()=>playPricingGame(g,{value:wrong}),/not active/i);
  assert.equal(g.chancesLeft,0);
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

test("Clock Game countdown is deadline-driven and expires without another guess",()=>{
  const g=createPricingGameForType("clockGame",player);g._clockStarted=true;g.clockEndsAt=10_000;
  assert.equal(syncClockGame(g,9_001),false);assert.equal(g.secondsLeft,1);
  assert.equal(syncClockGame(g,10_000),true);assert.equal(g.secondsLeft,0);assert.equal(g.status,"lost");assert.equal(g.result,"Time is up!");assert.equal(g.timeoutPrice,g._prices[g.itemIndex]);
});

test("Cliff Hangers hides the actual price until the climber stops",()=>{
  const g=createPricingGameForType("cliffHangers",player),actual=g._prices[0];
  playPricingGame(g,{value:actual-7});
  assert.equal(g.stage,"climbing");assert.equal(g.climber,7);assert.equal(g.priceReveal,undefined);assert.equal(g.lastClimb.from,0);assert.equal(g.lastClimb.to,7);
  assert.equal(g.lastClimb.duration,6300);assert.equal(g.lastClimb.stepDuration,900);
  settlePricingAnimation(g);
  assert.equal(g.priceReveal.actual,null);assert.ok(g._pendingPriceReveal);
  revealDeferredPrice(g);assert.equal(g.priceReveal.actual,actual);
});

test("a safe third Cliff Hangers climb wins all three prizes before the subtle price reveal",()=>{
  const g=createPricingGameForType("cliffHangers",player);g.itemIndex=2;g.climber=4;const actual=g._prices[2];
  playPricingGame(g,{value:actual});settlePricingAnimation(g);
  assert.equal(g.status,"won");assert.equal(g.cliffFinalWin,true);assert.equal(g.winnings,g._prices.reduce((sum,price)=>sum+price,0));assert.equal(g.priceReveal.actual,null);
  revealDeferredPrice(g);assert.equal(g.priceReveal.actual,actual);
});

test("Shell Game asks for another shell and exposes the ball for the final lift",()=>{
  const g=createPricingGameForType("shellGame",player);g.stage="shell";g.shells=2;g.wonSmallValue=127;g.chosenShells=[];g.options=["1","2","3","4"];g._ball=3;
  playPricingGame(g,{choice:"1"});assert.equal(g.prompt,"Pick another shell.");
  playPricingGame(g,{choice:"2"});assert.equal(g.status,"lost");assert.equal(g.revealedBall,4);assert.equal(g.winnings,127);
});

test("four correct Shell Game prices immediately win the grand prize",()=>{
  const g=createPricingGameForType("shellGame",player);
  while(g.stage==="prices"){const i=g.itemIndex;playPricingGame(g,{choice:g._prices[i]>g.items[i].shownPrice?"Higher":"Lower"});}
  assert.equal(g.stage,"complete");assert.equal(g.shells,4);assert.equal(g.status,"won");assert.equal(g.mainPrizeWon,true);
  const smallTotal=g.wonSmallValue,bonus=g._bonusPrice;
  assert.equal(g.status,"won");assert.equal(g.cashBonus,undefined);assert.equal(g.winnings,smallTotal+bonus);
});

test("Plinko physics always ends at the bottom in the awarded slot",()=>{
  const g=createPricingGameForType("plinko",player);g.stage="drop";g.chipsLeft=1;
  playPricingGame(g,{position:5});
  assert.equal(g.stage,"dropping");assert.equal(g.lastDrop.path.at(-1).y,1);
  assert.equal(Math.floor(g.lastDrop.path.at(-1).x),g.lastDrop.landing);
  assert.ok(g.lastDrop.path.length>=25);
});

test("Plinko starts with one free chip and offers four more without freezing between drops",()=>{
  const g=createPricingGameForType("plinko",player);
  assert.equal(g.qualifiers.length,4);assert.equal(g.chips,1);assert.equal(g.maxPrize,50000);
  while(g.stage==="qualify"){const i=g.qualifierIndex;playPricingGame(g,{choice:g._qualifierCorrect[i]});}
  assert.equal(g.chipsLeft,5);
  playPricingGame(g,{position:5});settlePricingAnimation(g);assert.equal(g.stage,"drop");assert.equal(g.chipsLeft,4);
  playPricingGame(g,{position:4});settlePricingAnimation(g);assert.equal(g.stage,"drop");assert.equal(g.chipsLeft,3);
});

test("used middle-price prizes are replaced and categories are varied",()=>{
  const first=createPricingGameForType("shellGame",player),used=first.items.map(x=>x.name);
  const second=createPricingGameForType("shellGame",player,used);
  assert.equal(second.items.some(x=>used.includes(x.name)),false);
  assert.ok(new Set(second.items.map(x=>x.category)).size>=3);
});

test("every pricing prize has a visible photo or matched fallback",()=>{
  for(const type of types){const publicGame=publicPricingGame(createPricingGameForType(type,player)),prizes=[...(publicGame.qualifiers||[]),...(publicGame.items||[]),...(publicGame.introPrizes||[])];for(const prize of prizes)assert.ok(prize.image||prize.visual,"every prize remains visible");}
});

test("live retailer pricing prizes keep the photo from their own product record",()=>{
  const live=Array.from({length:6},(_,i)=>({id:`retailer-product-${i}`,name:`Exact product ${i}`,brand:`Brand ${i}`,description:`Product ${i}`,price:50+i,image:`https://retailer.example/product-${i}.jpg`,imageAlt:`Exact product ${i}`,imageVerified:true,category:`category-${i}`}));
  const g=createPricingGameForType("plinko",player,[],live);
  assert.equal(g.qualifiers.length,4);
  for(const prize of g.qualifiers){const source=live.find(item=>item.name===prize.name);assert.ok(source);assert.equal(prize.id,source.id);assert.equal(prize.image,source.image);assert.equal(prize.imageAlt,source.imageAlt);assert.equal(prize.imageKey,`${source.id}|${source.image}`);assert.equal(prize.imageVerified,true);}
});
