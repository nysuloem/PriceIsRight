import { useEffect, useRef, useState } from "react";
import { THEME_B64 } from "./themeMusic.js";
import { ttsUrl, playerPhotoUrl } from "./api.js";

// ---------------------------------------------------------------------------
// OpeningSequence — the one and only intro. No other opening exists.
//
// Flow:
//   Theme music starts → each contestant called one by one (human AND AI),
//   face/avatar appears as their name is called → "You are the first N
//   contestants on The Price is Right!" → music swells → "And now... the
//   star of The Price is Right... [hostName]!" → host name on screen → done.
//
// Props:
//   contestants    — full lineup array (built by server): { id, name, isAI, photo }
//   roomCode       — needed to build human photo URLs
//   hostName       — e.g. "Robbie Archer"
//   announcerVoice — OpenAI voice for announcer (default "echo")
//   onDone         — called when sequence ends
// ---------------------------------------------------------------------------

export default function OpeningSequence({ contestants, roomCode, hostName, announcerVoice = "echo", onDone }) {
  const [revealed, setRevealed] = useState([]); // indices of contestants revealed so far
  const [showHost, setShowHost] = useState(false);
  const [hostPop, setHostPop] = useState(false);
  const themeRef = useRef(null);
  const voiceRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const theme = themeRef.current;
    theme.src = THEME_B64;
    theme.volume = 0.3;
    theme.loop = true;
    theme.play().catch(() => {});

    runSequence().catch(console.error);

    return () => { theme.pause(); theme.src = ""; };
  }, []);

  function speak(text) {
    return new Promise(resolve => {
      const el = voiceRef.current;
      let fired = false;
      const fire = () => { if (fired) return; fired = true; resolve(); };
      el.src = ttsUrl(text, announcerVoice, "announcer");
      el.volume = 1.0;
      el.onended = fire;
      el.onerror = () => setTimeout(fire, 1500);
      el.play().catch(() => setTimeout(fire, 1500));
    });
  }

  function wait(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async function runSequence() {
    await wait(600); // let music breathe first

    // Call every contestant — human and AI alike
    for (let i = 0; i < contestants.length; i++) {
      const c = contestants[i];
      // Reveal their face first, then speak
      setRevealed(prev => [...prev, i]);
      await wait(200); // brief flash before voice
      await speak(`${c.name}... come on down!`);
      await wait(250);
    }

    // Group line
    const count = contestants.length;
    const numWord = ["","one","two","three","four","five","six","seven","eight"][count] || String(count);
    await speak(`You are the first ${numWord} contestant${count !== 1 ? "s" : ""} on The Price is Right!`);

    // Swell music for host reveal
    await wait(600);
    themeRef.current.volume = 0.65;

    await speak(`And now... the star of The Price is Right...`);

    // Host name appears
    setShowHost(true);
    await wait(120);
    setHostPop(true);

    await speak(`${hostName}!`);
    await wait(1800);

    // Fade music out
    const theme = themeRef.current;
    const fade = setInterval(() => {
      if (theme.volume > 0.04) {
        theme.volume = Math.max(0, theme.volume - 0.04);
      } else {
        theme.pause();
        clearInterval(fade);
      }
    }, 60);

    await wait(1000);
    onDone();
  }

  // Photo src: human players fetched from server, AI get DiceBear URL
  function photoSrc(c) {
    if (c.isAI) return c.photo; // DiceBear URL already in state
    return playerPhotoUrl(roomCode, c.id);
  }

  const cols = Math.min(contestants.length, 4);

  if (showHost) {
    return (
      <div className="pir-opening">
        <audio ref={themeRef} style={{ display: "none" }} />
        <audio ref={voiceRef} style={{ display: "none" }} />
        <div className={`pir-host-reveal ${hostPop ? "visible" : ""}`}>
          <div className="pir-host-label">The Star of The Price is Right</div>
          <div className="pir-host-name">{hostName}</div>
          <div className="pir-host-sparkles">✦ ✦ ✦</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pir-opening">
      <audio ref={themeRef} style={{ display: "none" }} />
      <audio ref={voiceRef} style={{ display: "none" }} />

      <div className="pir-opening-logo">
        <div className="pir-opening-title">Come On Down!</div>
        <div className="pir-opening-sub">The Price is Right</div>
      </div>

      <div className="pir-opening-podiums"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {contestants.slice(0, 4).map((c, i) => {
          const isRevealed = revealed.includes(i);
          const src = photoSrc(c);
          return (
            <div key={i} className={`pir-opening-podium${isRevealed ? " lit" : ""}`}>
              <div className="pir-opening-avatar-wrap">
                {isRevealed && src ? (
                  <img
                    src={src}
                    alt={c.name}
                    className="pir-opening-photo"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextSibling.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="pir-opening-avatar" style={{ display: isRevealed && src ? "none" : "flex" }}>
                  {isRevealed ? c.name[0].toUpperCase() : "?"}
                </div>
              </div>
              <div className="pir-opening-name">
                {isRevealed ? c.name : "???"}
              </div>
              <div className="pir-led dim">$ — — —</div>
            </div>
          );
        })}
      </div>

      {/* If more than 4 contestants, show remaining in a second row */}
      {contestants.length > 4 && (
        <div className="pir-opening-podiums"
          style={{ gridTemplateColumns: `repeat(${Math.min(contestants.length - 4, 4)}, 1fr)`, marginTop: 10 }}>
          {contestants.slice(4).map((c, i) => {
            const idx = i + 4;
            const isRevealed = revealed.includes(idx);
            const src = photoSrc(c);
            return (
              <div key={idx} className={`pir-opening-podium${isRevealed ? " lit" : ""}`}>
                <div className="pir-opening-avatar-wrap">
                  {isRevealed && src ? (
                    <img src={src} alt={c.name} className="pir-opening-photo"
                      onError={(e) => { e.target.style.display = "none"; e.target.nextSibling.style.display = "flex"; }} />
                  ) : null}
                  <div className="pir-opening-avatar" style={{ display: isRevealed && src ? "none" : "flex" }}>
                    {isRevealed ? c.name[0].toUpperCase() : "?"}
                  </div>
                </div>
                <div className="pir-opening-name">{isRevealed ? c.name : "???"}</div>
                <div className="pir-led dim">$ — — —</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
