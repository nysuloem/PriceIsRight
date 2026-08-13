// prizeSource.js — builds a 500+ item prize pool from Canadian retailer feeds.
import { expandedBiddingCatalog } from "./pricingGames.js";
import { exactPrizeKey, prizeFamilyKey } from "./prizeIdentity.js";
import { configureUnifiedPrizeBankForTests, resetUnifiedPrizeBankForTests, retireKeys, retiredKeys, unifiedPrizeBankStats } from "./prizeBank.js";
//
// Prices are in CAD and deliberately use the REGULAR price. Temporary sale,
// coupon, loyalty, financing, marketplace, open-box, and refurbished prices
// are ignored. The public API is compatible with the original module.
//
// Run standalone to test: node prizeSource.js

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-CA,en;q=0.9",
  Accept: "application/json,text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
};

const MIN_PRICE = 20;
const MAX_PRICE = 25000;
const TARGET_POOL_SIZE = 1200;
const PER_RETAILER_TARGET = 200;
const CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;

// These are first-party Canadian storefronts. Shopify's public product feed
// supplies current CAD prices, product URLs, vendor names, and product images.
const SHOPIFY_RETAILERS = [
  { retailer: "The Brick", baseUrl: "https://www.thebrick.com" },
  { retailer: "Leon's", baseUrl: "https://www.leons.ca" },
  { retailer: "Province of Canada", baseUrl: "https://provinceofcanada.com" },
  { retailer: "Peace Collective", baseUrl: "https://www.peace-collective.com" },
  { retailer: "Knix Canada", baseUrl: "https://knix.ca" },
  { retailer: "Herschel Supply Canada", baseUrl: "https://herschel.ca" },
  { retailer: "Saje Natural Wellness", baseUrl: "https://www.saje.ca" },
  { retailer: "Mastermind Toys", baseUrl: "https://mastermindtoys.com" },
  { retailer: "Snuggle Bugz", baseUrl: "https://snugglebugz.ca" },
];

// A small set of hand-curated fallbacks is retained so the game still has
// prizes if every live retailer is temporarily unavailable.
const CURATED_FALLBACKS = [
  {
    id: "instant-pot-duo-v5",
    type: "canadianTire",
    url: "https://www.canadiantire.ca/en/pdp/instant-pot-duo-v5-with-14-smart-programs-6-qt-0430121p.html",
    name: "Instant Pot Duo V5, 6-Qt",
    brand: "Instant Pot",
    retailer: "Canadian Tire",
    fallbackPrice: 159.99,
    image: "https://commons.wikimedia.org/wiki/Special:FilePath/Instant_Pot_%2849907000991%29.jpg",
    imageAlt: "Instant Pot Duo V5 multi-cooker",
    hostDescription:
      "From Canadian Tire — the Instant Pot Duo V5! Seven appliances in one six-quart pot, including a pressure cooker, slow cooker, rice maker, steamer, and warmer.",
  },
  {
    id: "keurig-k-express",
    type: "canadianTire",
    url: "https://www.canadiantire.ca/en/pdp/keurig-k-expresstm-single-serve-coffee-maker-black-0430788p.html",
    name: "Keurig K-Express Coffee Maker",
    brand: "Keurig",
    retailer: "Canadian Tire",
    fallbackPrice: 109.99,
    image: "https://i.ebayimg.com/images/g/ozoAAOSwo7NmNXcA/s-l500.jpg",
    imageAlt: "Keurig K-Express single serve coffee maker",
    hostDescription:
      "From Canadian Tire — the Keurig K-Express! A slim single-serve brewer with cup-size choices and a strong-brew setting.",
  },
  {
    id: "nintendo-switch-2",
    type: "bestBuy",
    url: "https://www.bestbuy.ca/en-ca/product/nintendo-switch-2-console/19296507",
    webCode: "19296507",
    name: "Nintendo Switch 2 Console",
    brand: "Nintendo",
    retailer: "Best Buy Canada",
    fallbackPrice: 629.99,
    image:
      "https://multimedia.bbycastatic.ca/multimedia/products/500x500/192/19296/19296507.jpg",
    imageAlt: "Nintendo Switch 2 Console",
    hostDescription:
      "From Best Buy Canada — the Nintendo Switch 2! A portable game system with a high-definition display, docked TV play, and magnetic Joy-Con 2 controllers.",
  },
  {
    id: "roots-original-sweatpant",
    type: "static",
    url: "https://www.roots.com/ca/en/",
    name: "Roots Organic Original Sweatpant",
    brand: "Roots",
    retailer: "Roots Canada",
    fallbackPrice: 84,
    image: null,
    imageAlt: "Roots Organic Original Sweatpant",
    hostDescription:
      "From Roots Canada — the Organic Original Sweatpant! Soft organic cotton fleece in a classic Canadian design.",
  },
];

// Large static fallback catalogue inspired by Canadian brick-and-mortar retail.
// These are not live offers; they keep Contestants' Row varied when public
// product feeds are slow or temporarily unavailable.
const CANADIAN_RETAILER_PRIZE_BLUEPRINTS = [
  { retailers: ["The Brick", "Leon's"], category: "Furniture", items: [
    ["fabric sofa", 1199], ["leather recliner", 899], ["sectional sofa", 2299],
    ["dining room set", 1499], ["queen bedroom suite", 1899], ["king mattress set", 1699],
    ["coffee table set", 699], ["TV stand with fireplace", 799], ["accent chair pair", 649],
    ["home office desk", 549], ["bookcase wall unit", 899], ["storage ottoman", 299],
  ] },
  { retailers: ["The Brick", "Leon's", "Canadian Appliance Source"], category: "Appliances", items: [
    ["French-door refrigerator", 2499], ["front-load washer", 1099], ["electric dryer", 999],
    ["stainless-steel range", 1299], ["built-in dishwasher", 899], ["over-the-range microwave", 449],
    ["chest freezer", 699], ["wine fridge", 549], ["upright freezer", 1099], ["range hood", 399],
  ] },
  { retailers: ["RONA", "Canadian Tire", "Home Depot Canada"], category: "Tools & Home Improvement", items: [
    ["cordless drill kit", 249], ["mitre saw", 399], ["socket and wrench set", 179],
    ["wet-dry shop vacuum", 169], ["laser level kit", 159], ["pressure washer", 349],
    ["step ladder", 129], ["garage shelving unit", 199], ["tool chest", 499],
    ["bathroom vanity", 699], ["kitchen faucet", 239], ["smart thermostat", 229],
  ] },
  { retailers: ["RONA", "Canadian Tire", "Home Depot Canada"], category: "Outdoor Living", items: [
    ["propane barbecue", 799], ["patio conversation set", 1499], ["gazebo", 999],
    ["electric lawn mower", 599], ["snow blower", 1099], ["garden shed", 899],
    ["fire pit table", 699], ["deck box", 199], ["patio umbrella", 249],
    ["string light package", 129], ["planter collection", 159], ["hose reel cart", 119],
  ] },
  { retailers: ["Best Buy Canada", "Staples Canada"], category: "Electronics", items: [
    ["4K smart television", 899], ["sound bar system", 499], ["laptop computer", 1199],
    ["tablet bundle", 649], ["wireless printer", 249], ["mesh Wi-Fi system", 349],
    ["noise-cancelling headphones", 329], ["gaming monitor", 399], ["robot vacuum", 599],
    ["smartwatch", 449], ["Bluetooth party speaker", 299], ["streaming camera kit", 229],
  ] },
  { retailers: ["Sleep Country Canada", "The Brick", "Leon's"], category: "Home & Kitchen", items: [
    ["memory-foam mattress", 1399], ["adjustable bed base", 1199], ["duvet and pillow set", 349],
    ["weighted blanket", 229], ["sheet and towel package", 299], ["air purifier", 399],
    ["espresso machine", 799], ["stand mixer", 549], ["air fryer oven", 279],
    ["cookware set", 399], ["countertop ice maker", 249], ["food processor", 219],
  ] },
];

