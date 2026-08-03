import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mic2, Bot, Trophy, Sparkles, ArrowRight, ChefHat, ExternalLink } from "lucide-react";
import {
  getState, startGame, callNext, advance,
  resolveAITurn, nextTurn, restartGame, ttsUrl, playerPhotoUrl,
} from "./api.js";

const POLL_MS = 1200;

// ---------------------------------------------------------------------------
// playTTS — fetch audio from the server and play it.
// onDone fires when it ends, or after 1.5 s on error.
// ---------------------------------------------------------------------------
function playTTS(audioEl, text, onDone) {
  if (!text) { onDone(); return; }
  let fired = false;
  const fire = () => { if (fired) return; fired = true; onDone(); };
  audioEl.src = ttsUrl(text);
  audioEl.onended = fire;
  audioEl.onerror = () => setTimeout(fire, 1500);
  audioEl.play().catch(() => setTimeout(fire, 1500));
}

// ---------------------------------------------------------------------------
// HostView
// ---------------------------------------------------------------------------
export default function HostView({ code }) {
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState("lobby"); // "lobby" | "opening" | "game"
  const [error, setError] = useState("");
  const [readyToBid, setReadyToBid] = useState(false);
  const lastSeqRef = useRef(-1);

  // One <audio> element, never unmounted. Lives in a hidden div outside the
  // conditional render tree so React never recreates it.
  const audioRef = useRef(null);

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

    if (type === "welcome") {
      if (!text) return;
      playTTS(el, text, () => safely(() => callNext(code)));
    } else if (type === "call") {
      const last = state.callIndex >= state.contestants.length - 1;
      playTTS(el, text, () => safely(() => last ? advance(code, "item") : callNext(code)));
    } else if (type === "itemIntro") {
      setReadyToBid(false);
      playTTS(el, text, () => setReadyToBid(true));
    } else if (type === "prompt") {
      const c = state.contestants[state.turn];
      if (c?.isAI) playTTS(el, text, () => safely(() => resolveAITurn(code)));
      else playTTS(el, text, () => {});
    } else if (type === "bidResult") {
      const last = state.turn >= state.contestants.length - 1;
      playTTS(el, text, () => safely(() => last ? advance(code, "reveal") : nextTurn(code)));
    } else if (type === "reveal") {
      playTTS(el, text, () => {});
    }
  }, [state, code, phase]);

  const action = (fn) => () => fn().catch((e) => setError(e.message));

  // "Start Game" button — unlock audio with the gesture, then begin opening
  const handleStart = () => {
    // Prime the audio element with a short silent data URI so the browser
    // records a user-gesture play() on this element. This is the only
    // reliable cross-browser way to unlock autoplay.
    const el = audioRef.current;
    el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    el.play().then(() => { el.pause(); el.src = ""; }).catch(() => {});
    setPhase("opening");
  };

  const handleOpeningDone = async () => {
    setPhase("game");
    try { await startGame(code); } catch (e) { setError(e.message); }
  };

  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play/${code}`
    : `/play/${code}`;

  return (
    <>
      {/* Audio element is ALWAYS in the DOM — never conditionally rendered */}
      <audio ref={audioRef} style={{ display: "none" }} />

      {phase === "opening" && state && (
        <OpeningSequence
          players={state.players}
          audioRef={audioRef}
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
                <ItemView state={state} readyToBid={readyToBid}
                  onReady={action(() => advance(code, "bidding"))} />
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
// Opening sequence
// ---------------------------------------------------------------------------
function OpeningSequence({ players, audioRef, onDone }) {
  const [step, setStep] = useState(0);
  // 0 = fanfare, 1..n = call player n-1, n+1 = finale
  const [litPodiums, setLitPodiums] = useState([]);
  const ranRef = useRef(false);

  const advance = useCallback((s) => {
    const el = audioRef.current;

    if (s === 0) {
      playTTS(el,
        "Here it comes — television's most exciting game of fantastic prizes! The Bidding Game!",
        () => setStep(players.length > 0 ? 1 : players.length + 1)
      );
    } else if (s <= players.length) {
      const idx = s - 1;
      const name = players[idx].name;
      setLitPodiums((p) => [...p, idx]);
      playTTS(el, `${name}... come on down!`,
        () => setStep(s + 1)
      );
    } else {
      // finale
      playTTS(el, "Let's play The Bidding Game!", () => setTimeout(onDone, 600));
    }
  }, [players, audioRef, onDone]);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;
    advance(0);
  }, [advance]);

  useEffect(() => {
    if (step === 0) return; // handled by the init effect above
    advance(step);
  }, [step]);

  const slots = Math.max(4, players.length);

  return (
    <div className="pir-opening">
      <div className="pir-opening-logo">
        <div className="pir-opening-title">Come On Down!</div>
        <div className="pir-opening-sub">The Bidding Game</div>
      </div>
      <div className="pir-opening-podiums"
        style={{ gridTemplateColumns: `repeat(${Math.min(slots, 4)}, 1fr)` }}>
        {Array.from({ length: Math.min(slots, 4) }).map((_, i) => {
          const lit = litPodiums.includes(i);
          const p = players[i];
          return (
            <div key={i} className={`pir-opening-podium${lit ? " lit" : ""}`}>
              <div className="pir-opening-avatar">{lit && p ? p.name[0].toUpperCase() : "?"}</div>
              <div className="pir-opening-name">{lit && p ? p.name : "???"}</div>
              <div className="pir-led dim">$ — — —</div>
            </div>
          );
        })}
      </div>
      {step > players.length && (
        <div className="pir-opening-finale">Let's play!</div>
      )}
    </div>
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
function ItemView({ state, readyToBid, onReady }) {
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
      <div className="pir-actions">
        <button className="pir-btn" disabled={!readyToBid} onClick={onReady}>
          Lock In Your Bids <ArrowRight size={18} />
        </button>
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
  const { item, contestants, winnerIndices } = state;
  return (
    <>
      <div className="pir-price-reveal">
        <div className="label">Actual Retail Price</div>
        <div className="price">${item.price}</div>
      </div>
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
        {item.name} · {item.retailer} · ${item.exactPrice?.toFixed(2)}
        {item.priceIsLive ? " (live)" : " (last known)"}, rounded to ${item.price} for play
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
