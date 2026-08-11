const SMALL_ITEMS = [
  { name: "Electric kettle", brand: "Hamilton Beach", description: "A compact stainless-steel electric kettle.", price: 55, image: "https://images.unsplash.com/photo-1594213114663-d94db9b17125?auto=format&fit=crop&w=600&q=80" },
  { name: "Personal blender", brand: "Ninja", description: "A personal blender with two travel cups.", price: 79, image: "https://images.unsplash.com/photo-1570222094114-d054a817e56b?auto=format&fit=crop&w=600&q=80" },
  { name: "Desk lamp", brand: "Globe Electric", description: "An adjustable LED task lamp.", price: 32, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=600&q=80" },
  { name: "Bluetooth speaker", brand: "JBL", description: "A portable water-resistant wireless speaker.", price: 74, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=600&q=80" },
  { name: "Toaster", brand: "Black+Decker", description: "A two-slice extra-wide-slot toaster.", price: 46, image: "https://images.unsplash.com/photo-1583722799618-179f37a8b80d?auto=format&fit=crop&w=600&q=80" },
  { name: "Hair dryer", brand: "Conair", description: "A lightweight ionic hair dryer.", price: 38, image: "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=600&q=80" },
  { name: "Waffle maker", brand: "Cuisinart", description: "A round non-stick waffle maker.", price: 67, image: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?auto=format&fit=crop&w=600&q=80" },
  { name: "Digital scale", brand: "Starfrit", description: "A glass-top digital kitchen scale.", price: 29, image: "https://images.unsplash.com/photo-1591261730799-ee4e6c2d16d7?auto=format&fit=crop&w=600&q=80" },
  { name: "French press", brand: "Bodum", description: "An eight-cup glass coffee press.", price: 42, image: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=600&q=80" },
  { name: "Milk frother", brand: "Nespresso", description: "A compact electric milk frother.", price: 89, image: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?auto=format&fit=crop&w=600&q=80" },
  { name: "Rice cooker", brand: "Black+Decker", description: "A six-cup automatic rice cooker.", price: 58, image: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=600&q=80" },
  { name: "Hand mixer", brand: "KitchenAid", description: "A five-speed electric hand mixer.", price: 75, image: "https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?auto=format&fit=crop&w=600&q=80" },
  { name: "Popcorn maker", brand: "Dash", description: "A hot-air countertop popcorn maker.", price: 39, image: "https://images.unsplash.com/photo-1578849278619-e73505e9610f?auto=format&fit=crop&w=600&q=80" },
  { name: "Coffee grinder", brand: "Braun", description: "A stainless-steel blade coffee grinder.", price: 36, image: "https://images.unsplash.com/photo-1520171285021-e1bb1d1c0e20?auto=format&fit=crop&w=600&q=80" },
  { name: "Alarm clock", brand: "Sony", description: "A digital AM/FM clock radio.", price: 31, image: "https://images.unsplash.com/photo-1501139083538-0139583c060f?auto=format&fit=crop&w=600&q=80" },
  { name: "Headphones", brand: "Skullcandy", description: "Wireless over-ear headphones.", price: 69, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80" },
  { name: "Computer mouse", brand: "Logitech", description: "A rechargeable wireless computer mouse.", price: 54, image: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80" },
  { name: "Portable charger", brand: "Belkin", description: "A ten-thousand milliamp-hour power bank.", price: 47, image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?auto=format&fit=crop&w=600&q=80" },
  { name: "Electric toothbrush", brand: "Oral-B", description: "A rechargeable electric toothbrush.", price: 83, image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?auto=format&fit=crop&w=600&q=80" },
  { name: "Beard trimmer", brand: "Philips", description: "A cordless beard and hair trimmer.", price: 57, image: "https://images.unsplash.com/photo-1621607512022-6aecc4fed814?auto=format&fit=crop&w=600&q=80" },
  { name: "Heating pad", brand: "Sunbeam", description: "A soft electric heating pad.", price: 35, image: "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=600&q=80" },
  { name: "Garment steamer", brand: "Rowenta", description: "A handheld fabric steamer.", price: 72, image: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?auto=format&fit=crop&w=600&q=80" },
  { name: "Yoga mat", brand: "Gaiam", description: "A cushioned non-slip exercise mat.", price: 34, image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=600&q=80" },
  { name: "Dumbbell set", brand: "CAP", description: "A pair of neoprene hand weights.", price: 48, image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80" },
  { name: "Camping lantern", brand: "Coleman", description: "A rechargeable outdoor lantern.", price: 41, image: "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&w=600&q=80" },
  { name: "Binoculars", brand: "Bushnell", description: "Compact all-purpose binoculars.", price: 86, image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80" },
  { name: "Tool set", brand: "Stanley", description: "A thirty-eight-piece household tool kit.", price: 78, image: "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?auto=format&fit=crop&w=600&q=80" },
  { name: "Garden pruner", brand: "Fiskars", description: "A geared bypass pruning shear.", price: 27, image: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80" },
  { name: "Board game", brand: "Hasbro", description: "A family edition strategy board game.", price: 37, image: "https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=600&q=80" },
  { name: "Instant camera", brand: "Fujifilm", description: "A colourful instant-print camera.", price: 94, image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=600&q=80" },
];

const GROCERIES = [
  { name: "Vanilla Ice Cream", brand: "Chapman's", description: "Four litres of Canadian-made vanilla ice cream.", price: 8.99, image: "https://www.chapmans.ca/wp-content/uploads/2022/11/Original-Vanilla-4L.png" },
  { name: "Maple Crème Cookies", brand: "Dare", description: "Canadian maple-leaf sandwich cookies with crème filling.", price: 4.49, image: "https://www.darefoods.com/wp-content/uploads/2021/03/Dare-Ultimate-Maple-Creme.png" },
  { name: "Cheezies", brand: "Hawkins", description: "A 210-gram bag of crunchy Canadian cheese snacks.", price: 4.29, image: "https://hawkinscheezies.com/wp-content/uploads/2020/08/cheezies-bag.png" },
  { name: "Coffee Crisp", brand: "Nestlé", description: "A four-pack of coffee-flavoured wafer bars.", price: 3.99, image: "https://www.madewithnestle.ca/sites/default/files/2024-02/coffee-crisp-4-pack.png" },
  { name: "Original Macaroni & Cheese", brand: "Kraft Dinner", description: "A 200-gram box of classic Canadian comfort food.", price: 2.19, image: "https://assets.kraftfoods.com/recipe_images/opendeploy/110084_640x428.jpg" },
  { name: "Ginger Ale", brand: "Canada Dry", description: "A twelve-pack of 355-millilitre cans.", price: 8.49, image: "https://www.canadadry.ca/images/product-ginger-ale.png" },
  { name: "All Dressed Chips", brand: "Ruffles", description: "A 200-gram bag of all-dressed potato chips.", price: 4.79, image: "https://www.tastyrewards.com/sites/default/files/2023-09/ruffles-all-dressed.png" },
  { name: "Maple Cookies", brand: "Leclerc", description: "Maple-leaf cookies made in Canada.", price: 3.49, image: "https://leclerc.ca/wp-content/uploads/2021/03/maple-leaf-cookies.png" },
  { name: "Ketchup Chips", brand: "Lay's", description: "A family-size bag of ketchup chips.", price: 4.99, image: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80" },
  { name: "Peanut Butter", brand: "Kraft", description: "A jar of smooth peanut butter.", price: 7.49, image: "https://images.unsplash.com/photo-1598511757337-fe2cafc31ba0?auto=format&fit=crop&w=600&q=80" },
  { name: "Tomato Soup", brand: "Campbell's", description: "A can of condensed tomato soup.", price: 2.49, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80" },
  { name: "Oat Cereal", brand: "Cheerios", description: "A family-size box of oat cereal.", price: 6.79, image: "https://images.unsplash.com/photo-1521483451569-e33803c0330c?auto=format&fit=crop&w=600&q=80" },
  { name: "Chocolate Milk", brand: "Neilson", description: "A two-litre carton of chocolate milk.", price: 5.29, image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80" },
  { name: "Greek Yogurt", brand: "Oikos", description: "A four-pack of vanilla Greek yogurt.", price: 5.99, image: "https://images.unsplash.com/photo-1571212515416-fca77afa66b3?auto=format&fit=crop&w=600&q=80" },
  { name: "Frozen Pizza", brand: "Dr. Oetker", description: "A thin-crust pepperoni pizza.", price: 6.49, image: "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=600&q=80" },
  { name: "Orange Juice", brand: "Tropicana", description: "A bottle of pulp-free orange juice.", price: 6.99, image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80" },
  { name: "Pasta Sauce", brand: "Classico", description: "A jar of tomato basil pasta sauce.", price: 4.79, image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=600&q=80" },
  { name: "Tortillas", brand: "Dempster's", description: "A package of flour tortillas.", price: 4.29, image: "https://images.unsplash.com/photo-1624300629298-e9de39c13be5?auto=format&fit=crop&w=600&q=80" },
  { name: "Granola Bars", brand: "MadeGood", description: "A box of chocolate granola bars.", price: 5.49, image: "https://images.unsplash.com/photo-1621939514649-280e2aa9454f?auto=format&fit=crop&w=600&q=80" },
  { name: "Dish Soap", brand: "Sunlight", description: "A bottle of lemon dish soap.", price: 3.99, image: "https://images.unsplash.com/photo-1585832770485-e68a5dbfad52?auto=format&fit=crop&w=600&q=80" },
  { name: "Facial Tissues", brand: "Scotties", description: "A six-box package of facial tissues.", price: 9.49, image: "https://images.unsplash.com/photo-1584556812952-905ffd0c611a?auto=format&fit=crop&w=600&q=80" },
  { name: "Toothpaste", brand: "Crest", description: "A twin-pack of mint toothpaste.", price: 7.99, image: "https://images.unsplash.com/photo-1559591937-e6e7f1c2270c?auto=format&fit=crop&w=600&q=80" },
  { name: "Shampoo", brand: "Dove", description: "A bottle of daily moisture shampoo.", price: 6.49, image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=600&q=80" },
  { name: "Hand Soap", brand: "Softsoap", description: "A refill bottle of liquid hand soap.", price: 5.79, image: "https://images.unsplash.com/photo-1584305574647-0cc949a2bb9f?auto=format&fit=crop&w=600&q=80" },
  { name: "Laundry Detergent", brand: "Tide", description: "A bottle of liquid laundry detergent.", price: 9.99, image: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=600&q=80" },
  { name: "Apple Sauce", brand: "Mott's", description: "A six-pack of apple sauce cups.", price: 4.69, image: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=600&q=80" },
  { name: "Black Tea", brand: "Red Rose", description: "A box of orange pekoe tea bags.", price: 6.29, image: "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=600&q=80" },
  { name: "Pancake Mix", brand: "Pearl Milling", description: "A box of original pancake mix.", price: 4.99, image: "https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=600&q=80" },
  { name: "Canned Tuna", brand: "Clover Leaf", description: "A can of flaked light tuna.", price: 2.79, image: "https://images.unsplash.com/photo-1534482421-64566f976cfa?auto=format&fit=crop&w=600&q=80" },
  { name: "Yellow Mustard", brand: "French's", description: "A squeeze bottle of yellow mustard.", price: 3.49, image: "https://images.unsplash.com/photo-1528750717929-32abb73d3bd9?auto=format&fit=crop&w=600&q=80" },
];

const CARS = [
  { name: "2026 Hyundai Elantra Essential", brand: "Hyundai", description: "A compact sedan with an automatic transmission, heated front seats, and modern safety technology.", price: 26135, image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=85" },
  { name: "2026 Toyota Corolla LE", brand: "Toyota", description: "A fuel-efficient sedan with automatic climate control and a touchscreen multimedia system.", price: 28164, image: "https://images.unsplash.com/photo-1623869675781-80aa31012a5a?auto=format&fit=crop&w=1200&q=85" },
  { name: "2026 Nissan Sentra S", brand: "Nissan", description: "A comfortable compact sedan with intelligent emergency braking and smartphone integration.", price: 25146, image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1200&q=85" },
];

const GAME_NAMES = ["plinko", "cliffHangers", "punchABunch", "diceGame", "groceryGame", "oneAway", "clockGame", "anyNumber", "grandGame", "shellGame"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { const c = [...a]; for (let i=c.length-1;i>0;i-=1) { const j=Math.floor(Math.random()*(i+1)); [c[i],c[j]]=[c[j],c[i]]; } return c; };
const fresh = (items, excluded=[]) => { const blocked=new Set(excluded); const unused=items.filter(x=>!blocked.has(x.name)); return unused.length ? unused : items; };
const money = (n) => `$${Number(n).toLocaleString("en-CA", { maximumFractionDigits: 2 })}`;
const prizeIntro = (p) => ({ name:p.name, brand:p.brand, description:p.description, image:p.image, announcerText:`It's ${p.brand}'s ${p.name}! ${p.description}` });

function base(type,title,player,instructions,introPrizes=[]) {
  return { type,title,playerId:player.id,playerName:player.name,instructions,introPrizes,status:"playing",result:"",winnings:0,history:[],eventSeq:0,lastOutcome:null };
}
function outcome(g, kind, text) { g.eventSeq += 1; g.lastOutcome={ kind,text,seq:g.eventSeq }; }
function holdPriceReveal(g, beforeSeq, beforeOutcome, prize, guess, actual, heldOutcome=g.lastOutcome) {
  g.eventSeq = beforeSeq;
  g.lastOutcome = beforeOutcome;
  g.priceReveal = { ...prize, guess, actual: null, correct: null };
  g._pendingPriceReveal = { actual, outcome: heldOutcome };
}
function finish(g, won, text, winnings=g.winnings) { g.status=won?"won":"lost"; g.result=text; g.winnings=winnings; g.mode="done"; g.options=[]; outcome(g,won?"win":"loss",text); }
function introduceNext(g, prize) { if (prize) g.pendingPrizeAnnouncement = prize; }
function wrongTwoDigit(actual) {
  const s=String(actual).padStart(2,"0"); const correctPosition=Math.random()<.5?0:1;
  let wrong=String(Math.floor(Math.random()*9)+1); while(wrong===s[1-correctPosition]) wrong=String(Math.floor(Math.random()*9)+1);
  const shown=correctPosition===0?s[0]+wrong:wrong+s[1];
  return { shownPrice:Number(shown), correctDigit:s[correctPosition], correctPosition };
}

function makePlinko(player, excluded=[]) {
  const q=shuffle(fresh(SMALL_ITEMS.filter(x=>x.price>=10&&x.price<100),excluded)).slice(0,3).map(p=>({...prizeIntro(p),actual:p.price,...wrongTwoDigit(p.price)}));
  return {...base("plinko","PLINKO",player,"You get one free chip and can win three more. For each small prize, choose the correct digit in its displayed price. Then tap a drop position and watch every chip travel down the board.",q), stage:"qualify",qualifierIndex:0,qualifiers:q.map(({actual,correctDigit,correctPosition,...x})=>x),_qualifierPrices:q.map(x=>x.actual),_qualifierCorrect:q.map(x=>x.correctDigit),chips:1,chipsLeft:0,slots:[100,500,1000,0,10000,0,1000,500,100],prompt:`Choose the correct digit in the price of the ${q[0].name}.`,mode:"choice",options:String(q[0].shownPrice).padStart(2,"0").split(""),lastDrop:null};
}

function makePunch(player, excluded=[]) {
  const prizes=shuffle(fresh(SMALL_ITEMS,excluded)).slice(0,3); const shown=prizes.map((p,i)=>p.price+(i%2?9:-8));
  return {...base("punchABunch","PUNCH-A-BUNCH",player,"Earn up to three punches by deciding whether each small prize is higher or lower than its wrong price. Then punch the board and decide whether to keep the cash or give it back for another punch.",prizes.map(prizeIntro)),stage:"qualify",qualifierIndex:0,qualifiers:prizes.map((p,i)=>({...prizeIntro(p),shownPrice:shown[i]})),_qualifierPrices:prizes.map(p=>p.price),punches:0,punchesLeft:0,prompt:`Is the ${prizes[0].name} higher or lower than ${money(shown[0])}?`,mode:"choice",options:["Higher","Lower"],_values:shuffle([100,100,250,250,500,500,1000,1000,2500,2500,5000,5000,10000,10000,25000,50000,...Array(34).fill(0).map((_,i)=>[100,250,500,1000][i%4])]),punched:[],offer:null};
}

function diceCar() { return pick(CARS.filter(c=>String(c.price).slice(1).split("").every(d=>Number(d)>=1&&Number(d)<=6))); }
function makeDice(player) {
  const car=diceCar()||CARS[2]; const digits=String(car.price).split("").map(Number);
  return {...base("diceGame","DICE GAME",player,"Roll four dice for the last four digits of the car. Exact rolls light immediately; otherwise choose higher or lower. All choices are revealed one at a time after the final roll.",[{...prizeIntro(car),announcerText:`IT'S A NEW CAR! ${car.description}`}]),car:prizeIntro(car),firstDigit:digits[0],_digits:digits.slice(1),rolls:[null,null,null,null],choices:[null,null,null,null],revealed:[null,null,null,null],correct:[null,null,null,null],digitIndex:0,stage:"roll",prompt:"Roll the first die.",mode:"choice",options:["Roll"],rollSeq:0};
}

function makeGrocery(player, excluded=[]) {
  const items=shuffle(fresh(GROCERIES,excluded)).slice(0,5);
  return {...base("groceryGame","GROCERY GAME",player,"Buy any quantity of each grocery item. Reach a total from $20 to $22 without going over $22.",items.map(prizeIntro)),items:items.map((x,i)=>({...prizeIntro(x),id:i,used:false})),_prices:items.map(x=>x.price),total:0,prompt:"Choose a Canadian grocery item.",mode:"choice",options:items.map((x,i)=>`${i+1}. ${x.brand} ${x.name}`),stage:"item"};
}

function makeOneAway(player) {
  const car=pick(CARS); const actual=String(car.price).split("").map(Number); const shown=actual.map(d=>d===0?1:d===9?8:d+(Math.random()<.5?-1:1));
  return {...base("oneAway","ONE AWAY",player,"Every digit shown is exactly one away from the car's true price. Choose higher or lower for each digit, hear how many are right, then make one final correction.",[prizeIntro(car)]),car:prizeIntro(car),shownDigits:shown,_digits:actual,answers:[],stage:"choose",digitIndex:0,prompt:`Should the first digit be one higher or one lower than ${shown[0]}?`,mode:"choice",options:["Higher","Lower"],rightCount:null};
}

function makeCliff(player,excluded=[]) { const items=shuffle(fresh(SMALL_ITEMS,excluded)).slice(0,3); return {...base("cliffHangers","CLIFF HANGERS",player,"Price three small prizes. Every dollar you miss moves the climber one step; 25 steps is the limit.",items.map(prizeIntro)),items:items.map(prizeIntro),_prices:items.map(i=>i.price),itemIndex:0,climber:0,prompt:`What is the price of the ${items[0].name}?`,mode:"number"}; }
function makeClock(player,excluded=[]) { const items=shuffle(fresh(SMALL_ITEMS.filter(i=>i.price>=25),excluded)).slice(0,2); return {...base("clockGame","CLOCK GAME",player,"You have 30 seconds to price two prizes. After every guess, the host tells you higher or lower.",items.map(prizeIntro)),items:items.map(prizeIntro),_prices:items.map(i=>i.price),itemIndex:0,_startedAt:null,_clockStarted:false,prompt:`Guess the price of the ${items[0].name}.`,mode:"number",clue:"30 seconds starts now!",secondsLeft:30}; }
function makeAnyNumber(player) { const car=[3,...shuffle([0,1,2,4,5,6,7,8,9]).slice(0,4)], remaining=shuffle([0,1,2,4,5,6,7,8,9].filter(d=>!car.slice(1).includes(d))), small=remaining.slice(0,3), pig=remaining.slice(3,5); const carPrize=CARS[0]; return {...base("anyNumber","ANY NUMBER",player,"Call digits. You win the first price you completely reveal.",[prizeIntro(carPrize)]),boards:[{label:"Car",cells:[3,null,null,null,null]},{label:"Prize",cells:[null,null,null]},{label:"Piggy Bank",cells:[null,null]}],_answers:[car,small,pig],usedDigits:[3],prompt:"Choose a digit.",mode:"choice",options:[0,1,2,4,5,6,7,8,9].map(String)}; }
function makeGrand(player,excluded=[]) { const available=fresh(GROCERIES,excluded), target=6, cheap=shuffle(available.filter(i=>i.price<target)).slice(0,4), pricey=shuffle(available.filter(i=>i.price>=target)).slice(0,2), items=shuffle([...cheap,...pricey]); return {...base("grandGame","GRAND GAME",player,"Pick the four products priced below the target. Each correct pick multiplies your money by ten.",items.map(prizeIntro)),target,items:items.map(i=>({...prizeIntro(i),selected:false})),_prices:items.map(i=>i.price),prompt:`Pick a product under ${money(target)}.`,mode:"choice",options:items.map((i,n)=>`${n+1}. ${i.name}`),correct:0,winnings:1}; }
function makeShell(player,excluded=[]) { const items=shuffle(fresh(SMALL_ITEMS,excluded)).slice(0,3), shown=items.map((x,i)=>x.price+(i%2?-8:9)); return {...base("shellGame","SHELL GAME",player,"Win shells by deciding whether each small prize is higher or lower than its shown price, then find the hidden ball.",items.map(prizeIntro)),items:items.map((x,i)=>({...prizeIntro(x),shownPrice:shown[i]})),_prices:items.map(i=>i.price),itemIndex:0,shells:0,_ball:Math.floor(Math.random()*4),prompt:`${items[0].name}: higher or lower than ${money(shown[0])}?`,mode:"choice",options:["Higher","Lower"],stage:"prices"}; }

const FACTORIES={plinko:makePlinko,cliffHangers:makeCliff,punchABunch:makePunch,diceGame:makeDice,groceryGame:makeGrocery,oneAway:makeOneAway,clockGame:makeClock,anyNumber:makeAnyNumber,grandGame:makeGrand,shellGame:makeShell};
export const PRICING_GAME_TYPES=[...GAME_NAMES];
export function createPricingGameForType(type,player,excluded=[]){ if(!FACTORIES[type]) throw new Error(`Unknown pricing game: ${type}`); return FACTORIES[type](player,excluded); }
export function createPricingGame(player,previous=[],excluded=[]){ const a=GAME_NAMES.filter(x=>!previous.includes(x)); return FACTORIES[pick(a.length?a:GAME_NAMES)](player,excluded); }
export function pricingPrizeNames(game){return [...(game?.qualifiers||[]),...(game?.items||[]),...(game?.introPrizes||[])].map(x=>x?.name).filter(Boolean);}

export function playPricingGame(g,action={}) {
  if(!g||g.status!=="playing") throw new Error("Pricing game is not active"); const choice=String(action.choice??""); const value=Math.round(Number(action.value));
  if(g.type==="plinko") {
    if(g.stage==="qualify") { const beforeSeq=g.eventSeq,beforeOutcome=g.lastOutcome,i=g.qualifierIndex, q=g.qualifiers[i], correct=choice===g._qualifierCorrect[i]; if(correct){g.chips+=1;g.history.push(`${q.name}: ${money(g._qualifierPrices[i])} — correct! You won the prize and a chip.`);outcome(g,"success","Correct — another Plinko chip!");}else{g.history.push(`${q.name}: the correct digit was ${g._qualifierCorrect[i]}.`);outcome(g,"failure","That digit was not correct.");} g.qualifierIndex+=1; if(g.qualifierIndex===3){g.stage="drop";g.chipsLeft=g.chips;g.mode="drop";g.options=[];g.prompt=`Tap one of the nine drop positions for chip 1 of ${g.chips}.`;}else{const n=g.qualifiers[g.qualifierIndex];g.options=String(n.shownPrice).padStart(2,"0").split("");g.prompt=`Choose the correct digit in the price of the ${n.name}.`;introduceNext(g,n);} holdPriceReveal(g,beforeSeq,beforeOutcome,q,choice,g._qualifierPrices[i]); }
    else if(g.stage==="drop") { const start=Math.max(0,Math.min(8,Number(action.position??choice)-1)); let col=start; const path=[col]; for(let r=0;r<12;r+=1){col=Math.max(0,Math.min(8,col+(Math.random()<.5?-1:1)));path.push(col);} g.stage="dropping";g.mode="wait";g.lastDrop={id:(g.lastDrop?.id||0)+1,start,path,landing:col};g.prompt="The chip is falling…"; }
  } else if(g.type==="punchABunch") {
    if(g.stage==="qualify") { const beforeSeq=g.eventSeq,beforeOutcome=g.lastOutcome,i=g.qualifierIndex, actual=g._qualifierPrices[i], shown=g.qualifiers[i].shownPrice, correct=choice.toLowerCase()===(actual>shown?"higher":"lower"); if(correct){g.punches+=1;outcome(g,"success","Correct — you earned a punch!");}else outcome(g,"failure","No punch for that prize.");const revealOutcome=g.lastOutcome;g.history.push(`${g.qualifiers[i].name}: ${money(actual)} — ${correct?"correct":"incorrect"}.`);g.qualifierIndex+=1;if(g.qualifierIndex===3){if(!g.punches)finish(g,false,"No punches were earned.");else{g.punchesLeft=g.punches;g.stage="punch";g.options=Array.from({length:50},(_,n)=>String(n+1));g.prompt=`You earned ${g.punches} punch${g.punches===1?"":"es"}. Pick a hole.`;}}else{const n=g.qualifiers[g.qualifierIndex];g.prompt=`Is the ${n.name} higher or lower than ${money(n.shownPrice)}?`;introduceNext(g,n);} holdPriceReveal(g,beforeSeq,beforeOutcome,g.qualifiers[i],choice,actual,revealOutcome); }
    else if(g.stage==="punch") { const i=Math.max(0,Math.min(49,Number(choice)-1));if(g.punched.includes(i))throw new Error("That hole has already been punched");g.punched.push(i);g.punchesLeft-=1;g.offer=g._values[i];g.winnings=g.offer;g.history.push(`Hole ${i+1} held ${money(g.offer)}.`);outcome(g,"success",`You found ${money(g.offer)}!`);if(!g.punchesLeft)finish(g,true,`Your final punch is worth ${money(g.offer)}!`,g.offer);else{g.stage="decision";g.options=["Keep it","Punch again"];g.prompt=`You found ${money(g.offer)}. Keep it, or give it back for another punch?`;} }
    else if(choice.toLowerCase().startsWith("keep"))finish(g,true,`You kept ${money(g.offer)}!`,g.offer);else{g.stage="punch";g.options=Array.from({length:50},(_,n)=>g.punched.includes(n)?null:String(n+1)).filter(Boolean);g.prompt=`Pick another hole. ${g.punchesLeft} punch${g.punchesLeft===1?"":"es"} left.`;}
  } else if(g.type==="diceGame") {
    if(g.stage==="roll") { const i=g.digitIndex, roll=1+Math.floor(Math.random()*6);g.rolls[i]=roll;g.rollSeq+=1;if(roll===g._digits[i]){g.choices[i]="Exact";g.revealed[i]=roll;g.correct[i]=true;outcome(g,"success",`A ${roll} — exactly right!`);g.digitIndex+=1;}else{g.stage="direction";g.prompt=`The die shows ${roll}. Is the hidden digit higher or lower?`;g.options=roll===1?["Higher"]:roll===6?["Lower"]:["Higher","Lower"];return g;} }
    else if(g.stage==="direction"){g.choices[g.digitIndex]=choice;g.digitIndex+=1;g.stage="roll";outcome(g,"neutral","Choice locked in. No result yet.");}
    else { const i=g.revealIndex, target=g._digits[i], roll=g.rolls[i], exact=g.choices[i]==="Exact", correct=exact||g.choices[i].toLowerCase()===(target>roll?"higher":"lower");g.revealed[i]=target;g.correct[i]=correct;g.revealIndex+=1;outcome(g,correct?"success":"failure",`Digit ${i+2} is ${target}: ${correct?"correct":"incorrect"}.`);if(g.revealIndex===4){const won=g.correct.every(Boolean);finish(g,won,won?`You won the ${g.car.name}!`:"The car price was not completed.");}else g.prompt="Reveal the next digit.";return g; }
    if(g.digitIndex===4){g.stage="reveal";g.revealIndex=0;g.prompt="All choices are locked. Reveal the first digit.";g.options=["Reveal next digit"];}
    else if(g.stage==="roll"){g.prompt=`Roll die ${g.digitIndex+1}.`;g.options=["Roll"];}
  } else if(g.type==="groceryGame") {
    if(g.stage==="item"){const i=Number(choice.split(".")[0])-1;if(g.items[i]?.used)throw new Error("That item was already used");g.selected=i;g.stage="quantity";g.mode="number";g.prompt=`How many ${g.items[i].brand} ${g.items[i].name} would you like?`;}
    else{const qty=Math.max(1,Math.min(20,value)),i=g.selected,add=Number((g._prices[i]*qty).toFixed(2));g.total=Number((g.total+add).toFixed(2));g.items[i].used=true;g.history.push(`${qty} × ${g.items[i].name} = ${money(add)}; total ${money(g.total)}.`);outcome(g,g.total<=22?"success":"failure",`Your total is now ${money(g.total)}.`);if(g.total>=20&&g.total<=22)finish(g,true,`Perfect shopping! Your total is ${money(g.total)}.`);else if(g.total>22||g.items.every(x=>x.used))finish(g,false,`Your final total is ${money(g.total)}.`);else{g.stage="item";g.mode="choice";g.options=g.items.map((x,n)=>x.used?null:`${n+1}. ${x.brand} ${x.name}`).filter(Boolean);g.prompt="Choose another item.";}}
  } else if(g.type==="oneAway") {
    if(g.stage==="choose"){g.answers[g.digitIndex]=choice;g.digitIndex+=1;if(g.digitIndex===5){const proposed=g.shownDigits.map((d,i)=>d+(g.answers[i].toLowerCase()==="higher"?1:-1));g.rightCount=proposed.filter((d,i)=>d===g._digits[i]).length;outcome(g,g.rightCount?"success":"failure",`${g.rightCount} digit${g.rightCount===1?" is":"s are"} right.`);if(!g.rightCount)return finish(g,false,"Not one digit was right.");g.stage="revise";g.mode="multi";g.options=[];g.prompt=`You have ${g.rightCount} right. Submit your final higher/lower choices.`;}else g.prompt=`Should digit ${g.digitIndex+1} be one higher or lower than ${g.shownDigits[g.digitIndex]}?`;}
    else{const answers=Array.isArray(action.answers)?action.answers:g.answers;const final=g.shownDigits.map((d,i)=>d+(String(answers[i]).toLowerCase()==="higher"?1:-1));const won=final.every((d,i)=>d===g._digits[i]);finish(g,won,won?`You won the ${g.car.name}!`:`The actual price was ${money(Number(g._digits.join("")))}.`);}
  } else if(g.type==="cliffHangers") { if(!Number.isFinite(value))throw new Error("Enter a price");const beforeSeq=g.eventSeq,beforeOutcome=g.lastOutcome,i=g.itemIndex,actual=g._prices[i],error=Math.abs(value-actual);g.climber+=error;g.history.push(`${g.items[i].name}: ${money(value)}, actual ${money(actual)} — ${error} steps.`);outcome(g,error===0?"success":"failure",error===0?"Exactly right!":`${error} climber steps.`);const revealOutcome=g.lastOutcome;g.itemIndex+=1;if(g.climber>25)finish(g,false,"The climber went over the cliff!");else if(g.itemIndex===3)finish(g,true,`You kept the climber safe at step ${g.climber}!`);else{g.prompt=`What is the price of the ${g.items[g.itemIndex].name}?`;introduceNext(g,g.items[g.itemIndex]);} holdPriceReveal(g,beforeSeq,beforeOutcome,g.items[i],money(value),actual,revealOutcome);
  } else if(g.type==="clockGame") {g.secondsLeft=Math.max(0,30-Math.floor((Date.now()-g._startedAt)/1000));if(!g.secondsLeft)return finish(g,false,"Time is up!");const actual=g._prices[g.itemIndex];if(value===actual){outcome(g,"success","Correct!");g.itemIndex+=1;if(g.itemIndex===2)return finish(g,true,`Both prizes won with ${g.secondsLeft} seconds left!`);g.prompt=`Now price the ${g.items[1].name}.`;introduceNext(g,g.items[1]);}else{g.clue=actual>value?"Higher!":"Lower!";g.prompt=`${g.clue} ${g.secondsLeft} seconds left.`;}
  } else if(g.type==="anyNumber") {const d=Number(choice);if(g.usedDigits.includes(d))throw new Error("Digit already chosen");g.usedDigits.push(d);g.options=g.options.filter(x=>Number(x)!==d);for(let b=0;b<g._answers.length;b++)for(let c=0;c<g._answers[b].length;c++)if(g._answers[b][c]===d)g.boards[b].cells[c]=d;const done=g.boards.findIndex(b=>b.cells.every(x=>x!==null));if(done>=0)finish(g,done===0,`You completed the ${g.boards[done].label} price!`);
  } else if(g.type==="grandGame") {const i=Number(choice.split(".")[0])-1;if(g.items[i]?.selected)throw new Error("Already selected");g.items[i].selected=true;const actual=g._prices[i];g.history.push(`${g.items[i].name}: ${money(actual)}.`);if(actual>=g.target)finish(g,false,`That item was not below ${money(g.target)}.`);else{g.correct+=1;g.winnings*=10;outcome(g,"success","Correct!");if(g.correct===4)finish(g,true,"Four correct products — you won $10,000!",10000);else{g.options=g.items.map((x,n)=>x.selected?null:`${n+1}. ${x.name}`).filter(Boolean);g.prompt="Pick another product.";}}
  } else if(g.type==="shellGame") {if(g.stage==="prices"){const beforeSeq=g.eventSeq,beforeOutcome=g.lastOutcome,i=g.itemIndex,correct=choice.toLowerCase()===(g._prices[i]>g.items[i].shownPrice?"higher":"lower");if(correct)g.shells+=1;outcome(g,correct?"success":"failure",correct?"Correct — you earned a shell!":"Incorrect.");const revealOutcome=g.lastOutcome;g.itemIndex+=1;if(g.itemIndex===3){if(!g.shells)finish(g,false,"No shells were earned.");else{g.stage="shell";g.options=["1","2","3","4"];g.prompt="Pick a shell.";}}else{g.prompt=`${g.items[g.itemIndex].name}: higher or lower than ${money(g.items[g.itemIndex].shownPrice)}?`;introduceNext(g,g.items[g.itemIndex]);}holdPriceReveal(g,beforeSeq,beforeOutcome,g.items[i],choice,g._prices[i],revealOutcome);}else{const hit=Number(choice)-1===g._ball;g.shells-=1;if(hit)finish(g,true,`The ball was under shell ${choice}!`);else if(!g.shells)finish(g,false,`The ball was under shell ${g._ball+1}.`);}}
  return g;
}

export function publicPricingGame(game){if(!game)return null;return Object.fromEntries(Object.entries(game).filter(([k])=>!k.startsWith("_")));}

export function revealDeferredPrice(game) {
  if (!game?._pendingPriceReveal || !game.priceReveal) throw new Error("No price is waiting to be revealed");
  const pending=game._pendingPriceReveal;
  game.priceReveal.actual=pending.actual;
  game.priceReveal.correct=pending.outcome?.kind === "success" || pending.outcome?.kind === "win";
  if (pending.outcome) outcome(game,pending.outcome.kind,pending.outcome.text);
  return game;
}

export function clearDeferredPrice(game) {
  if (!game?._pendingPriceReveal) throw new Error("No revealed price is waiting");
  game.priceReveal=null;
  game._pendingPriceReveal=null;
  return game;
}

export function initialPrizeAnnouncements(game) {
  if (!game) return [];
  if (game.type === "plinko" || game.type === "punchABunch") return [game.qualifiers[0]];
  if (game.type === "cliffHangers" || game.type === "clockGame" || game.type === "shellGame") return [game.items[0]];
  return game.introPrizes || [];
}

export function settlePricingAnimation(game) {
  if (game?.type !== "plinko" || game.stage !== "dropping" || !game.lastDrop) throw new Error("No Plinko chip is falling");
  const won=game.slots[game.lastDrop.landing];game.lastDrop.value=won;game.winnings+=won;game.chipsLeft-=1;game.history.push(`Chip landed in ${money(won)}.`);game.stage="drop";game.mode="drop";outcome(game,won?"success":"failure",`The chip landed on ${money(won)}.`);
  if(!game.chipsLeft)finish(game,game.winnings>0,`You won ${money(game.winnings)} on Plinko!`);else game.prompt=`Tap a drop position for your next chip. ${game.chipsLeft} remaining.`;
  return game;
}
