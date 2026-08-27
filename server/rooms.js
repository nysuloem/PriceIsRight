import { randomUUID } from "crypto";
import {
  buildLineup, computeAIBid, computeWinners, shuffle,
} from "./gameLogic.js";
import { getPrizePool, pickRandomItem, prizeBankStats, retirePrize } from "./prizeSource.js";
import { CAR_PRICING_GAME_TYPES, NON_CAR_PRICING_GAME_TYPES, PRICING_GAME_TYPES, clearDeferredPrice, createPricingGameForType, initialPrizeAnnouncements, pickAPairPoolStatus, playPricingGame, pricingPrizeNames, pricingPrizes, publicPricingGame, recordPricingAction, revealDeferredPrice, settlePricingAnimation, syncClockGame } from "./pricingGames.js";
import { retirePricingPrizes, retiredPricingPrizeNamesList } from "./pricingPrizeBank.js";
import { getSmallPrizePool, smallPrizePoolStats } from "./smallPrizeSource.js";
import { markPricingGamePlayed, pricingGameCandidates, pricingGameRotationStatus } from "./gameRotation.js";
import { advanceShowcase, createFinalShowcase, createShowdown, publicFinalShowcase, publicShowdown, resolveShowcaseAI, resolveWheelAI, settleWheel, showcaseAction, wheelAction } from "./showFlow.js";

const rooms = new Map();
const ROOM_TTL_MS = 4 * 60 * 60 * 1000;
const CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const MAX_PLAYERS = 8;   // how many humans can join
const DICE_AUTO_REVEAL_DELAY_MS = 1600;
const CAR_FIRST_GAMES = new Set(["diceGame", "oneAway", "anyNumber", "moneyGame", "luckySeven", "threeStrikes", "tenChances"]);
const recentPricingPrizeNames=[];
export const BIDDING_CATEGORY_SCHEDULE = ["Tools", "Appliances", "Jewellery", "Outdoor Equipment", "Electronics", "Furniture"];
export const biddingCategoryForRound = round => BIDDING_CATEGORY_SCHEDULE[Math.max(0, Number(round) || 0) % BIDDING_CATEGORY_SCHEDULE.length];
export function makePricingGameSchedule(random=Math.random){const schedule=Array(6).fill("nonCar");schedule[Math.floor(random()*3)]="car";schedule[3+Math.floor(random()*3)]="car";return schedule;}
function rememberPricingPrizes(names){for(const name of names){const old=recentPricingPrizeNames.indexOf(name);if(old>=0)recentPricingPrizeNames.splice(old,1);recentPricingPrizeNames.push(name);}if(recentPricingPrizeNames.length>240)recentPricingPrizeNames.splice(0,recentPricingPrizeNames.length-240);}

function preparePricingIntroduction(room, player) {
  const game=room.pricingGame;
  if (CAR_FIRST_GAMES.has(game.type) || game.type==="shellGame" || game.featuredIntroCount) {
    const announcements=initialPrizeAnnouncements(game),featuredPrize=announcements[0];
    game._featuredPrizeIntroducedFirst=true;
    game._featuredIntroCount=game.featuredIntroCount||1;
    game._carIntroducedFirst=CAR_FIRST_GAMES.has(game.type);
    game._rulesIntroduced=false;
    room.pricingAnnouncementQueue=announcements.slice(1,game._featuredIntroCount);
    room.pricingAnnouncement=featuredPrize;
    room.phase="pricingPrizeIntro";
    setHostLine(room,featuredPrize?.announcerText||(game._carIntroducedFirst?"IT'S A NEW CAR!":"Take a look at the grand prize!"),"pricingPrizeIntro");
  } else {
    room.phase="pricingIntro";
    setHostLine(room,game.type==="plinko"?`${player.name}, you're going to play PLINKO! You have a chance to win up to $50,000 in cash!`:`${player.name}, you are going to play ${game.title}!`,"pricingGameIntro");
  }
}

export function prepareWinnerPricingIntroduction(room, winner) {
  preparePricingIntroduction(room, winner);
}

