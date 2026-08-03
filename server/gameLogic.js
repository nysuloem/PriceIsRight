// Pure helper functions for building the contestant lineup, simulating
// AI bids, and figuring out who's closest without going over.

// First names only — no hometowns, per design decision.
export const AI_NAMES = [
  "Priya",
  "Doug",
  "Marie",
  "Trent",
  "Babs",
  "Kyle",
  "Noor",
  "Gord",
  "Yvonne",
  "Faisal",
  "Owen",
  "Tasha",
  "Reggie",
  "Sandeep",
  "Colleen",
  "Mack",
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

// Build a 4-seat lineup from whichever human players have joined,
// filling any remaining seats with AI contestants.
export function buildLineup(players) {
  const namePool = shuffle(AI_NAMES);
  const stratPool = shuffle(STRATEGIES);

  const lineup = players.slice(0, 4).map((p) => ({
    id: p.id,
    name: p.name,
    isAI: false,
    bid: null,
  }));

  let aiCount = 0;
  while (lineup.length < 4) {
    lineup.push({
      id: `ai-${aiCount}`,
      name: namePool[aiCount % namePool.length],
      isAI: true,
      strategy: stratPool[aiCount % stratPool.length],
      bid: null,
    });
    aiCount += 1;
  }
  return lineup;
}

// Simulate an AI contestant's bid given their assigned "personality" and
// the bids placed so far this round.
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

// Closest bid without going over wins. If everyone goes over, nobody wins.
// Ties (same diff) are co-winners.
export function computeWinners(contestants, price) {
  const diffs = contestants.map((c) =>
    c.bid != null && c.bid <= price ? price - c.bid : null
  );
  const valid = diffs.filter((d) => d !== null);
  if (valid.length === 0) return [];
  const min = Math.min(...valid);
  return diffs.map((d, i) => (d === min ? i : -1)).filter((i) => i !== -1);
}
