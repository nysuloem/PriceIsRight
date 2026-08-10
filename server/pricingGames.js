const SMALL_ITEMS = [
  { name: "Coffee filters", price: 6 }, { name: "Travel mug", price: 18 },
  { name: "Toaster", price: 42 }, { name: "Hair dryer", price: 36 },
  { name: "Desk lamp", price: 29 }, { name: "Electric kettle", price: 55 },
  { name: "Blender", price: 68 }, { name: "Throw blanket", price: 32 },
  { name: "Board game", price: 27 }, { name: "Bluetooth speaker", price: 74 },
];

const GROCERIES = [
  { name: "Pasta sauce", price: 4.79 }, { name: "Cereal", price: 6.49 },
  { name: "Dish soap", price: 3.69 }, { name: "Peanut butter", price: 5.99 },
  { name: "Frozen pizza", price: 7.49 }, { name: "Coffee", price: 9.99 },
  { name: "Crackers", price: 3.29 }, { name: "Shampoo", price: 8.49 },
];

const GAME_NAMES = [
  "plinko", "cliffHangers", "punchABunch", "diceGame", "groceryGame",
  "holeInOne", "clockGame", "anyNumber", "grandGame", "shellGame",
];

const pick = (items) => items[Math.floor(Math.random() * items.length)];
const shuffle = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const money = (n) => `$${Number(n).toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;

function base(type, title, playerId, playerName, instructions) {
  return { type, title, playerId, playerName, instructions, status: "playing", result: "", winnings: 0, history: [] };
}

function makePlinko(player) {
  return { ...base("plinko", "PLINKO", player.id, player.name, "Drop three chips. Each chip bounces into a cash slot."),
    chipsLeft: 3, slots: [100, 500, 1000, 0, 10000, 0, 1000, 500, 100], prompt: "Choose where to drop chip 1.", mode: "choice",
    options: ["1", "2", "3", "4", "5", "6", "7", "8", "9"] };
}

function makeCliff(player) {
  const items = shuffle(SMALL_ITEMS).slice(0, 3);
  return { ...base("cliffHangers", "CLIFF HANGERS", player.id, player.name, "Price three small prizes. Every dollar you miss moves the climber one step; 25 steps is the limit."),
    items: items.map(({ name }) => ({ name })), _prices: items.map(i => i.price), itemIndex: 0, climber: 0,
    prompt: `What is the price of the ${items[0].name}?`, mode: "number" };
}

function makePunch(player) {
  return { ...base("punchABunch", "PUNCH-A-BUNCH", player.id, player.name, "Pick one square and punch through it to reveal your cash prize."),
    prompt: "Choose a square to punch!", mode: "choice", options: Array.from({ length: 16 }, (_, i) => String(i + 1)),
    _values: shuffle([100,100,250,250,500,500,500,1000,1000,2500,2500,5000,5000,10000,25000,50000]) };
}

function makeDice(player) {
  const digits = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6));
  return { ...base("diceGame", "DICE GAME", player.id, player.name, "Roll for each hidden digit. If the roll is not exact, decide whether the correct digit is higher or lower."),
    firstDigit: 3, _digits: digits, revealed: [null, null, null, null], digitIndex: 0, stage: "roll",
    prompt: "Roll the first die.", mode: "choice", options: ["Roll"] };
}

function makeGrocery(player) {
  const items = shuffle(GROCERIES).slice(0, 5);
  return { ...base("groceryGame", "GROCERY GAME", player.id, player.name, "Buy quantities of grocery items. Win by reaching $20–$22 without going over."),
    items: items.map(i => ({ name: i.name, used: false })), _prices: items.map(i => i.price), total: 0,
    prompt: "Choose an item.", mode: "choice", options: items.map((i, n) => `${n + 1}. ${i.name}`), stage: "item" };
}

function makeHole(player) {
  const items = shuffle(GROCERIES).slice(0, 6);
  return { ...base("holeInOne", "HOLE IN ONE (OR TWO)", player.id, player.name, "Put the six items in ascending price order to move closer, then take up to two putts."),
    items: items.map((i, index) => ({ id: index, name: i.name })), _prices: items.map(i => i.price),
    prompt: "Tap the products from least to most expensive.", mode: "order", stage: "order", attempts: 2 };
}

function makeClock(player) {
  const items = shuffle(SMALL_ITEMS.filter(i => i.price >= 25)).slice(0, 2);
  return { ...base("clockGame", "CLOCK GAME", player.id, player.name, "You have 30 seconds to price two prizes. After every guess, the host tells you higher or lower."),
    items: items.map(i => ({ name: i.name })), _prices: items.map(i => i.price), itemIndex: 0, _startedAt: Date.now(),
    prompt: `Guess the price of the ${items[0].name}.`, mode: "number", clue: "30 seconds starts now!", secondsLeft: 30 };
}

function makeAnyNumber(player) {
  const car = [3, ...shuffle([0,1,2,4,5,6,7,8,9]).slice(0, 4)];
  const remaining = shuffle([0,1,2,4,5,6,7,8,9].filter(d => !car.slice(1).includes(d)));
  const small = remaining.slice(0, 3); const pig = remaining.slice(3, 5);
  return { ...base("anyNumber", "ANY NUMBER", player.id, player.name, "Call digits. You win the first price you completely reveal."),
    boards: [{ label: "Car", cells: [3,null,null,null,null] }, { label: "Prize", cells: [null,null,null] }, { label: "Piggy Bank", cells: [null,null] }],
    _answers: [car, small, pig], usedDigits: [3], prompt: "Choose a digit.", mode: "choice", options: [0,1,2,4,5,6,7,8,9].map(String) };
}

function makeGrand(player) {
  const target = 6;
  const cheap = shuffle(GROCERIES.filter(i => i.price < target)).slice(0, 4);
  const pricey = shuffle(GROCERIES.filter(i => i.price >= target)).slice(0, 2);
  const items = shuffle([...cheap, ...pricey]);
  return { ...base("grandGame", "GRAND GAME", player.id, player.name, "Pick the four products priced below the target. Each correct pick multiplies your money by ten."),
    target, items: items.map(i => ({ name: i.name, selected: false })), _prices: items.map(i => i.price),
    prompt: `Pick a product under ${money(target)}.`, mode: "choice", options: items.map((i,n) => `${n + 1}. ${i.name}`), correct: 0, winnings: 1 };
}

function makeShell(player) {
  const items = shuffle(SMALL_ITEMS).slice(0, 3);
  const displayed = items.map((item, i) => item.price + (i % 2 ? -8 : 9));
  return { ...base("shellGame", "SHELL GAME", player.id, player.name, "Win shells by deciding whether each small prize is higher or lower than its shown price, then find the hidden ball."),
    items: items.map((i,n) => ({ name: i.name, shownPrice: displayed[n] })), _prices: items.map(i => i.price), itemIndex: 0, shells: 0,
    _ball: Math.floor(Math.random() * 4), prompt: `${items[0].name}: higher or lower than ${money(displayed[0])}?`, mode: "choice", options: ["Higher", "Lower"], stage: "prices" };
}

const FACTORIES = { plinko: makePlinko, cliffHangers: makeCliff, punchABunch: makePunch, diceGame: makeDice,
  groceryGame: makeGrocery, holeInOne: makeHole, clockGame: makeClock, anyNumber: makeAnyNumber,
  grandGame: makeGrand, shellGame: makeShell };

export function createPricingGameForType(type, player) {
  if (!FACTORIES[type]) throw new Error(`Unknown pricing game: ${type}`);
  return FACTORIES[type](player);
}

export function createPricingGame(player, previousTypes = []) {
  const available = GAME_NAMES.filter(name => !previousTypes.includes(name));
  const type = pick(available.length ? available : GAME_NAMES);
  return FACTORIES[type](player);
}

function finish(g, won, text, winnings = g.winnings) {
  g.status = won ? "won" : "lost"; g.result = text; g.winnings = winnings; g.mode = "done"; g.options = [];
}

export function playPricingGame(g, action) {
  if (!g || g.status !== "playing") throw new Error("Pricing game is not active");
  const choice = String(action.choice ?? "");
  const value = Math.round(Number(action.value));
  if (g.type === "plinko") {
    const drop = Math.max(0, Math.min(8, Number(choice) - 1));
    const landing = Math.max(0, Math.min(8, drop + Math.floor(Math.random() * 5) - 2));
    const won = g.slots[landing]; g.winnings += won; g.chipsLeft -= 1;
    g.history.push(`Chip landed in ${money(won)}.`);
    if (!g.chipsLeft) finish(g, g.winnings > 0, `You won ${money(g.winnings)} on Plinko!`);
    else g.prompt = `Choose where to drop chip ${4 - g.chipsLeft}.`;
  } else if (g.type === "cliffHangers") {
    if (!Number.isFinite(value)) throw new Error("Enter a price");
    const actual = g._prices[g.itemIndex]; const error = Math.abs(value - actual); g.climber += error;
    g.history.push(`${g.items[g.itemIndex].name}: guessed ${money(value)}, actual ${money(actual)} — ${error} step${error === 1 ? "" : "s"}.`);
    g.itemIndex += 1;
    if (g.climber > 25) finish(g, false, "The climber went over the cliff!");
    else if (g.itemIndex === 3) finish(g, true, `You kept the climber safe at step ${g.climber}!`);
    else g.prompt = `What is the price of the ${g.items[g.itemIndex].name}?`;
  } else if (g.type === "punchABunch") {
    const index = Math.max(0, Math.min(15, Number(choice) - 1));
    const won = g._values[index]; finish(g, true, `Square ${index + 1} held ${money(won)}!`, won);
  } else if (g.type === "diceGame") {
    const target = g._digits[g.digitIndex];
    if (g.stage === "roll") {
      const roll = 1 + Math.floor(Math.random() * 6); g.roll = roll;
      if (roll === target) { g.revealed[g.digitIndex] = target; g.history.push(`Rolled ${roll}: exact!`); g.digitIndex += 1; }
      else { g.stage = "direction"; g.prompt = `You rolled ${roll}. Is the digit higher or lower?`; g.options = roll === 1 ? ["Higher"] : roll === 6 ? ["Lower"] : ["Higher", "Lower"]; return g; }
    } else {
      const correct = choice.toLowerCase() === (target > g.roll ? "higher" : "lower");
      g.history.push(`Rolled ${g.roll}, chose ${choice}: ${correct ? "correct" : `wrong — it was ${target}`}.`);
      if (!correct) return finish(g, false, "That direction was incorrect. The car stays on the lot.");
      g.revealed[g.digitIndex] = target; g.digitIndex += 1; g.stage = "roll";
    }
    if (g.digitIndex === 4) finish(g, true, `You won the ${money(Number(`${g.firstDigit}${g._digits.join("")}`))} car!`);
    else { g.prompt = `Roll die ${g.digitIndex + 1}.`; g.mode = "choice"; g.options = ["Roll"]; }
  } else if (g.type === "groceryGame") {
    if (g.stage === "item") { const index = Number(choice.split(".")[0]) - 1; if (g.items[index]?.used) throw new Error("That item was already used"); g.selected = index; g.stage = "quantity"; g.mode = "number"; g.prompt = `How many ${g.items[index].name} would you like?`; }
    else { const qty = Math.max(1, Math.min(20, value)); const i = g.selected; const add = Number((g._prices[i] * qty).toFixed(2)); g.total = Number((g.total + add).toFixed(2)); g.items[i].used = true; g.history.push(`${qty} × ${g.items[i].name} = ${money(add)}; total ${money(g.total)}.`);
      if (g.total >= 20 && g.total <= 22) finish(g, true, `Perfect shopping! Your total is ${money(g.total)}.`);
      else if (g.total > 22 || g.items.every(x => x.used)) finish(g, false, `Your final total is ${money(g.total)}.`);
      else { g.stage = "item"; g.mode = "choice"; g.options = g.items.map((x,n) => x.used ? null : `${n + 1}. ${x.name}`).filter(Boolean); g.prompt = "Choose another item."; }
    }
  } else if (g.type === "holeInOne") {
    if (g.stage === "order") { const order = Array.isArray(action.order) ? action.order.map(Number) : []; if (new Set(order).size !== 6) throw new Error("Order all six products");
      let correctLinks = 0; for (let i = 1; i < order.length; i += 1) if (g._prices[order[i]] > g._prices[order[i - 1]]) correctLinks += 1;
      g.distance = 6 - correctLinks; g.stage = "putt"; g.mode = "choice"; g.options = ["Left", "Centre", "Right"]; g.prompt = `You are ${g.distance} line${g.distance === 1 ? "" : "s"} away. Aim your first putt.`;
    } else { const chance = Math.max(0.25, 0.9 - g.distance * 0.1); const made = Math.random() < chance; g.history.push(`${choice} putt: ${made ? "in the hole!" : "missed"}.`); g.attempts -= 1;
      if (made) finish(g, true, "Hole in one! You win the grand prize!"); else if (!g.attempts) finish(g, false, "Both putts just missed."); else g.prompt = "Hole in one… or two! Aim your second putt.";
    }
  } else if (g.type === "clockGame") {
    g.secondsLeft = Math.max(0, 30 - Math.floor((Date.now() - g._startedAt) / 1000)); if (!g.secondsLeft) return finish(g, false, "Time is up!");
    if (!Number.isFinite(value)) throw new Error("Enter a price"); const actual = g._prices[g.itemIndex];
    if (value === actual) { g.history.push(`${g.items[g.itemIndex].name}: ${money(actual)} — correct!`); g.itemIndex += 1; if (g.itemIndex === 2) return finish(g, true, `Both prizes won with ${g.secondsLeft} seconds left!`); g.prompt = `Now price the ${g.items[1].name}.`; g.clue = `${g.secondsLeft} seconds left!`; }
    else { g.clue = actual > value ? "Higher!" : "Lower!"; g.prompt = `${g.clue} Guess again — ${g.secondsLeft} seconds left.`; }
  } else if (g.type === "anyNumber") {
    const digit = Number(choice); if (g.usedDigits.includes(digit)) throw new Error("Digit already chosen"); g.usedDigits.push(digit); g.options = g.options.filter(x => Number(x) !== digit);
    for (let b = 0; b < g._answers.length; b += 1) for (let c = 0; c < g._answers[b].length; c += 1) if (g._answers[b][c] === digit) g.boards[b].cells[c] = digit;
    const done = g.boards.findIndex(b => b.cells.every(x => x !== null)); if (done >= 0) finish(g, done === 0, `You completed the ${g.boards[done].label} price!`); else g.prompt = "Choose another digit.";
  } else if (g.type === "grandGame") {
    const index = Number(choice.split(".")[0]) - 1; if (g.items[index]?.selected) throw new Error("Already selected"); g.items[index].selected = true; const actual = g._prices[index];
    g.history.push(`${g.items[index].name}: ${money(actual)}.`); if (actual >= g.target) finish(g, false, `That item was not below ${money(g.target)}.`, g.correct < 4 ? g.winnings : 0);
    else { g.correct += 1; g.winnings *= 10; if (g.correct === 4) finish(g, true, "Four correct products — you won $10,000!", 10000); else { g.options = g.items.map((x,n) => x.selected ? null : `${n + 1}. ${x.name}`).filter(Boolean); g.prompt = `Correct! You have ${money(g.winnings)}. Pick another product under ${money(g.target)}.`; } }
  } else if (g.type === "shellGame") {
    if (g.stage === "prices") { const i = g.itemIndex; const correct = choice.toLowerCase() === (g._prices[i] > g.items[i].shownPrice ? "higher" : "lower"); if (correct) g.shells += 1; g.history.push(`${g.items[i].name}: ${choice} was ${correct ? "correct" : "incorrect"}.`); g.itemIndex += 1;
      if (g.itemIndex === 3) { if (!g.shells) return finish(g, false, "No shells were earned."); g.stage = "shell"; g.prompt = `You earned ${g.shells} chance${g.shells === 1 ? "" : "s"}. Pick a shell.`; g.options = ["1","2","3","4"]; }
      else g.prompt = `${g.items[g.itemIndex].name}: higher or lower than ${money(g.items[g.itemIndex].shownPrice)}?`;
    } else { const hit = Number(choice) - 1 === g._ball; g.shells -= 1; if (hit) finish(g, true, `The ball was under shell ${choice}!`); else if (!g.shells) finish(g, false, `The ball was under shell ${g._ball + 1}.`); else { g.options = g.options.filter(x => x !== choice); g.prompt = `Empty! You have ${g.shells} pick${g.shells === 1 ? "" : "s"} left.`; } }
  }
  return g;
}

export function publicPricingGame(game) {
  if (!game) return null;
  return Object.fromEntries(Object.entries(game).filter(([key]) => !key.startsWith("_")));
}
