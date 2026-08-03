import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mic2, Bot, Trophy, Sparkles, ArrowRight, ChefHat, ExternalLink } from "lucide-react";
import {
  getState, startGame, callNext, advance,
  resolveAITurn, nextTurn, restartGame, ttsUrl, playerPhotoUrl,
} from "./api.js";

const POLL_MS = 1200;

// Play a TTS line; onDone fires when audio ends or on error (short pause).
function playTTS(audioEl, text, onDone) {
  if (!text) { onDone(); return; }
  let fired = false;
  const fire = () => { if (fired) return; fired = true; onDone(); };
  audioEl.src = ttsUrl(text);
  audioEl.onended = fire;
  audioEl.onerror = () => setTimeout(fire, 1500);
  const p = audioEl.play();
  if (p?.catch) p.catch(() => setTimeout(fire, 1500));
}

export default function HostView({ code }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [showOpening, setShowOpening] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [readyToBid, setReadyToBid] = useState(false);
  // Single audio element, always mounted, shared by both the opening and the game.
  const audioRef = useRef(null);
  const lastSeqRef = useRef(-1);

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

  // Drive the game's host lines via TTS once the opening is done.
  useEffect(() => {
    if (!state?.hostLine || !audioUnlocked || showOpening) return;
    const { seq, text, type } = state.hostLine;
    if (seq === lastSeqRef.current) return;
    lastSeqRef.current = seq;
    const safely = (fn) => fn().catch((e) => setError(e.message));
    const el = audioRef.current;

    if (type === "welcome") {
      if (!text) return;
      playTTS(el, text, () => safely(() => callNext(code)));
    } else if (type === "call") {
      const lastCalled = state.callIndex >= state.contestants.length - 1;
      playTTS(el, text, () => safely(() => lastCalled ? advance(code, "item") : callNext(code)));
    } else if (type === "itemIntro") {
      setReadyToBid(false);
      playTTS(el, text, () => setReadyToBid(true));
    } else if (type === "prompt") {
      const current = state.contestants[state.turn];
      if (current?.isAI) {
        playTTS(el, text, () => safely(() => resolveAITurn(code)));
      } else {
        playTTS(el, text, () => {});
      }
    } else if (type === "bidResult") {
      const isLast = state.turn >= state.contestants.length - 1;
      playTTS(el, text, () => safely(() => isLast ? advance(code, "reveal") : nextTurn(code)));
    } else if (type === "reveal") {
      playTTS(el, text, () => {});
    }
  }, [state, code, audioUnlocked, showOpening]);

  const action = (fn) => () => fn().catch((e) => setError(e.message));

  const beginShow = async () => {
    // This click handler unlocks browser autoplay for the session.
    setAudioUnlocked(true);
    const el = audioRef.current;
    try {
      // Play a silent moment to satisfy the user-gesture requirement.
      el.src = "";
      await el.play().catch(() => {});
      el.pause();
    } catch { /* ignore — we just need the gesture recorded */ }
    setShowOpening(true);
  };

  const onOpeningDone = async () => {
    setShowOpening(false);
    try { await startGame(code); } catch (e) { setError(e.message); }
  };

  const joinUrl = `${window.location.origin}/play/${code}`;

  if (!state) {
    return (
      <div className="pir-root pir-loading">
        <audio ref={audioRef} />
        <div className="pir-title">Come On Down!</div>
        <p className="pir-helptext">Loading room {code}…</p>
      </div>
    );
  }

  // The <audio> element lives here at all times so audioRef is always valid —
  // both the opening sequence and the game loop use it.
  return (
    <div className="pir-root" style={showOpening ? { maxWidth: "none", padding: 0 } : {}}>
      <audio ref={audioRef} />

      {showOpening && (
        <OpeningSequence
          contestants={state.players}
          audioRef={audioRef}
          onDone={onOpeningDone}
        />
      )}

      {!showOpening && (
        <>
          <div className="pir-title-row">
            <h1 className="pir-title">Come On Down!</h1>
            <div className="pir-subtitle">The Bidding Game · Item Up For Bid</div>
          </div>

          {state.phase === "lobby" && (
            <Lobby state={state} code={code} joinUrl={joinUrl} onStart={beginShow} />
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

          {error && <div className="pir-error">{error}</div>}
        </>
      )}
    </div>
  );
}

// ── Opening Sequence ──────────────────────────────────────────────────────────
function OpeningSequence({ contestants, audioRef, onDone }) {
  const [step, setStep] = useState("init"); // init | intro | 0,1,2... | finale
  const [litPodiums, setLitPodiums] = useState([]);
  const human = contestants || [];
  // Prevent double-firing from strict-mode double-invoke
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    // Kick off on next tick so the component is fully mounted
    setTimeout(() => setStep("intro"), 50);
  }, []);

  useEffect(() => {
    if (step === "init") return;
    const el = audioRef.current;
    if (!el) return;

    if (step === "intro") {
      playTTS(el,
        "Here it comes — television's most exciting game of fantastic prizes! The Bidding Game!",
        () => setStep(human.length > 0 ? 0 : "finale")
      );
    } else if (typeof step === "number" && step < human.length) {
      const name = human[step].name;
      setLitPodiums((prev) => [...prev, step]);
      playTTS(el, `${name}... come on down!`, () =>
        setStep(step + 1 < human.length ? step + 1 : "finale")
      );
    } else if (step === "finale") {
      playTTS(el, "Let's play The Bidding Game!", () => {
        setTimeout(onDone, 700);
      });
    }
  }, [step]);

  const slots = Math.min(Math.max(4, human.length), 4);

  return (
    <div className="pir-opening">
      <div className="pir-opening-logo">
        <div className="pir-opening-title">Come On Down!</div>
        <div className="pir-opening-sub">The Bidding Game</div>
      </div>

      <div className="pir-opening-podiums" style={{ gridTemplateColumns: `repeat(${slots}, 1fr)` }}>
        {Array.from({ length: slots }).map((_, i) => {
          const isLit = litPodiums.includes(i);
          const p = human[i];
          return (
            <div key={i} className={`pir-opening-podium ${isLit ? "lit" : ""}`}>
              <div className="pir-opening-avatar">{isLit && p ? p.name[0].toUpperCase() : "?"}</div>
              <div className="pir-opening-name">{isLit && p ? p.name : "???"}</div>
              <div className="pir-led dim">$ — — —</div>
            </div>
          );
        })}
      </div>

      {step === "finale" && (
        <div className="pir-opening-finale">Let's play!</div>
      )}
    </div>
  );
}

