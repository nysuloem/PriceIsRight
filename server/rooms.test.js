import test from "node:test";
import assert from "node:assert/strict";
import { BIDDING_CATEGORY_SCHEDULE, acknowledgeWheelResult, advance, advanceShowcasePresentation, beginPricingGame, biddingCategoryForRound, continuePricingPrice, createPricingGameDemo, createRoom, joinRoom, kissHost, makePricingGameSchedule, nextTurn, prepareWinnerPricingIntroduction, pricingGameAction, publicState, restart, revealPricingPrice, revealReplacement, settlePricingGame, settleWheelGame, submitBid, wheelGameAction } from "./rooms.js";
import { createShowdown } from "./showFlow.js";
import { createPricingGameForType, playPricingGame } from "./pricingGames.js";

test("each half schedules exactly one car game and two non-car games",()=>{
  for(const random of [0,.2,.34,.67,.999]){
    const schedule=makePricingGameSchedule(()=>random);
    assert.equal(schedule.slice(0,3).filter(type=>type==="car").length,1);
    assert.equal(schedule.slice(0,3).filter(type=>type==="nonCar").length,2);
    assert.equal(schedule.slice(3,6).filter(type=>type==="car").length,1);
    assert.equal(schedule.slice(3,6).filter(type=>type==="nonCar").length,2);
  }
});

test("the six bidding rounds visit six different prize departments",()=>{
  assert.deepEqual(BIDDING_CATEGORY_SCHEDULE,["Clothing","Appliances","Jewellery","Recreation","Electronics","Furniture"]);
  assert.deepEqual(Array.from({length:6},(_,round)=>biddingCategoryForRound(round)),BIDDING_CATEGORY_SCHEDULE);
  assert.equal(new Set(BIDDING_CATEGORY_SCHEDULE).size,6);
});

test("contestants can add a sanitized optional T-shirt message", () => {
  const room = createRoom();
  const player = joinRoom(room, "Jamie", null, "  I waited\nmy whole life to come on down!  ");
  assert.equal(player.shirtMessage, "I waited my whole life to come on down!");
  assert.equal(publicState(room).players[0].shirtMessage, player.shirtMessage);
});

test("a winning contestant's shirt is revealed before the pricing-game introduction", () => {
  const room = createRoom();
  const winner = { id: "winner", name: "Jamie", isAI: false, shirtMessage: "I LOVE THE BIG WHEEL!" };
  room.contestants = [winner];
  room.pricingGame = createPricingGameForType("clockGame", winner);
  prepareWinnerPricingIntroduction(room, winner);
  assert.equal(room.phase, "shirtReveal");
  assert.equal(publicState(room).shirtReveal.message, winner.shirtMessage);
  assert.equal(room.hostLine.type, "shirtReveal");
  beginPricingGame(room);
  assert.equal(room.shirtReveal, null);
  assert.equal(room.phase, "pricingIntro");
});

test("pricing game demos wait for a phone, introduce the game, then unlock controls", () => {
  const { room } = createPricingGameDemo("plinko");
  assert.equal(publicState(room).phase, "demoLobby");
  const player = joinRoom(room, "Game Tester");
  let state = publicState(room);
  assert.equal(state.phase, "pricingIntro");
  assert.equal(state.pricingGame.type, "plinko");
  assert.equal(state.pricingGame.playerId, player.id);
  assert.equal(state.isDemo, true);
  beginPricingGame(room);
  state = publicState(room);
  assert.equal(state.phase, "pricingPrizeIntro");
  assert.equal(state.pricingAnnouncement.name, state.pricingGame.qualifiers[0].name);
  beginPricingGame(room);
  state = publicState(room);
  assert.equal(state.phase, "pricingGame");
});

test("duplicate Plinko animation completion cannot freeze or double-award a chip",()=>{
  const room=createRoom();room.pricingGame=createPricingGameForType("plinko",{id:"p",name:"Player"});
  const g=room.pricingGame;g.stage="drop";g.chipsLeft=2;playPricingGame(g,{position:5});
  settlePricingGame(room);const winnings=g.winnings;
  assert.doesNotThrow(()=>settlePricingGame(room));assert.equal(g.winnings,winnings);assert.equal(g.chipsLeft,1);assert.equal(g.stage,"drop");
});

