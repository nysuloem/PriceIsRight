import { useEffect, useRef, useState, useCallback } from "react";
import { Mic2, Bot, Trophy, Sparkles, ArrowRight, ChefHat } from "lucide-react";
import {
  getState,
  startGame,
  callNext,
  advance,
  resolveAITurn,
  nextTurn,
  restartGame,
  ttsUrl,
} from "./api.js";

const POLL_MS = 1200;

export default function HostView({ code }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [readyToBid, setReadyToBid] = useState(false);
  const audioRef = useRef(null);
  const lastSeqRef = useRef(-1);

  // Poll room state.
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
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [code]);

  // Play a host line via TTS, falling back to a timed pause if audio is
  // unavailable or fails. `onDone` fires exactly once either way.
  const playLine = useCallback(
    (text, onDone) => {
      if (!text) {
        onDone();
        return;
      }
      const fallbackMs = Math.min(6000, Math.max(1500, text.length * 70));
      let fired = false;
      const fire = () => {
        if (fired) return;
        fired = true;
        onDone();
      };

      if (!audioUnlocked || !audioRef.current) {
        setTimeout(fire, fallbackMs);
        return;
      }

      const el = audioRef.current;
      el.src = ttsUrl(text);
      el.onended = fire;
      el.onerror = () => setTimeout(fire, fallbackMs);
      const playPromise = el.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => setTimeout(fire, fallbackMs));
      }
    },
    [audioUnlocked]
  );

  // Orchestrate the show: react to new host lines and drive the state
  // machine forward once each line finishes (or times out).
  useEffect(() => {
    if (!state || !state.hostLine) return;
    const { seq, text, type } = state.hostLine;
    if (seq === lastSeqRef.current) return;
    lastSeqRef.current = seq;

    const safely = (fn) => fn().catch((e) => setError(e.message));

    if (type === "welcome") {
      if (!text) return; // empty welcome = freshly reset to lobby
      playLine(text, () => safely(() => callNext(code)));
    } else if (type === "call") {
      const lastCalled = state.callIndex >= state.contestants.length - 1;
      playLine(text, () =>
        safely(() => (lastCalled ? advance(code, "item") : callNext(code)))
      );
    } else if (type === "itemIntro") {
      setReadyToBid(false);
      playLine(text, () => setReadyToBid(true));
    } else if (type === "prompt") {
      const current = state.contestants[state.turn];
      if (current?.isAI) {
        playLine(text, () => safely(() => resolveAITurn(code)));
      } else {
        playLine(text, () => {}); // wait for the player's phone
      }
    } else if (type === "bidResult") {
      const isLast = state.turn >= state.contestants.length - 1;
      playLine(text, () =>
        safely(() => (isLast ? advance(code, "reveal") : nextTurn(code)))
      );
    } else if (type === "reveal") {
      playLine(text, () => {});
    }
  }, [state, code, playLine]);

  const action = (fn) => () => fn().catch((e) => setError(e.message));

  const beginShow = async () => {
    setAudioUnlocked(true);
    // Unlock autoplay with a tiny clip triggered by this click.
    try {
      const el = audioRef.current;
      el.src = ttsUrl("Let's play!");
      await el.play().catch(() => {});
      el.pause();
    } catch {
      /* ignore */
    }
    try {
      await startGame(code);
    } catch (e) {
      setError(e.message);
    }
  };

  if (!state) {
    return (
      <div className="pir-root pir-loading">
        <div className="pir-title">Come On Down!</div>
        <p className="pir-helptext">Loading room {code}…</p>
      </div>
    );
  }

  const joinUrl = `${window.location.origin}/play/${code}`;

  return (
    <div className="pir-root">
      <audio ref={audioRef} />
      <div className="pir-title-row">
        <h1 className="pir-title">Come On Down!</h1>
        <div className="pir-subtitle">The Bidding Game · Item Up For Bid</div>
      </div>

      {state.phase === "lobby" && (
        <Lobby state={state} code={code} joinUrl={joinUrl} onStart={beginShow} />
      )}

      {state.phase === "calling" && <CallingView state={state} />}

      {state.phase === "item" && (
        <ItemView
          state={state}
          readyToBid={readyToBid}
          onReady={action(() => advance(code, "bidding"))}
        />
      )}

      {state.phase === "bidding" && <BiddingView state={state} />}

      {state.phase === "reveal" && (
        <RevealView
          state={state}
          onBidAgain={action(() => restartGame(code, "sameLineup"))}
          onNewPlayers={action(() => restartGame(code, "newPlayers"))}
        />
      )}

      {error && <div className="pir-error">{error}</div>}
    </div>
  );
}