// Contestants' Row needs six recognizably different departments, not colour or
// trim variants of the same product. These records are deliberately one item
// per product family and use the manufacturer as the brand.
const SIX_ROUND_PRIZE_CATALOG = [
  ["Clothing", "Roots", "Cabin fleece hoodie", "A warm cotton-fleece hoodie with a soft brushed interior.", 98, "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Canada Goose", "Down vest", "A lightweight insulated vest designed for cool Canadian weather.", 595, "https://images.unsplash.com/photo-1548883354-7622d03aca27?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Lululemon", "Training jacket", "A breathable zip-front jacket for workouts and everyday wear.", 168, "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Arc'teryx", "Waterproof shell", "A weatherproof shell jacket with an adjustable hood.", 500, "https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Levi's", "Denim jacket", "A classic trucker-style denim jacket with button pockets.", 129, "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Columbia", "Winter parka", "An insulated parka with a water-resistant outer shell.", 279, "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "RW&CO", "Tailored suit", "A coordinated tailored suit with professional fitting.", 498, "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Reitmans", "Wrap dress", "A versatile wrap dress with a softly draped silhouette.", 90, "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Simons", "Dress shirt collection", "Four crisp cotton dress shirts in classic colours.", 240, "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Aritzia", "Wool skirt", "A tailored wool skirt with a clean, modern cut.", 148, "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Blundstone", "Chelsea boots", "A durable pair of leather pull-on boots for year-round wear.", 265, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Nike", "Running shoes", "Lightweight cushioned running shoes for everyday training.", 190, "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "SAXX", "Underwear collection", "A collection of comfortable Canadian-designed everyday underwear.", 180, "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Smartwool", "Merino sock collection", "Six pairs of soft merino-wool socks for work and outdoor wear.", 168, "https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Joe Fresh", "Cotton pyjama set", "A comfortable cotton sleepwear set with matching robe.", 75, "https://images.unsplash.com/photo-1617952385804-7b31f8c2e7e2?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "Adidas", "Track suit", "A coordinated zip jacket and athletic pant set.", 180, "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=900&q=80"],
  ["Clothing", "The Bay", "Plush bathrobe", "A soft cotton bathrobe with deep pockets and a shawl collar.", 110, "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80"],
  ["Appliances", "KitchenAid", "Stand mixer", "A tilt-head stand mixer with a stainless-steel bowl and attachments.", 549, "https://images.unsplash.com/photo-1594385208974-2e75f8d7bb48?auto=format&fit=crop&w=900&q=80"],
  ["Appliances", "Dyson", "Cordless vacuum", "A powerful cordless vacuum with whole-machine filtration.", 799, "https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&w=900&q=80"],
  ["Appliances", "Breville", "Espresso machine", "A stainless-steel espresso machine with an integrated steam wand.", 899, "https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?auto=format&fit=crop&w=900&q=80"],
  ["Appliances", "Samsung", "Front-load washer", "A high-capacity washer with steam cycles and smart controls.", 1099, "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80"],
  ["Appliances", "LG", "French-door refrigerator", "A spacious refrigerator with adjustable shelves and a bottom freezer.", 2499, "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80"],
  ["Appliances", "Instant Pot", "Multi-cooker", "A large pressure cooker with slow-cook, steam and sauté settings.", 159, "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Birks", "Sterling silver necklace", "A polished sterling silver pendant on a fine chain.", 395, "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Mejuri", "Gold hoop earrings", "A pair of polished gold hoops for everyday wear.", 248, "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Pandora", "Charm bracelet", "A sterling silver bracelet with a collection of Canadian-themed charms.", 310, "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Swarovski", "Crystal tennis bracelet", "A rhodium-finished bracelet set with a continuous row of crystals.", 280, "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Tissot", "Classic wristwatch", "A Swiss-made stainless-steel watch with a leather strap.", 575, "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Peoples", "Diamond stud earrings", "A matched pair of round diamond studs in white gold.", 699, "https://images.unsplash.com/photo-1535556116002-6281ff3e9f36?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Birks", "Pearl ring", "A luminous cultured pearl set in polished sterling silver.", 450, "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Mejuri", "Gold bangle", "A slender polished gold bangle for everyday wear.", 398, "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Pandora", "Silver anklet", "A delicate sterling silver anklet with an adjustable clasp.", 125, "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Swarovski", "Crystal brooch", "A sculpted crystal brooch with a polished metal setting.", 220, "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Hugo Boss", "Cufflink set", "A pair of polished metal cufflinks in a presentation case.", 195, "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=900&q=80"],
  ["Jewellery", "Mikimoto", "Pearl pendant", "A cultured pearl pendant on a fine white-gold chain.", 1450, "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80"],
  ["Recreation", "Pelican", "Recreational kayak", "A stable sit-in kayak with paddle and personal flotation device.", 699, "https://images.unsplash.com/photo-1544551763-46a013bb70d5f?auto=format&fit=crop&w=900&q=80"],
  ["Recreation", "CCM", "Hockey equipment set", "Skates, helmet, gloves and protective equipment for the rink.", 849, "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=900&q=80"],
  ["Recreation", "Coleman", "Camping package", "A family tent, sleeping bags, camp stove and rechargeable lanterns.", 629, "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=900&q=80"],
  ["Recreation", "Trek", "Hybrid bicycle", "A versatile bicycle for city paths, fitness rides and weekend trails.", 1099, "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=900&q=80"],
  ["Recreation", "Callaway", "Golf club set", "A complete set of clubs with a cart bag and head covers.", 1299, "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?auto=format&fit=crop&w=900&q=80"],
  ["Recreation", "Napoleon", "Propane barbecue", "A Canadian-designed barbecue with side burner and folding shelves.", 999, "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80"],
  ["Electronics", "Sony", "OLED television", "A large 4K television with vivid colour and smart streaming apps.", 2199, "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&w=900&q=80"],
  ["Electronics", "Apple", "Tablet", "A lightweight tablet with a sharp display and all-day battery life.", 799, "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=900&q=80"],
  ["Electronics", "Nintendo", "Video game console", "A home and portable game system with two wireless controllers.", 629, "https://images.unsplash.com/photo-1486401899868-0e435ed85128?auto=format&fit=crop&w=900&q=80"],
  ["Electronics", "Bose", "Noise-cancelling headphones", "Wireless over-ear headphones with adjustable noise cancellation.", 479, "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80"],
  ["Electronics", "Canon", "Mirrorless camera", "A compact interchangeable-lens camera with a zoom lens.", 1249, "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80"],
  ["Electronics", "Lenovo", "Laptop computer", "A slim laptop with a bright display and generous solid-state storage.", 1199, "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80"],
  ["Furniture", "EQ3", "Leather lounge chair", "A Canadian-designed lounge chair with tailored leather upholstery.", 1899, "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=80"],
  ["Furniture", "IKEA", "Dining room set", "A solid dining table with six coordinating chairs.", 1099, "https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=900&q=80"],
  ["Furniture", "Article", "Sectional sofa", "A roomy upholstered sectional with deep, comfortable seating.", 2499, "https://images.unsplash.com/photo-1555041469-a586c61ea9bcf?auto=format&fit=crop&w=900&q=80"],
  ["Furniture", "Structube", "Bedroom collection", "A queen bed, two nightstands and a six-drawer dresser.", 1799, "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80"],
  ["Furniture", "La-Z-Boy", "Power recliner", "An upholstered recliner with powered footrest and adjustable head support.", 1699, "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=80"],
  ["Furniture", "Herman Miller", "Ergonomic office chair", "An adjustable task chair with breathable support for the home office.", 1795, "https://images.unsplash.com/photo-1580480055273-228ff5388ef8?auto=format&fit=crop&w=900&q=80"],
];

const CATALOG_IMAGE_RULES = [
  [/chest freezer/i, "https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?auto=format&fit=crop&w=900&q=80"],
  [/upright freezer|refrigerator/i, "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=900&q=80"],
  [/front-load washer|electric dryer/i, "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?auto=format&fit=crop&w=900&q=80"],
  [/dishwasher/i, "https://images.unsplash.com/photo-1604709177225-055f99402ea3?auto=format&fit=crop&w=900&q=80"],
  [/range hood|stainless-steel range|microwave/i, "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80"],
  [/desk|office/i, "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=80"],
  [/sofa|sectional/i, "https://images.unsplash.com/photo-1555041469-a586c61ea9bcf?auto=format&fit=crop&w=900&q=80"],
  [/recliner|accent chair/i, "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=900&q=80"],
  [/dining/i, "https://images.unsplash.com/photo-1617104678098-de229db51175?auto=format&fit=crop&w=900&q=80"],
  [/bedroom|mattress|bed base/i, "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80"],
  [/coffee table|tv stand|bookcase|ottoman/i, "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=80"],
  [/refrigerator|freezer|dishwasher|range|dryer|washer|microwave|hood/i, "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=900&q=80"],
  [/drill|saw|socket|vacuum|level|washer|ladder|shelving|tool chest/i, "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?auto=format&fit=crop&w=900&q=80"],
  [/vanity|faucet|thermostat/i, "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80"],
  [/barbecue|patio|gazebo|mower|snow blower|shed|fire pit|deck box|umbrella|planter|hose/i, "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80"],
  [/television|sound bar|laptop|tablet|printer|wi-fi|headphones|monitor|smartwatch|speaker|camera/i, "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=900&q=80"],
  [/duvet|blanket|sheet|towel|air purifier/i, "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=900&q=80"],
  [/espresso|mixer|air fryer|cookware|ice maker|food processor/i, "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80"],
];

const CATALOG_CATEGORY_IMAGES = {
  Furniture: "https://images.unsplash.com/photo-1555041469-a586c61ea9bcf?auto=format&fit=crop&w=900&q=80",
  Appliances: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=900&q=80",
  "Tools & Home Improvement": "https://images.unsplash.com/photo-1581166397057-235af2b3c6dd?auto=format&fit=crop&w=900&q=80",
  "Outdoor Living": "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
  Electronics: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=900&q=80",
  "Home & Kitchen": "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
};

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function asMoney(value) {
  const parsed = Number.parseFloat(String(value ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function plausiblePrice(value) {
  return Number.isFinite(value) && value >= MIN_PRICE && value <= MAX_PRICE;
}

function stripMarkup(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\*\*/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function hasFrenchCopy(value) {
  return /\b(à|avec|sans|pour|modèle|modele|couleur|noir|blanc|rouge|bleu|gris|laveuse|sécheuse|secheuse|réfrigérateur|refrigerateur|congélateur|congelateur|cuisinière|cuisiniere|ensemble|meuble|fauteuil|chaise|bureau|tablette)\b/i.test(String(value || ""));
}

function hasProductCode(value) {
  const text = String(value || "");
  return (
    /\b(?:model|modèle|modele|sku|item|article|part|web code|product code)\s*[:#]?\s*[A-Z0-9][A-Z0-9-]{3,}\b/i.test(text) ||
    /\b(?=[A-Z0-9-]{6,}\b)(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*\b/.test(text)
  );
}

function removeProductCodes(value) {
  return stripMarkup(value)
    .replace(/\s*\((?:model|modèle|modele|sku|item|article|part|web code|product code)?\s*#?\s*[A-Z0-9][A-Z0-9-]{3,}\)\s*/gi, " ")
    .replace(/\b(?:model|modèle|modele|sku|item|article|part|web code|product code)\s*[:#]?\s*[A-Z0-9][A-Z0-9-]{3,}\b/gi, " ")
    .replace(/\b(?=[A-Z0-9-]{6,}\b)(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function preferEnglishCopy(value) {
  const clean = removeProductCodes(value);
  if (!clean) return "";
  const parts = clean.split(/\s+(?:\/|\||•)\s+|\s{2,}/).map((part) => part.trim()).filter(Boolean);
  const english = parts.find((part) => !hasFrenchCopy(part));
  return english || (hasFrenchCopy(clean) ? "" : clean);
}

function cleanProductName(value) {
  return preferEnglishCopy(value)
    .replace(/\b(?:new|online only|web only|clearance|sale)\b/gi, " ")
    .replace(/\bAmuseables?\b/gi, " ")
    .replace(/\s+[—|]\s+.*$/, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function essentialProductName(value, category = "", brand = "") {
  const clean = cleanProductName(value);
  const withoutBrand = clean.replace(new RegExp(`^${String(brand || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "").trim();
  const text = `${withoutBrand} ${category}`.toLowerCase();
  const rules = [
    [/\b(laptop|notebook|chromebook)\b/, "Laptop computer"],
    [/\b(all-in-one|desktop computer|gaming desktop)\b/, "Desktop computer"],
    [/\boled\b.*\b(tv|television)\b|\b(tv|television)\b.*\boled\b/, "OLED smart television"],
    [/\bqled\b.*\b(tv|television)\b|\b(tv|television)\b.*\bqled\b/, "QLED smart television"],
    [/\b(tv|television)\b/, "4K smart television"],
    [/\bgaming monitor\b/, "Gaming monitor"],
    [/\bmonitor\b/, "Computer monitor"],
    [/\b(tablet|ipad)\b/, "Tablet"],
    [/\b(smartphone|mobile phone|iphone)\b/, "Smartphone"],
    [/\b(noise.?cancell?ing).*\bheadphones?\b|\bheadphones?\b.*\b(noise.?cancell?ing)\b/, "Noise-cancelling headphones"],
    [/\bheadphones?\b/, "Wireless headphones"],
    [/\bfrench.?door.*\brefrigerator\b/, "French-door refrigerator"],
    [/\brefrigerator\b/, "Refrigerator"],
    [/\bfront.?load.*\bwasher\b/, "Front-load washer"],
    [/\bwasher\b/, "Washing machine"],
    [/\bdryer\b/, "Clothes dryer"],
    [/\bdishwasher\b/, "Dishwasher"],
    [/\b(espresso|coffee) machine\b/, "Espresso machine"],
    [/\bstand mixer\b/, "Stand mixer"],
    [/\bcordless.*\bvacuum\b/, "Cordless vacuum"],
    [/\brobot.*\bvacuum\b/, "Robot vacuum"],
    [/\bsectional\b/, "Sectional sofa"],
    [/\brecliner\b/, "Recliner"],
    [/\bdining.*\bset\b/, "Dining room set"],
    [/\bmattress\b/, "Mattress set"],
    [/\b(short|long)[ -]?sleeve.*\b(shirt|top)\b|\b(shirt|top)\b/, "Shirt"],
    [/\bhoodie\b/, "Hoodie"],
    [/\bjacket\b/, "Jacket"],
    [/\bdress\b/, "Dress"],
    [/\b(boots?|shoes?|sneakers?)\b/, "Footwear"],
  ];
  const matched = rules.find(([pattern]) => pattern.test(text));
  if (matched) return matched[1];
  return withoutBrand
    .replace(/\([^)]*(?:\d|colour|color|size)[^)]*\)/gi, " ")
    .replace(/\s+(?:with|featuring|includes?)\s+.*$/i, "")
    .replace(/[,;:].*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim() || "Retail prize";
}

function productSpecificationDescription(rawName, briefName) {
  const source = stripMarkup(rawName);
  if (/laptop|notebook|chromebook/i.test(`${source} ${briefName}`)) {
    const screen = source.match(/\b(\d{2}(?:\.\d+)?)\s*(?:["”]|in(?:ch(?:es)?)?\b)/i)?.[1];
    const ram = source.match(/\b(\d+)\s*GB(?:\s+DDR\d?)?\s*(?:RAM|memory)\b/i)?.[1];
    const storage = source.match(/\b(\d+(?:\.\d+)?)\s*(TB|GB)\s*(SSD|solid[ -]?state drive|hard drive|storage)\b/i);
    const details = [screen ? `a ${screen}-inch display` : "", ram ? `${ram} GB of RAM` : "", storage ? `a ${storage[1]} ${storage[2].toUpperCase()} ${/ssd|solid/i.test(storage[3]) ? "solid-state drive" : "hard drive"}` : ""].filter(Boolean);
    if (details.length) return `A laptop with ${details.length === 1 ? details[0] : `${details.slice(0, -1).join(", ")} and ${details.at(-1)}`}.`;
  }
  if (/\b(tv|television)\b/i.test(`${source} ${briefName}`)) {
    const size = source.match(/\b(\d{2,3}(?:\.\d+)?)\s*(?:["”]|in(?:ch(?:es)?)?\b)/i)?.[1];
    const features = [size ? `a ${size}-inch screen` : "", /\b8k\b/i.test(source) ? "8K resolution" : /\b4k\b/i.test(source) ? "4K resolution" : "", /\boled\b/i.test(source) ? "OLED display technology" : /\bqled\b/i.test(source) ? "QLED display technology" : ""].filter(Boolean);
    if (features.length) return `A smart television with ${features.length === 1 ? features[0] : `${features.slice(0, -1).join(", ")} and ${features.at(-1)}`}.`;
  }
  return "";
}

function cleanSellerName(value, fallback = "a Canadian retailer") {
  const clean = cleanProductName(value);
  return clean || fallback;
}

function clipSpeechLine(value, maxLength = 110) {
  const clean = stripMarkup(value);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "") + "!";
}

function fullPrizeAnnouncement({ brand, name, description }) {
  const identity = [cleanSellerName(brand, "Canadian brand"), cleanProductName(name)].filter(Boolean).join(" ");
  return `It's the ${identity}! ${displayDescription({ brand, name, description })}`;
}

function fallbackFeatureDetails(baseName, category) {
  const text = `${baseName} ${category || ""}`.toLowerCase();
  const details = [
    [/washer/i, "a roomy drum, multiple wash cycles, and a modern laundry-room finish"],
    [/dryer/i, "sensor drying programs, generous capacity, and a clean front-control design"],
    [/refrigerator/i, "wide food storage, adjustable shelves, and a stainless-style finish"],
    [/dishwasher/i, "quiet cleaning cycles, flexible racks, and a streamlined kitchen look"],
    [/range|microwave|hood/i, "everyday cooking power, easy controls, and a coordinated kitchen finish"],
    [/freezer|wine fridge/i, "organized cold storage, adjustable temperature control, and a compact footprint"],
    [/sofa|sectional|recliner|chair/i, "comfortable seating, tailored upholstery, and a polished living-room look"],
    [/dining/i, "coordinated seating, a sturdy tabletop, and room for family dinners"],
    [/bedroom|mattress|bed base/i, "a coordinated sleep setup, supportive comfort, and a fresh bedroom style"],
    [/desk|office/i, "a practical work surface, built-in storage, and a clean home-office profile"],
    [/bookcase|tv stand|coffee table|ottoman/i, "useful storage, durable surfaces, and a coordinated living-space design"],
    [/drill|saw|socket|tool|vacuum|level|ladder|shelving/i, "workshop-ready construction, practical storage, and everyday project versatility"],
    [/vanity|faucet|thermostat/i, "a polished home-upgrade look, easy controls, and practical everyday use"],
    [/barbecue|patio|gazebo|mower|snow blower|shed|fire pit|deck box|umbrella|planter|hose/i, "outdoor-ready construction, useful seasonal features, and backyard-friendly style"],
    [/television|sound bar|laptop|tablet|printer|wi-fi|headphones|monitor|smartwatch|speaker|camera/i, "modern connectivity, easy controls, and everyday entertainment value"],
    [/duvet|blanket|sheet|towel|air purifier/i, "comfort-focused materials, simple everyday care, and a fresh home feel"],
    [/espresso|mixer|air fryer|cookware|ice maker|food processor/i, "countertop convenience, easy controls, and everyday kitchen versatility"],
  ];
  return details.find(([regex]) => regex.test(text))?.[1] || "practical features, everyday usefulness, and a polished home-ready design";
}

function fallbackImage(baseName, category) {
  const matched = CATALOG_IMAGE_RULES.find(([regex]) => regex.test(baseName));
  return matched?.[1] || CATALOG_CATEGORY_IMAGES[category] || CATALOG_CATEGORY_IMAGES["Home & Kitchen"];
}

function fallbackBrand(baseName) {
  const text = String(baseName).toLowerCase();
  const rules = [
    [/refrigerator|washer|dryer|dishwasher|range|microwave|freezer|wine fridge|range hood/, "LG"],
    [/sofa|sectional|recliner|dining|bedroom|coffee table|tv stand|accent chair|ottoman/, "CANVAS"],
    [/desk|bookcase|shelving|tool chest/, "Husky"],
    [/drill|mitre saw|laser level/, "DeWalt"],
    [/socket|wrench|wet-dry|pressure washer|ladder/, "Mastercraft"],
    [/vanity|faucet/, "Moen"],
    [/thermostat/, "ecobee"],
    [/barbecue/, "Napoleon"],
    [/patio|gazebo|fire pit|deck box|umbrella|planter|hose|string light/, "CANVAS"],
    [/lawn mower|snow blower/, "EGO"],
    [/garden shed/, "Keter"],
    [/television|sound bar/, "Samsung"],
    [/laptop|tablet|printer|wi-fi|monitor/, "HP"],
    [/headphones|speaker/, "JBL"],
    [/robot vacuum/, "iRobot"],
    [/smartwatch/, "Garmin"],
    [/camera/, "Canon"],
    [/mattress|bed base/, "Sealy"],
    [/duvet|blanket|sheet|towel/, "GlucksteinHome"],
    [/air purifier/, "Honeywell"],
    [/espresso/, "Breville"],
    [/mixer|food processor/, "KitchenAid"],
    [/air fryer|ice maker/, "Ninja"],
    [/cookware/, "Paderno"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || "Canadian Living";
}

function displayDescription(item) {
  const category = cleanProductName(item.category || item.bidCategory || "retail prize").toLowerCase();
  const existing = preferEnglishCopy(item.description || item.shortDescription || item.hostDescription)
    .replace(/^(?:(?:sold by|available (?:from|at)|from)\s+[^,.;—]+[,.;—]\s*)+/i, "")
    .replace(/^it'?s\s+(?:an?\s+)?/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const subject = existing.match(/^The\s+(.{2,80}?)\s+(?:is|are)\s+(.+)$/i);
  const identityWords = `${item.brand || ""} ${item.name || ""}`.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
  const subjectWords = subject?.[1].toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean) || [];
  const conciseExisting = subject && subjectWords.length >= 2 && subjectWords.every(word => identityWords.includes(word)) ? subject[2] : existing;
  const completeSentences = conciseExisting
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 35 && sentence.length <= 210 && !/contestants?'? row|substantial|department|regular canadian retail price|shop now|learn more/i.test(sentence));
  const detail = completeSentences.find((sentence) => /\d|with|features?|includes?|made|designed/i.test(sentence))
    || completeSentences[0]
    || fallbackFeatureDetails(item.name || category, category);
  const sentence = detail.replace(/^(?:sold by|from)\s+[^,.;—]+[,.;—]\s*/i, "").trim();
  const capitalized = sentence ? sentence[0].toUpperCase() + sentence.slice(1) : "";
  return `${capitalized.replace(/[.!?]+$/, "")}.`.replace(/\.\.+$/g, ".");
}

function isDisplayReadyPrize(item) {
  const visible = `${item?.name || ""} ${item?.brand || ""} ${item?.retailer || ""} ${item?.category || ""} ${item?.description || ""}`;
  const description = displayDescription(item || {});
  return (
    Boolean(item?.image) &&
    cleanProductName(item?.name).length >= 3 &&
    description.length >= 35 &&
    !hasFrenchCopy(visible) &&
    !hasProductCode(visible)
  );
}

function buildCanadianRetailerCatalog() {
  const sixRound = SIX_ROUND_PRIZE_CATALOG.map(([category, brand, name, description, exactPrice, image], index) => ({
    id: `six-round-${slugify(category)}-${index + 1}`,
    name, brand, retailer: "Canadian prize catalogue", exactPrice, price: Math.round(exactPrice),
    priceIsLive: false, priceKind: "regular", currency: "CAD", url: `catalogue:six-round/${index + 1}`,
    image, imageKind: "representative", imageAlt: name, description, category,
    hostDescription: `${brand} ${name}! ${description}`,
  }));
  const departmentPrizes = CANADIAN_RETAILER_PRIZE_BLUEPRINTS.flatMap((section) =>
    section.items.map(([baseName, basePrice], index) => {
      const retailer = section.retailers[index % section.retailers.length];
      const brand = fallbackBrand(baseName);
      return {
        id: `canadian-department-${slugify(baseName)}`,
        name: baseName[0].toUpperCase() + baseName.slice(1), brand, retailer,
        exactPrice: basePrice, price: Math.round(basePrice), priceIsLive: false,
        priceKind: "regular", currency: "CAD", url: `catalogue:department/${slugify(baseName)}`,
        image: fallbackImage(baseName, section.category), imageKind: "representative", imageAlt: baseName,
        description: `${fallbackFeatureDetails(baseName, section.category)[0].toUpperCase()}${fallbackFeatureDetails(baseName, section.category).slice(1)}.`,
        category: section.category,
      };
    }),
  );
  return [...sixRound, ...departmentPrizes];
}

async function fetchData(url) {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

const MARKDOWN_WORDS = /\b(last call|final sale|clearance|closeout|liquidation)\b/i;

export function chooseShopifyRegularPrice(product) {
  const productCopy = `${product?.title || ""} ${product?.handle || ""} ${product?.tags || ""}`;
  if (MARKDOWN_WORDS.test(productCopy)) return null;
  const available = (product.variants || []).filter((variant) => variant.available !== false);
  const variants = available.length ? available : product.variants || [];
  const prices = variants
    .map((variant) => {
      const sellingPrice = asMoney(variant.price);
      const compareAtPrice = asMoney(variant.compare_at_price);
      // A crossed-out compare-at price means the variant is discounted. The
      // game uses regular merchandise only, so reject that variant entirely.
      if (compareAtPrice && compareAtPrice > sellingPrice) return null;
      return sellingPrice;
    })
    .filter(plausiblePrice);
  return prices.length ? Math.min(...prices) : null;
}

export function normalizeShopifyProduct(config, product) {
  const regularPrice = chooseShopifyRegularPrice(product);
  if (!regularPrice || !product.handle || !product.title) return null;

  const image = product.images?.[0]?.src || product.image?.src || null;
  const brand = cleanSellerName(product.vendor, config.retailer);
  const rawName = cleanProductName(product.title);
  const category = cleanProductName(product.product_type) || "General merchandise";
  const name = essentialProductName(rawName, category, brand);
  const description = productSpecificationDescription(product.title, name) || displayDescription({ description: product.body_html, category, brand, retailer: config.retailer, name });
  if (!name) return null;
  const url = `${config.baseUrl}/products/${product.handle}`;

  return {
    id: `${slugify(config.retailer)}-${product.id}`,
    name,
    brand,
    retailer: config.retailer,
    exactPrice: regularPrice,
    price: Math.round(regularPrice),
    priceIsLive: true,
    priceKind: "regular",
    currency: "CAD",
    url,
    image,
    imageKind: "product",
    imageAlt: name,
    description,
    category,
    hostDescription: fullPrizeAnnouncement({ brand, name, description }),
  };
}

async function fetchShopifyRetailer(config) {
  try {
    const url = `${config.baseUrl}/products.json?limit=250`;
    const response = await fetchData(url);
    const data = await response.json();
    if (!Array.isArray(data.products)) throw new Error("Invalid product feed");
    return data.products
      .map((product) => normalizeShopifyProduct(config, product))
      .filter(Boolean)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn(`[prizeSource] ${config.retailer}: ${err.message}`);
    return [];
  }
}

function isSuitableBestBuyProduct(product) {
  const text = `${product.name || ""} ${product.shortDescription || ""}`.toLowerCase();
  const excluded = /\b(open[ -]?box|refurbished|renewed|used|pre-owned|monthly financing|digital download|last call|final sale|clearance|closeout|liquidation)\b/;
  const firstParty = product.isMarketplace === false || product.seller?.name === "Best Buy";
  const regularPrice = asMoney(product.regularPrice);
  const sellingPrice = asMoney(product.salePrice ?? product.currentPrice ?? product.price);
  return (
    firstParty &&
    product.isVisible !== false &&
    !excluded.test(text) &&
    plausiblePrice(regularPrice) &&
    !(plausiblePrice(sellingPrice) && sellingPrice < regularPrice)
  );
}

export function normalizeBestBuyProduct(product) {
  if (!isSuitableBestBuyProduct(product)) return null;
  const regularPrice = asMoney(product.regularPrice);
  const rawName = cleanProductName(product.name);
  const brand = cleanSellerName(product.manufacturer || product.brand || rawName.split(/\s+/)[0], "Best Buy");
  const category = cleanProductName(product.categoryName) || "Electronics";
  const name = essentialProductName(rawName, category, brand);
  const description = productSpecificationDescription(product.name, name) || displayDescription({ description: product.shortDescription, category, brand, retailer: "Best Buy Canada", name });
  if (!name) return null;
  const url = new URL(product.productUrl, "https://www.bestbuy.ca").href;

  return {
    id: `best-buy-${product.sku}`,
    name,
    brand,
    retailer: "Best Buy Canada",
    exactPrice: regularPrice,
    price: Math.round(regularPrice),
    priceIsLive: true,
    priceKind: "regular",
    currency: "CAD",
    url,
    image: product.highResImage || product.thumbnailImage || null,
    imageKind: "product",
    imageAlt: name,
    description,
    category,
    hostDescription: fullPrizeAnnouncement({ brand, name, description }),
  };
}

async function fetchBestBuyProducts(wanted = 160) {
  const products = [];
  const seen = new Set();

  for (let page = 1; page <= 12 && products.length < wanted; page += 1) {
    try {
      const url =
        `https://www.bestbuy.ca/api/v2/json/search?categoryid=20001` +
        `&page=${page}&pageSize=100`;
      const response = await fetchData(url);
      const data = await response.json();
      for (const rawProduct of data.products || []) {
        const product = normalizeBestBuyProduct(rawProduct);
        if (product && !seen.has(product.id)) {
          seen.add(product.id);
          products.push(product);
        }
      }
    } catch (err) {
      console.warn(`[prizeSource] Best Buy page ${page}: ${err.message}`);
      break; // stop trying more pages if one fails
    }
  }

  return products;
}

// Extract regular/list price from structured page data. This is intentionally
// conservative: an ambiguous page falls back instead of risking a sale price.
function extractRegularPrice(html) {
  const patterns = [
    /"regularPrice"\s*:\s*"?(\d[\d,]*(?:\.\d{1,2})?)/i,
    /"listPrice"\s*:\s*"?(\d[\d,]*(?:\.\d{1,2})?)/i,
    /"compareAtPrice"\s*:\s*"?(\d[\d,]*(?:\.\d{1,2})?)/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    const value = match ? asMoney(match[1]) : null;
    if (plausiblePrice(value)) return value;
  }
  return null;
}

async function fetchCuratedFallback(candidate) {
  let exactPrice = candidate.fallbackPrice;
  let priceIsLive = false;
  let image = candidate.image || null;

  try {
    if (candidate.type !== "static") {
      const html = await (await fetchData(candidate.url)).text();
      const regularPrice = extractRegularPrice(html);
      if (regularPrice !== null) {
        exactPrice = regularPrice;
        priceIsLive = true;
      }
    }
    if (candidate.type === "bestBuy" && candidate.webCode && !image) {
      const code = candidate.webCode;
      image = `https://multimedia.bbycastatic.ca/multimedia/products/500x500/${code.slice(0, 3)}/${code.slice(0, 5)}/${code}.jpg`;
    }
  } catch (error) {
    console.warn(`[prizeSource] ${candidate.id}: ${error.message}; using fallback`);
  }

  return {
    id: candidate.id,
    name: cleanProductName(candidate.name),
    brand: cleanSellerName(candidate.brand, candidate.retailer),
    retailer: candidate.retailer,
    exactPrice,
    price: Math.round(exactPrice),
    priceIsLive,
    priceKind: "regular",
    currency: "CAD",
    url: candidate.url,
    image,
    imageKind: priceIsLive ? "product" : "representative",
    imageAlt: cleanProductName(candidate.imageAlt) || cleanProductName(candidate.name),
    description: displayDescription(candidate),
    category: cleanProductName(candidate.category) || "General merchandise",
    hostDescription: clipSpeechLine(`From ${candidate.retailer} — ${candidate.name}!`),
  };
}

function deduplicate(items) {
  const ids = new Set();
  const urls = new Set();
  return items.filter((item) => {
    if (!item || ids.has(item.id) || urls.has(item.url)) return false;
    ids.add(item.id);
    urls.add(item.url);
    return true;
  });
}

export function prizeCategory(item) {
  const text = `${item.category || ""} ${item.name || ""}`.toLowerCase();
  if (/\b(jewellery|jewelry|necklace|earrings?|bracelet|pendant|diamond|gold hoop|wristwatch|ring|bangle|anklet|brooch|cufflinks?|pearl)\b/.test(text)) return "Jewellery";
  if (/\b(furniture|sofa|sectional|recliner|lounge chair|dining room|bedroom|office chair|mattress|bookcase|ottoman|desk)\b/.test(text)) return "Furniture";
  if (/\b(appliances?|refrigerator|freezer|washer|dryer|dishwasher|range|microwave|vacuum|mixer|espresso|multi-cooker|air fryer)\b/.test(text)) return "Appliances";
  if (/\b(tv|television|laptop|computer|tablet|phone|camera|speaker|headphone|console|gaming|electronics?)\b/.test(text)) return "Electronics";
  if (/\b(recreation|outdoor|camp|kayak|bike|bicycle|sport|fitness|golf|hockey|barbecue|scooter)\b/.test(text)) return "Recreation";
  if (/\b(shirt|tee|t-shirt|hoodie|sweater|sweatshirt|pant|jogger|legging|dress|skirt|suit|tracksuit|track suit|pyjama|pajama|robe|boots?|shoes?|bra|underwear|sock|jacket|coat|parka|vest|apparel|clothing)\b/.test(text)) return "Clothing";
  return "Other";
}

// Deliberately broad: once a T-shirt has appeared in a room, another T-shirt
// is not considered a fresh experience merely because its colour or logo is
// different.
export function prizeFamily(item) {
  return prizeFamilyKey(item);
}

export function normalizePrizePresentation(item) {
  const brand = cleanSellerName(item.brand, item.retailer);
  const brandPattern = new RegExp(`^${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i");
  const enriched = { ...item, brand, name: cleanProductName(item.name).replace(brandPattern, "").trim(), description: displayDescription(item) };
  return { ...enriched, hostDescription: fullPrizeAnnouncement(enriched), bidCategory: prizeCategory(enriched), prizeFamily: prizeFamily(enriched) };
}

const enrichPrize = normalizePrizePresentation;

function reduceSimilarPrizes(items) {
  const families = new Set();
  return items.filter(item => {
    const family = prizeFamilyKey(item);
    if (families.has(family)) return false;
    families.add(family);
    return true;
  });
}

// Interleaving prevents one large retailer from crowding the others out.
function interleaveRetailers(groups, targetSize) {
  const result = [];
  const positions = groups.map(() => 0);
  let added = true;

  while (result.length < targetSize && added) {
    added = false;
    for (let i = 0; i < groups.length && result.length < targetSize; i += 1) {
      const item = groups[i][positions[i]];
      if (item) {
        result.push(item);
        positions[i] += 1;
        added = true;
      }
    }
  }
  return deduplicate(result);
}

export async function fetchPrizePool() {
  const settled = await Promise.allSettled([
    ...SHOPIFY_RETAILERS.map(fetchShopifyRetailer),
    fetchBestBuyProducts(PER_RETAILER_TARGET * 2),
  ]);

  const groups = settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const source = SHOPIFY_RETAILERS[index]?.retailer || "Best Buy Canada";
    console.warn(`[prizeSource] ${source}: ${result.reason?.message || result.reason}`);
    return [];
  });

  // Give each source an equal initial quota, then use every remaining product
  // as a fill pool if a smaller retailer has fewer than 70 eligible products.
  const quotaGroups = groups.map((group) => group.slice(0, PER_RETAILER_TARGET));
  let items = interleaveRetailers(quotaGroups, TARGET_POOL_SIZE);

  if (items.length < TARGET_POOL_SIZE) {
    const overflow = groups.flatMap((group) => group.slice(PER_RETAILER_TARGET));
    items = deduplicate([...items, ...overflow]).slice(0, TARGET_POOL_SIZE);
  }

  const curated = await Promise.all(CURATED_FALLBACKS.map(fetchCuratedFallback));
  const localCatalog = expandedBiddingCatalog();
  const canadianRetailerCatalog = buildCanadianRetailerCatalog();
  items = reduceSimilarPrizes(
    deduplicate([...items, ...curated, ...localCatalog, ...canadianRetailerCatalog])
      .map(enrichPrize)
      .filter(isDisplayReadyPrize),
  );

  if (items.length < 200) {
    console.warn(
      `[prizeSource] Only ${items.length} varied prizes were available; ` +
        "one or more retailer feeds may be temporarily unavailable.",
    );
  }

  return items;
}

// Always keep a usable local pool ready. Live retailer refreshes happen in the
// background, so a round transition never waits on several slow shop sites.
const retiredPrizeIds = new Set();
const retiredPrizeFingerprints = new Set();
const REFILL_THRESHOLD = 120;
let prizeBankFileOverride;
let retiredPrizeIdsLoaded = false;

function prizeFingerprint(item) {
  return prizeFamilyKey(item);
}

function loadRetiredPrizeIds() {
  if (retiredPrizeIdsLoaded) return;
  retiredPrizeIdsLoaded = true;
  const stored = retiredKeys("bidding");
  stored.exact.forEach(key => retiredPrizeIds.add(key));
  stored.families.forEach(key => retiredPrizeFingerprints.add(key));
}

function saveRetiredPrizeIds() {
  retireKeys("bidding", { exact: [...retiredPrizeIds], families: [...retiredPrizeFingerprints] });
}

function availablePrizes(items) {
  loadRetiredPrizeIds();
  const stored = retiredKeys("bidding");
  stored.exact.forEach(key => retiredPrizeIds.add(key));
  stored.families.forEach(key => retiredPrizeFingerprints.add(key));
  return items.filter((item) => !retiredPrizeIds.has(exactPrizeKey(item)) && !retiredPrizeFingerprints.has(prizeFingerprint(item)));
}

const buildLocalFallbackPool = () => reduceSimilarPrizes(
  [
    ...CURATED_FALLBACKS.map(enrichPrize),
    ...expandedBiddingCatalog().map(enrichPrize),
    ...buildCanadianRetailerCatalog().map(enrichPrize),
  ].filter(isDisplayReadyPrize),
);
loadRetiredPrizeIds();
let cache = { items: availablePrizes(buildLocalFallbackPool()), fetchedAt: 0 };
let refreshPromise = null;

async function refreshPrizePool() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetchPrizePool()
    .then((items) => {
      const available = availablePrizes(items);
      cache = { items: available, fetchedAt: Date.now() };
      return available;
    })
    .catch((err) => {
      console.error("[prizeSource] fetchPrizePool failed:", err.message);
      return cache.items;
    })
    .finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export async function getPrizePool(forceRefresh = false) {
  loadRetiredPrizeIds();
  const stale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
  if (forceRefresh) return refreshPrizePool();
  if (stale || cache.items.length < REFILL_THRESHOLD) void refreshPrizePool();
  return cache.items;
}

// Mirrors Trivial Pursuit's used-question bank: a selected prize immediately
// leaves the available bank. A low bank triggers a background retailer refill;
// only genuinely new verified product IDs can enter again.
export function retirePrize(id) {
  if (!id) return false;
  loadRetiredPrizeIds();
  const usedPrize = cache.items.find((item) => item.id === id);
  const exact = exactPrizeKey(usedPrize || id), alreadyRetired = retiredPrizeIds.has(exact);
  retiredPrizeIds.add(exact);
  if (usedPrize) retiredPrizeFingerprints.add(prizeFingerprint(usedPrize));
  if (!alreadyRetired || usedPrize) saveRetiredPrizeIds();
  cache = { ...cache, items: cache.items.filter((item) => item.id !== id) };
  if (usedPrize) cache = { ...cache, items: availablePrizes(cache.items) };
  if (cache.items.length < REFILL_THRESHOLD) void refreshPrizePool();
  return !alreadyRetired;
}

export function prizeBankStats() {
  loadRetiredPrizeIds();
  return {
    available: cache.items.length,
    used: retiredPrizeIds.size,
    usedFingerprints: retiredPrizeFingerprints.size,
    refilling: Boolean(refreshPromise),
    threshold: REFILL_THRESHOLD,
    persistent: unifiedPrizeBankStats().persistent,
  };
}

export function resetPrizeBankForTests(options = {}) {
  resetUnifiedPrizeBankForTests(options);
  retiredPrizeIds.clear();
  retiredPrizeFingerprints.clear();
  retiredPrizeIdsLoaded = true;
  cache = { items: availablePrizes(buildLocalFallbackPool()), fetchedAt: Date.now() };
  refreshPromise = null;
}

export function configurePrizeBankStorageForTests(storageFile) {
  prizeBankFileOverride = storageFile || null;
  configureUnifiedPrizeBankForTests(storageFile);
  retiredPrizeIds.clear();
  retiredPrizeFingerprints.clear();
  retiredPrizeIdsLoaded = false;
  loadRetiredPrizeIds();
  cache = { items: availablePrizes(buildLocalFallbackPool()), fetchedAt: Date.now() };
  refreshPromise = null;
}

export function pickRandomItem(pool, excludeId = null) {
  const candidates = excludeId ? pool.filter((item) => item.id !== excludeId) : pool;
  const list = candidates.length ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}

export function summarizePrizePool(pool) {
  const byRetailer = {};
  for (const item of pool) {
    byRetailer[item.retailer] = (byRetailer[item.retailer] || 0) + 1;
  }
  return {
    total: pool.length,
    live: pool.filter((item) => item.priceIsLive).length,
    regularPrice: pool.filter((item) => item.priceKind === "regular").length,
    retailers: byRetailer,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPrizePool()
    .then((items) => {
      console.log(JSON.stringify(summarizePrizePool(items), null, 2));
      console.log(JSON.stringify(items.slice(0, 5), null, 2));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
