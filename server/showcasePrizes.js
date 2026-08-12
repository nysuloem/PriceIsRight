import fs from "node:fs";
import path from "node:path";

const TRIP_BANK_STORAGE_NAME = "price-is-right-trip-bank.json";
let tripBankFileOverride = null;
let usedTripIdsLoaded = false;
const usedTripIds = new Set();

const TRIP_SLOT = { tripSlot: true };

const TRIP_PRIZES = [
  ["banff-lake-louise", "Banff and Lake Louise mountain getaway", "Air Canada Vacations", "Round-trip airfare for two, six nights in Banff, a Lake Louise day tour, and a guided glacier walk.", 8450, "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=85"],
  ["tofino-victoria", "Tofino and Victoria coastal escape", "Expedia Canada", "Flights for two, six nights between Victoria and Tofino, a rental car, whale watching, and a coastal dining package.", 8920, "https://images.unsplash.com/photo-1559511260-66a654ae982a?auto=format&fit=crop&w=1000&q=85"],
  ["halifax-cape-breton", "Halifax and Cape Breton road trip", "Air Canada Vacations", "Flights for two, seven nights of accommodations, a rental car, and scenic admissions along the Cabot Trail.", 7190, "https://images.unsplash.com/photo-1506377585622-bedcbb027afc?auto=format&fit=crop&w=1000&q=85"],
  ["charlottetown-pei", "Prince Edward Island beach holiday", "Expedia Canada", "Flights for two, six nights in Charlottetown, a rental car, beach tours, and a lobster dinner.", 6240, "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&w=1000&q=85"],
  ["quebec-city-winter", "Quebec City winter festival trip", "Porter Escapes", "Flights for two, five nights in Old Quebec, festival passes, a food tour, and a spa afternoon.", 5880, "https://images.unsplash.com/photo-1519178614-68673b201f36?auto=format&fit=crop&w=1000&q=85"],
  ["montreal-food", "Montreal food and culture weekend", "VIA Rail Vacations", "Round-trip rail for two, four hotel nights, museum passes, a guided food tour, and dinner in Old Montreal.", 4680, "https://images.unsplash.com/photo-1519178614-68673b201f36?auto=format&fit=crop&w=1000&q=85"],
  ["niagara-vineyard", "Niagara wine-country escape", "Marriott Bonvoy Travel", "Three nights for two in Niagara-on-the-Lake, winery tours, theatre tickets, and chauffeured transfers.", 4390, "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1000&q=85"],
  ["muskoka-resort", "Muskoka lakeside resort stay", "Expedia Canada", "Five nights for two at a lakeside resort with canoe rentals, spa credits, and a private dinner cruise.", 6780, "https://images.unsplash.com/photo-1499696010180-025ef6e1a8f9?auto=format&fit=crop&w=1000&q=85"],
  ["winnipeg-churchill", "Churchill northern lights adventure", "Frontiers North Adventures", "Flights for two, five nights in Manitoba, guided northern lights viewing, and a tundra excursion.", 11280, "https://images.unsplash.com/photo-1483086431886-3590a88317fe?auto=format&fit=crop&w=1000&q=85"],
  ["saskatchewan-city", "Saskatchewan rail and city adventure", "VIA Rail Vacations", "Rail travel for two, six nights in Regina and Saskatoon, and a guided excursion to Moose Jaw.", 4380, "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1000&q=85"],
  ["calgary-stampede", "Calgary Stampede holiday", "WestJet Vacations", "Flights for two, five nights in Calgary, reserved rodeo seats, midway credits, and a Banff day trip.", 7680, "https://images.unsplash.com/photo-1527489377706-5bf97e608852?auto=format&fit=crop&w=1000&q=85"],
  ["whistler-ski", "Whistler ski holiday", "Expedia Canada", "Flights for two, seven nights slopeside, lift passes, premium ski rentals, and airport transfers.", 9340, "https://images.unsplash.com/photo-1486911278844-a81c5267e227?auto=format&fit=crop&w=1000&q=85"],
  ["yellowknife-aurora", "Yellowknife aurora getaway", "Air Canada Vacations", "Flights for two, five hotel nights, aurora-viewing tours, winter gear rentals, and a local dinner.", 8160, "https://images.unsplash.com/photo-1483347756197-71ef80e95f73?auto=format&fit=crop&w=1000&q=85"],
  ["yukon-adventure", "Yukon wilderness adventure", "Travel Yukon", "Flights for two, six nights in Whitehorse, guided hikes, wildlife tours, and a scenic flightseeing excursion.", 10490, "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=85"],
  ["newfoundland-iceberg", "Newfoundland iceberg coast tour", "Air Canada Vacations", "Flights for two, seven nights between St. John's and Twillingate, a rental car, and boat tours.", 8650, "https://images.unsplash.com/photo-1527556897832-0c6492fa56cd?auto=format&fit=crop&w=1000&q=85"],
  ["cancun-resort", "Cancun all-inclusive holiday", "Sunwing Vacations", "Round-trip airfare for two and seven nights at a luxury all-inclusive beach resort.", 7290, "https://images.unsplash.com/photo-1510097467424-192d713fd8b2?auto=format&fit=crop&w=1000&q=85"],
  ["punta-cana", "Punta Cana beach resort vacation", "Air Canada Vacations", "Flights for two and seven all-inclusive nights at a Dominican Republic beachfront resort.", 6890, "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=85"],
  ["jamaica", "Jamaica all-inclusive escape", "WestJet Vacations", "Flights for two, seven nights in Montego Bay, resort dining, snorkeling, and airport transfers.", 7560, "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1000&q=85"],
  ["bahamas", "Bahamas island getaway", "Expedia Canada", "Flights for two, six nights in Nassau, a harbour cruise, and beach-club passes.", 7980, "https://images.unsplash.com/photo-1544551763-77ef2d0cfc6c?auto=format&fit=crop&w=1000&q=85"],
  ["hawaii-maui", "Maui oceanfront holiday", "Air Canada Vacations", "Flights for two, seven nights oceanfront, a rental car, luau tickets, and a road-to-Hana tour.", 12880, "https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?auto=format&fit=crop&w=1000&q=85"],
  ["las-vegas", "Las Vegas entertainment weekend", "Expedia Canada", "Flights for two, four nights on the Strip, show tickets, dinner credit, and attraction passes.", 5860, "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=1000&q=85"],
  ["new-york", "New York City theatre trip", "Porter Escapes", "Flights for two, five nights in Manhattan, Broadway tickets, museum passes, and a dining credit.", 9340, "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=1000&q=85"],
  ["orlando", "Orlando family theme-park vacation", "Air Canada Vacations", "Flights for four, six hotel nights, theme-park tickets, and airport transfers.", 13990, "https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?auto=format&fit=crop&w=1000&q=85"],
  ["san-francisco", "San Francisco bay adventure", "Expedia Canada", "Flights for two, five nights, bay cruise tickets, guided neighbourhood tours, and a wine-country day trip.", 8740, "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=1000&q=85"],
  ["london", "London theatre and history holiday", "Air Canada Vacations", "Round-trip airfare for two, seven nights in London, West End tickets, and guided historic tours.", 12980, "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1000&q=85"],
  ["paris", "Paris romance getaway", "Air France Holidays", "Flights for two, seven nights in Paris, museum passes, a Seine dinner cruise, and a pastry class.", 13490, "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1000&q=85"],
  ["rome-amalfi", "Rome and Amalfi Coast holiday", "Air Canada Vacations", "Flights for two, ten nights between Rome and the Amalfi Coast, rail transfers, and guided tours.", 15280, "https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1000&q=85"],
  ["barcelona", "Barcelona architecture escape", "Expedia Canada", "Flights for two, seven nights in Barcelona, museum admissions, tapas tours, and a coastal day trip.", 12360, "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1000&q=85"],
  ["athens-santorini", "Athens and Santorini island holiday", "Air Canada Vacations", "Flights for two, nine nights in Greece, ferry transfers, guided tours, and a sunset cruise.", 16480, "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1000&q=85"],
  ["tokyo-kyoto", "Tokyo and Kyoto cultural journey", "Air Canada Vacations", "Flights for two, ten nights in Japan, rail passes, food tours, and guided temple visits.", 18940, "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1000&q=85"],
  ["sydney", "Sydney harbour adventure", "Air Canada Vacations", "Flights for two, eight nights in Sydney, harbour cruise, wildlife park passes, and coastal tours.", 19960, "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1000&q=85"],
  ["costa-rica", "Costa Rica rainforest and beach trip", "Expedia Canada", "Flights for two, eight nights, eco-lodge and beach resort stays, guided rainforest tours, and transfers.", 11870, "https://images.unsplash.com/photo-1518182170546-07661fd94144?auto=format&fit=crop&w=1000&q=85"],
  ["iceland", "Iceland northern adventure", "Icelandair Holidays", "Flights for two, seven nights, lagoon admission, glacier tours, and northern lights excursions.", 13920, "https://images.unsplash.com/photo-1504829857797-ddff29c27927?auto=format&fit=crop&w=1000&q=85"],
  ["alaska-cruise", "Alaska cruise vacation", "Princess Cruises", "A seven-night balcony cruise for two, airfare to Vancouver, shore excursion credits, and onboard dining.", 14780, "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1000&q=85"],
  ["rocky-mountaineer", "Rocky Mountaineer rail journey", "Rocky Mountaineer", "Luxury rail travel for two through the Canadian Rockies, hotel stays, meals, and sightseeing transfers.", 16890, "https://images.unsplash.com/photo-1478059299873-f047d8c5fe1a?auto=format&fit=crop&w=1000&q=85"],
].map(([id, name, brand, description, price, image]) => ({
  id: `trip-${id}`,
  name,
  brand,
  retailer: brand,
  description,
  price,
  image,
  imageAlt: name,
  isTripPrize: true,
}));

