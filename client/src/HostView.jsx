import { useEffect, useRef, useState, useCallback, Component } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mic2, Bot, Trophy, Sparkles, ArrowRight, ChefHat, ExternalLink } from "lucide-react";
import {
  getState, startGame, callNext, advance,
  resolveAITurn, nextTurn, restartGame, resetBids, ttsUrl, playerPhotoUrl, getConfig,
} from "./api.js";
import OpeningSequence from "./OpeningSequence.jsx";

const POLL_MS = 1200;

// ---------------------------------------------------------------------------
// playTTS — fetch audio from the server and play it.
// onDone fires when it ends, or after 1.5 s on error.
// ---------------------------------------------------------------------------
function playTTS(audioEl, text, onDone, voice, style = "host") {
  if (!text) { onDone(); return; }
  let fired = false;
  const fire = () => { if (fired) return; fired = true; onDone(); };
  audioEl.src = ttsUrl(text, voice, style);
  audioEl.onended = fire;
  audioEl.onerror = () => setTimeout(fire, 1500);
  audioEl.play().catch(() => setTimeout(fire, 1500));
}

// ---------------------------------------------------------------------------
// HostView
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Error boundary — shows a message instead of blank screen on crash
// ---------------------------------------------------------------------------
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="pir-root" style={{ textAlign: "center", paddingTop: "20vh" }}>
          <div className="pir-title" style={{ fontSize: 28 }}>Something went wrong</div>
          <p className="pir-helptext" style={{ marginTop: 16 }}>{this.state.error.message}</p>
          <button className="pir-btn" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Sound effects — generated via Web Audio API, no files needed
// ---------------------------------------------------------------------------
function playBuzzer() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) { console.warn("buzzer failed", e); }
}

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      const t = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.start(t); osc.stop(t + 0.25);
    }
  } catch (e) { console.warn("alarm failed", e); }
}

