import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Maximize2, Volume2 } from "lucide-react";
import HostView from "./HostView.jsx";
import PlayerView from "./PlayerView.jsx";
import { getState } from "./api.js";

export default function RemotePlayView({ code, navigate }) {
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showExpanded, setShowExpanded] = useState(false);
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

  const unlockSound = () => window.dispatchEvent(new Event("pir:unlock-audio"));
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
    <div className={`pir-remote-root ${showExpanded ? "show-expanded" : ""}`} onPointerDownCapture={unlockSound}>
      <header className="pir-remote-toolbar">
        <div><b>REMOTE PLAY</b><span>Room {code}</span></div>
        <div>
          <button onClick={copyInvite}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Invite"}</button>
          <button onClick={() => setShowExpanded((value) => !value)}><Maximize2 size={16} />{showExpanded ? "Controls" : "Show"}</button>
        </div>
      </header>
      <div className="pir-remote-sound"><Volume2 size={15} /> Sound plays on every device. Keep this page open.</div>
      <section className="pir-remote-show" aria-label="The Price Is Right show screen">
        <HostView code={code} remoteMode controller={isController} embedded />
      </section>
      {!showExpanded && (
        <section className="pir-remote-controls" aria-label="Your contestant controls">
          <PlayerView code={code} navigate={navigate} embedded remoteMode />
        </section>
      )}
      {error && <div className="pir-error pir-remote-error">{error}</div>}
    </div>
  );
}
