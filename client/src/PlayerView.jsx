import { useEffect, useState } from "react";
import { Bot, Trophy, ChefHat } from "lucide-react";
import { getState, joinRoom, submitBid } from "./api.js";

const POLL_MS = 1200;

export default function PlayerView({ code }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [playerId, setPlayerId] = useState(() =>
    localStorage.getItem(`pir_player_${code}`)
  );
  const [name, setName] = useState("");
  const [bidDraft, setBidDraft] = useState("");

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

  const doJoin = async (e) => {
    e.preventDefault();
    try {
      const data = await joinRoom(code, name.trim());
      localStorage.setItem(`pir_player_${code}`, data.playerId);
      localStorage.setItem(`pir_name_${code}`, name.trim());
      setPlayerId(data.playerId);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  if (!state) {
    return (
      <div className="pir-root pir-loading">
        <div className="pir-title">Come On Down!</div>
        <p className="pir-helptext">Connecting to room {code}…</p>
      </div>
    );
  }

  if (!playerId) {
    if (state.phase !== "lobby") {
      return (
        <div className="pir-root pir-player">
          <h1 className="pir-title">Come On Down!</h1>
          <p className="pir-helptext">
            This game has already started — ask the host for a new room code.
          </p>
        </div>
      );
    }
    return (
      <div className="pir-root pir-player">
        <h1 className="pir-title">Come On Down!</h1>
        <div className="pir-subtitle">Room {code}</div>
        <form onSubmit={doJoin} className="pir-join-form">
          <input
            placeholder="Your name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button className="pir-btn" type="submit">
            Join
          </button>
        </form>
        {error && <div className="pir-error">{error}</div>}
      </div>
    );
  }

  const myIndex = state.contestants.findIndex((c) => c.id === playerId);
  const me = state.contestants[myIndex];
  const myName = me?.name || localStorage.getItem(`pir_name_${code}`) || "You";

  return (
    <div className="pir-root pir-player">
      <h1 className="pir-title">Come On Down!</h1>
      <div className="pir-subtitle">
        {myName} · Room {code}
      </div>

      {state.phase === "lobby" && (
        <div className="pir-panel pir-center">
          <p>You're in, {myName}! Waiting for the host to start the showcase…</p>
        </div>
      )}

      {state.phase === "calling" && <CallingPhase state={state} myIndex={myIndex} />}

      {state.phase === "item" && state.item && (
        <div className="pir-panel pir-center">
          <ItemImage item={state.item} />
          <h3 style={{ marginTop: 10 }}>{state.item.name}</h3>
          <p className="pir-helptext">Get your bid ready!</p>
        </div>
      )}

      {state.phase === "bidding" && (
        <BiddingPhase
          state={state}
          playerId={playerId}
          bidDraft={bidDraft}
          setBidDraft={setBidDraft}
          onSubmit={async () => {
            try {
              await submitBid(code, playerId, bidDraft);
              setBidDraft("");
            } catch (e) {
              setError(e.message);
            }
          }}
        />
      )}

      {state.phase === "reveal" && <RevealPhase state={state} myIndex={myIndex} />}

      {error && <div className="pir-error">{error}</div>}
    </div>
  );
}

function CallingPhase({ state, myIndex }) {
  const called = myIndex !== -1 && myIndex <= state.callIndex;
  return (
    <div className="pir-panel pir-center">
      {called ? (
        <p>You're on stage! Watch the big screen for the item up for bid.</p>
      ) : (
        <p>Get ready — the host is introducing everyone…</p>
      )}
    </div>
  );
}

function BiddingPhase({ state, playerId, bidDraft, setBidDraft, onSubmit }) {
  const { contestants, turn } = state;
  const isMyTurn = contestants[turn]?.id === playerId && contestants[turn]?.bid == null;

  return (
    <div className="pir-panel">
      {isMyTurn ? (
        <>
          <p className="pir-helptext">It's your turn — what's your bid?</p>
          <div className="pir-led pir-bid-input">
            $
            <input
              type="number"
              min={0}
              max={9999}
              autoFocus
              value={bidDraft}
              placeholder="0"
              onChange={(e) => setBidDraft(e.target.value)}
            />
          </div>
          <div className="pir-actions">
            <button className="pir-btn" disabled={bidDraft === ""} onClick={onSubmit}>
              Lock In Bid
            </button>
          </div>
        </>
      ) : (
        <p className="pir-helptext pir-center">
          {contestants[turn]?.bid != null
            ? "Waiting for the next bid…"
            : `Waiting for ${contestants[turn]?.name} to bid…`}
        </p>
      )}

      <div className="pir-bid-list">
        {contestants.map((c, i) => (
          <div key={i} className="pir-bid-row">
            <span>
              {c.name}
              {c.isAI && <Bot size={12} style={{ marginLeft: 4, verticalAlign: "middle" }} />}
              {c.id === playerId && " (you)"}
            </span>
            <span>{c.bid != null ? `$${c.bid}` : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevealPhase({ state, myIndex }) {
  const { item, contestants, winnerIndices } = state;
  const me = contestants[myIndex];
  const isWinner = winnerIndices.includes(myIndex);
  const over = me && me.bid > item.price;
  const diff = me ? (over ? me.bid - item.price : item.price - me.bid) : 0;

  return (
    <div className="pir-panel pir-center">
      <div className="pir-price-reveal">
        <div className="label">Actual Retail Price</div>
        <div className="price">${item.price}</div>
      </div>
      {me && (
        <p style={{ marginTop: 12 }}>
          You bid <b>${me.bid}</b> —{" "}
          {isWinner ? (
            <span style={{ color: "var(--led-green)" }}>
              <Trophy size={16} style={{ verticalAlign: "middle" }} /> You win it!
            </span>
          ) : over ? (
            `over by $${diff}`
          ) : (
            `under by $${diff}`
          )}
        </p>
      )}
    </div>
  );
}

function ItemImage({ item }) {
  const [errored, setErrored] = useState(false);
  if (errored || !item.image) {
    return (
      <div className="pir-item-frame pir-centered-frame">
        <div className="pir-item-placeholder">
          <ChefHat size={40} />
          <span>{item.name}</span>
        </div>
      </div>
    );
  }
  return (
    <div className="pir-item-frame pir-centered-frame">
      <img src={item.image} alt={item.imageAlt} onError={() => setErrored(true)} />
    </div>
  );
}
