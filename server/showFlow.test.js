import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { advanceShowcase, createFinalShowcase, createShowdown, publicFinalShowcase, settleWheel, showcaseAction, wheelAction } from "./showFlow.js";
import { configureTripBankStorageForTests, resetTripBankForTests, showcaseBankStats, tripBankStats } from "./showcasePrizes.js";
import { prizeFamilyKey } from "./prizeIdentity.js";

const players=[
  {id:"a",name:"Alice",totalWinnings:1200,isAI:false},
  {id:"b",name:"Bob",totalWinnings:4500,isAI:false},
  {id:"c",name:"Carla",totalWinnings:9000,isAI:false},
];

test("trip and prepared Showcase banks are doubled",()=>{resetTripBankForTests();assert.equal(tripBankStats().total,70);assert.equal(showcaseBankStats().preparedTotal,48);});

test("prepared, replacement, trip, and generated Showcases always have real scene photos",()=>{
  resetTripBankForTests();
  for(let show=0;show<30;show+=1){
    const showcases=createFinalShowcase(players.slice(1)).showcases;
    for(const showcase of showcases)for(const prize of showcase.prizes){
      assert.ok(prize.image,`${showcase.title}: ${prize.name} has a photo`);
      assert.equal(prize.imageVerified,true);
    }
  }
  resetTripBankForTests();
});

function spinTo(showdown,index){wheelAction(showdown,showdown.participants[showdown.currentIndex].id,"spin");showdown.pendingIndex=index;settleWheel(showdown);}

test("Showcase Showdown runs in winnings order with stay, second spin and dollar bonus",()=>{
  const s=createShowdown(1,players);
  assert.deepEqual(s.participants.map(p=>p.id),["a","b","c"]);
  spinTo(s,10); // 50
  wheelAction(s,"a","stay");
  spinTo(s,15); // 20, must spin again
  assert.throws(()=>wheelAction(s,"b","stay"),/must spin again/);
  spinTo(s,11); // +95 = bust
  spinTo(s,0); // Carla hits $1
  assert.equal(s.stage,"bonusTurn");
  spinTo(s,1); // bonus 5 cents
  assert.equal(s.stage,"complete");
  assert.equal(s.winnerId,"c");
  assert.equal(s.participants.find(p=>p.id==="c").bonusCash,1100);
});

test("tied dollar bonus spins also serve as the spin-off",()=>{
  const s=createShowdown(1,players);
  spinTo(s,0); // Alice 100
  spinTo(s,0); // Bob 100
  spinTo(s,10); spinTo(s,4); // Carla 50 + 70, bust
  assert.equal(s.isSpinoff,true);
  spinTo(s,1); // Alice bonus/spin-off: 5
  spinTo(s,19); // Bob bonus/spin-off: 15
  assert.equal(s.stage,"complete");
  assert.equal(s.winnerId,"b");
  assert.equal(s.participants.find(p=>p.id==="b").bonusCash,1100);
});

test("a second dollar on the bonus spin adds another $1,000",()=>{
  const s=createShowdown(1,[players[0]]);
  spinTo(s,0);
  assert.equal(s.stage,"bonusTurn");
  spinTo(s,0);
  assert.equal(s.participants[0].bonusCash,2000);
  assert.match(s.result,/another \$1,000/);
});

test("the third contestant automatically wins after two busts and receives a bonus-opportunity spin", () => {
  const s = createShowdown(1, players);
  spinTo(s, 4); spinTo(s, 9); // Alice: 70 + 85, bust
  spinTo(s, 2); spinTo(s, 11); // Bob: 90 + 95, bust
  assert.equal(s.currentIndex, 2);
  assert.equal(s.stage, "automaticTurn");
  assert.equal(s.winnerId, "c");
  assert.match(s.result, /automatically/i);
  spinTo(s, 1); // 5 cents, no extra prize
  assert.equal(s.stage, "complete");
  assert.equal(s.participants[2].bonusCash, 0);
});

test("an automatic winner landing on one dollar earns $1,000 and the normal bonus spin", () => {
  const s = createShowdown(1, players);
  spinTo(s, 4); spinTo(s, 9);
  spinTo(s, 2); spinTo(s, 11);
  spinTo(s, 0);
  assert.equal(s.stage, "bonusTurn");
  assert.equal(s.participants[2].bonusCash, 1000);
  spinTo(s, 1);
  assert.equal(s.stage, "complete");
  assert.equal(s.participants[2].bonusCash, 1100);
});

test("one phone can control multiple independently keyed appearances",()=>{
  const repeat=[
    {id:"jason:r1",controllerPlayerId:"jason",name:"Jason",totalWinnings:1000,isAI:false},
    {id:"jason:r2",controllerPlayerId:"jason",name:"Jason",totalWinnings:2000,isAI:false},
    {id:"other:r3",controllerPlayerId:"other",name:"Other",totalWinnings:3000,isAI:false},
  ];
  const s=createShowdown(1,repeat);
  wheelAction(s,"jason","spin");
  assert.equal(s.stage,"spinning");
});

test("the wheel begins each spin at its previous resting angle",()=>{
  const s=createShowdown(1,[players[0],players[1]]);
  wheelAction(s,"a",{type:"spin",strength:"gentle"});
  s.pendingIndex=7;settleWheel(s);
  const resting=s.wheelRotation;
  wheelAction(s,"a",{type:"spin",strength:"mighty"});
  assert.equal(s.spinStartRotation,resting);
  assert.ok(s.wheelRotation>resting);
});

