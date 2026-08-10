import { useState } from "react";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { createPricingGameDemo } from "./api.js";

const GAMES = [
  ["plinko", "Plinko", "Drop three chips into cash slots."],
  ["cliffHangers", "Cliff Hangers", "Price three prizes without sending the climber over the edge."],
  ["punchABunch", "Punch-a-Bunch", "Punch a square to reveal a cash prize."],
  ["diceGame", "Dice Game", "Roll and complete the digits in a car price."],
  ["groceryGame", "Grocery Game", "Shop your way to a total between $20 and $22."],
  ["holeInOne", "Hole in One (or Two)", "Order groceries, move closer, and take your putts."],
  ["clockGame", "Clock Game", "Use higher/lower clues to price two prizes in 30 seconds."],
  ["anyNumber", "Any Number", "Call digits to complete a prize price."],
  ["grandGame", "Grand Game", "Find four grocery products below the target price."],
  ["shellGame", "Shell Game", "Earn shells and find the hidden ball."],
];

export default function PricingGamesLab({ navigate }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const launch = async (type) => {
    setBusy(type); setError("");
    try {
      const demo = await createPricingGameDemo(type);
      localStorage.setItem(`pir_player_${demo.code}`, demo.playerId);
      localStorage.setItem(`pir_name_${demo.code}`, "Game Tester");
      navigate(`/play/${demo.code}`);
    } catch (e) { setError(e.message); setBusy(""); }
  };
  return (
    <div className="pir-root pir-games-lab">
      <button className="pir-btn secondary small" onClick={() => navigate("/")}><ArrowLeft size={15} /> Main Screen</button>
      <h1 className="pir-title">Test Pricing Games</h1>
      <p className="pir-helptext">Choose any game to start a private practice round. No contestants or bidding required.</p>
      <div className="pir-game-picker">
        {GAMES.map(([type, title, description]) => (
          <button key={type} disabled={!!busy} onClick={() => launch(type)}>
            <Gamepad2 size={24} /><span><b>{title}</b><small>{description}</small></span>
            {busy === type && <em>Loading…</em>}
          </button>
        ))}
      </div>
      {error && <div className="pir-error">{error}</div>}
    </div>
  );
}
