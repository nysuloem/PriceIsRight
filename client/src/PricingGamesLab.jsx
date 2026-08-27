import { useState } from "react";
import { ArrowLeft, Gamepad2 } from "lucide-react";
import { createPricingGameDemo } from "./api.js";

const GAMES = [
  ["plinko", "Plinko", "Start with one free chip, earn up to four more, and play for as much as $50,000."],
  ["cliffHangers", "Cliff Hangers", "Price three prizes without sending the climber over the edge."],
  ["punchABunch", "Punch-a-Bunch", "Earn up to three punches, then choose whether to keep the cash."],
  ["diceGame", "Dice Game", "Roll and complete the digits in a car price."],
  ["groceryGame", "Grocery Game", "Shop your way to a total between $20 and $22."],
  ["oneAway", "One Away", "Change every car-price digit one higher or lower."],
  ["clockGame", "Clock Game", "Use higher/lower clues to price two prizes in 90 seconds."],
  ["anyNumber", "Any Number", "Call digits to complete a prize price."],
  ["grandGame", "Grand Game", "Find four grocery products below the target price."],
  ["shellGame", "Shell Game", "Earn shells and find the hidden ball."],
  ["moneyGame", "Money Game", "Find the first and last pairs in a new car's price."],
  ["luckySeven", "Lucky Seven", "Keep at least one dollar while completing a new car's price."],
  ["doublePrices", "Double Prices", "Choose the correct of two prices for a grand prize."],
  ["threeStrikes", "3 Strikes", "Place all five car-price digits before drawing three strikes."],
  ["switchGame", "Switch?", "Decide whether two prize prices should stay or switch."],
  ["tenChances", "10 Chances", "Use ten total attempts to price two prizes and a new car."],
  ["pickAPair", "Pick-a-Pair", "Find two grocery products with exactly the same price."],
  ["balanceGame", "Balance Game", "Choose two money bags that balance with the grand prize."],
  ["holeInOne", "Hole in One (or Two)", "Order six groceries, earn a closer putting line, and time the perfect putt."],
  ["masterKey", "Master Key", "Price two small prizes, earn keys, and try them in three giant prize locks."],
  ["secretX", "Secret X", "Earn and place Xs, then reveal the hidden centre-column X."],
];

export default function PricingGamesLab({ navigate }) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const launch = async (type) => {
    setBusy(type); setError("");
    try {
      const demo = await createPricingGameDemo(type);
      navigate(`/host/${demo.code}`);
    } catch (e) { setError(e.message); setBusy(""); }
  };
  return (
    <div className="pir-root pir-games-lab">
      <button className="pir-btn secondary small" onClick={() => navigate("/")}><ArrowLeft size={15} /> Main Screen</button>
      <h1 className="pir-title">Test Pricing Games</h1>
      <p className="pir-helptext">Choose a game for the main screen, then scan its QR code and make the contestant's choices on your phone.</p>
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
