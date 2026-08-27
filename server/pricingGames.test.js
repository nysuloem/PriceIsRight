import test from "node:test";
import assert from "node:assert/strict";
import { CAR_PRICING_GAME_TYPES, NON_CAR_PRICING_GAME_TYPES, clearDeferredPrice, createPricingGame, createPricingGameForType, expandedBiddingCatalog, isSingleGrandPrize, pickAPairPoolStatus, playPricingGame, pricingCatalogStats, publicPricingGame, revealDeferredPrice, settlePricingAnimation, syncClockGame } from "./pricingGames.js";
import { ADDITIONAL_GRAND_PRIZES } from "./prizePoolExpansion.js";

const player = { id: "human-1", name: "Test Player" };
const moneyForTest = value => `$${Number(value).toLocaleString("en-CA")}`;
const types = ["plinko","cliffHangers","punchABunch","diceGame","groceryGame","oneAway","clockGame","anyNumber","grandGame","shellGame","moneyGame","luckySeven","doublePrices","threeStrikes","switchGame","tenChances","pickAPair","balanceGame","holeInOne","masterKey","secretX"];

test("every built-in prize catalogue has at least twice its original capacity",()=>{
  const stats=pricingCatalogStats();
  assert.ok(stats.smallPrizes>=240);assert.ok(stats.groceries>=120);assert.ok(stats.cars>=48);assert.ok(stats.anyNumberPrizes>=12);assert.ok(stats.grandPrizes>=20);
  assert.ok(stats.pickAPairProducts>=180);assert.ok(pickAPairPoolStatus().usablePairs>=82);
});

test("pricing-game grand prizes are individual products from $1,000 to $5,000",()=>{
  assert.equal(isSingleGrandPrize({name:"Complete living-room collection",description:"A sofa, chairs and tables.",price:4500}),false);
  assert.equal(isSingleGrandPrize({name:"OLED television",description:"One 4K OLED smart television.",price:2499}),true);
  assert.equal(isSingleGrandPrize({name:"OLED television",description:"One 4K OLED smart television.",price:999}),false);
  assert.ok(ADDITIONAL_GRAND_PRIZES.length>=40);
  for(const prize of ADDITIONAL_GRAND_PRIZES){
    assert.equal(isSingleGrandPrize(prize),true,`${prize.name} is eligible`);
    assert.match(prize.description,/^One\b/,`${prize.name} describes one product`);
    assert.doesNotMatch(prize.name,/\b(collection|bundle|package|suite|set|pair|studio|room|wardrobe|renovation|retreat|cruise|getaway|vacation|trip|for two)\b/i);
  }
  const grandTypes=["groceryGame","shellGame","doublePrices","switchGame","pickAPair","balanceGame","holeInOne","masterKey","secretX"];
  for(let attempt=0;attempt<40;attempt+=1){
    for(const type of grandTypes){
      const game=createPricingGameForType(type,player);
      const entries=type==="switchGame"?game.items.map((prize,index)=>({prize,price:game._prices[index]}))
        :type==="masterKey"?game.targets.filter(target=>target.label!=="NEW CAR").map(target=>({prize:target,price:target.value}))
        :type==="doublePrices"?[{prize:game.prize,price:game._actual}]
        :[{prize:game.bonusPrize||game.prize,price:game._bonusPrice||game._actual}];
      for(const {prize,price} of entries){
        assert.ok(prize,`${type} exposes its grand prize`);
        assert.ok(price>=1000&&price<=5000,`${type} prize ${prize.name} stays in the $1,000-$5,000 range`);
        assert.equal(isSingleGrandPrize({...prize,price}),true,`${type} prize ${prize.name} is one product`);
      }
    }
  }
});