test("Cliff Hangers apologizes before revealing the losing prize price, then ends silently",()=>{
  const room=createRoom();room.pricingGame=createPricingGameForType("cliffHangers",{id:"p",name:"Player"});room.phase="pricingGame";
  const g=room.pricingGame;g.climber=24;g.itemIndex=0;
  playPricingGame(g,{value:g._prices[0]+2});
  settlePricingGame(room);
  assert.equal(g.cliffOver,true);
  assert.equal(room.phase,"pricingRevealCue");
  assert.match(room.hostLine.text,/OH, sorry, he went over the cliff/i);
  assert.equal(g.priceReveal.actual,null);
  revealPricingPrice(room);
  assert.equal(g.priceReveal.actual,g._prices[0]);
  continuePricingPrice(room);
  assert.equal(g.status,"lost");
  assert.equal(room.hostLine.type,"pricingResult");
  assert.equal(room.hostLine.text,"");
});

test("car games introduce the car before the host explains the rules",()=>{
  const {room}=createPricingGameDemo("diceGame");
  joinRoom(room,"Car Player");
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.match(room.hostLine.text,/NEW CAR/i);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingIntro");
  assert.equal(room.hostLine.type,"pricingGameIntro");
  beginPricingGame(room);
  assert.equal(room.phase,"pricingGame");
});

test("Dice Game automatically reveals all digits after the final choice", async()=>{
  const {room}=createPricingGameDemo("diceGame");
  const player=joinRoom(room,"Dice Player");
  beginPricingGame(room);
  beginPricingGame(room);
  while(room.pricingGame.stage!=="reveal"){
    if(room.pricingGame.stage==="roll")pricingGameAction(room,player.id,{choice:"Roll"});
    else {
      const index=room.pricingGame.digitIndex;
      pricingGameAction(room,player.id,{choice:room.pricingGame._digits[index]>room.pricingGame.rolls[index]?"Higher":"Lower"});
    }
  }
  assert.equal(room.pricingGame.mode,"wait");
  assert.deepEqual(room.pricingGame.options,[]);
  await new Promise(resolve=>setTimeout(resolve,7000));
  assert.equal(room.pricingGame.status,"won");
  assert.equal(room.phase,"pricingGame");
  assert.equal(room.hostLine.type,"pricingResult");
});

test("Ten Chances introduces the car, then rules, then its first small prize",()=>{
  const {room}=createPricingGameDemo("tenChances");
  joinRoom(room,"Ten Chances Player");
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.equal(room.pricingAnnouncement.name,room.pricingGame.prizes[2].name);
  assert.match(room.hostLine.text,/NEW CAR/i);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingIntro");
  beginPricingGame(room);
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.equal(room.pricingAnnouncement.name,room.pricingGame.prizes[0].name);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingGame");
});

test("Any Number introduces its three-digit prize after the car and rules",()=>{
  const {room}=createPricingGameDemo("anyNumber");
  joinRoom(room,"Any Number Player");
  const carName=room.pricingAnnouncement.name;
  beginPricingGame(room);
  assert.equal(room.phase,"pricingIntro");
  beginPricingGame(room);
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.notEqual(room.pricingAnnouncement.name,carName);
  assert.equal(room.pricingAnnouncement.name,room.pricingGame.secondaryPrize.name);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingGame");
});

test("Shell Game introduces the grand prize before the rules and first small prize",()=>{
  const {room}=createPricingGameDemo("shellGame");
  joinRoom(room,"Shell Player");
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.equal(room.pricingAnnouncement.id,room.pricingGame.bonusPrize.id);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingIntro");
  assert.doesNotMatch(room.pricingGame.instructions,/cash bonus/i);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.equal(room.pricingAnnouncement.id,room.pricingGame.items[0].id);
});

