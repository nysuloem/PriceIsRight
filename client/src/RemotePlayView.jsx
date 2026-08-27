import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Maximize2, Volume2 } from "lucide-react";
import HostView, { unlockSoundEffects } from "./HostView.jsx";
import PlayerView from "./PlayerView.jsx";
import { getState } from "./api.js";

export default function RemotePlayView({ code, navigate }) {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
  const [soundReady, setSoundReady] = useState(false);
  const isController = useMemo(
    () => localStorage.getItem(`pir_remote_host_${code}`) === "true",
    [code]
  );
  const inviteUrl = `${window.location.origin}/remote/${code}`;

  useEffect(() => {
    let stopped = false;
    getState(code)
      .then((state) => {
        if (stopped) return;
        if (state.playMode !== "remote") {
          navigate(`/play/${code}`);
          return;
        }
        setRoom(state);
      })
      .catch((e) => !stopped && setError(e.message));
    return () => { stopped = true; };
  }, [code, navigate]);

  const enableSound = () => {
    // This deliberate tap happens before the show mounts. On iOS, trying to
    // unlock audio from a scroll gesture can steal audio focus from the host
    // narration and strand the game on the current phase.
    let settled = false;
    let silent;
    const startShow = () => {
      if (settled) return;
      settled = true;
      if (silent) {
        silent.pause();
        silent.removeAttribute("src");
      }
      setSoundReady(true);
    };
    try {
      silent = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
      silent.volume = 0.01;
      silent.play().then(startShow).catch(startShow);
      setTimeout(startShow, 800);
    } catch { startShow(); }
    unlockSoundEffects();
  };
  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(`Share this link: ${inviteUrl}`);
    }
  };

  if (!room && !error) return <div className="pir-root pir-loading"><div className="pir-title">Remote Play</div><p>Connecting to room {code}…</p></div>;

  return (
    <div className={`pir-remote-root ${showExpanded ? "show-expanded" : ""}`}>
      <header className="pir-remote-toolbar">
        <div><b>REMOTE PLAY</b><span>Room {code}</span></div>
        <div>
          <button onClick={copyInvite}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Invite"}</button>
          <button onClick={() => setShowExpanded((value) => !value)}><Maximize2 size={16} />{showExpanded ? "Controls" : "Show"}</button>
        </div>
      </header>
      <div className="pir-remote-sound"><Volume2 size={15} /> Sound plays on every device. Keep this page open.</div>
      <section className="pir-remote-show" aria-label="The Price Is Right show screen">
        {soundReady ? <HostView code={code} remoteMode controller={isController} embedded /> : <div className="pir-remote-ready"><Volume2 size={34}/><b>READY TO PLAY?</b><span>Tap once to enable the show sound. Scrolling will not interrupt it.</span><button className="pir-btn" onClick={enableSound}>Start Sound &amp; Show</button></div>}
      </section>
      {soundReady && !showExpanded && (
        <section className="pir-remote-controls" aria-label="Your contestant controls">
          <PlayerView code={code} navigate={navigate} embedded remoteMode />
        </section>
      )}
      {error && <div className="pir-error pir-remote-error">{error}</div>}
    </div>
  );
}
