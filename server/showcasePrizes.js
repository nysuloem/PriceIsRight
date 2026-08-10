const THEMES = [
  {
    id:"saskatchewan", title:"SASKATCHEWAN SKIES", intro:"Your showcase was inspired by the lovely province of Saskatchewan!",
    prizes:[
      {name:"Saskatchewan rail and city adventure",brand:"Expedia Canada",description:"Round-trip airfare for two, six nights in Regina and Saskatoon, and a guided excursion to Moose Jaw.",price:4380,image:"https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85"},
      {name:"Premium outdoor entertaining collection",brand:"Canadian Tire",description:"A barbecue, patio dining set, fire table and all-weather accessories for evenings under the prairie sky.",price:5849,image:"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=85"},
      {name:"2026 Toyota Corolla LE",brand:"Toyota Canada",description:"A new compact sedan with automatic transmission, heated seats and Toyota Safety Sense.",price:28995,image:"https://images.unsplash.com/photo-1623869675781-80aa31012a5a?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"coast",title:"FROM COAST TO COAST",intro:"This showcase takes you on an unforgettable journey from Canada's Atlantic coast to the Pacific!",
    prizes:[
      {name:"Halifax and Cape Breton escape",brand:"Air Canada Vacations",description:"Flights for two, seven nights of accommodations and a rental car for a spectacular Atlantic road trip.",price:7190,image:"https://images.unsplash.com/photo-1506377585622-bedcbb027afc?auto=format&fit=crop&w=1000&q=85"},
      {name:"Vancouver Island wilderness getaway",brand:"Expedia Canada",description:"Flights for two, six nights in Victoria and Tofino, whale watching and a coastal dining package.",price:8430,image:"https://images.unsplash.com/photo-1559511260-66a654ae982a?auto=format&fit=crop&w=1000&q=85"},
      {name:"2026 Toyota Corolla Cross AWD",brand:"Toyota Canada",description:"A versatile new all-wheel-drive crossover ready to explore every coast.",price:39297,image:"https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"home",title:"THERE'S NO PLACE LIKE HOME",intro:"Your showcase proves there is truly no place like home!",
    prizes:[
      {name:"Complete living-room collection",brand:"IKEA Canada",description:"A sectional sofa, armchair, coffee table, storage wall, rugs, lamps and home accessories.",price:6745,image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85"},
      {name:"Premium home cinema",brand:"Best Buy Canada",description:"An OLED television, surround sound system, media console and streaming package.",price:8799,image:"https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1000&q=85"},
      {name:"Mediterranean villa holiday",brand:"Air Canada Vacations",description:"Round-trip airfare for two and ten nights in villas across Italy's Amalfi Coast.",price:12680,image:"https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"adventure",title:"CHOOSE YOUR ADVENTURE",intro:"Whether by land, water or air, this showcase lets you choose your next adventure!",
    prizes:[
      {name:"Two touring kayaks",brand:"MEC",description:"Two premium touring kayaks with paddles, personal flotation devices and roof carriers.",price:6480,image:"https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=85"},
      {name:"Rocky Mountain expedition",brand:"Expedia Canada",description:"Flights for two, seven nights in Banff and Jasper, a rental SUV and guided glacier tour.",price:7950,image:"https://images.unsplash.com/photo-1464278533981-50106e6176b1?auto=format&fit=crop&w=1000&q=85"},
      {name:"2026 Toyota GR Corolla",brand:"Toyota Canada",description:"A thrilling all-wheel-drive performance hatchback with a turbocharged engine.",price:53703,image:"https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"sun",title:"FOLLOW THE SUN",intro:"Pack your sunglasses, because every prize in this showcase follows the sun!",
    prizes:[
      {name:"Cancún all-inclusive holiday",brand:"Air Canada Vacations",description:"Round-trip airfare for two and seven nights at a luxury all-inclusive beach resort.",price:7290,image:"https://images.unsplash.com/photo-1510097467424-192d713fd8b2?auto=format&fit=crop&w=1000&q=85"},
      {name:"Backyard pool and lounge package",brand:"Canadian Tire",description:"An above-ground pool, robotic cleaner, loungers, umbrellas and poolside accessories.",price:9835,image:"https://images.unsplash.com/photo-1562778612-e1e0cda9915c?auto=format&fit=crop&w=1000&q=85"},
      {name:"2026 Toyota Corolla Hybrid LE",brand:"Toyota Canada",description:"A fuel-efficient new hybrid sedan with heated front seats and smart safety technology.",price:31035,image:"https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"winter",title:"THE GREAT CANADIAN WINTER",intro:"This showcase has everything you need to celebrate a great Canadian winter!",
    prizes:[
      {name:"Whistler ski holiday",brand:"Expedia Canada",description:"Flights for two, seven nights slopeside, lift passes and premium ski rentals.",price:9340,image:"https://images.unsplash.com/photo-1486911278844-a81c5267e227?auto=format&fit=crop&w=1000&q=85"},
      {name:"Luxury winter wardrobe",brand:"Sporting Life",description:"Designer parkas, snow boots, thermal layers and winter accessories for two.",price:6125,image:"https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=1000&q=85"},
      {name:"2026 Toyota Corolla Cross Hybrid AWD",brand:"Toyota Canada",description:"A new hybrid all-wheel-drive crossover equipped for Canadian winter roads.",price:39297,image:"https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
];

const shuffle=(a)=>{const c=[...a];for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}return c;};
export function createShowcases(){return shuffle(THEMES).slice(0,2).map(s=>({...s,prizes:s.prizes.map(p=>({...p,announcerText:`It's ${p.name}, from ${p.brand}! ${p.description}`})),actualPrice:s.prizes.reduce((n,p)=>n+p.price,0)}));}
