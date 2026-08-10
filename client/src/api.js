const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const createRoom = () => request("/rooms", { method: "POST" });

export const joinRoom = (code, name, photo) =>
  request(`/rooms/${code}/join`, {
    method: "POST",
    body: JSON.stringify({ name, photo: photo || null }),
  });

export const getState = (code) => request(`/rooms/${code}/state`);

export const startGame = (code) =>
  request(`/rooms/${code}/start`, { method: "POST" });

export const callNext = (code) =>
  request(`/rooms/${code}/call-next`, { method: "POST" });

export const advance = (code, to) =>
  request(`/rooms/${code}/advance`, {
    method: "POST",
    body: JSON.stringify({ to }),
  });

export const submitBid = (code, playerId, amount) =>
  request(`/rooms/${code}/bid`, {
    method: "POST",
    body: JSON.stringify({ playerId, amount }),
  });

export const resolveAITurn = (code) =>
  request(`/rooms/${code}/resolve-ai-turn`, { method: "POST" });

export const nextTurn = (code) =>
  request(`/rooms/${code}/next-turn`, { method: "POST" });

export const restartGame = (code, mode) =>
  request(`/rooms/${code}/restart`, {
    method: "POST",
    body: JSON.stringify({ mode }),
  });

export const ttsUrl = (text, voice, style) =>
  `${BASE}/tts?text=${encodeURIComponent(text)}${voice ? `&voice=${voice}` : ""}${style ? `&style=${style}` : ""}`;

// Returns the URL to fetch a human player's photo (served by the server).
export const playerPhotoUrl = (code, playerId) =>
  `${BASE}/rooms/${code}/photo/${playerId}`;

export const getConfig = () => request("/config");

export const resetBids = (code) =>
  request(`/rooms/${code}/reset-bids`, { method: 'POST' });

export const startPricingGame = (code) =>
  request(`/rooms/${code}/pricing-game/start`, { method: "POST" });

export const pricingGameAction = (code, playerId, action) =>
  request(`/rooms/${code}/pricing-game/action`, {
    method: "POST",
    body: JSON.stringify({ playerId, action }),
  });

export const beginPricingGame = (code) =>
  request(`/rooms/${code}/pricing-game/begin`, { method: "POST" });

export const settlePricingGame = (code) =>
  request(`/rooms/${code}/pricing-game/settle`, { method: "POST" });

export const revealReplacement = (code) =>
  request(`/rooms/${code}/replacement/reveal`, { method: "POST" });

export const createPricingGameDemo = (type) =>
  request("/pricing-games/demo", {
    method: "POST",
    body: JSON.stringify({ type }),
  });

export const wheelAction = (code,playerId,action) => request(`/rooms/${code}/wheel/action`,{method:"POST",body:JSON.stringify({playerId,action})});
export const settleWheel = (code) => request(`/rooms/${code}/wheel/settle`,{method:"POST"});
export const resolveWheelAI = (code) => request(`/rooms/${code}/wheel/ai`,{method:"POST"});
export const finishShowdown = (code) => request(`/rooms/${code}/wheel/finish`,{method:"POST"});
export const advanceShowcase = (code) => request(`/rooms/${code}/showcase/advance`,{method:"POST"});
export const showcaseAction = (code,playerId,action) => request(`/rooms/${code}/showcase/action`,{method:"POST",body:JSON.stringify({playerId,action})});
export const resolveShowcaseAI = (code) => request(`/rooms/${code}/showcase/ai`,{method:"POST"});
