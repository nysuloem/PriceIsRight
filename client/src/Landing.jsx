import { useState } from "react";
import { Gamepad2, Tv } from "lucide-react";
import { createRoom } from "./api.js";

export default function Landing({ navigate }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const hostGame = async () => {
    setBusy(true);
    setError("");
    try {
      const { code } = await createRoom();
      navigate(`/host/${code}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pir-landing">
      <div className="pir-landing-card">
        <h1 className="pir-title">Come On Down!</h1>
        <div className="pir-subtitle">The Bidding Game</div>

        <button className="pir-btn" disabled={busy} onClick={hostGame}>
          <Tv size={18} /> Host on This Screen
        </button>
        <p className="pir-helptext">
          Put this on a laptop or TV. Players join by scanning the QR code shown next.
        </p>

        <button className="pir-btn secondary" disabled={busy} onClick={() => navigate("/games")}>
          <Gamepad2 size={18} /> Test Pricing Games
        </button>
        <p className="pir-helptext">Try any pricing game instantly without starting a full show.</p>

        {error && <div className="pir-error">{error}</div>}
      </div>
    </div>
  );
}