test("Grocery Game introduces its grand prize before explaining the rules",()=>{
  const {room}=createPricingGameDemo("groceryGame");
  joinRoom(room,"Grocery Player");
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.equal(room.pricingAnnouncement.id,room.pricingGame.bonusPrize.id);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingIntro");
  beginPricingGame(room);
  assert.equal(room.phase,"pricingGame");
});

test("Pick-a-Pair introduces its grand prize and accepts phone choices",()=>{
  const {room}=createPricingGameDemo("pickAPair"),player=joinRoom(room,"Pair Player");
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.equal(room.pricingAnnouncement.id,room.pricingGame.bonusPrize.id);
  beginPricingGame(room);assert.equal(room.phase,"pricingIntro");
  beginPricingGame(room);assert.equal(room.phase,"pricingGame");
  pricingGameAction(room,player.id,{choice:room.pricingGame.options[0]});
  assert.equal(room.pricingGame.stage,"second");
  assert.equal(room.hostLine.type,"pricingPrompt");
});

test("Balance Game introduces its prize and accepts two money bags",()=>{
  const {room}=createPricingGameDemo("balanceGame"),player=joinRoom(room,"Balance Player");
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.equal(room.pricingAnnouncement.id,room.pricingGame.prize.id);
  beginPricingGame(room);assert.equal(room.phase,"pricingIntro");
  beginPricingGame(room);assert.equal(room.phase,"pricingGame");
  const [first,second]=room.pricingGame._correctBagAmounts;
  pricingGameAction(room,player.id,{choice:`$${first.toLocaleString("en-CA")}`});
  assert.equal(room.pricingGame.status,"playing");
  pricingGameAction(room,player.id,{choice:`$${second.toLocaleString("en-CA")}`});
  assert.equal(room.pricingGame.status,"won");
  assert.equal(room.hostLine.type,"pricingResult");
});

test("Switch introduces both large prizes before explaining the rules",()=>{
  const {room}=createPricingGameDemo("switchGame");
  joinRoom(room,"Switch Player");
  assert.equal(room.pricingAnnouncement.id,room.pricingGame.items[0].id);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingPrizeIntro");
  assert.equal(room.pricingAnnouncement.id,room.pricingGame.items[1].id);
  beginPricingGame(room);
  assert.equal(room.phase,"pricingIntro");
});

test("only a human bidding winner can trigger the host-kiss celebration",()=>{
  const room=createRoom();room.phase="reveal";room.contestants=[{id:"winner",name:"Jamie",isAI:false},{id:"other",name:"Pat",isAI:false}];room.winnerIndices=[0];
  const event=kissHost(room,"winner");
  assert.equal(event.playerName,"Jamie");
  assert.equal(publicState(room).kissEvent.seq,1);
  assert.throws(()=>kissHost(room,"other"),/winning contestant/i);
});

test("non-playing humans can shout pricing suggestions without changing the game",()=>{
  const room=createRoom();room.phase="pricingGame";room.players=[{id:"player",name:"Player"},{id:"audience",name:"Audience"}];room.pricingGame=createPricingGameForType("punchABunch",room.players[0]);
  const before=room.pricingGame.qualifierIndex;
  pricingGameAction(room,"audience",{audienceChoice:"Higher"});
  assert.equal(room.pricingGame.qualifierIndex,before);
  assert.equal(room.pricingGame.audienceSuggestions.latest.choice,"Higher");
  assert.equal(room.pricingGame.audienceSuggestions.latest.playerName,"Audience");
  assert.equal(room.pricingGame.audienceSuggestions.counts.Higher,1);
  assert.throws(()=>pricingGameAction(room,"player",{audienceChoice:"Lower"}),/non-playing/i);
});

test("the completed Showcase plays the host goodbye before the recorded credits",()=>{
  const room=createRoom();room.finalShowcase={stage:"complete"};room.phase="showcaseReveal";room.closingLine="Be kind and share the snacks!";
  advanceShowcasePresentation(room);
  assert.equal(room.phase,"creditsHost");assert.equal(room.hostLine.type,"endHost");assert.match(room.hostLine.text,/Good bye/i);
  advanceShowcasePresentation(room);
  assert.equal(room.phase,"creditsMusic");assert.equal(room.hostLine.type,"endCreditsTrack");assert.equal(room.hostLine.text,"");
  assert.doesNotMatch(JSON.stringify(room.hostLine),/Rod Roddy|wishing you a good day/i);
});