function genCode() {
  let code;
  do {
    code = Array.from(
      { length: 4 },
      () => CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

export function createRoom(playMode = "sharedScreen") {
  const code = genCode();
  const room = {
    code,
    playMode: playMode === "remote" ? "remote" : "sharedScreen",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    phase: "lobby",
    players: [],
    contestants: [],
    calledHumanIds: [],
    returningHumanQueue: [],
    item: null,
    callIndex: -1,
    turn: 0,
    firstBidderId: null,
    winnerIndices: [],
    usedPrizeIds: [],
    usedPrizeFamilies: [],
    prizeCategoryCounts: {},
    playedPricingGames: [],
    pricingGameSchedule: makePricingGameSchedule(),
    usedPricingPrizeNames: [],
    pricingGame: null,
    prizePoolWarnings: [],
    pricingGameRotation: pricingGameRotationStatus(),
    pricingAnnouncement: null,
    pricingAnnouncementQueue: [],
    shirtReveal: null,
    showcaseContestants: [],
    completedRounds: 0,
    halfWinners: [],
    showdown: null,
    finalShowcase: null,
    showcaseAnnouncement: null,
    replacementContestantId: null,
    replacementVisible: false,
    isDemo: false,
    kissEvent: null,
    shirtEvent: null,
    celebrationSeq: 0,
    hostLine: { seq: 0, text: "", type: "welcome" },
  };
  rooms.set(code, room);
  return room;
}

export function getRoom(code) {
  const room = rooms.get((code || "").toUpperCase());
  if (room) room.updatedAt = Date.now();
  return room || null;
}

export function createPricingGameDemo(type) {
  const room = createRoom();
  room.isDemo = true;
  room.demoGameType = type;
  room.phase = "demoLobby";
  setHostLine(room, "Scan the QR code on your phone to test this pricing game.", "demoLobby");
  return { room, player: null };
}

function contestantKey(contestant = {}) {
  return contestant.controllerPlayerId || String(contestant.id || "").replace(/:round:\d+$/i, "");
}

function contestantStandings(room) {
  const standings = new Map();
  const ensure = (id, name, isAI = false) => {
    const key = id || name || "contestant";
    if (!standings.has(key)) standings.set(key, { id: key, name: name || "Contestant", isAI, totalWinnings: 0 });
    return standings.get(key);
  };
  room.players.forEach(player => ensure(player.id, player.name, false));
  room.showcaseContestants.forEach(contestant => {
    const row = ensure(contestantKey(contestant), contestant.name, contestant.isAI);
    row.totalWinnings += Number(contestant.oneBidValue || 0) + Number(contestant.pricingWinnings || 0);
  });
  room.halfWinners.forEach(contestant => {
    const row = ensure(contestantKey(contestant), contestant.name, contestant.isAI);
    row.totalWinnings += Number(contestant.bonusCash || 0);
  });
  const finalShowcase = room.finalShowcase;
  if (finalShowcase?.stage === "complete" && finalShowcase.winnerId) {
    const winner = finalShowcase.contestants.find(contestant => contestant.id === finalShowcase.winnerId);
    const row = ensure(contestantKey(winner), winner?.name, winner?.isAI);
    finalShowcase.showcases.forEach((showcase, index) => {
      const assignedToWinner = finalShowcase.assignments?.[index] === finalShowcase.winnerId;
      if (assignedToWinner || finalShowcase.doubleShowcase) row.totalWinnings += Number(showcase.actualPrice || 0);
    });
  }
  return [...standings.values()].sort((a, b) => b.totalWinnings - a.totalWinnings || a.name.localeCompare(b.name));
}

// Strip base64 photo from public state to keep polling payloads small;
// the photo is sent once at join time and the client caches it locally.
export function publicState(room) {
  if(syncClockGame(room.pricingGame)&&room.phase==="pricingGame")setHostLine(room,`Time is up! The actual retail price of the ${room.pricingGame.items[room.pricingGame.itemIndex]?.name||"prize"} was $${Number(room.pricingGame.timeoutPrice).toLocaleString("en-CA")}.`,"pricingResult");
  return {
    code: room.code,
    playMode: room.playMode || "sharedScreen",
    phase: room.phase,
    players: room.players.map(({ id, name, hasPhoto, shirtMessage }) => ({ id, name, hasPhoto: !!hasPhoto, shirtMessage: shirtMessage || "" })),
    contestants: room.contestants
      .filter(c => room.phase !== "replacement" || room.replacementVisible || c.id !== room.replacementContestantId)
      .map((c) => ({
        ...c,
        photo: c.isAI ? c.photo : undefined, // AI avatars are a URL (small), human photos excluded
      })),
    item: room.item,
    callIndex: room.callIndex,
    turn: room.turn,
    hostLine: room.hostLine,
    winnerIndices: room.winnerIndices,
    revealType: room.revealType || null,
    pricingGame: publicPricingGame(room.pricingGame),
    pricingAnnouncement: room.pricingAnnouncement,
    shirtReveal: room.shirtReveal,
    showcaseContestants: room.showcaseContestants.map(({ id, name, isAI }) => ({ id, name, isAI })),
    completedRounds: room.completedRounds,
    showHalf: room.completedRounds < 3 ? 1 : 2,
    showdown: publicShowdown(room.showdown),
    finalShowcase: publicFinalShowcase(room.finalShowcase),
    showcaseAnnouncement: room.showcaseAnnouncement,
    contestantStandings: contestantStandings(room),
    replacementContestantId: room.replacementContestantId,
    replacementVisible: room.replacementVisible,
    isDemo: room.isDemo,
    demoGameType: room.demoGameType || null,
    kissEvent: room.kissEvent,
    shirtEvent: room.shirtEvent,
    prizePoolWarnings: room.prizePoolWarnings,
    pricingGameRotation: room.pricingGameRotation,
  };
}

async function selectFreshPrize(room) {
  let pool = await getPrizePool();
  let unused = pool.filter(item => !room.usedPrizeIds.includes(item.id));
  if (!unused.length) {
    pool = await getPrizePool(true);
    unused = pool.filter(item => !room.usedPrizeIds.includes(item.id));
    if (!unused.length) throw new Error("The Canadian bidding bank is empty. It will not recycle used prizes; refill the retailer feed first.");
  }
  const newFamilies = unused.filter(item => !room.usedPrizeFamilies.includes(item.prizeFamily));
  if (newFamilies.length) unused = newFamilies;
  const requiredCategory = biddingCategoryForRound(room.completedRounds);
  const candidates = unused.filter(item => item.bidCategory === requiredCategory);
  if (!candidates.length) throw new Error(`The ${requiredCategory} bidding bank is empty; used prizes will not be recycled.`);
  const livePhotoCandidates = candidates.filter(item => item.priceIsLive && item.image && item.imageKind !== "representative");
  const item = pickRandomItem(livePhotoCandidates.length >= 8 ? livePhotoCandidates : candidates);
  if (!item) throw new Error("No prizes are currently available");
  room.usedPrizeIds.push(item.id);
  retirePrize(item.id);
  room.usedPrizeFamilies.push(item.prizeFamily);
  room.prizeCategoryCounts[item.bidCategory] = (room.prizeCategoryCounts[item.bidCategory] || 0) + 1;
  return item;
}

function setHostLine(room, text, type) {
  room.hostLine = { seq: room.hostLine.seq + 1, text, type };
}

export function joinRoom(room, name, photoDataUrl, shirtMessage) {
  if (room.phase !== "lobby" && room.phase !== "demoLobby") throw new Error("Game already started");
  if (room.players.length >= MAX_PLAYERS) throw new Error("Room is full");
  const cleanName = (name || "").trim().slice(0, 24) || "Player";
  const cleanShirtMessage = String(shirtMessage || "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  // Validate photo is a data URL if provided; silently drop if malformed.
  let photo = null;
  if (photoDataUrl && typeof photoDataUrl === "string" && photoDataUrl.startsWith("data:image/")) {
    // Limit size to ~2MB base64
    if (photoDataUrl.length < 2_800_000) photo = photoDataUrl;
  }
  const player = { id: randomUUID(), name: cleanName, photo, hasPhoto: !!photo, shirtMessage: cleanShirtMessage };
  room.players.push(player);
  if (room.phase === "demoLobby") {
    room.contestants = [{ ...player, isAI: false, strategy: null, bid: null }];
    room.pricingGame = createPricingGameForType(room.demoGameType, player);
    room.playedPricingGames = [room.demoGameType];
    preparePricingIntroduction(room,player);
  }
  return player;
}

// Called by the host to fetch a specific player's photo (for podium display).
export function getPlayerPhoto(room, playerId) {
  const p = room.players.find((pl) => pl.id === playerId);
  return p?.photo || null;
}

export async function startGame(room) {
  if (room.phase !== "lobby") throw new Error("Already started");
  if (!room.players.length) throw new Error("At least one human player must join before the game can start");
  room.contestants = buildLineup(room.players);
  room.calledHumanIds = room.contestants.filter(c=>!c.isAI).map(c=>c.id);
  room.returningHumanQueue = [];
  room.item = await selectFreshPrize(room);
  room.callIndex = -1;
  room.turn = 0;
  room.firstBidderId = room.contestants[0]?.id || null;
  room.winnerIndices = [];
  room.completedRounds = 0;
  room.pricingGameSchedule = makePricingGameSchedule();
  room.showcaseContestants = [];
  room.halfWinners = [];
  room.showdown = null;
  room.finalShowcase = null;
  room.shirtReveal = null;
  room.phase = "calling";
  setHostLine(room, "Let's meet today's contestants!", "welcome");
}

export function callNext(room) {
  if (room.phase !== "calling") throw new Error("Not in calling phase");
  if (room.callIndex < room.contestants.length - 1) {
    room.callIndex += 1;
    const c = room.contestants[room.callIndex];
    const extra = c.isAI ? " You're our newest AI contestant on the Bidding Game." : "";
    setHostLine(room, `${c.name}, come on down!${extra}`, "call");
  }
}

function promptTurn(room) {
  const c = room.contestants[room.turn];
  setHostLine(room, `Alright ${c.name} — what's your bid?`, "prompt");
}

function revealLine(room) {
  const { item, contestants, winnerIndices } = room;
  const price = item.price;

  // Check for exact bid
  const exactBidder = contestants.find(c => c.bid === price);
  if (exactBidder) {
    return { text: `The actual retail price is $${price}! And ${exactBidder.name} bid EXACTLY that! That is an exact bid — ${exactBidder.name} wins an extra one hundred dollars!`, type: "exactBid" };
  }

  // All overbid
  if (winnerIndices.length === 0) {
    const bids = contestants.map(c => c.bid).filter(b => b != null);
    const lowest = Math.min(...bids);
    const lowestName = contestants.find(c => c.bid === lowest)?.name || "someone";
    return { text: `You have all overbid! The lowest bid was ${lowestName} at $${lowest}. I won't reveal the price—clear those bids and let's try again!`, type: "overbid" };
  }

  // Normal winner
  const names = winnerIndices.map((i) => contestants[i].name).join(" and ");
  const winLine = winnerIndices.length > 1 ? `${names} both win it!` : `${names} wins it!`;
  return { text: `The actual retail price is $${price}! ${winLine}`, type: "reveal" };
}

export function advance(room, to) {
  if (to === "item") {
    if (room.phase !== "calling" && room.phase !== "item" && room.phase !== "replacement") throw new Error("Bad phase for 'item'");
    const firstItem = room.phase === "calling";
    room.phase = "item";
    room.replacementVisible = true;
    // "||" separates host line from announcer description — client splits on it
    const hostLine = firstItem ? "Here's the first prize up for bids!" : "Here's the next prize up for bids!";
    setHostLine(room, `${hostLine}||${room.item.hostDescription}`, "itemIntro");
  } else if (to === "bidding") {
    if (room.phase !== "item") throw new Error("Bad phase for 'bidding'");
    room.phase = "bidding";
    const firstIndex = room.contestants.findIndex(c => c.id === room.firstBidderId);
    room.turn = firstIndex >= 0 ? firstIndex : 0;
    promptTurn(room);
  } else if (to === "reveal") {
    if (room.phase !== "bidding") throw new Error("Bad phase for 'reveal'");
    room.phase = "reveal";
    room.winnerIndices = computeWinners(room.contestants, room.item.price);
    const reveal = revealLine(room);
    room.revealType = reveal.type; // "reveal" | "overbid" | "exactBid"
    setHostLine(room, reveal.text, reveal.type);
  } else {
    throw new Error(`Unknown target: ${to}`);
  }
}

export async function startPricingGame(room) {
  if (room.phase !== "reveal") throw new Error("Finish Contestants' Row first");
  const winner = room.winnerIndices.map(i => room.contestants[i]).find(c => c && !c.isAI);
  if (!winner) throw new Error("No human winner is available for a pricing game");
  const [retailerPool,smallItemPool]=await Promise.all([getPrizePool(),getSmallPrizePool()]);
  const livePricingItems=[...retailerPool,...smallItemPool].filter(item=>item.image&&Number(item.price)>=1&&Number(item.price)<=25000).map(item=>({id:item.id,name:item.name,brand:item.brand||item.retailer,retailer:item.retailer,description:item.description||`Available from ${item.retailer}.`,price:Number(item.price)>=20?Math.round(Number(item.price)):Number(item.price),image:item.image,imageAlt:item.imageAlt||item.name,imageVerified:true,sourceUrl:item.url,category:item.bidCategory||item.category||"retail"}));
  const category=room.pricingGameSchedule[room.completedRounds]||"nonCar";
  const allowedTypes=category==="car"?CAR_PRICING_GAME_TYPES:NON_CAR_PRICING_GAME_TYPES;
  const retiredPricingNames = retiredPricingPrizeNamesList();
  const excluded=[...new Set([...room.usedPricingPrizeNames,...recentPricingPrizeNames,...retiredPricingNames])];
  const candidates=pricingGameCandidates(allowedTypes,PRICING_GAME_TYPES).sort((a,b)=>Number(room.playedPricingGames.includes(a))-Number(room.playedPricingGames.includes(b)));
  const failures=[];
  room.pricingGame=null;
  for(const type of candidates){try{room.pricingGame=createPricingGameForType(type,winner,excluded,livePricingItems);break;}catch(error){failures.push(`${type}: ${error.message}`);}}
  if(!room.pricingGame)throw new Error(`No pricing game could be prepared. ${failures.join(" | ")}`);
  room.playedPricingGames.push(room.pricingGame.type);
  room.pricingGameRotation=markPricingGamePlayed(room.pricingGame.type);
  const selectedPricingPrizeNames = pricingPrizeNames(room.pricingGame);
  const selectedPricingPrizes = pricingPrizes(room.pricingGame);
  room.usedPricingPrizeNames.push(...selectedPricingPrizeNames);
  rememberPricingPrizes(selectedPricingPrizeNames);
  retirePricingPrizes(selectedPricingPrizes);
  const nextExcluded=[...new Set([...excluded,...selectedPricingPrizeNames,...retiredPricingPrizeNamesList()])],pairStatus=pickAPairPoolStatus(nextExcluded,livePricingItems),bidding=prizeBankStats(),small=smallPrizePoolStats();
  room.prizePoolWarnings=[];
  if(pairStatus.low)room.prizePoolWarnings.push(`Pick-a-Pair has only ${pairStatus.usablePairs} fresh pairs (${pairStatus.completeGames} complete game${pairStatus.completeGames===1?"":"s"}) remaining after automatic refill.`);
  if(bidding.available<bidding.threshold)room.prizePoolWarnings.push(`The bidding-prize pool is refilling automatically: ${bidding.available} prizes remain.`);
  if(small.available<120)room.prizePoolWarnings.push(`The live small-item pool is refilling automatically: ${small.available} items remain.`);
  prepareWinnerPricingIntroduction(room,winner);
}

export function beginPricingGame(room) {
  if (!room.pricingGame) throw new Error("No pricing game introduction is active");
  const game=room.pricingGame;
  if (room.phase === "shirtReveal") {
    room.shirtReveal = null;
    const player = room.contestants.find(contestant => contestant.id === game.playerId) || { name: game.playerName };
    preparePricingIntroduction(room, player);
    return;
  }
  if (room.phase === "pricingPrizeIntro" && game._featuredPrizeIntroducedFirst && !game._rulesIntroduced) {
    if(room.pricingAnnouncementQueue.length){const next=room.pricingAnnouncementQueue.shift();room.pricingAnnouncement=next;setHostLine(room,next.announcerText,"pricingPrizeIntro");return;}
    game._rulesIntroduced=true;
    room.pricingAnnouncement=null;
    room.phase="pricingIntro";
    setHostLine(room,`${game.playerName}, you are going to play ${game.title}!`,"pricingGameIntro");
    return;
  }
  if (room.phase === "pricingIntro") room.pricingAnnouncementQueue = game._featuredPrizeIntroducedFirst ? initialPrizeAnnouncements(game).slice(game._featuredIntroCount||1) : initialPrizeAnnouncements(game);
  else if (room.phase !== "pricingPrizeIntro") throw new Error("No pricing game introduction is active");
  const next = room.pricingAnnouncementQueue.shift();
  if (next) {
    room.pricingAnnouncement = next;
    room.phase = "pricingPrizeIntro";
    setHostLine(room, next.announcerText || `It's ${next.name}!`, "pricingPrizeIntro");
  } else {
    room.pricingAnnouncement = null;
    room.phase = "pricingGame";
    if (room.pricingGame.type === "clockGame" && !room.pricingGame._clockStarted) {
      room.pricingGame._startedAt = Date.now();
      room.pricingGame._clockStarted = true;
      room.pricingGame.clockEndsAt = room.pricingGame._startedAt + room.pricingGame.secondsLeft * 1000;
    }
    setHostLine(room, room.pricingGame.prompt, "pricingPrompt");
  }
}

function scheduleDiceAutoReveal(room) {
  const game = room.pricingGame;
  if (
    room.phase !== "pricingGame"
    || game?.type !== "diceGame"
    || game.stage !== "reveal"
    || game.status !== "playing"
    || game._autoRevealScheduled
  ) return;

  game._autoRevealScheduled = true;
  const revealNext = () => {
    if (room.pricingGame !== game || room.phase !== "pricingGame" || game.stage !== "reveal" || game.status !== "playing") {
      game._autoRevealScheduled = false;
      return;
    }
    playPricingGame(game, { choice: "Reveal next digit" });
    room.updatedAt = Date.now();
    if (game.status === "playing") {
      setHostLine(room, game.lastOutcome?.text || game.prompt, "pricingPrompt");
      const timer = setTimeout(revealNext, DICE_AUTO_REVEAL_DELAY_MS);
      timer.unref?.();
      room.diceRevealTimer = timer;
    } else {
      game._autoRevealScheduled = false;
      setHostLine(room, game.result, "pricingResult");
    }
  };
  const timer = setTimeout(revealNext, DICE_AUTO_REVEAL_DELAY_MS);
  timer.unref?.();
  room.diceRevealTimer = timer;
}

export function pricingGameAction(room, playerId, action) {
  if (room.phase !== "pricingGame" || !room.pricingGame) throw new Error("No pricing game is active");
  if(action?.audienceChoice!=null){
    if(room.pricingGame.status!=="playing")throw new Error("This pricing game has ended");
    const audienceMember=room.players.find(player=>player.id===playerId);
    if(!audienceMember||playerId===room.pricingGame.playerId)throw new Error("Only non-playing human contestants may shout suggestions");
    const choice=String(action.audienceChoice).trim().slice(0,32);if(!choice)throw new Error("Choose a suggestion first");
    const g=room.pricingGame,promptKey=`${g.stage||""}|${g.prompt||""}`;
    if(g.audienceSuggestions?.promptKey!==promptKey)g.audienceSuggestions={seq:g.audienceSuggestions?.seq||0,promptKey,counts:{},latest:null};
    g.audienceSuggestions.counts[choice]=(g.audienceSuggestions.counts[choice]||0)+1;
    g.audienceSuggestions.seq+=1;g.audienceSuggestions.latest={playerName:audienceMember.name,choice};
    return;
  }
  if (room.pricingGame.playerId !== playerId) throw new Error("This is not your pricing game");
  playPricingGame(room.pricingGame, action || {});
  const g = room.pricingGame;
  recordPricingAction(g,action||{});
  if (g._pendingPriceReveal) {
    room.phase = "pricingRevealCue";
    setHostLine(room, `${g.priceReveal.guess ? `You said ${g.priceReveal.guess}. ` : ""}Show me the price!`, "pricingRevealCue");
  } else if(g.type==="cliffHangers"&&g.stage==="checking"){
    setHostLine(room,"Is that the right price?","cliffCheck");
  } else if(g.type==="holeInOne"&&g.stage==="orderReveal"){
    setHostLine(room,"Let's reveal your grocery prices, starting with the least expensive.","holeOrderReveal");
  } else if(g.type==="holeInOne"&&g.stage==="putting"){
    setHostLine(room,"","holePutt");
  } else if(g.type==="luckySeven"&&g.stage==="doorOpening"){
    setHostLine(room,`${g.playerName} says ${g.lastGuess.guess}. Open the next door!`,"luckySevenDoor");
  } else if (g.pendingPrizeAnnouncement) {
    room.pricingAnnouncementQueue = [g.pendingPrizeAnnouncement];
    g.pendingPrizeAnnouncement = null;
    room.pricingAnnouncement = room.pricingAnnouncementQueue.shift();
    room.phase = "pricingPrizeIntro";
    setHostLine(room, room.pricingAnnouncement.announcerText || `It's ${room.pricingAnnouncement.name}!`, "pricingPrizeIntro");
  } else {
    setHostLine(room, g.status === "playing" ? g.prompt : g.result, g.status === "playing" ? "pricingPrompt" : "pricingResult");
    scheduleDiceAutoReveal(room);
  }
}

export function revealPricingPrice(room) {
  if (room.phase !== "pricingRevealCue" || !room.pricingGame) throw new Error("No price is waiting to be revealed");
  revealDeferredPrice(room.pricingGame);
  room.phase = "pricingPriceShown";
  const r=room.pricingGame.priceReveal;
  if(room.pricingGame.type==="cliffHangers")setHostLine(room,`The actual retail price was $${Number(r.actual).toLocaleString("en-CA")}.`,"pricingPriceShown");
  else setHostLine(room, `$${Number(r.actual).toLocaleString("en-CA")}! ${room.pricingGame.lastOutcome?.text || ""}`, "pricingPriceShown");
}

export function continuePricingPrice(room) {
  if (room.phase !== "pricingPriceShown" || !room.pricingGame) throw new Error("No revealed price is waiting");
  const g=room.pricingGame;
  clearDeferredPrice(g);
  if(g.type==="cliffHangers"&&g.cliffOver){
    room.phase="pricingGame";
    setHostLine(room,"","pricingResult");
    return;
  }
  if (g.pendingPrizeAnnouncement) {
    room.pricingAnnouncementQueue=[g.pendingPrizeAnnouncement];
    g.pendingPrizeAnnouncement=null;
    room.pricingAnnouncement=room.pricingAnnouncementQueue.shift();
    room.phase="pricingPrizeIntro";
    setHostLine(room,room.pricingAnnouncement.announcerText||`It's ${room.pricingAnnouncement.name}!`,"pricingPrizeIntro");
  } else {
    room.phase="pricingGame";
    setHostLine(room,g.status==="playing"?g.prompt:g.result,g.status==="playing"?"pricingPrompt":"pricingResult");
  }
}

export function settlePricingGame(room,action={}) {
  if (!room.pricingGame) throw new Error("No pricing game is active");
  // Animation completion can be reported by both the normal browser event and
  // its watchdog (or by two host displays). Treat repeats as harmless.
  if(room.pricingGame.type==="plinko"&&room.pricingGame.stage!=="dropping"&&room.pricingGame.lastDrop?.value!=null)return room;
  if(room.pricingGame.type==="cliffHangers"&&room.pricingGame.stage!=="climbing"&&room.pricingGame.priceReveal)return room;
  if(room.pricingGame.type==="holeInOne"&&action.kind){const g=room.pricingGame;if(action.kind==="holeOrder"&&(g.stage!=="orderReveal"||Number(action.index)!==g.revealedCount))return room;if(action.kind==="holePutt"&&(g.stage!=="putting"||Number(action.id)!==g.lastPutt?.id))return room;if(action.kind==="holeOrTwo"&&g.stage!=="orTwoReveal")return room;}
  if(room.pricingGame.type==="luckySeven"){const g=room.pricingGame;if(!["luckyDoor","luckyCost"].includes(action.kind)||Number(action.id)!==g.lastGuess?.id)return room;if(action.kind==="luckyDoor"&&g.stage!=="doorOpening")return room;if(action.kind==="luckyCost"&&g.stage!=="costReveal")return room;}
  settlePricingAnimation(room.pricingGame);
  const g=room.pricingGame;
  if(g.type==="luckySeven"){
    if(g.stage==="costReveal"){setHostLine(room,g.prompt,"luckySevenCost");return room;}
    setHostLine(room,g.status==="playing"?g.prompt:g.result,g.status==="playing"?"pricingPrompt":"pricingResult");return room;
  }
  if(g.type==="holeInOne"){
    if(g.stage==="orderReveal"){setHostLine(room,g.prompt,"holeOrderRevealStep");return room;}
    if(g.stage==="puttReady"){setHostLine(room,g.prompt,"holePuttReady");return room;}
    if(g.stage==="orTwoReveal"){setHostLine(room,"...OR TWO!","holeOrTwoReveal");return room;}
  }
  if(g.type==="cliffHangers"&&g.stage==="climbing"){setHostLine(room,"","cliffClimb");return room;}
  if(g._pendingPriceReveal){room.phase="pricingRevealCue";setHostLine(room,g.cliffFinalWin?"HE MADE IT! You won all three prizes!":g.cliffOver?"OH, sorry, he went over the cliff.":`The climber stopped at step ${g.climber}. Now, show me the actual price!`,"pricingRevealCue");return room;}
  setHostLine(room,g.status==="playing"?g.prompt:g.result,g.status==="playing"?"pricingPrompt":"pricingResult");
}

export function revealReplacement(room) {
  if (room.phase !== "replacement") throw new Error("No replacement contestant is being called");
  room.replacementVisible = true;
}

export function submitBid(room, playerId, amount) {
  if(amount==="__kiss_host__"){kissHost(room,playerId);return;}
  if(amount==="__show_shirt__"){showShirt(room,playerId);return;}
  if (room.phase !== "bidding") throw new Error("Bidding isn't open");
  const c = room.contestants[room.turn];
  if (!c || c.id !== playerId) throw new Error("Not your turn");
  if (c.bid != null) throw new Error("Already bid");
  const bid = Math.max(1, Math.min(9999, Math.round(Number(amount) || 0)));
  if (room.contestants.some(other => other.bid === bid)) throw new Error("That bid has already been used");
  c.bid = bid;
  setHostLine(room, `${c.name} bids $${c.bid}!`, "bidResult");
}

function celebrationWinner(room,playerId){
  const rowWinner=room.winnerIndices.map(i=>room.contestants[i]).find(c=>c&&!c.isAI&&contestantKey(c)===playerId);
  if(room.phase==="reveal")return rowWinner||null;
  if(["pricingIntro","pricingPrizeIntro","pricingGame"].includes(room.phase)&&room.pricingGame?.playerId===playerId){
    return room.contestants.find(c=>contestantKey(c)===playerId)||{id:playerId,name:room.pricingGame.playerName,shirtMessage:room.players.find(p=>p.id===playerId)?.shirtMessage};
  }
  return null;
}

export function kissHost(room,playerId){
  const winner=celebrationWinner(room,playerId);
  if(!winner)throw new Error("Only the current winning contestant can kiss the host");
  room.celebrationSeq+=1;
  room.kissEvent={seq:room.celebrationSeq,playerName:winner.name};
  return room.kissEvent;
}

export function showShirt(room,playerId){
  const winner=celebrationWinner(room,playerId);
  if(!winner)throw new Error("Only the current winning contestant can show a T-shirt");
  const message=String(winner.shirtMessage||room.players.find(p=>p.id===playerId)?.shirtMessage||"").trim();
  if(!message)throw new Error("No T-shirt message was entered");
  room.celebrationSeq+=1;
  room.shirtEvent={seq:room.celebrationSeq,playerName:winner.name,message};
  return room.shirtEvent;
}

export function resolveAITurn(room) {
  if (room.phase !== "bidding") throw new Error("Bidding isn't open");
  const c = room.contestants[room.turn];
  if (!c || !c.isAI || c.bid != null) throw new Error("Invalid AI turn");
  const prevBids = room.contestants.slice(0, room.turn).map((x) => x.bid);
  c.bid = computeAIBid(c.strategy, room.item.price, prevBids, room.turn, room.contestants.length,room.item.bidCategory||room.item.category||"variety",c.priceProfile);
  setHostLine(room, `${c.name} bids $${c.bid}!`, "bidResult");
}

// Reset all bids and return to bidding phase (used after all-overbid)
export function resetBids(room) {
  if (room.phase !== "reveal") throw new Error("Not in reveal phase");
  room.contestants.forEach(c => { c.bid = null; });
  room.phase = "bidding";
  const firstIndex = room.contestants.findIndex(c => c.id === room.firstBidderId);
  room.turn = firstIndex >= 0 ? firstIndex : 0;
  room.winnerIndices = [];
  room.revealType = null;
  const c = room.contestants[room.turn];
  setHostLine(room, `Alright ${c.name} — what's your bid this time?`, "prompt");
}

export function nextTurn(room) {
  if (room.phase !== "bidding") throw new Error("Bidding isn't open");
  const c = room.contestants[room.turn];
  if (!c || c.bid == null) throw new Error("Current bid not set yet");
  if (room.contestants.every(contestant => contestant.bid != null)) throw new Error("Already at last turn");
  for (let offset = 1; offset <= room.contestants.length; offset += 1) {
    const candidate = (room.turn + offset) % room.contestants.length;
    if (room.contestants[candidate].bid == null) { room.turn = candidate; break; }
  }
  promptTurn(room);
}

export async function restart(room, mode) {
  if (mode === "newPlayers") {
    room.phase = "lobby";
    room.players = [];
    room.contestants = [];
    room.calledHumanIds = [];
    room.returningHumanQueue = [];
    room.item = null;
    room.callIndex = -1;
    room.turn = 0;
    room.firstBidderId = null;
    room.winnerIndices = [];
    room.usedPrizeIds = [];
    room.usedPrizeFamilies = [];
    room.prizeCategoryCounts = {};
    room.playedPricingGames = [];
    room.pricingGameSchedule = makePricingGameSchedule();
    room.usedPricingPrizeNames = [];
    room.pricingGame = null;
    room.prizePoolWarnings = [];
    room.kissEvent = null;
    room.shirtEvent = null;
    room.celebrationSeq = 0;
    room.showcaseContestants = [];
    room.completedRounds = 0;
    room.halfWinners = [];
    room.showdown = null;
    room.finalShowcase = null;
    room.replacementContestantId = null;
    room.replacementVisible = false;
    setHostLine(room, "", "welcome");
  } else {
    const mayAdvance = room.phase === "reveal"
      || (room.phase === "pricingGame" && room.pricingGame?.status && room.pricingGame.status !== "playing");
    // Host speech callbacks and manual controls can race to advance the same
    // completed round. Treat the second request as a harmless no-op instead
    // of showing a false error after the next round is already on screen.
    if (!mayAdvance) return room;
    const winnerIndex = room.winnerIndices[0];
    const winner = room.contestants[winnerIndex];
    if (!winner) throw new Error("No Contestants' Row winner is available");
    if (winner) {
      const gameValue=pricingGameValue(room.pricingGame);
      const oneBidValue=Number(room.item?.price||0)+(room.revealType==="exactBid"?100:0);
      const round=room.completedRounds+1;
      // Every win is a separate game-show appearance. The controllerPlayerId
      // still points at the same phone, allowing a human to earn multiple
      // independent spots in a Showcase Showdown (and even the Showcase).
      room.showcaseContestants.push({ ...winner, id:`${winner.id}:round:${round}`, controllerPlayerId:winner.id, bid:null, oneBidValue, pricingWinnings:gameValue, totalWinnings:oneBidValue+gameValue, round });
      room.completedRounds+=1;
    }

    if(room.completedRounds===3||room.completedRounds===6){
      const group=room.showcaseContestants.filter(c=>c.round>(room.completedRounds-3));
      room.showdown=createShowdown(room.completedRounds===3?1:2,group);
      room.pricingGame=null;room.phase="showcaseShowdown";
      setHostLine(room,`It's time for the ${room.completedRounds===3?"first":"second"} Showcase Showdown! ${room.showdown.participants[0].name}, you're first at the Big Wheel!`,"wheelIntro");
      return;
    }
    await prepareReplacement(room);
  }
}

function pricingGameValue(game){
  if(game?.type==="shellGame")return Number(game.winnings||0);
  if(!game||game.status!=="won")return 0;
  if(game.type==="diceGame")return Number(`${game.firstDigit}${game._digits.join("")}`);
  if(game.type==="moneyGame"||game.type==="luckySeven")return Number(game._digits?.join("")||game.car?.price||30000);
  if(game.type==="oneAway")return Number(game._digits.join(""));
  if(game.type==="clockGame")return game._prices.reduce((a,b)=>a+b,0);
  if(game.type==="cliffHangers")return Number(game.winnings||0);
  if(game.type==="groceryGame")return Number(game.winnings||0);
  if(game.type==="anyNumber")return Number(game._answers[0].join(""));
  return Number(game.winnings||0);
}

async function prepareReplacement(room){
    const winnerIndex=room.winnerIndices[0];
    const winner=room.contestants[winnerIndex];
    if(!winner)throw new Error("No Contestants' Row winner is available for the next round");
    const unavailable = new Set(room.contestants.filter((_,index)=>index!==winnerIndex).map(c => c.id));
    // First call every human who has never appeared. Only then cycle previous
    // winners in FIFO order, putting each new win at the bottom of that queue.
    const called = new Set(room.calledHumanIds);
    let waitingHuman = room.players.find(player => !called.has(player.id) && !unavailable.has(player.id));
    if(waitingHuman) room.calledHumanIds.push(waitingHuman.id);
    else {
      while(room.returningHumanQueue.length && !waitingHuman){
        const id=room.returningHumanQueue.shift();
        if(!unavailable.has(id)) waitingHuman=room.players.find(player=>player.id===id);
      }
    }
    room.contestants.forEach(c=>{c.bid=null;});
    room.winnerIndices=[];
    room.pricingGame=null;
    room.item = await selectFreshPrize(room);
    if(!waitingHuman){
      // With four or fewer humans nobody leaves the Row. The winner keeps the
      // same podium, but bidding first next round removes the usual advantage.
      room.firstBidderId=winner.id;
      room.replacementContestantId=null;
      room.replacementVisible=true;
      room.phase="item";
      setHostLine(room,`Here's the next prize up for bids!||${room.item.hostDescription}`,"itemIntro");
      return;
    }
    room.returningHumanQueue.push(winner.id);
    const replacement = { id: waitingHuman.id, name: waitingHuman.name, isAI: false, strategy: null, bid: null, photo: waitingHuman.photo || null, shirtMessage: waitingHuman.shirtMessage || "" };
    // Preserve every podium position: only the winner's vacated spot changes.
    room.contestants[winnerIndex]=replacement;
    room.firstBidderId=replacement.id;
    room.replacementContestantId = replacement.id;
    room.replacementVisible = false;
    room.turn = winnerIndex;
    room.phase = "replacement";
    setHostLine(room,
      `We need a new contestant!||Here's one for you... ${replacement.name}, come on down! You're the next contestant on The Price Is Right!`,
      "replacementIntro");
}

export function wheelGameAction(room,playerId,action){if(room.phase!=="showcaseShowdown")throw new Error("The wheel is not active");const name=room.showdown.participants[room.showdown.currentIndex]?.name,type=typeof action==="string"?action:action?.type;wheelAction(room.showdown,playerId,action);if(room.showdown.stage==="complete")setHostLine(room,room.showdown.result,"wheelResult");else if(type==="spin")setHostLine(room,`${name} gives the Big Wheel a ${room.showdown.spinStrength} spin!`,"wheelSpin");else{const p=room.showdown.participants[room.showdown.currentIndex];setHostLine(room,`${p.name}, you're next at the wheel!`,"wheelAdvance");}}
export function settleWheelGame(room){
  const s=room.showdown,spinner=s?.participants?.[s.currentIndex];
  settleWheel(s);
  s.announcingPlayerId=spinner?.id;
  const value=spinner?.bonusSpin ?? spinner?.spins?.at(-1);
  if(s.stage==="complete"){setHostLine(room,`${spinner?.name} spun ${value===100?"one dollar":`${value} cents`}. ${s.result}`,"wheelResult");return;}
  s.pendingStage=s.stage;s.stage="announcing";
  const total=spinner.score>100?"That puts you over one dollar.":`Your total is now ${spinner.score} cents.`;
  const bonus=spinner.hitDollar&&spinner.score===100?"That's exactly one dollar — you win $1,000 and a bonus spin!":"";
  setHostLine(room,`${spinner.name}, you spun ${value===100?"one dollar":`${value} cents`}. ${total} ${bonus}`.trim(),"wheelAnnouncement");
}

export function acknowledgeWheelResult(room){
  const s=room.showdown;if(room.phase!=="showcaseShowdown"||s?.stage!=="announcing"||!s.pendingStage)throw new Error("No wheel result is waiting");
  s.stage=s.pendingStage;s.pendingStage=null;s.announcingPlayerId=null;
  if(s.stage==="bonusTurn")setHostLine(room,`${s.participants[s.currentIndex].name}, take your bonus spin!`,"wheelPrompt");
  else{const p=s.participants[s.currentIndex];setHostLine(room,s.stage==="decision"?`${p.name}, spin again or stay on ${p.score} cents?`:s.stage==="automaticTurn"?`${p.name}, the first two contestants went over one dollar, so you automatically win the Showcase Showdown! Step up and take one spin for a chance at bonus money!`:`${p.name}, step up and spin the wheel!`,"wheelPrompt");}
}
export function resolveWheelGameAI(room){const name=room.showdown.participants[room.showdown.currentIndex]?.name;resolveWheelAI(room.showdown);if(room.showdown.stage==="complete")setHostLine(room,room.showdown.result,"wheelResult");else if(["spinning","bonusSpinning"].includes(room.showdown.stage))setHostLine(room,`${name} spins the Big Wheel!`,"wheelSpin");else{const p=room.showdown.participants[room.showdown.currentIndex];setHostLine(room,`${p.name}, you're next!`,"wheelAdvance");}}
export async function finishShowdown(room){if(room.showdown?.stage!=="complete")throw new Error("The Showcase Showdown is not complete");const winner=room.showdown.participants.find(p=>p.id===room.showdown.winnerId);room.halfWinners.push({...winner,totalWinnings:winner.totalWinnings+winner.bonusCash});if(room.showdown.half===1){room.showdown=null;await prepareReplacement(room);}else{room.finalShowcase=createFinalShowcase(room.halfWinners);room.showdown=null;room.phase="showcaseIntro";const cue=advanceShowcase(room.finalShowcase);room.showcaseAnnouncement=null;setHostLine(room,cue.text,"showcaseTheme");}}

export function advanceShowcasePresentation(room){if(!room.finalShowcase)throw new Error("No Showcase is active");const f=room.finalShowcase;if(f.stage==="complete"){if(room.phase==="showcaseReveal"){room.phase="creditsMusic";setHostLine(room,"","endCreditsTrack");}return;}if(f.stage==="revealFirst"){f.revealCount=2;f.stage="revealSecond";room.phase="showcaseReveal";setHostLine(room,showcaseRevealLine(f,1),"showcaseRevealStep");return;}if(f.stage==="revealSecond"){f.stage="complete";room.phase="showcaseReveal";setHostLine(room,f.result,"showcaseResult");return;}const cue=advanceShowcase(f);if(cue.type==="theme"){room.phase="showcaseIntro";room.showcaseAnnouncement=null;setHostLine(room,cue.text,"showcaseTheme");}else if(cue.type==="prize"){room.phase="showcaseIntro";room.showcaseAnnouncement=cue.prize;setHostLine(room,cue.text,"showcasePrize");}else{room.showcaseAnnouncement=null;room.phase=f.stage==="choice"?"showcaseChoice":"showcaseBid";const id=f.stage==="choice"?f.contestants[0].id:f.assignments[1];const p=f.contestants.find(c=>c.id===id);setHostLine(room,f.stage==="choice"?`${p.name}, would you like to bid on this showcase, or pass it?`:`${p.name}, what is your bid on this showcase?`,f.stage==="choice"?"showcaseChoice":"showcaseBid");}}
function showcaseRevealLine(f,index){const r=f.results[index],p=f.contestants.find(c=>c.id===r.playerId);return `${p.name} bid $${r.bid.toLocaleString("en-CA")}. The actual retail price of Showcase ${index+1} is $${r.actual.toLocaleString("en-CA")}. ${r.over?"That is an overbid.":`That is a difference of $${r.difference.toLocaleString("en-CA")}.`}`;}
function beginShowcaseReveal(room,f){room.phase="showcaseReveal";setHostLine(room,showcaseRevealLine(f,0),"showcaseRevealStep");}
export function finalShowcaseAction(room,playerId,action){showcaseAction(room.finalShowcase,playerId,action);const f=room.finalShowcase;if(f.stage==="firstBid"){room.phase="showcaseBid";const p=f.contestants.find(c=>c.id===f.assignments[0]);setHostLine(room,`${p.name}, what is your bid on the first showcase?`,"showcaseBid");}else if(f.stage==="secondTheme"){room.phase="showcaseIntro";const cue=advanceShowcase(f);setHostLine(room,cue.text,"showcaseTheme");}else if(f.stage==="revealFirst")beginShowcaseReveal(room,f);}
export function resolveFinalShowcaseAI(room){resolveShowcaseAI(room.finalShowcase);const f=room.finalShowcase;if(f.stage==="firstBid"){const p=f.contestants.find(c=>c.id===f.assignments[0]);room.phase="showcaseBid";setHostLine(room,`${p.name}, what is your bid?`,"showcaseBid");}else if(f.stage==="secondTheme"){room.phase="showcaseIntro";const cue=advanceShowcase(f);setHostLine(room,cue.text,"showcaseTheme");}else if(f.stage==="revealFirst")beginShowcaseReveal(room,f);}

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (now - room.updatedAt > ROOM_TTL_MS) rooms.delete(code);
  }
}, 30 * 60 * 1000);
cleanupTimer.unref?.();