function HostViewInner({ code }) {
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState("lobby"); // "lobby" | "opening" | "game"
  const [error, setError] = useState("");
  const [config, setConfig] = useState({ hostName: "Robbie Archer", announcerVoice: "echo", hostVoice: "onyx" });
  const lastSeqRef = useRef(-1);
  const audioRef = useRef(null);       // host voice
  const announcerRef = useRef(null);   // announcer voice (for prize descriptions)

  // Poll server state
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const s = await getState(code);
        if (!stopped) setState(s);
      } catch (e) {
        if (!stopped) setError(e.message);
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { stopped = true; clearInterval(id); };
  }, [code]);

  // Drive host lines (game phase only)
  useEffect(() => {
    if (phase !== "game" || !state?.hostLine) return;
    const { seq, text, type } = state.hostLine;
    if (seq === lastSeqRef.current) return;
    lastSeqRef.current = seq;
    const el = audioRef.current;
    const safely = (fn) => fn().catch((e) => setError(e.message));

    const voice = config.hostVoice || "echo";
    // "welcome" and "call" types are handled by the opening sequence.
    // The game loop only handles item onwards.
    if (type === "welcome" || type === "call") {
      return; // opening already did this — ignore
    } else if (type === "itemIntro") {
      const parts = text.split("||");
      const hostPart = parts[0] || "";
      const announcerPart = parts[1] || "";
      const ann = announcerRef.current;
      const annVoice = config.announcerVoice || "echo";
      let advancedToBidding = false;
      const afterAnnounce = () => {
        if (advancedToBidding) return;
        advancedToBidding = true;
        safely(() => advance(code, "bidding"));
      };
      // Safety net: if TTS takes too long or fails, advance anyway after 15s
      const safetyTimer = setTimeout(afterAnnounce, 15000);
      // Host introduces, announcer describes, then auto-advance to bidding
      playTTS(el, hostPart, () => {
        if (announcerPart && ann) {
          playTTS(ann, announcerPart, () => { clearTimeout(safetyTimer); afterAnnounce(); }, annVoice, "announcer");
        } else {
          clearTimeout(safetyTimer);
          afterAnnounce();
        }
      }, voice);
    } else if (type === "prompt") {
      const c = state.contestants[state.turn];
      if (c?.isAI) playTTS(el, text, () => safely(() => resolveAITurn(code)), voice);
      else playTTS(el, text, () => {}, voice);
    } else if (type === "bidResult") {
      const last = state.turn >= state.contestants.length - 1;
      playTTS(el, text, () => safely(() => last ? advance(code, "reveal") : nextTurn(code)), voice);
    } else if (type === "reveal") {
      playTTS(el, text, () => {}, voice);
    } else if (type === "overbid") {
      playBuzzer();
      setTimeout(() => {
        playTTS(el, text, () => {
          // Auto-reset bids after host finishes speaking
          setTimeout(() => safely(() => resetBids(code)), 1200);
        }, voice);
      }, 900); // let buzzer play first
    } else if (type === "exactBid") {
      playAlarm();
      setTimeout(() => {
        playTTS(el, text, () => {}, voice);
      }, 800);
    }
  }, [state, code, phase]);

  const action = (fn) => () => fn().catch((e) => setError(e.message));

  // "Start Game" — unlock audio, start game (builds lineup), wait for
  // contestants to appear in state, THEN show opening.
  const handleStart = async () => {
    const el = audioRef.current;
    // Unlock browser autoplay with a silent data URI triggered by this gesture
    el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    el.play().then(() => { el.pause(); el.src = ""; }).catch(() => {});

    try {
      const [cfg] = await Promise.all([
        getConfig().catch(() => ({})),
        startGame(code),
      ]);
      setConfig(cfg);
    } catch (e) { setError(e.message); return; }

    // Poll until the server state has contestants populated (it's immediate
    // but the React state might not have caught up from the poll interval yet)
    for (let i = 0; i < 10; i++) {
      const s = await getState(code).catch(() => null);
      if (s?.contestants?.length > 0) {
        setState(s);
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    setPhase("opening");
  };

  const handleOpeningDone = async () => {
    // The opening already called all contestants — skip the server's "calling"
    // phase by advancing straight through it to "item".
    // First call-next enough times to exhaust the calling phase,
    // then advance to item.
    try {
      // Fast-forward: call all contestants server-side (sets callIndex)
      const s = await getState(code);
      const needed = (s?.contestants?.length || 4);
      for (let i = 0; i <= needed; i++) {
        await callNext(code).catch(() => {});
      }
      // Now advance to item
      await advance(code, "item");
      // Get the latest state and prime the seq BEFORE entering game phase
      const fresh = await getState(code);
      if (fresh) {
        setState(fresh);
        lastSeqRef.current = fresh.hostLine.seq - 1; // -1 so the next effect fires
      }
    } catch (e) {
      console.error("handleOpeningDone:", e);
    }
    setPhase("game");
  };



  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play/${code}`
    : `/play/${code}`;

  return (
    <>
      {/* Audio elements always in DOM */}
      <audio ref={audioRef} style={{ display: "none" }} />
      <audio ref={announcerRef} style={{ display: "none" }} />

      {phase === "opening" && state && (
        <OpeningSequence
          contestants={state.contestants}
          roomCode={code}
          announcerVoice={config.announcerVoice}
          hostVoice={config.hostVoice}
          onDone={handleOpeningDone}
        />
      )}

      {phase !== "opening" && (
        <div className="pir-root">
          {!state && (
            <div className="pir-loading">
              <div className="pir-title">Come On Down!</div>
              <p className="pir-helptext">Loading room {code}…</p>
            </div>
          )}

          {state && (
            <>
              <div className="pir-title-row">
                <h1 className="pir-title">Come On Down!</h1>
                <div className="pir-subtitle">The Bidding Game · Item Up For Bid</div>
              </div>

              {state.phase === "lobby" && (
                <Lobby state={state} code={code} joinUrl={joinUrl} onStart={handleStart} />
              )}
              {state.phase === "calling" && <CallingView state={state} code={code} />}
              {state.phase === "item" && (
                <ItemView state={state} />
              )}
              {state.phase === "bidding" && <BiddingView state={state} code={code} />}
              {state.phase === "reveal" && (
                <RevealView state={state} code={code}
                  onBidAgain={action(() => restartGame(code, "sameLineup"))}
                  onNewPlayers={action(() => restartGame(code, "newPlayers"))} />
              )}
            </>
          )}

          {error && <div className="pir-error">{error}</div>}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------
function Lobby({ state, code, joinUrl, onStart }) {
  return (
    <div className="pir-panel">
      <div className="pir-lobby-layout">
        <div className="pir-lobby-qr">
          <div className="pir-qr-box">
            <QRCodeSVG value={joinUrl} size={160} fgColor="#fff8e7" bgColor="transparent" level="M" />
          </div>
          <div className="pir-room-code">Room: <span>{code}</span></div>
          <p className="pir-helptext" style={{ fontSize: 11 }}>Scan to join · or visit the URL</p>
          <a href={joinUrl} target="_blank" rel="noopener noreferrer"
            className="pir-btn secondary small"
            style={{ display: "inline-flex", textDecoration: "none", marginTop: 6 }}>
            <ExternalLink size={14} /> Test as Player
          </a>
        </div>
        <div className="pir-lobby-players">
          <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--gold)" }}>
            {state.players.length === 0 ? "Waiting for players…"
              : `${state.players.length} player${state.players.length !== 1 ? "s" : ""} joined`}
          </div>
          {state.players.map((p) => (
            <div key={p.id} className="pir-lobby-player-row">
              <div className="pir-avatar-sm pir-avatar-human">
                {p.hasPhoto ? "📷" : p.name[0].toUpperCase()}
              </div>
              <span>{p.name}</span>
            </div>
          ))}
          {state.players.length === 0 && (
            <p className="pir-helptext">AI contestants fill any empty seats.</p>
          )}
        </div>
      </div>
      <div className="pir-actions">
        <button className="pir-btn" onClick={onStart}>
          Start Game <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calling
// ---------------------------------------------------------------------------
function CallingView({ state, code }) {
  return (
    <>
      <Caption icon={<Mic2 size={20} />}
        text={state.hostLine.text || "Let's meet today's contestants…"} />
      <ContestantRow contestants={state.contestants} highlight={state.callIndex} code={code} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------
function ItemView({ state }) {
  const { item } = state;
  return (
    <>
      <Caption icon={<ChefHat size={20} />} text="Here's what you're bidding on tonight…" />
      <div className="pir-panel">
        <div className="pir-item-card">
          <ItemImage item={item} />
          <div className="pir-item-info">
            <h3>{item.name}</h3>
            <div className="pir-item-tag">{item.brand} · {item.retailer}</div>
            <div className="pir-item-desc">{item.hostDescription}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Bidding
// ---------------------------------------------------------------------------
function BiddingView({ state, code }) {
  return (
    <>
      <Caption icon={<Mic2 size={20} />} text={state.hostLine.text} />
      <ContestantRow contestants={state.contestants}
        activeTurn={state.turn} code={code} showBids />
    </>
  );
}

// ---------------------------------------------------------------------------
// Reveal
// ---------------------------------------------------------------------------
function RevealView({ state, code, onBidAgain, onNewPlayers }) {
  const { item, contestants, winnerIndices, revealType } = state;
  const isExact = revealType === "exactBid";
  const isOverbid = revealType === "overbid";
  const exactWinner = isExact ? contestants.find(c => c.bid === item.price) : null;

  // Overbid screen — bids will be reset automatically by TTS completion
  if (isOverbid) {
    const bids = contestants.map(c => c.bid).filter(b => b != null);
    const lowest = bids.length ? Math.min(...bids) : 0;
    const lowestName = contestants.find(c => c.bid === lowest)?.name || "";
    return (
      <>
        <div className="pir-winner-banner" style={{ color: "var(--red)", fontSize: "clamp(20px,4vw,30px)" }}>
          🚫 Everyone overbid! Resetting…
        </div>
        <div className="pir-price-reveal">
          <div className="label">Actual Retail Price</div>
          <div className="price">${item.price}</div>
        </div>
        <ContestantRow contestants={contestants} showBids showDiff itemPrice={item.price} code={code} />
        <p className="pir-helptext">Lowest bid: {lowestName} at ${lowest} — still too high!</p>
      </>
    );
  }

  return (
    <>
      <div className="pir-price-reveal">
        <div className="label">Actual Retail Price</div>
        <div className="price">${item.price}</div>
      </div>

      {isExact && exactWinner && (
        <div className="pir-exact-bid-banner">
          <div className="pir-exact-label">🎯 EXACT BID! +$100</div>
          <CanadianHundred />
        </div>
      )}

      {winnerIndices.length > 0 ? (
        <div className="pir-winner-banner">
          <Trophy size={26} />
          {winnerIndices.map((i) => contestants[i].name).join(" & ")}{" "}
          {winnerIndices.length > 1 ? "win it!" : "wins it!"}
        </div>
      ) : (
        <div className="pir-winner-banner" style={{ color: "var(--red)" }}>
          Everybody went over — nobody wins this one.
        </div>
      )}

      <ContestantRow contestants={contestants} winnerIndices={winnerIndices}
        showBids showDiff itemPrice={item.price} code={code} />
      <div className="pir-fineprint">
        {item.name} · {item.retailer} · ${item.price}
      </div>
      <div className="pir-actions">
        <button className="pir-btn" onClick={onBidAgain}>
          <Sparkles size={18} /> New Prize, Same Lineup
        </button>
        <button className="pir-btn secondary" onClick={onNewPlayers}>New Players</button>
      </div>
    </>
  );
}

// Canadian $100 bill — SVG illustration
function CanadianHundred() {
  return (
    <div className="pir-hundred-wrap">
      <svg viewBox="0 0 340 160" xmlns="http://www.w3.org/2000/svg" className="pir-hundred-bill">
        {/* Bill background */}
        <rect width="340" height="160" rx="8" fill="#e8f5e0" />
        {/* Brown border stripe */}
        <rect width="340" height="160" rx="8" fill="none" stroke="#5a7a3a" strokeWidth="6" />
        {/* Left colour block */}
        <rect x="0" y="0" width="60" height="160" rx="8" fill="#b8d4a0" />
        <rect x="55" y="0" width="10" height="160" fill="#b8d4a0" />
        {/* Security thread */}
        <rect x="105" y="0" width="4" height="160" fill="#7aaa5a" opacity="0.6" />
        {/* Large "100" */}
        <text x="190" y="95" fontFamily="Georgia,serif" fontSize="52" fontWeight="bold"
          fill="#2d5a1a" textAnchor="middle" opacity="0.9">100</text>
        {/* CANADA text */}
        <text x="190" y="118" fontFamily="Arial,sans-serif" fontSize="11"
          fill="#2d5a1a" textAnchor="middle" letterSpacing="4">CANADA</text>
        {/* Maple leaf watermark */}
        <text x="58" y="95" fontFamily="Arial" fontSize="36" fill="#5a7a3a"
          textAnchor="middle" opacity="0.7">🍁</text>
        {/* Right side denomination */}
        <text x="310" y="60" fontFamily="Georgia,serif" fontSize="22" fontWeight="bold"
          fill="#2d5a1a" textAnchor="middle" transform="rotate(90,310,60)">100</text>
        {/* Serial number */}
        <text x="140" y="140" fontFamily="monospace" fontSize="8"
          fill="#2d5a1a" opacity="0.6">HDA 2847291</text>
        {/* Top text */}
        <text x="190" y="24" fontFamily="Arial,sans-serif" fontSize="8"
          fill="#2d5a1a" textAnchor="middle" letterSpacing="1">BANK OF CANADA · BANQUE DU CANADA</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: contestant row
// ---------------------------------------------------------------------------
function ContestantRow({
  contestants, highlight = -1, activeTurn,
  winnerIndices = [], showBids, showDiff, itemPrice, code,
}) {
  const cols = Math.min(contestants.length, 4);
  return (
    <div className="pir-podium-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {contestants.map((c, i) => {
        const called = highlight === -1 ? true : i <= highlight;
        const active = activeTurn === i;
        const winner = winnerIndices.includes(i);
        const over = showDiff && c.bid != null && c.bid > itemPrice;
        const diff = showDiff && c.bid != null
          ? (over ? c.bid - itemPrice : itemPrice - c.bid) : null;
        return (
          <div key={i} className={[
            "pir-podium",
            called ? "called" : "",
            active ? "active" : "",
            winner ? "winner" : "",
          ].filter(Boolean).join(" ")}>
            <ContestantAvatar contestant={c} code={code} winner={winner} />
            <div className="pir-podium-name">
              {c.name}
              {c.isAI && <span className="pir-ai-badge"><Bot size={10} /> AI</span>}
            </div>
            {showBids && (
              <div className={`pir-led ${c.bid == null ? "dim" : ""}`}>
                {c.bid != null ? `$${c.bid}` : active ? "· · ·" : "$ — —"}
              </div>
            )}
            {showDiff && diff !== null && (
              <div className={`pir-result-line ${winner ? "win" : over ? "over" : ""}`}>
                {winner ? `✓ Under by $${diff}` : over ? `Over by $${diff}` : `Under by $${diff}`}
              </div>
            )}
            {!showBids && !showDiff && <div className="pir-led dim">$ — — —</div>}
          </div>
        );
      })}
    </div>
  );
}

function ContestantAvatar({ contestant, code, winner }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    setErr(false);
    setSrc(contestant.isAI ? contestant.photo : playerPhotoUrl(code, contestant.id));
  }, [contestant, code]);
  if (err || !src) {
    return (
      <div className="pir-avatar pir-avatar-placeholder">
        {contestant.name[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <img src={src} alt={contestant.name}
      className={`pir-avatar ${winner ? "pir-avatar-winner" : ""}`}
      onError={() => setErr(true)} />
  );
}

function Caption({ icon, text }) {
  return <div className="pir-caption">{icon}<div>{text}</div></div>;
}

function ItemImage({ item }) {
  const [err, setErr] = useState(false);
  if (err || !item.image) {
    return (
      <div className="pir-item-frame">
        <div className="pir-item-placeholder"><ChefHat size={40} /><span>{item.name}</span></div>
      </div>
    );
  }
  return (
    <div className="pir-item-frame">
      <img src={item.image} alt={item.imageAlt} onError={() => setErr(true)} />
    </div>
  );
}

export default function HostView({ code }) {
  return (
    <ErrorBoundary>
      <HostViewInner code={code} />
    </ErrorBoundary>
  );
}
