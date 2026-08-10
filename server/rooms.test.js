import test from "node:test";
import assert from "node:assert/strict";
import { beginPricingGame, createPricingGameDemo, createRoom, joinRoom, publicState, restart, revealReplacement } from "./rooms.js";

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
  assert.deepEqual(room.showdown.participants.map(p=>p.id),["third","second","first"]);
});

test("a winner leaves once, replacement restores exactly four, and the newcomer bids first",async()=>{
  const room=createRoom();
  room.phase="reveal";room.item={id:"round-prize",price:900};room.winnerIndices=[2];
  room.contestants=[
    {id:"a",name:"Alice",isAI:true,bid:700},
    {id:"b",name:"Bob",isAI:true,bid:800},
    {id:"winner",name:"Winner",isAI:true,bid:850},
    {id:"d",name:"Dina",isAI:true,bid:600},
  ];
  await restart(room,"sameLineup");
  assert.equal(room.contestants.length,4);
  assert.equal(room.contestants.some(c=>c.id==="winner"),false);
  assert.equal(room.contestants[0].id,room.replacementContestantId);
  assert.equal(room.turn,0);
  await assert.rejects(()=>restart(room,"sameLineup"),/already advanced/);
  assert.equal(room.contestants.length,4);
});