test("Final Showcase supports bid or pass, two bids, reveal and double-showcase rule",()=>{
  resetTripBankForTests();
  const f=createFinalShowcase([players[0],players[2]]);
  assert.equal(publicFinalShowcase(f).showcases[0].actualPrice,undefined);
  advanceShowcase(f); while(f.stage==="firstPrizes") advanceShowcase(f);
  showcaseAction(f,"c",{choice:"pass"});
  showcaseAction(f,"a",{bid:f.showcases[0].actualPrice-200});
  advanceShowcase(f); while(f.stage==="secondPrizes") advanceShowcase(f);
  showcaseAction(f,"c",{bid:f.showcases[1].actualPrice-1000});
  assert.equal(f.stage,"revealFirst");
  assert.equal(f.winnerId,"a");
  assert.equal(f.doubleShowcase,true);
  let publicGame=publicFinalShowcase(f);
  assert.ok(publicGame.showcases[0].actualPrice>0);
  assert.equal(publicGame.showcases[1].actualPrice,undefined);
  assert.equal(publicGame.winnerId,null);
  f.revealCount=2;f.stage="revealSecond";
  publicGame=publicFinalShowcase(f);
  assert.ok(publicGame.showcases[1].actualPrice>0);
  assert.equal(publicGame.winnerId,null);
  f.stage="complete";
  assert.equal(publicFinalShowcase(f).winnerId,"a");
});

test("every Showcase prize announcement includes brand, item, and description", () => {
  resetTripBankForTests({ clearStorage: true });
  const finalShowcase = createFinalShowcase(players);
  for (const prize of finalShowcase.showcases.flatMap(showcase => showcase.prizes)) {
    assert.ok(prize.announcerText.includes(prize.brand));
    assert.ok(prize.announcerText.includes(prize.name));
    assert.ok(prize.announcerText.includes(prize.description));
    assert.ok(prize.image || prize.visual);
    if (prize.image) assert.equal(prize.imageVerified, true);
  }
});

test("Final Showcase trip prizes rotate out after use",()=>{
  resetTripBankForTests();
  const trips=[];
  for(let game=0;game<4;game+=1){
    const finalShowcase=createFinalShowcase([players[0],players[1]]);
    trips.push(...finalShowcase.showcases.flatMap(showcase=>showcase.prizes.filter(prize=>prize.isTripPrize).map(prize=>prize.id)));
  }
  assert.ok(trips.length>=2);
  assert.equal(new Set(trips).size,trips.length);
  assert.ok(tripBankStats().used>=trips.length);
});

test("repeated Final Showcases replace every used prize family",()=>{
  resetTripBankForTests();
  const families=[];
  for(let show=0;show<4;show+=1){
    const game=createFinalShowcase([players[0],players[1]]);
    families.push(...game.showcases.flatMap(showcase=>showcase.prizes.map(prizeFamilyKey)));
  }
  assert.equal(families.length,24);
  assert.equal(new Set(families).size,families.length);
});

test("a used complete Showcase is permanently replaced",()=>{
  resetTripBankForTests();
  const first=createFinalShowcase([players[0],players[1]]);
  const firstIds=first.showcases.map(showcase=>showcase.id);
  const second=createFinalShowcase([players[0],players[1]]);
  const secondIds=second.showcases.map(showcase=>showcase.id);
  assert.equal(firstIds.some(id=>secondIds.includes(id)),false);
  assert.equal(showcaseBankStats().preparedUsed,4);
});

test("the complete Showcase bank generates new packages instead of recycling",()=>{
  resetTripBankForTests();
  const preparedTotal=showcaseBankStats().preparedTotal;
  const ids=[];
  for(let game=0;game<preparedTotal/2;game+=1){
    ids.push(...createFinalShowcase([players[0],players[1]]).showcases.map(showcase=>showcase.id));
  }
  assert.equal(ids.length,preparedTotal);
  assert.equal(new Set(ids).size,preparedTotal);
  assert.equal(showcaseBankStats().preparedAvailable,0);
  const generated=[];
  for(let game=0;game<8;game+=1)generated.push(...createFinalShowcase([players[0],players[1]]).showcases);
  assert.equal(generated.every(showcase=>showcase.generated&&showcase.id.startsWith("generated-")),true);
  assert.equal(generated.every(showcase=>showcase.prizes.length===3),true);
  assert.equal(generated.some(showcase=>ids.includes(showcase.id)),false);
  assert.equal(new Set(generated.map(showcase=>showcase.id)).size,generated.length);
  assert.equal(new Set(generated.map(showcase=>showcase.title)).size,generated.length);
  assert.equal(showcaseBankStats().generatedUsed,16);
});

test("complete Showcase retirement persists after a server reload",()=>{
  const dir=mkdtempSync(path.join(tmpdir(),"pir-showcase-bank-")),file=path.join(dir,"bank.json");
  try{
    configureTripBankStorageForTests(file);
    resetTripBankForTests({clearStorage:true});
    const preparedTotal=showcaseBankStats().preparedTotal;
    for(let game=0;game<preparedTotal/2;game+=1)createFinalShowcase([players[0],players[1]]);
    const firstIds=createFinalShowcase([players[0],players[1]]).showcases.map(showcase=>showcase.id);
    configureTripBankStorageForTests(file);
    const secondIds=createFinalShowcase([players[0],players[1]]).showcases.map(showcase=>showcase.id);
    assert.equal(firstIds.some(id=>secondIds.includes(id)),false);
    assert.equal(firstIds.every(id=>id.startsWith("generated-")),true);
    assert.equal(secondIds.every(id=>id.startsWith("generated-")),true);
    assert.equal(showcaseBankStats().generatedUsed,4);
    assert.equal(showcaseBankStats().persistent,true);
  }finally{
    configureTripBankStorageForTests(null);
    rmSync(dir,{recursive:true,force:true});
  }
});
