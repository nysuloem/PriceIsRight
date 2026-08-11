import test from "node:test";
import assert from "node:assert/strict";
import { advanceShowcase, createFinalShowcase, createShowdown, publicFinalShowcase, settleWheel, showcaseAction, wheelAction } from "./showFlow.js";

const players=[
  {id:"a",name:"Alice",totalWinnings:1200,isAI:false},
  {id:"b",name:"Bob",totalWinnings:4500,isAI:false},
  {id:"c",name:"Carla",totalWinnings:9000,isAI:false},
];

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

test("Final Showcase supports bid or pass, two bids, reveal and double-showcase rule",()=>{
  const f=createFinalShowcase([players[0],players[2]]);
  assert.equal(publicFinalShowcase(f).showcases[0].actualPrice,undefined);
  advanceShowcase(f); while(f.stage==="firstPrizes") advanceShowcase(f);
  showcaseAction(f,"c",{choice:"pass"});
  showcaseAction(f,"a",{bid:f.showcases[0].actualPrice-200});
  advanceShowcase(f); while(f.stage==="secondPrizes") advanceShowcase(f);
  showcaseAction(f,"c",{bid:f.showcases[1].actualPrice-1000});
  assert.equal(f.stage,"complete");
  assert.equal(f.winnerId,"a");
  assert.equal(f.doubleShowcase,true);
  assert.ok(publicFinalShowcase(f).showcases[0].actualPrice>0);
});
