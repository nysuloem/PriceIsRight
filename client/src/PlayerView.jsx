import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, Trophy, Camera, Upload, X, Check } from "lucide-react";
import { getState, joinRoom, submitBid } from "./api.js";

const POLL_MS = 1200;

export default function PlayerView({ code }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [playerId, setPlayerId] = useState(() =>
    localStorage.getItem(`pir_player_${code}`)
  );
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoMode, setPhotoMode] = useState(null); // "camera" | null
  const [bidDraft, setBidDraft] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

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

  // Stop camera on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // ── Camera helpers ──────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported in this browser — try uploading a photo.");
      return;
    }
    try {
      // Minimal constraints — iOS Safari rejects explicit width/height constraints
      // on getUserMedia. facingMode as { ideal } works on both iOS and Android.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      streamRef.current = stream;
      setPhotoMode("camera");
      // Assign srcObject after the <video> element renders (next tick)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera not available — try uploading a photo instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setPhotoMode(null);
  }, []);

  const takeSnapshot = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Camera not ready yet — wait a moment and try again.");
      return;
    }
    const SIZE = 320;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    // Centre-crop to square
    const s = Math.min(video.videoWidth, video.videoHeight);
    const ox = (video.videoWidth - s) / 2;
    const oy = (video.videoHeight - s) / 2;
    // Mirror horizontally so the captured image matches the mirrored preview
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, ox, oy, s, s, 0, 0, SIZE, SIZE);
    setPhoto(canvas.toDataURL("image/jpeg", 0.75));
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected if needed
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 320;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        const s = Math.min(img.width, img.height);
        const ox = (img.width - s) / 2;
        const oy = (img.height - s) / 2;
        ctx.drawImage(img, ox, oy, s, s, 0, 0, SIZE, SIZE);
        setPhoto(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const doJoin = async (e) => {
    e.preventDefault();
    try {
      const data = await joinRoom(code, name.trim(), photo);
      localStorage.setItem(`pir_player_${code}`, data.playerId);
      localStorage.setItem(`pir_name_${code}`, name.trim());
      setPlayerId(data.playerId);
      setError("");
    } catch (e) {
      setError(e.message);
    }
  };

  // ── Not yet connected ───────────────────────────────────────────────
  if (!state) {
    return (
      <div className="pir-root pir-loading">
        <div className="pir-title">Come On Down!</div>
        <p className="pir-helptext">Connecting to room {code}…</p>
      </div>
    );
  }

  // ── Need to join ────────────────────────────────────────────────────
  if (!playerId) {
    if (state.phase !== "lobby") {
      return (
        <div className="pir-root pir-player pir-center">
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

        {/* ── Photo capture area ── */}
        <div className="pir-photo-area">
          {photoMode === "camera" ? (
            <div className="pir-camera-box">
              {/* playsInline required on iOS to prevent fullscreen takeover */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="pir-camera-feed"
              />
              <div className="pir-camera-controls">
                <button className="pir-btn" type="button" onClick={takeSnapshot}>
                  <Camera size={18} /> Take Photo
                </button>
                <button className="pir-btn secondary" type="button" onClick={stopCamera}>
                  <X size={18} /> Cancel
                </button>
              </div>
            </div>
          ) : photo ? (
            <div className="pir-photo-preview">
              <img src={photo} alt="Your photo" />
              <button
                className="pir-photo-clear"
                type="button"
                onClick={() => setPhoto(null)}
                title="Remove photo"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="pir-photo-placeholder">
              <div className="pir-photo-prompt">Add a photo (optional)</div>
              <div className="pir-photo-btns">
                <button className="pir-btn secondary small" type="button" onClick={startCamera}>
                  <Camera size={15} /> Selfie
                </button>
                <button className="pir-btn secondary small" type="button"
                  onClick={() => fileRef.current?.click()}>
                  <Upload size={15} /> Upload
                </button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleFileUpload}
              />
            </div>
          )}
        </div>

        <form onSubmit={doJoin} className="pir-join-form">
          <input
            placeholder="Your name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button className="pir-btn" type="submit" disabled={!name.trim()}>
            <Check size={18} /> Join Game
          </button>
        </form>
        {error && <div className="pir-error">{error}</div>}
      </div>
    );
  }

  // ── In the game ─────────────────────────────────────────────────────
  const myIndex = state.contestants.findIndex((c) => c.id === playerId);
  const me = state.contestants[myIndex];
  const myName = me?.name || localStorage.getItem(`pir_name_${code}`) || "You";

  return (
    <div className="pir-root pir-player">
      <h1 className="pir-title">Come On Down!</h1>
      <div className="pir-subtitle">{myName} · Room {code}</div>

      {state.phase === "lobby" && (
        <div className="pir-panel pir-center">
          <p>You're in, {myName}! Waiting for the host to start…</p>
        </div>
      )}

      {state.phase === "calling" && <CallingPhase state={state} myIndex={myIndex} />}

      {state.phase === "item" && state.item && (
        <div className="pir-panel pir-center">
          <PlayerItemImage item={state.item} />
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
      {called
        ? <p>You're on stage! Watch the big screen.</p>
        : <p>Get ready — the host is introducing everyone…</p>}
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
              type="number" min={0} max={9999} autoFocus
              value={bidDraft} placeholder="0"
              onChange={(e) => setBidDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && bidDraft !== "" && onSubmit()}
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
          {isWinner
            ? <span style={{ color: "var(--led-green)" }}>
                <Trophy size={16} style={{ verticalAlign: "middle" }} /> You win it!
              </span>
            : over ? `over by $${diff}` : `under by $${diff}`}
        </p>
      )}
    </div>
  );
}

function PlayerItemImage({ item }) {
  const [errored, setErrored] = useState(false);
  if (errored || !item.image) {
    return (
      <div className="pir-item-frame pir-centered-frame">
        <div className="pir-item-placeholder"><span>{item.name}</span></div>
      </div>
    );
  }
  return (
    <div className="pir-item-frame pir-centered-frame">
      <img src={item.image} alt={item.imageAlt} onError={() => setErrored(true)} />
    </div>
  );
}
