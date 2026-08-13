import { useEffect, useRef, useState } from "react";
import { ttsUrl, playerPhotoUrl } from "./api.js";

// ---------------------------------------------------------------------------
// OpeningSequence
//
// Flow:
//  1. Recorded classic opening line
//  2. Each contestant is called one by one by the AI announcer
//  3. Recorded show-opening handoff
//  4. onDone() hands directly to the first prize
//
// The host then takes over via the game's TTS loop (itemIntro, prompt, etc.)
// ---------------------------------------------------------------------------

export function openingContestantLine(count) {
  if (count === 1) return "You are the only contestant on The Price Is Right!";
  if (count === 2) return "You are the two contestants on The Price Is Right!";
  if (count === 3) return "You are the three contestants on The Price Is Right!";
  if (count === 4) return "You are the four contestants on The Price Is Right!";
  return "You are the first four contestants on The Price Is Right!";
}

export default function OpeningSequence({
  contestants,
  roomCode,
  announcerVoice = "cedar",
  onDone,
}) {
  const [revealed, setRevealed] = useState([]);
  const clipRef = useRef(null);
  const announcerRef = useRef(null);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runSequence().catch((err) => {
      console.error("[OpeningSequence]", err);
      finish();
    });
  }, []);

  function speakAs(text, voice, style) {
    return new Promise((resolve) => {
      const el = announcerRef.current;
      if (!el) { resolve(); return; }
      let fired = false;
      const fire = () => { if (fired) return; fired = true; resolve(); };
      el.src = ttsUrl(text, voice, style);
      el.volume = 1.0;
      el.onended = fire;
      el.onerror = () => setTimeout(fire, 1500);
      el.play().catch(() => setTimeout(fire, 1500));
    });
  }

  const announce = (text) => speakAs(text, announcerVoice, "announcer");

  function playClip(src) {
    return new Promise((resolve) => {
      const el = clipRef.current;
      if (!el) { resolve(); return; }
      let fired = false;
      const fire = () => { if (fired) return; fired = true; resolve(); };
      el.src = src;
      el.volume = 1;
      el.onended = fire;
      el.onerror = fire;
      el.play().catch(fire);
    });
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  async function runSequence() {
    await playClip("/media/opening-greatest-hour.mp3");
    await wait(300);

    // The contestant names remain dynamic and use the selected announcer voice.
    for (let i = 0; i < contestants.length; i++) {
      const c = contestants[i];
      setRevealed(prev => [...prev, i]);
      await wait(100);
      await announce(`${c.name}... come on down!`);
      await wait(200);
    }

    await wait(350);
    await playClip("/media/opening-show-handoff.mp3");
    await wait(300);
    finish();
  }

  function photoSrc(c) {
    return c.isAI ? c.photo : playerPhotoUrl(roomCode, c.id);
  }

  return (
    <div className="pir-opening">
      <audio ref={clipRef} style={{ display: "none" }} />
      <audio ref={announcerRef} style={{ display: "none" }} />

      <div className="pir-opening-logo">
        <div className="pir-opening-title">Come On Down!</div>
        <div className="pir-opening-sub">The Price is Right</div>
      </div>

      {contestants.length === 0 ? (
        <p style={{ color: "var(--muted)", textAlign: "center" }}>
          Building the lineup…
        </p>
      ) : (
        <div className="pir-podium-row pir-opening-row">
          {contestants.map((c, i) => (
            <ContestantPodium key={c.id} contestant={c}
              revealed={revealed.includes(i)} active={i === revealed.at(-1)} src={photoSrc(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContestantPodium({ contestant, revealed, active, src }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className={`pir-podium${revealed ? " called" : ""}${active ? " active" : ""}`}>
      <div className="pir-contestant-upper">
        <div className="pir-podium-mic" aria-hidden="true">
          <span className="pir-mic-head" />
          <span className="pir-mic-stem" />
        </div>
        {revealed && src && !imgErr ? (
          <img src={src} alt={contestant.name} className="pir-avatar"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="pir-avatar pir-avatar-placeholder">
            {revealed ? contestant.name[0].toUpperCase() : "?"}
          </div>
        )}
        <div className="pir-podium-nameplate">
          <div className="pir-podium-name">{revealed ? contestant.name : "???"}</div>
        </div>
      </div>
      <div className="pir-podium-console">
        <div className="pir-led dim">$ — — —</div>
      </div>
    </div>
  );
}