test("all pricing games can be created without leaking answers", () => {
  for (const type of types) {
    const game = createPricingGameForType(type, player);
    assert.equal(game.type, type);
    assert.equal(game.status, "playing");
    assert.doesNotMatch(JSON.stringify(publicPricingGame(game)), /"_/);
  }
});

test("every announced pricing prize includes its brand, item name, and description", () => {
  for (const type of types) {
    const game = createPricingGameForType(type, player);
    for (const prize of game.introPrizes) {
      assert.ok(prize.brand && prize.name && prize.description, `${type} has complete prize fields`);
      assert.match(prize.announcerText, new RegExp(prize.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      assert.match(prize.announcerText, new RegExp(prize.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
      assert.ok(prize.announcerText.includes(prize.description), `${type} announces the full description`);
    }
  }
});

test("the built-in bidding catalogue is large, varied, and uniquely keyed",()=>{
  const catalog=expandedBiddingCatalog();
  assert.ok(catalog.length>=100);
  assert.equal(new Set(catalog.map(item=>item.id)).size,catalog.length);
  assert.ok(new Set(catalog.map(item=>item.category)).size>=8);
});

test("Dice Game locks phone controls while its digits reveal automatically",()=>{
  const g=createPricingGameForType("diceGame",player);
  while(g.digitIndex<4){
    if(g.stage==="roll")playPricingGame(g,{choice:"Roll"});
    else playPricingGame(g,{choice:g._digits[g.digitIndex]>g.rolls[g.digitIndex]?"Higher":"Lower"});
  }
  assert.equal(g.stage,"reveal");
  assert.equal(g.mode,"wait");
  assert.deepEqual(g.options,[]);
});

test("pricing-game selection respects a scheduled car or non-car category",()=>{
  const car=createPricingGame(player,[],[],[],CAR_PRICING_GAME_TYPES);
  const nonCar=createPricingGame(player,[],[],[],NON_CAR_PRICING_GAME_TYPES);
  assert.ok(CAR_PRICING_GAME_TYPES.includes(car.type));
  assert.ok(NON_CAR_PRICING_GAME_TYPES.includes(nonCar.type));
});

test("Double Prices alternatives and Switch prizes differ by at least $1,500", () => {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const doublePrices = createPricingGameForType("doublePrices", player);
    assert.ok(Math.abs(doublePrices.prices[0] - doublePrices.prices[1]) >= 1500);
    const switchGame = createPricingGameForType("switchGame", player);
    assert.ok(Math.abs(switchGame._prices[0] - switchGame._prices[1]) >= 1500);
  }
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

test("grocery games use recognizable grocery brands and reject general small-prize feed items",()=>{
  const boutique={id:"boutique",name:"Organic einkorn cake mix",brand:"Tiny Farm Pantry",description:"A niche organic cake mix.",price:5.49,image:"https://example.com/cake.jpg"};
  const greetingCards=Array.from({length:6},(_,index)=>({id:`card-${index}`,name:`Greeting Card ${index+1}`,brand:"Stationery Shop",description:"A greeting card.",price:[2.99,2.99,3.99,3.99,4.99,4.99][index],image:`https://example.com/card-${index}.jpg`}));
  const seen=new Set();
  for(let attempt=0;attempt<80;attempt+=1){
    const game=createPricingGameForType("groceryGame",player,[],[boutique]);
    game.items.forEach(item=>seen.add(`${item.brand} ${item.name}`));
    assert.equal(game.items.some(item=>item.brand===boutique.brand),false);
  }
  assert.ok(seen.size>=30,"the curated grocery bank should remain broad and varied");
  for(const type of ["pickAPair","holeInOne"]){
    for(let attempt=0;attempt<30;attempt+=1){
      const game=createPricingGameForType(type,player,[],greetingCards);
      assert.equal(game.items.some(item=>/greeting card|stationery/i.test(`${item.brand} ${item.name}`)),false,`${type} must not borrow stationery from the live feed`);
      assert.ok(game.items.every(item=>item.brand&&item.name),`${type} groceries must be branded`);
    }
  }
});

test("all pricing game engines can reach a result", () => {
  let g = createPricingGameForType("plinko", player); while(g.stage === "qualify") { playPricingGame(g,{choice:g._qualifierCorrect[g.qualifierIndex]}); g.pendingPrizeAnnouncement=null; } while(g.status === "playing") { playPricingGame(g,{position:5}); settlePricingAnimation(g); } assert.notEqual(g.status,"playing");
  g = createPricingGameForType("cliffHangers", player); for (const price of [...g._prices]) { playPricingGame(g,{value:price}); settlePricingAnimation(g); settlePricingAnimation(g); clearDeferredPrice(g); } assert.equal(g.status,"won");
  g = createPricingGameForType("punchABunch", player); while(g.stage === "qualify") { const i=g.qualifierIndex; playPricingGame(g,{choice:g._qualifierPrices[i]>g.qualifiers[i].shownPrice?"Higher":"Lower"}); } playPricingGame(g,{choice:"1"}); if(g.stage === "decision") playPricingGame(g,{choice:"Keep it"}); assert.equal(g.status,"won");
  g = createPricingGameForType("diceGame", player); while(g.status === "playing") { if(g.stage === "roll") playPricingGame(g,{choice:"Roll"}); else if(g.stage === "direction") { const i=g.digitIndex; playPricingGame(g,{choice:g._digits[i]>g.rolls[i]?"Higher":"Lower"}); } else playPricingGame(g,{choice:"Reveal next digit"}); } assert.equal(g.status,"won");
  g = createPricingGameForType("groceryGame", player); playPricingGame(g,{choice:g.options[0]}); playPricingGame(g,{value:20}); assert.notEqual(g.status,"playing");
  g = createPricingGameForType("oneAway", player); while(g.stage === "choose"&&g.status==="playing") { const i=g.digitIndex; playPricingGame(g,{choice:g._digits[i]>g.shownDigits[i]?"Higher":"Lower"}); } if(g.status==="playing")playPricingGame(g,{answers:g.answers}); assert.equal(g.status,"won");
  g = createPricingGameForType("clockGame", player); g._startedAt=Date.now(); playPricingGame(g,{value:g._prices[0]}); playPricingGame(g,{value:g._prices[1]}); assert.equal(g.status,"won");
  g = createPricingGameForType("anyNumber", player); for (const digit of g._answers[0].slice(1)) { if(g.status === "playing") playPricingGame(g,{choice:String(digit)}); } assert.equal(g.status,"won");
  g = createPricingGameForType("grandGame", player); for (const i of g._prices.map((p,i)=>p<g.target?i:-1).filter(i=>i>=0)) { if(g.status === "playing") playPricingGame(g,{choice:`${i+1}. item`}); } assert.equal(g.status,"won");
  g = createPricingGameForType("shellGame", player); while(g.stage === "prices") { const i=g.itemIndex; playPricingGame(g,{choice:g._prices[i]>g.items[i].shownPrice?"Higher":"Lower"}); } assert.equal(g.stage,"complete"); assert.equal(g.status,"won");
  g = createPricingGameForType("moneyGame", player); playPricingGame(g,{choice:g._front}); playPricingGame(g,{choice:g._back}); assert.equal(g.status,"won");
  g = createPricingGameForType("luckySeven", player); for(let i=1;i<5;i++){playPricingGame(g,{choice:String(g._digits[i])});settlePricingAnimation(g);settlePricingAnimation(g);} assert.equal(g.status,"won");
  g=createPricingGameForType("doublePrices",player);playPricingGame(g,{choice:`$${g._actual}`});assert.equal(g.status,"won");
  g=createPricingGameForType("threeStrikes",player);g._bag=[...g._digits];while(g.status==="playing"){playPricingGame(g,{choice:"DRAW A BALL"});if(g.stage==="place")playPricingGame(g,{choice:`Position ${g._digits.indexOf(g.currentBall)+1}`});}assert.equal(g.status,"won");
  g=createPricingGameForType("switchGame",player);playPricingGame(g,{choice:g.shownPrices[0]===g._prices[0]?"Leave them":"Switch them"});assert.equal(g.status,"won");
  g=createPricingGameForType("tenChances",player);for(const price of g._prices)playPricingGame(g,{value:price});assert.equal(g.status,"won");
  g=createPricingGameForType("pickAPair",player);{const first=0,second=g._prices.findIndex((price,index)=>index!==first&&price===g._prices[first]);playPricingGame(g,{choice:g.options.find(option=>option.startsWith(`${first+1}.`))});playPricingGame(g,{choice:g.options.find(option=>option.startsWith(`${second+1}.`))});}assert.equal(g.status,"won");
  g=createPricingGameForType("balanceGame",player);for(const amount of g._correctBagAmounts)playPricingGame(g,{choice:`$${amount.toLocaleString("en-CA")}`});assert.equal(g.status,"won");
  g=createPricingGameForType("holeInOne",player);playPricingGame(g,{order:g.items.map((item,index)=>({id:item.id,price:g._prices[index]})).sort((a,b)=>a.price-b.price).map(entry=>entry.id)});for(let i=0;i<6;i+=1)settlePricingAnimation(g);playPricingGame(g,{accuracy:g.puttWindow.center});settlePricingAnimation(g);assert.equal(g.status,"won");
  g=createPricingGameForType("masterKey",player);{const master=g._keyTypes.indexOf("master")+1;playPricingGame(g,{choice:`$${g._qualifierPrices[0]}`});revealDeferredPrice(g);clearDeferredPrice(g);playPricingGame(g,{choice:`Key ${master}`});playPricingGame(g,{choice:`$${g._qualifierPrices[1]}`});revealDeferredPrice(g);clearDeferredPrice(g);playPricingGame(g,{choice:g.options[0]});playPricingGame(g,{choice:`Try Key ${master}`});settlePricingAnimation(g);settlePricingAnimation(g);}assert.equal(g.status,"won");assert.ok(g.targets.every(target=>target.unlocked));
  g=createPricingGameForType("secretX",player);{const placements=g._secretIndex===1?[0,2,3]:g._secretIndex===4?[0,8,2]:[6,8,0];playPricingGame(g,{position:placements[0]});for(let i=0;i<2;i++){playPricingGame(g,{choice:`$${g._qualifierPrices[i]}`});revealDeferredPrice(g);clearDeferredPrice(g);playPricingGame(g,{position:placements[i+1]});}}settlePricingAnimation(g);assert.equal(g.status,"won");
});

test("Pick-a-Pair creates three pairs and offers one keep-and-repick chance",()=>{
  const g=createPricingGameForType("pickAPair",player),counts=new Map();
  g._prices.forEach(price=>counts.set(price,(counts.get(price)||0)+1));
  assert.deepEqual([...counts.values()].sort(),[2,2,2]);
  const first=0,wrong=g._prices.findIndex(price=>price!==g._prices[first]);
  playPricingGame(g,{choice:g.options.find(option=>option.startsWith("1."))});
  playPricingGame(g,{choice:g.options.find(option=>option.startsWith(`${wrong+1}.`))});
  assert.equal(g.stage,"keep");assert.equal(g.options.length,2);
  playPricingGame(g,{choice:g.options.find(option=>option.includes("1."))});
  const match=g._prices.findIndex((price,index)=>index!==first&&price===g._prices[first]);
  playPricingGame(g,{choice:g.options.find(option=>option.startsWith(`${match+1}.`))});
  assert.equal(g.status,"won");assert.equal(g.winnings,g._bonusPrice);
});

test("Pick-a-Pair has a deep reserve and automatically remains playable after exhaustion",()=>{
  const initial=pickAPairPoolStatus();
  assert.ok(initial.completeGames>=10,`expected at least ten complete games, got ${initial.completeGames}`);
  const excluded=[];
  for(let run=0;run<25;run+=1){
    const game=createPricingGameForType("pickAPair",player,excluded);
    assert.equal(game.items.length,6);
    assert.equal(new Set(game._prices).size,3);
    excluded.push(...game.items.map(item=>item.name));
  }
  const exhausted=pickAPairPoolStatus(excluded);
  assert.equal(exhausted.low,true);
  assert.equal(exhausted.autoRefill,true);
});

test("Balance Game has exactly one winning pair and awards the grand prize",()=>{
  const g=createPricingGameForType("balanceGame",player),pairs=[];
  for(let i=0;i<g.bags.length;i+=1)for(let j=i+1;j<g.bags.length;j+=1)if(g.smallBag+g.bags[i].value+g.bags[j].value===g._actual)pairs.push([g.bags[i].value,g.bags[j].value]);
  assert.equal(pairs.length,1);assert.equal(g.bags.length,3);
  for(const amount of pairs[0])playPricingGame(g,{choice:`$${amount.toLocaleString("en-CA")}`});
  assert.equal(g.status,"won");assert.equal(g.balanceState,"balanced");assert.equal(g.winnings,g._actual);
});

test("Hole in One rewards accurate grocery ordering with an easier putting meter",()=>{
  const g=createPricingGameForType("holeInOne",player),sorted=g.items.map((item,index)=>({id:item.id,price:g._prices[index]})).sort((a,b)=>a.price-b.price);
  assert.equal(g.title,"HOLE IN ONE");assert.doesNotMatch(g.instructions,/or two/i);assert.match(g.instructions,/LEAST expensive first/i);assert.match(g.prompt,/LEAST expensive product first/i);
  playPricingGame(g,{order:sorted.map(entry=>entry.id)});assert.equal(g.stage,"orderReveal");assert.equal(g.revealedCount,0);
  for(let i=0;i<6;i+=1)settlePricingAnimation(g);
  assert.equal(g.stage,"puttReady");assert.equal(g.earnedLines,6);assert.equal(g.distanceLine,1);assert.equal(g.puttWindow.tolerance,14);assert.equal(g.puttWindow.cycleMs,2600);
});

test("Hole in One reveals OR TWO only after a missed first putt",()=>{
  const g=createPricingGameForType("holeInOne",player),reverse=g.items.map((item,index)=>({id:item.id,price:g._prices[index]})).sort((a,b)=>b.price-a.price).map(entry=>entry.id);
  playPricingGame(g,{order:reverse});for(let i=0;i<6;i+=1)settlePricingAnimation(g);
  assert.equal(g.distanceLine,6);assert.equal(g.puttWindow.tolerance,5);assert.equal(g.puttWindow.cycleMs,1800);assert.equal(g.orTwoRevealed,false);
  playPricingGame(g,{accuracy:0});assert.equal(g.stage,"putting");settlePricingAnimation(g);
  assert.equal(g.stage,"orTwoReveal");assert.equal(g.orTwoRevealed,true);assert.match(g.prompt,/OR TWO/i);
  settlePricingAnimation(g);assert.equal(g.stage,"puttReady");assert.equal(g.attempts,1);
  playPricingGame(g,{accuracy:g.puttWindow.center});settlePricingAnimation(g);
  assert.equal(g.status,"won");assert.match(g.result,/Hole in two/i);assert.equal(g.winnings,g._bonusPrice);
});

test("Master Key uses five authentic keys and turns the giant locks one at a time",()=>{
  const g=createPricingGameForType("masterKey",player),master=g._keyTypes.indexOf("master")+1;
  assert.deepEqual([...g._keyTypes].sort(),["blank","car","master","prize1","prize2"]);
  assert.equal(g.targets.length,3);assert.equal(g.keys.length,5);
  playPricingGame(g,{choice:moneyForTest(g._qualifierPrices[0])});revealDeferredPrice(g);clearDeferredPrice(g);playPricingGame(g,{choice:`Key ${master}`});
  playPricingGame(g,{choice:moneyForTest(g._qualifierPrices[1])});revealDeferredPrice(g);clearDeferredPrice(g);playPricingGame(g,{choice:g.options[0]});
  playPricingGame(g,{choice:`Try Key ${master}`});assert.equal(g.stage,"keyTurning");settlePricingAnimation(g);assert.equal(g.stage,"keyResult");assert.equal(g.lastKeyTurn.result,"master");settlePricingAnimation(g);assert.equal(g.status,"won");assert.ok(g.targets.every(target=>target.unlocked));
});

test("Secret X allows side-column placements and keeps the centre X hidden until the reveal",()=>{
  const g=createPricingGameForType("secretX",player);assert.ok([1,4,7].includes(g._secretIndex));assert.equal(g.secretRevealed,false);
  assert.equal(g.xsToPlace,1);assert.equal(g.mode,"xPlacement");assert.throws(()=>playPricingGame(g,{position:g._secretIndex}),/left or right/i);
  const placements=g._secretIndex===1?[0,2,3]:g._secretIndex===4?[0,8,2]:[6,8,0];playPricingGame(g,{position:placements[0]});assert.equal(g.stage,"pricing");
  for(let i=0;i<2;i++){playPricingGame(g,{choice:moneyForTest(g._qualifierPrices[i])});revealDeferredPrice(g);clearDeferredPrice(g);assert.equal(g.stage,"placing");playPricingGame(g,{position:placements[i+1]});}
  assert.equal(g.stage,"secretReveal");assert.equal(g.board[g._secretIndex],null);settlePricingAnimation(g);assert.equal(g.secretRevealed,true);assert.equal(g.status,"won");
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

test("higher/lower small prizes and displayed prices are always double digit",()=>{
  for(const type of ["punchABunch","shellGame"]){
    for(let run=0;run<30;run+=1){
      const game=createPricingGameForType(type,player),items=type==="punchABunch"?game.qualifiers:game.items,actual=type==="punchABunch"?game._qualifierPrices:game._prices;
      assert.ok(actual.every(price=>price>=10),`${type} actual prices must be double digit`);
      assert.ok(items.every(item=>item.shownPrice>=10),`${type} shown prices must be double digit`);
    }
  }
});

test("car games avoid cars already used during the show",()=>{
  const first=createPricingGameForType("oneAway",player);
  const second=createPricingGameForType("oneAway",player,[first.car.name]);
  assert.notEqual(second.car.name,first.car.name);
});

test("every car game uses the new-car announcement",()=>{
  for(const type of ["diceGame","oneAway","anyNumber","moneyGame","luckySeven","threeStrikes","tenChances","masterKey"]){
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

test("Ten Chances shuffles the car digits instead of showing the answer",()=>{
  const g=createPricingGameForType("tenChances",player);
  const answer=String(g._prices[2]).split("");
  const shown=g.digitSets[2];
  assert.deepEqual([...shown].sort(), [...answer].sort());
  assert.notEqual(shown.join(""), answer.join(""));
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
  assert.equal(g.currentGuess,null);
  playPricingGame(g,{value:65});assert.equal(g.clue,"Higher!");assert.equal(g.prompt,"Higher!");assert.equal(g.currentGuess,65);
  playPricingGame(g,{value:67});assert.equal(g.clue,"Lower!");assert.equal(g.prompt,"Lower!");assert.equal(g.currentGuess,67);
  playPricingGame(g,{value:66});assert.equal(g.itemIndex,1);assert.equal(g.currentGuess,null);
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
  assert.equal(g.stage,"checking");assert.equal(g.climber,0);assert.equal(g.prompt,"Is that the right price?");assert.equal(g.lastClimb.correct,false);
  settlePricingAnimation(g);
  assert.equal(g.stage,"climbing");assert.equal(g.climber,7);assert.equal(g.priceReveal,undefined);assert.equal(g.lastClimb.from,0);assert.equal(g.lastClimb.to,7);
  assert.equal(g.lastClimb.duration,6300);assert.equal(g.lastClimb.stepDuration,900);
  settlePricingAnimation(g);
  assert.equal(g.priceReveal.actual,null);assert.ok(g._pendingPriceReveal);
  revealDeferredPrice(g);assert.equal(g.priceReveal.actual,actual);
});

test("Cliff Hangers only uses double-digit small prizes",()=>{
  for(let i=0;i<25;i+=1){
    const g=createPricingGameForType("cliffHangers",player);
    assert.equal(g._prices.every(price=>price>=10&&price<=99),true);
  }
});

test("a safe third Cliff Hangers climb wins all three prizes before the subtle price reveal",()=>{
  const g=createPricingGameForType("cliffHangers",player);g.itemIndex=2;g.climber=4;const actual=g._prices[2];
  playPricingGame(g,{value:actual});assert.equal(g.lastClimb.correct,true);settlePricingAnimation(g);settlePricingAnimation(g);
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
  for(const type of types){const publicGame=publicPricingGame(createPricingGameForType(type,player)),prizes=[...(publicGame.qualifiers||[]),...(publicGame.items||[]),...(publicGame.introPrizes||[]),publicGame.prize,publicGame.bonusPrize].filter(Boolean);for(const prize of prizes)assert.ok(prize.image||prize.visual,"every prize remains visible");}
});

test("live retailer pricing prizes keep the photo from their own product record",()=>{
  const live=Array.from({length:6},(_,i)=>({id:`retailer-product-${i}`,name:`Exact product ${i}`,brand:`Brand ${i}`,description:`Product ${i}`,price:50+i,image:`https://retailer.example/product-${i}.jpg`,imageAlt:`Exact product ${i}`,imageVerified:true,category:`category-${i}`}));
  const g=createPricingGameForType("plinko",player,[],live);
  assert.equal(g.qualifiers.length,4);
  for(const prize of g.qualifiers){const source=live.find(item=>item.name===prize.name);assert.ok(source);assert.equal(prize.id,source.id);assert.equal(prize.image,source.image);assert.equal(prize.imageAlt,source.imageAlt);assert.equal(prize.imageKey,`${source.id}|${source.image}`);assert.equal(prize.imageVerified,true);}
});

test("unverified or reused stock photos are replaced by matched prize visuals",()=>{
  const questionable=Array.from({length:6},(_,i)=>({id:`stock-${i}`,name:`Small prize ${i}`,brand:`Brand ${i}`,description:`A useful small prize number ${i}.`,price:50+i,image:"https://stock.example/generic.jpg",imageVerified:false,category:`category-${i}`}));
  const game=createPricingGameForType("plinko",player,[],questionable);
  for(const prize of game.qualifiers){assert.equal(prize.image,null);assert.ok(prize.visual);assert.equal(prize.imageVerified,false);}
});
