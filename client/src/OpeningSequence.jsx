import { useEffect, useRef, useState } from "react";
import { ttsUrl, playerPhotoUrl } from "./api.js";

// ---------------------------------------------------------------------------
// OpeningSequence
//
// Flow:
//  1. Theme music starts
//  2. Announcer: "Get ready for television's most fantastic hour of prizes —
//     The Price is Right!"
//  3. Each contestant called one by one — face pops in as name is called
//  4. Announcer: "And now... here's your host!"
//  5. Theme fades → onDone()
//
// The host then takes over via the game's TTS loop (itemIntro, prompt, etc.)
// ---------------------------------------------------------------------------

export default function OpeningSequence({
  contestants,
  roomCode,
  announcerVoice = "onyx",
  hostVoice = "coral",
  onDone,
}) {
  const [revealed, setRevealed] = useState([]);
  const themeRef = useRef(null);
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

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function fadeTheme(theme) {
    return new Promise(resolve => {
      const fade = setInterval(() => {
        if (theme && theme.volume > 0.04) {
          theme.volume = Math.max(0, theme.volume - 0.04);
        } else {
          if (theme) theme.pause();
          clearInterval(fade);
          resolve();
        }
      }, 60);
    });
  }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  async function runSequence() {
    // 1. Start theme — load lazily so it doesn't block page render
    const theme = themeRef.current;
    if (theme) {
      try {
        const { THEME_B64 } = await import("./themeMusic.js");
        theme.src = THEME_B64;
        theme.volume = 0.28;
        theme.loop = true;
        await theme.play().catch(() => {});
      } catch (err) {
        console.warn("[OpeningSequence] theme music failed to load:", err.message);
      }
    }
    await wait(600);

    // 2. Opening line
    await announce("Get ready for television's most fantastic hour of prizes — The Price is Right!");
    await wait(300);

    // 3. Call each contestant
    for (let i = 0; i < contestants.length; i++) {
      const c = contestants[i];
      setRevealed(prev => [...prev, i]);
      await wait(100);
      await announce(`${c.name}... come on down!`);
      await wait(200);
    }

    await wait(400);

    await announce("You are the first four contestants on The Price Is Right!");
    await wait(350);

    // 4. Hand off to host
    await announce("And now... here's your host!");
    await wait(300);

    // 5. Fade music and finish — host TTS takes over from here
    await fadeTheme(theme);
    await wait(300);
    finish();
  }

  function photoSrc(c) {
    return c.isAI ? c.photo : playerPhotoUrl(roomCode, c.id);
  }

  return (
    <div className="pir-opening">
      <audio ref={themeRef} style={{ display: "none" }} />
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
