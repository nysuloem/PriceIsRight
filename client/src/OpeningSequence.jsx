import { useEffect, useRef, useState } from "react";
import { THEME_B64 } from "./themeMusic.js";
import { HOST_VIDEO_B64 } from "./hostVideo.js";
import { ttsUrl, playerPhotoUrl } from "./api.js";

// ---------------------------------------------------------------------------
// OpeningSequence
//
// Flow:
//  1. Theme music starts
//  2. Each contestant called one by one (humans first, then AI) — face pops
//     in as their name is called: "[Name]... come on down!"
//  3. "You are the first N contestants on The Price is Right!"
//  4. Host intro VIDEO plays fullscreen (with its own audio) — theme fades
//  5. onDone() → game begins
//
// Props:
//   contestants     — full lineup from server (humans + AI already merged)
//   roomCode        — for human photo URLs
//   announcerVoice  — OpenAI voice (default "echo")
//   onDone          — called when sequence finishes
// ---------------------------------------------------------------------------

export default function OpeningSequence({ contestants, roomCode, announcerVoice = "echo", onDone }) {
  const [revealed, setRevealed] = useState([]);     // contestant indices revealed so far
  const [showVideo, setShowVideo] = useState(false); // host video phase
  const themeRef = useRef(null);
  const voiceRef = useRef(null);
  const videoRef = useRef(null);
  const startedRef = useRef(false);
  const doneRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    runSequence().catch((err) => {
      console.error("[OpeningSequence] error:", err);
      finish(); // don't leave game stuck if something breaks
    });
  }, []);

  // When showVideo becomes true, the <video> element is in the DOM — play it
  useEffect(() => {
    if (!showVideo || !videoRef.current) return;
    const vid = videoRef.current;
    // Fade theme out while video plays
    const theme = themeRef.current;
    if (theme) {
      const fade = setInterval(() => {
        if (theme.volume > 0.05) theme.volume = Math.max(0, theme.volume - 0.05);
        else { theme.pause(); clearInterval(fade); }
      }, 60);
    }
    vid.play().catch(() => finish()); // if video can't play, just finish
  }, [showVideo]);

  function speak(text) {
    return new Promise((resolve) => {
      const el = voiceRef.current;
      if (!el) { resolve(); return; }
      let fired = false;
      const fire = () => { if (fired) return; fired = true; resolve(); };
      el.src = ttsUrl(text, announcerVoice, "announcer");
      el.volume = 1.0;
      el.onended = fire;
      el.onerror = () => setTimeout(fire, 1500);
      el.play().catch(() => setTimeout(fire, 1500));
    });
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function finish() {
    if (doneRef.current) return;
    doneRef.current = true;
    onDone();
  }

  async function runSequence() {
    // Start theme music
    const theme = themeRef.current;
    if (theme) {
      theme.src = THEME_B64;
      theme.volume = 0.3;
      theme.loop = true;
      await theme.play().catch(() => {});
    }

    await wait(700);

    // Call every contestant — humans first (already ordered by server), then AI
    for (let i = 0; i < contestants.length; i++) {
      const c = contestants[i];
      setRevealed(prev => [...prev, i]);
      await wait(150);
      await speak(`${c.name}... come on down!`);
      await wait(200);
    }

    // Group line — only say it if there are actually contestants
    if (contestants.length > 0) {
      const numWords = ["","one","two","three","four","five","six","seven","eight"];
      const n = contestants.length;
      const numWord = numWords[n] || String(n);
      await speak(`You are the first ${numWord} contestant${n !== 1 ? "s" : ""} on The Price is Right!`);
    }

    await wait(400);

    // Switch to host video
    setShowVideo(true);
  }

  function photoSrc(c) {
    return c.isAI ? c.photo : playerPhotoUrl(roomCode, c.id);
  }

  const cols = Math.min(contestants.length, 4);

  // ── Host video phase ──────────────────────────────────────────────────────
  if (showVideo) {
    return (
      <div className="pir-opening pir-video-phase">
        <audio ref={themeRef} style={{ display: "none" }} />
        <audio ref={voiceRef} style={{ display: "none" }} />
        <video
          ref={videoRef}
          src={HOST_VIDEO_B64}
          playsInline
          className="pir-host-video"
          onEnded={finish}
          onError={finish}
        />
      </div>
    );
  }

  // ── Contestant calling phase ──────────────────────────────────────────────
  return (
    <div className="pir-opening">
      <audio ref={themeRef} style={{ display: "none" }} />
      <audio ref={voiceRef} style={{ display: "none" }} />

      <div className="pir-opening-logo">
        <div className="pir-opening-title">Come On Down!</div>
        <div className="pir-opening-sub">The Price is Right</div>
      </div>

      {contestants.length === 0 ? (
        <p style={{ color: "var(--muted)", textAlign: "center" }}>
          Building the lineup…
        </p>
      ) : (
        <>
          <div
            className="pir-opening-podiums"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {contestants.slice(0, 4).map((c, i) => (
              <ContestantPodium
                key={c.id}
                contestant={c}
                revealed={revealed.includes(i)}
                src={photoSrc(c)}
              />
            ))}
          </div>

          {contestants.length > 4 && (
            <div
              className="pir-opening-podiums"
              style={{
                gridTemplateColumns: `repeat(${Math.min(contestants.length - 4, 4)}, 1fr)`,
                marginTop: 10,
              }}
            >
              {contestants.slice(4).map((c, i) => (
                <ContestantPodium
                  key={c.id}
                  contestant={c}
                  revealed={revealed.includes(i + 4)}
                  src={photoSrc(c)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContestantPodium({ contestant, revealed, src }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className={`pir-opening-podium${revealed ? " lit" : ""}`}>
      <div className="pir-opening-avatar-wrap">
        {revealed && src && !imgErr ? (
          <img
            src={src}
            alt={contestant.name}
            className="pir-opening-photo"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="pir-opening-avatar">
            {revealed ? contestant.name[0].toUpperCase() : "?"}
          </div>
        )}
      </div>
      <div className="pir-opening-name">
        {revealed ? contestant.name : "???"}
      </div>
      <div className="pir-led dim">$ — — —</div>
    </div>
  );
}