function Lobby({ state, code, joinUrl, onStart }) {
  return (
    <div className="pir-panel">
      <div className="pir-room-code">
        Room Code: <span>{code}</span>
      </div>
      <p className="pir-helptext">Players join at {joinUrl}</p>
      <div className="pir-podium-row">
        {[0, 1, 2, 3].map((i) => {
          const p = state.players[i];
          return (
            <div key={i} className={`pir-podium ${p ? "called" : ""}`}>
              <div className="pir-podium-name">{p ? p.name : "Open Seat"}</div>
              {!p && (
                <div className="pir-ai-badge">
                  <Bot size={10} /> AI will fill in
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="pir-actions">
        <button className="pir-btn" onClick={onStart}>
          Start the Showcase <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

function CallingView({ state }) {
  const { contestants, callIndex, hostLine } = state;
  return (
    <>
      <Caption icon={<Mic2 size={20} />} text={hostLine.text || "Let's meet today's contestants…"} />
      <div className="pir-podium-row">
        {contestants.map((c, i) => (
          <div key={i} className={`pir-podium ${i <= callIndex ? "called" : ""}`}>
            <div className="pir-podium-name">{i <= callIndex ? c.name : "???"}</div>
            {i <= callIndex && c.isAI && (
              <div className="pir-ai-badge">
                <Bot size={10} /> AI
              </div>
            )}
            <div className="pir-led dim">$ — — —</div>
          </div>
        ))}
      </div>
    </>
  );
}

function ItemView({ state, readyToBid, onReady }) {
  const { item } = state;
  return (
    <>
      <Caption
        icon={<ChefHat size={20} />}
        text="Alright everyone, here's what you're bidding on tonight…"
      />
      <div className="pir-panel">
        <div className="pir-item-card">
          <ItemImage item={item} />
          <div className="pir-item-info">
            <h3>{item.name}</h3>
            <div className="pir-item-tag">
              {item.brand} · Available at {item.retailer}
            </div>
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

function BiddingView({ state }) {
  const { contestants, turn, hostLine } = state;
  return (
    <>
      <Caption icon={<Mic2 size={20} />} text={hostLine.text} />
      <div className="pir-podium-row">
        {contestants.map((c, i) => (
          <div key={i} className={`pir-podium called ${i === turn ? "active" : ""}`}>
            <div className="pir-podium-name">
              {c.name}
              {c.isAI && (
                <span className="pir-ai-badge">
                  <Bot size={10} /> AI
                </span>
              )}
            </div>
            <div className={`pir-led ${c.bid == null ? "dim" : ""}`}>
              {c.bid != null ? `$${c.bid}` : i === turn ? "· · ·" : "$ — — —"}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function RevealView({ state, onBidAgain, onNewPlayers }) {
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
          Ouch — everybody went over! Nobody's going home with this one.
        </div>
      )}

      <div className="pir-podium-row">
        {contestants.map((c, i) => {
          const over = c.bid > item.price;
          const diff = over ? c.bid - item.price : item.price - c.bid;
          const isWinner = winnerIndices.includes(i);
          return (
            <div key={i} className={`pir-podium called ${isWinner ? "winner" : ""}`}>
              <div className="pir-podium-name">
                {c.name}
                {c.isAI && (
                  <span className="pir-ai-badge">
                    <Bot size={10} /> AI
                  </span>
                )}
              </div>
              <div className="pir-led">${c.bid}</div>
              <div className={`pir-result-line ${isWinner ? "win" : over ? "over" : ""}`}>
                {isWinner
                  ? `Closest! Under by $${diff}`
                  : over
                  ? `Over by $${diff}`
                  : `Under by $${diff}`}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pir-fineprint">
        {item.name} — {item.brand}, {item.retailer} · price ${item.exactPrice?.toFixed(2)}
        {item.priceIsLive ? " (live)" : " (last known)"}, rounded to ${item.price} for play
      </div>

      <div className="pir-actions">
        <button className="pir-btn" onClick={onBidAgain}>
          New Prize, Same Lineup <Sparkles size={18} />
        </button>
        <button className="pir-btn secondary" onClick={onNewPlayers}>
          New Players
        </button>
      </div>
    </>
  );
}

function Caption({ icon, text }) {
  return (
    <div className="pir-caption">
      {icon}
      <div>{text}</div>
    </div>
  );
}

function ItemImage({ item }) {
  const [errored, setErrored] = useState(false);
  if (errored || !item.image) {
    return (
      <div className="pir-item-frame">
        <div className="pir-item-placeholder">
          <ChefHat size={40} />
          <span>{item.name}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="pir-item-frame">
      <img src={item.image} alt={item.imageAlt} onError={() => setErrored(true)} />
    </div>
  );
}
