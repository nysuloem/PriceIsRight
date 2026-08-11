// Pure helpers for contestant lineup, AI bids, and winner calculation.

// First names only — no hometowns.
export const AI_NAMES = [
  "Priya", "Doug", "Marie", "Trent", "Babs", "Kyle",
  "Noor", "Gord", "Yvonne", "Faisal", "Owen", "Tasha",
  "Reggie", "Sandeep", "Colleen", "Mack", "Iris", "Dex",
  "Wren", "Theo", "Zara", "Clint", "Luz", "Pasha",
];

export const STRATEGIES = ["cautious", "confident", "wildcard", "plusOne"];
const FEMALE_AI_NAMES = new Set(["Priya","Marie","Babs","Noor","Yvonne","Tasha","Colleen","Iris","Wren","Zara","Luz"]);
const FEMALE_STRENGTHS = ["Home & Kitchen","Beauty & Wellness","Apparel","Baby & Family"];
const MALE_STRENGTHS = ["Electronics","Sports & Outdoors","Toys & Games"];
function aiPriceProfile(name){const gender=FEMALE_AI_NAMES.has(name)?"female":"male";return {gender,strengths:gender==="female"?FEMALE_STRENGTHS:MALE_STRENGTHS};}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// DiceBear "fun-emoji" style avatar — unique per name, no API key needed.
export function aiAvatarUrl(name) {
  const seed = encodeURIComponent(name + "-pir");
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

// Build a lineup from however many humans joined (0–MAX_PLAYERS),
// padding to at least MIN_SEATS with AI contestants.
const MIN_SEATS = 4;

export function buildLineup(players) {
  const namePool = shuffle(AI_NAMES);
  const stratPool = shuffle(STRATEGIES);
  const usedNames = new Set(players.map((p) => p.name));

  // Contestants' Row always contains exactly four people. Extra humans remain
  // in the room's waiting queue and are called after a winner leaves.
  const lineup = players.slice(0, MIN_SEATS).map((p) => ({
    id: p.id,
    name: p.name,
    isAI: false,
    strategy: null,
    bid: null,
    photo: p.photo || null,        // base64 data URL or null
  }));

  const needed = Math.max(0, MIN_SEATS - lineup.length);
  let aiCount = 0;
  let nameIdx = 0;
  while (aiCount < needed) {
    // Skip AI names that clash with a human player's name
    while (usedNames.has(namePool[nameIdx % namePool.length])) nameIdx++;
    const name = namePool[nameIdx % namePool.length];
    nameIdx++;
    lineup.push({
      id: `ai-${aiCount}`,
      name,
      isAI: true,
      strategy: stratPool[aiCount % stratPool.length],
      priceProfile: aiPriceProfile(name),
      bid: null,
      photo: aiAvatarUrl(name),
    });
    aiCount++;
  }
  return lineup;
}

export function makeAIContestant(existingContestants = [], sequence = 0) {
  const usedNames = new Set(existingContestants.map(c => c.name));
  const name = shuffle(AI_NAMES).find(candidate => !usedNames.has(candidate)) || `Player ${sequence + 1}`;
  return {
    id: `ai-${Date.now()}-${sequence}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    isAI: true,
    strategy: shuffle(STRATEGIES)[0],
    priceProfile: aiPriceProfile(name),
    bid: null,
    photo: aiAvatarUrl(name),
  };
}

export function computeAIBid(strategy, price, previousBids, position = 0, totalBidders = 4, category = "variety", priceProfile = null) {
  const prev = previousBids.filter((b) => b != null);
  // AI contestants do not know the actual retail price; price is used to
  // create a noisy private estimate, just as a human has an approximate idea.
  const strength=priceProfile?.strengths?.includes(category)?"strong":priceProfile?"weak":"neutral";
  const [low,spread]=strength==="strong"?[.76,.44]:strength==="weak"?[.52,.88]:[.72,.42];
  const estimate = Math.max(1, Math.round(price * (low + Math.random() * spread)));
  const isLast = position === totalBidders - 1;

  // Classic final-bid strategy: if every existing bid appears too high, bid
  // $1. Otherwise bid one dollar above the strongest plausible bid.
  if (isLast && prev.length) {
    const plausible = prev.filter(bid => bid < estimate);
    if (!plausible.length) return 1;
    const strategic = Math.max(...plausible) + 1;
    if (!prev.includes(strategic)) return strategic;
  }

  let bid;
  switch (strategy) {
    case "cautious":
      bid = Math.max(1, Math.round(estimate * (0.72 + Math.random() * 0.16)));
      break;
    case "wildcard":
      bid = Math.max(1, Math.round(estimate * (0.55 + Math.random() * 0.8)));
      break;
    case "plusOne": {
      if (prev.length > 0) {
        const maxPrev = Math.max(...prev);
        if (maxPrev > 0 && maxPrev < estimate) bid = maxPrev + 1;
      }
      if (bid == null) bid = estimate;
      break;
    }
    case "confident":
    default:
      bid = estimate;
  }
  // Duplicate bids are not allowed on the show. Nudge upward until unique.
  while (prev.includes(bid) && bid < 9999) bid += 1;
  return Math.min(9999, bid);
}

// Closest bid without going over wins. Duplicate bids are rejected before
// this point, so there is always at most one winner.
// If everyone goes over, nobody wins.
export function computeWinners(contestants, price) {
  const diffs = contestants.map((c) =>
    c.bid != null && c.bid <= price ? price - c.bid : null
  );
  const valid = diffs.filter((d) => d !== null);
  if (valid.length === 0) return [];
  const min = Math.min(...valid);
  return diffs.map((d, i) => (d === min ? i : -1)).filter((i) => i !== -1);
}