test("public state includes final contestant standings sorted by winnings",()=>{
  const room=createRoom();
  room.players=[{id:"alice",name:"Alice"},{id:"bob",name:"Bob"}];
  room.showcaseContestants=[
    {id:"alice:round:1",controllerPlayerId:"alice",name:"Alice",isAI:false,oneBidValue:1200,pricingWinnings:5000},
    {id:"bob:round:2",controllerPlayerId:"bob",name:"Bob",isAI:false,oneBidValue:900,pricingWinnings:0},
  ];
  room.halfWinners=[{id:"alice:round:1",controllerPlayerId:"alice",name:"Alice",bonusCash:1000}];
  room.finalShowcase={stage:"complete",winnerId:"bob:round:2",doubleShowcase:false,contestants:[{id:"bob:round:2",controllerPlayerId:"bob",name:"Bob"}],assignments:["bob:round:2"],showcases:[{actualPrice:32000,prizes:[]}]};
  assert.deepEqual(publicState(room).contestantStandings.map(player=>[player.name,player.totalWinnings]),[["Bob",32900],["Alice",7200]]);
});

test("replacement contestant stays off the row until the name call begins", () => {
  const room = createRoom();
  room.phase = "replacement";
  room.contestants = [
    { id: "old", name: "Alice", isAI: true },
    { id: "new", name: "Nathan", isAI: true },
  ];
  room.replacementContestantId = "new";
  room.replacementVisible = false;
  assert.deepEqual(publicState(room).contestants.map(c => c.name), ["Alice"]);
  revealReplacement(room);
  assert.deepEqual(publicState(room).contestants.map(c => c.name), ["Alice", "Nathan"]);
});

test("the third on-stage winner starts the first Showcase Showdown", async()=>{
  const room=createRoom();
  room.phase="reveal";room.completedRounds=2;room.item={price:1200};room.winnerIndices=[0];
  room.contestants=[{id:"third",name:"Third Winner",isAI:false,bid:1000}];
  room.showcaseContestants=[
    {id:"first",name:"First Winner",isAI:false,totalWinnings:8000,round:1},
    {id:"second",name:"Second Winner",isAI:false,totalWinnings:3000,round:2},
  ];
  await restart(room,"sameLineup");
  assert.equal(room.phase,"showcaseShowdown");
  assert.equal(room.completedRounds,3);
  assert.deepEqual(room.showdown.participants.map(p=>p.id),["third:round:3","second","first"]);
  assert.equal(room.showdown.participants[0].controllerPlayerId,"third");
});

test("wheel controls remain locked until the spoken result is acknowledged",()=>{
  const room=createRoom();
  room.phase="showcaseShowdown";
  room.showdown=createShowdown(1,[{id:"spinner",name:"Spinner",isAI:false,totalWinnings:1000}]);
  wheelGameAction(room,"spinner",{type:"spin",strength:"gentle"});
  room.showdown.pendingIndex=10;
  settleWheelGame(room);
  assert.equal(room.showdown.stage,"announcing");
  assert.throws(()=>wheelGameAction(room,"spinner",{type:"spin",strength:"mighty"}),/not ready/);
  acknowledgeWheelResult(room);
  assert.equal(room.showdown.stage,"decision");
});