// ── Lobby ─────────────────────────────────────────────────────────────────────
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
            {state.players.length === 0
              ? "Waiting for players…"
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
            <p className="pir-helptext">AI contestants fill any empty seats automatically.</p>
          )}
        </div>
      </div>
      <div className="pir-actions">
        <button className="pir-btn" onClick={onStart}>
          Start the Showcase <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Calling ───────────────────────────────────────────────────────────────────
function CallingView({ state, code }) {
  return (
    <>
      <Caption icon={<Mic2 size={20} />} text={state.hostLine.text || "Let's meet today's contestants…"} />
      <ContestantRow contestants={state.contestants} highlight={state.callIndex} code={code} />
    </>
  );
}

// ── Item ──────────────────────────────────────────────────────────────────────
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

// ── Bidding ───────────────────────────────────────────────────────────────────
function BiddingView({ state, code }) {
  return (
    <>
      <Caption icon={<Mic2 size={20} />} text={state.hostLine.text} />
      <ContestantRow contestants={state.contestants} activeTurn={state.turn} code={code} showBids />
    </>
  );
}

// ── Reveal ────────────────────────────────────────────────────────────────────
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

// ── Contestant row ────────────────────────────────────────────────────────────
function ContestantRow({ contestants, highlight = -1, activeTurn, winnerIndices = [], showBids, showDiff, itemPrice, code }) {
  const cols = Math.min(contestants.length, 4);
  return (
    <div className="pir-podium-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {contestants.map((c, i) => {
        const called = i <= highlight;
        const active = activeTurn === i;
        const isWinner = winnerIndices.includes(i);
        const over = showDiff && c.bid != null && c.bid > itemPrice;
        const diff = showDiff && c.bid != null
          ? (over ? c.bid - itemPrice : itemPrice - c.bid) : null;
        return (
          <div key={i} className={["pir-podium", called ? "called" : "", active ? "active" : "", isWinner ? "winner" : ""].filter(Boolean).join(" ")}>
            <ContestantAvatar contestant={c} code={code} isWinner={isWinner} />
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
              <div className={`pir-result-line ${isWinner ? "win" : over ? "over" : ""}`}>
                {isWinner ? `✓ Under by $${diff}` : over ? `Over by $${diff}` : `Under by $${diff}`}
              </div>
            )}
            {!showBids && !showDiff && <div className="pir-led dim">$ — — —</div>}
          </div>
        );
      })}
    </div>
  );
}

function ContestantAvatar({ contestant, code, isWinner }) {
  const [src, setSrc] = useState(null);
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    setSrc(contestant.isAI ? contestant.photo : playerPhotoUrl(code, contestant.id));
    setErrored(false);
  }, [contestant, code]);
  if (errored || !src) {
    return <div className="pir-avatar pir-avatar-placeholder">{contestant.name[0]?.toUpperCase()}</div>;
  }
  return (
    <img src={src} alt={contestant.name}
      className={`pir-avatar ${isWinner ? "pir-avatar-winner" : ""}`}
      onError={() => setErrored(true)} />
  );
}

function Caption({ icon, text }) {
  return <div className="pir-caption">{icon}<div>{text}</div></div>;
}

function ItemImage({ item }) {
  const [errored, setErrored] = useState(false);
  if (errored || !item.image) {
    return (
      <div className="pir-item-frame">
        <div className="pir-item-placeholder"><ChefHat size={40} /><span>{item.name}</span></div>
      </div>
    );
  }
  return (
    <div className="pir-item-frame">
      <img src={item.image} alt={item.imageAlt} onError={() => setErrored(true)} />
    </div>
  );
}
