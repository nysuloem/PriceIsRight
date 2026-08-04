import { useEffect, useRef, useState } from "react";
import { THEME_B64 } from "./themeMusic.js";
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
  announcerVoice = "echo",
  hostVoice = "echo",
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
    // 1. Start theme
    const theme = themeRef.current;
    if (theme) {
      theme.src = THEME_B64;
      theme.volume = 0.28;
      theme.loop = true;
      await theme.play().catch(() => {});
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

  const cols = Math.min(contestants.length, 4);

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
        <>
          <div className="pir-opening-podiums"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
            {contestants.slice(0, 4).map((c, i) => (
              <ContestantPodium key={c.id} contestant={c}
                revealed={revealed.includes(i)} src={photoSrc(c)} />
            ))}
          </div>
          {contestants.length > 4 && (
            <div className="pir-opening-podiums"
              style={{ gridTemplateColumns: `repeat(${Math.min(contestants.length - 4, 4)}, 1fr)`, marginTop: 10 }}>
              {contestants.slice(4).map((c, i) => (
                <ContestantPodium key={c.id} contestant={c}
                  revealed={revealed.includes(i + 4)} src={photoSrc(c)} />
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
          <img src={src} alt={contestant.name} className="pir-opening-photo"
            onError={() => setImgErr(true)} />
        ) : (
          <div className="pir-opening-avatar">
            {revealed ? contestant.name[0].toUpperCase() : "?"}
          </div>
        )}
      </div>
      <div className="pir-opening-name">{revealed ? contestant.name : "???"}</div>
      <div className="pir-led dim">$ — — —</div>
    </div>
  );
}
