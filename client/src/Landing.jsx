import { useState } from "react";
import { Tv, Smartphone } from "lucide-react";
import { createRoom, joinRoom } from "./api.js";

export default function Landing({ navigate }) {
  const [joinCode, setJoinCode] = useState("");
  const [name, setName] = useState("");
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

  const joinGame = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const code = joinCode.trim().toUpperCase();
      const data = await joinRoom(code, name.trim());
      localStorage.setItem(`pir_player_${code}`, data.playerId);
      localStorage.setItem(`pir_name_${code}`, name.trim());
      navigate(`/play/${code}`);
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
          Put this on a laptop or TV — it'll show a room code for players to join.
        </p>

        <div className="pir-divider">or join on your phone</div>

        <form onSubmit={joinGame} className="pir-join-form">
          <input
            placeholder="Room code"
            value={joinCode}
            maxLength={4}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          />
          <input
            placeholder="Your name"
            value={name}
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="pir-btn secondary" disabled={busy} type="submit">
            <Smartphone size={18} /> Join Game
          </button>
        </form>

        {error && <div className="pir-error">{error}</div>}
      </div>
    </div>
  );
}