const THEMES = [
  {
    id:"saskatchewan", title:"SASKATCHEWAN SKIES", intro:"Your showcase was inspired by the lovely province of Saskatchewan!",
    prizes:[
      TRIP_SLOT,
      {name:"Premium outdoor entertaining collection",brand:"Canadian Tire",description:"A barbecue, patio dining set, fire table and all-weather accessories for evenings under the prairie sky.",price:5849,image:"https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1000&q=85"},
      {name:"2026 Toyota Corolla LE",brand:"Toyota Canada",description:"A new compact sedan with automatic transmission, heated seats and Toyota Safety Sense.",price:28995,image:"https://images.unsplash.com/photo-1623869675781-80aa31012a5a?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"coast",title:"FROM COAST TO COAST",intro:"This showcase takes you on an unforgettable journey from Canada's Atlantic coast to the Pacific!",
    prizes:[
      TRIP_SLOT,
      TRIP_SLOT,
      {name:"2026 Toyota Corolla Cross AWD",brand:"Toyota Canada",description:"A versatile new all-wheel-drive crossover ready to explore every coast.",price:39297,image:"https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"home",title:"THERE'S NO PLACE LIKE HOME",intro:"Your showcase proves there is truly no place like home!",
    prizes:[
      {name:"Complete living-room collection",brand:"IKEA Canada",description:"A sectional sofa, armchair, coffee table, storage wall, rugs, lamps and home accessories.",price:6745,image:"https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85"},
      {name:"Premium home cinema",brand:"Best Buy Canada",description:"An OLED television, surround sound system, media console and streaming package.",price:8799,image:"https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=1000&q=85"},
      TRIP_SLOT,
    ],
  },
  {
    id:"adventure",title:"CHOOSE YOUR ADVENTURE",intro:"Whether by land, water or air, this showcase lets you choose your next adventure!",
    prizes:[
      {name:"Two touring kayaks",brand:"MEC",description:"Two premium touring kayaks with paddles, personal flotation devices and roof carriers.",price:6480,image:"https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=85"},
      TRIP_SLOT,
      {name:"2026 Toyota GR Corolla",brand:"Toyota Canada",description:"A thrilling all-wheel-drive performance hatchback with a turbocharged engine.",price:53703,image:"https://images.unsplash.com/photo-1617469767053-d3b523a0b982?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"sun",title:"FOLLOW THE SUN",intro:"Pack your sunglasses, because every prize in this showcase follows the sun!",
    prizes:[
      TRIP_SLOT,
      {name:"Backyard pool and lounge package",brand:"Canadian Tire",description:"An above-ground pool, robotic cleaner, loungers, umbrellas and poolside accessories.",price:9835,image:"https://images.unsplash.com/photo-1562778612-e1e0cda9915c?auto=format&fit=crop&w=1000&q=85"},
      {name:"2026 Toyota Corolla Hybrid LE",brand:"Toyota Canada",description:"A fuel-efficient new hybrid sedan with heated front seats and smart safety technology.",price:31035,image:"https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
  {
    id:"winter",title:"THE GREAT CANADIAN WINTER",intro:"This showcase has everything you need to celebrate a great Canadian winter!",
    prizes:[
      TRIP_SLOT,
      {name:"Luxury winter wardrobe",brand:"Sporting Life",description:"Designer parkas, snow boots, thermal layers and winter accessories for two.",price:6125,image:"https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=1000&q=85"},
      {name:"2026 Toyota Corolla Cross Hybrid AWD",brand:"Toyota Canada",description:"A new hybrid all-wheel-drive crossover equipped for Canadian winter roads.",price:39297,image:"https://images.unsplash.com/photo-1504215680853-026ed2a45def?auto=format&fit=crop&w=1000&q=85"},
    ],
  },
];

const shuffle=(a)=>{const c=[...a];for(let i=c.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[c[i],c[j]]=[c[j],c[i]];}return c;};

function tripBankStorageFile(){
  if(tripBankFileOverride!==null)return tripBankFileOverride;
  if(process.env.TRIP_BANK_FILE)return process.env.TRIP_BANK_FILE;
  const directory=process.env.PRIZE_BANK_DIR||process.env.RAILWAY_VOLUME_MOUNT_PATH;
  return directory?path.join(directory,TRIP_BANK_STORAGE_NAME):null;
}

function loadUsedTrips(){
  if(usedTripIdsLoaded)return;
  usedTripIdsLoaded=true;
  const file=tripBankStorageFile();
  if(!file)return;
  try{
    const parsed=JSON.parse(fs.readFileSync(file,"utf8"));
    if(Array.isArray(parsed.usedTripIds))parsed.usedTripIds.forEach(id=>usedTripIds.add(id));
  }catch(error){
    if(error.code!=="ENOENT")console.warn(`[showcasePrizes] Could not load trip bank: ${error.message}`);
  }
}

function saveUsedTrips(){
  const file=tripBankStorageFile();
  if(!file)return;
  try{
    fs.mkdirSync(path.dirname(file),{recursive:true});
    fs.writeFileSync(file,JSON.stringify({usedTripIds:[...usedTripIds].sort(),updatedAt:new Date().toISOString()},null,2));
  }catch(error){
    console.warn(`[showcasePrizes] Could not save trip bank: ${error.message}`);
  }
}

function takeFreshTrip(){
  loadUsedTrips();
  let available=TRIP_PRIZES.filter(trip=>!usedTripIds.has(trip.id));
  if(!available.length){
    usedTripIds.clear();
    available=TRIP_PRIZES;
  }
  const trip=shuffle(available)[0];
  usedTripIds.add(trip.id);
  saveUsedTrips();
  return {...trip};
}

function fillShowcasePrize(prize){
  const filled=prize.tripSlot?takeFreshTrip():{...prize};
  return {...filled,announcerText:`It's ${filled.name}, from ${filled.brand}! ${filled.description}`};
}

export function createShowcases(){
  return shuffle(THEMES).slice(0,2).map(showcase=>{
    const prizes=showcase.prizes.map(fillShowcasePrize);
    return {...showcase,prizes,actualPrice:prizes.reduce((total,prize)=>total+prize.price,0)};
  });
}

export function tripBankStats(){
  loadUsedTrips();
  return {total:TRIP_PRIZES.length,used:usedTripIds.size,persistent:Boolean(tripBankStorageFile())};
}

export function resetTripBankForTests(options={}){
  usedTripIds.clear();
  usedTripIdsLoaded=true;
  if(options.clearStorage){
    const file=tripBankStorageFile();
    if(file)fs.rmSync(file,{force:true});
  }
}

export function configureTripBankStorageForTests(storageFile){
  tripBankFileOverride=storageFile||null;
  usedTripIds.clear();
  usedTripIdsLoaded=false;
  loadUsedTrips();
}
