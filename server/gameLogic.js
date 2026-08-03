// Pure helpers for contestant lineup, AI bids, and winner calculation.

// First names only — no hometowns.
export const AI_NAMES = [
  "Priya", "Doug", "Marie", "Trent", "Babs", "Kyle",
  "Noor", "Gord", "Yvonne", "Faisal", "Owen", "Tasha",
  "Reggie", "Sandeep", "Colleen", "Mack", "Iris", "Dex",
  "Wren", "Theo", "Zara", "Clint", "Luz", "Pasha",
];

export const STRATEGIES = ["cautious", "confident", "wildcard", "plusOne"];

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

  const lineup = players.map((p) => ({
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
      bid: null,
      photo: aiAvatarUrl(name),
    });
    aiCount++;
  }
  return lineup;
}

export function computeAIBid(strategy, price, previousBids) {
  const prev = previousBids.filter((b) => b != null);
  switch (strategy) {
    case "cautious":
      return Math.max(1, Math.round(price * (0.5 + Math.random() * 0.25)));
    case "wildcard":
      return Math.max(1, Math.round(price * (0.3 + Math.random() * 1.0)));
    case "plusOne": {
      if (prev.length > 0) {
        const maxPrev = Math.max(...prev);
        if (maxPrev > 0 && maxPrev < price * 1.5) return maxPrev + 1;
      }
      return Math.max(1, Math.round(price * (0.85 + Math.random() * 0.13)));
    }
    case "confident":
    default:
      return Math.max(1, Math.round(price * (0.85 + Math.random() * 0.13)));
  }
}

// Closest bid without going over wins. Ties are co-winners.
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
