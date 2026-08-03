import { useEffect, useRef, useState } from "react";
import { THEME_B64 } from "./themeMusic.js";
import { ttsUrl } from "./api.js";

// ---------------------------------------------------------------------------
// OpeningSequence
//
// Full Price is Right cold open:
//   1. Theme music starts immediately
//   2. Announcer (echo voice) calls each contestant: "[Name]... come on down!"
//      — podium flashes gold as each name is called
//   3. "You are the first [N] contestants on The Price is Right!"
//   4. Brief musical pause
//   5. "And now... the star of The Price is Right..."
//   6. HOST NAME slams onto screen in giant gold text
//   7. onDone() fires → game starts
//
// Props:
//   players      — array of { id, name } human players (may be empty)
//   hostName     — e.g. "Robbie Archer"
//   announcerVoice — OpenAI voice for the announcer (default "echo")
//   onDone       — called when opening finishes
// ---------------------------------------------------------------------------

export default function OpeningSequence({ players, hostName, announcerVoice = "echo", onDone }) {
  const [litPodiums, setLitPodiums] = useState([]);   // indices of lit podiums
  const [showHost, setShowHost] = useState(false);     // host name reveal
  const [hostVisible, setHostVisible] = useState(false); // animation trigger
  const themeRef = useRef(null);   // theme music element
  const voiceRef = useRef(null);   // TTS voice element
  const doneRef = useRef(false);

  useEffect(() => {
    // Start theme music immediately at low volume (will play under voice)
    const theme = themeRef.current;
    theme.src = THEME_B64;
    theme.volume = 0.35;
    theme.loop = true;
    theme.play().catch(() => {});

    // Run the announcing sequence
    runSequence();

    return () => {
      theme.pause();
      theme.src = "";
    };
  }, []);

  function speakTTS(text, voice, onDone) {
    const el = voiceRef.current;
    let fired = false;
    const fire = () => { if (fired) return; fired = true; onDone(); };
    el.src = ttsUrl(text, voice);
    el.volume = 1.0;
    el.onended = fire;
    el.onerror = () => setTimeout(fire, 1500);
    el.play().catch(() => setTimeout(fire, 1500));
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function speak(text, voice) {
    return new Promise(resolve => speakTTS(text, voice, resolve));
  }

  async function runSequence() {
    // Small pause for music to kick in
    await wait(800);

    // Call each human contestant
    const count = players.length;
    for (let i = 0; i < count; i++) {
      const name = players[i].name;
      setLitPodiums(prev => [...prev, i]);
      await speak(`${name}... come on down!`, announcerVoice);
      await wait(300);
    }

    // "You are the first N contestants on The Price is Right!"
    if (count > 0) {
      const numWord = ["", "one", "two", "three", "four", "five", "six", "seven", "eight"][count] || count.toString();
      await speak(
        `You are the first ${numWord} contestant${count !== 1 ? "s" : ""} on The Price is Right!`,
        announcerVoice
      );
    } else {
      await speak("Welcome to The Price is Right!", announcerVoice);
    }

    // Musical pause — let the theme breathe
    await wait(1200);

    // Swell volume for host reveal
    const theme = themeRef.current;
    theme.volume = 0.7;

    // Announcer intro
    await speak(`And now... the star of The Price is Right...`, announcerVoice);

    // Host name reveal
    setShowHost(true);
    await wait(100);
    setHostVisible(true);

    // Shout the host name
    await speak(hostName + "!", announcerVoice);

    // Let music play for a moment
    await wait(1800);

    // Fade theme out
    const fadeInterval = setInterval(() => {
      if (theme.volume > 0.05) {
        theme.volume = Math.max(0, theme.volume - 0.05);
      } else {
        theme.pause();
        clearInterval(fadeInterval);
      }
    }, 80);

    await wait(1200);

    if (!doneRef.current) {
      doneRef.current = true;
      onDone();
    }
  }

  const slots = Math.max(4, Math.min(players.length, 4));

  return (
    <div className="pir-opening">
      <audio ref={themeRef} style={{ display: "none" }} />
      <audio ref={voiceRef} style={{ display: "none" }} />

      {!showHost ? (
        <>
          <div className="pir-opening-logo">
            <div className="pir-opening-title">Come On Down!</div>
            <div className="pir-opening-sub">The Price is Right</div>
          </div>

          <div className="pir-opening-podiums"
            style={{ gridTemplateColumns: `repeat(${slots}, 1fr)` }}>
            {Array.from({ length: slots }).map((_, i) => {
              const lit = litPodiums.includes(i);
              const p = players[i];
              return (
                <div key={i} className={`pir-opening-podium${lit ? " lit" : ""}`}>
                  <div className="pir-opening-avatar">
                    {lit && p ? p.name[0].toUpperCase() : "?"}
                  </div>
                  <div className="pir-opening-name">
                    {lit && p ? p.name : "???"}
                  </div>
                  <div className="pir-led dim">$ — — —</div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className={`pir-host-reveal ${hostVisible ? "visible" : ""}`}>
          <div className="pir-host-label">The Star of The Price is Right</div>
          <div className="pir-host-name">{hostName}</div>
          <div className="pir-host-sparkles">✦ ✦ ✦</div>
        </div>
      )}
    </div>
  );
}