test("a waiting human fills only the winner's podium and bids first",async()=>{
  const room=createRoom();
  room.phase="reveal";room.item={id:"round-prize",price:900};room.winnerIndices=[2];
  room.players=["a","b","winner","d","new"].map(id=>({id,name:id,photo:null}));
  room.calledHumanIds=["a","b","winner","d"];
  room.contestants=room.players.slice(0,4).map((p,index)=>({...p,isAI:false,bid:600+index*100}));
  await restart(room,"sameLineup");
  assert.equal(room.contestants.length,4);
  assert.equal(room.contestants.some(c=>c.id==="winner"),false);
  assert.deepEqual(room.contestants.map(c=>c.id),["a","b","new","d"]);
  assert.equal(room.replacementContestantId,"new");
  assert.equal(room.turn,2);
  const phaseAfterAdvance=room.phase;
  await restart(room,"sameLineup");
  assert.equal(room.phase,phaseAfterAdvance,"a duplicate restart is a harmless no-op");
  assert.equal(room.contestants.length,4);
});

test("with four humans the winner keeps the same podium and bids first next round",async()=>{
  const room=createRoom();
  room.phase="reveal";room.item={id:"family-prize",price:900};room.winnerIndices=[1];
  room.players=["a","b","c","d"].map(id=>({id,name:id.toUpperCase(),photo:null}));
  room.calledHumanIds=["a","b","c","d"];
  room.contestants=room.players.map(p=>({...p,isAI:false,bid:800}));
  await restart(room,"sameLineup");
  assert.equal(room.contestants.length,4);
  assert.deepEqual(room.contestants.map(c=>c.id),["a","b","c","d"]);
  assert.equal(room.firstBidderId,"b");
  assert.equal(room.phase,"item");
  assert.equal(room.showcaseContestants[0].controllerPlayerId,"b");
});

test("bidding proceeds cyclically from the prior winner without moving podiums",()=>{
  const room=createRoom();
  room.phase="item";
  room.contestants=["a","b","c","d"].map(id=>({id,name:id.toUpperCase(),bid:null,isAI:false}));
  room.firstBidderId="c";
  advance(room,"bidding");
  const order=[];
  for(const id of ["c","d","a","b"]){
    order.push(room.contestants[room.turn].id);
    submitBid(room,id,100+order.length);
    if(id!=="b")nextTurn(room);
  }
  assert.deepEqual(order,["c","d","a","b"]);
  assert.deepEqual(room.contestants.map(c=>c.id),["a","b","c","d"]);
});

test("never-called humans precede winners and winners return in FIFO order",async()=>{
  const room=createRoom();
  room.players=["a","b","c","d","e","f"].map(id=>({id,name:id.toUpperCase(),photo:null}));
  room.calledHumanIds=["a","b","c","d"];
  room.completedRounds=6;
  room.contestants=room.players.slice(0,4).map(p=>({...p,isAI:false,bid:800}));
  const playRound=async winnerId=>{
    room.phase="reveal";room.item={id:`prize-${winnerId}`,price:900};
    room.winnerIndices=[room.contestants.findIndex(c=>c.id===winnerId)];
    await restart(room,"sameLineup");
    return room.contestants[room.turn].id;
  };
  assert.equal(await playRound("b"),"e");
  assert.equal(await playRound("a"),"f");
  assert.equal(await playRound("c"),"b");
});

test("an all-overbid reveal keeps the retail price secret",()=>{
  const room=createRoom();room.phase="bidding";room.item={price:800};
  room.contestants=[1,2,3,4].map((n,i)=>({id:String(n),name:`P${n}`,bid:900+i*10,isAI:false}));
  advance(room,"reveal");
  assert.equal(room.revealType,"overbid");
  assert.doesNotMatch(room.hostLine.text,/800/);
});

test("an exact bid announces and awards a one-hundred-dollar bonus",async()=>{
  const room=createRoom();room.phase="bidding";room.item={price:800};room.completedRounds=2;
  room.contestants=[{id:"exact",name:"Exact",bid:800,isAI:false}];
  room.showcaseContestants=[{id:"r1",name:"R1",round:1,totalWinnings:100},{id:"r2",name:"R2",round:2,totalWinnings:200}];
  advance(room,"reveal");
  assert.match(room.hostLine.text,/one hundred dollars/i);
  await restart(room,"sameLineup");
  const entry=room.showcaseContestants.find(c=>c.controllerPlayerId==="exact");
  assert.equal(entry.oneBidValue,900);
});
