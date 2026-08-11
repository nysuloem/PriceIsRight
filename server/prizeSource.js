// prizeSource.js — builds a 500+ item prize pool from Canadian retailer feeds.
import { expandedBiddingCatalog } from "./pricingGames.js";
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
const CANADIAN_RETAILER_VARIANTS = [
  ["Classic", 0],
  ["Deluxe", 0.12],
  ["Premium", 0.24],
  ["Compact", -0.1],
];

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

const CATALOG_IMAGE_RULES = [
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

function clipSpeechLine(value, maxLength = 110) {
  const clean = stripMarkup(value);
  if (clean.length <= maxLength) return clean;
  return clean.slice(0, maxLength - 1).replace(/\s+\S*$/, "") + "!";
}

function makeHostDescription(retailer, name) {
  const intro = `From ${retailer} — ${name}!`;
  return clipSpeechLine(intro);
}

function fallbackDescription(retailer, variant, baseName, category) {
  const style = {
    Classic: "a dependable everyday",
    Deluxe: "an upgraded",
    Premium: "a premium",
    Compact: "a space-saving",
  }[variant] || "a featured";
  const categoryText = String(category || "home").toLowerCase();
  return `From ${retailer}, ${style} ${baseName} from the ${categoryText} department, chosen as a substantial Contestants' Row prize.`;
}

function fallbackImage(baseName, category) {
  const matched = CATALOG_IMAGE_RULES.find(([regex]) => regex.test(baseName));
  return matched?.[1] || CATALOG_CATEGORY_IMAGES[category] || CATALOG_CATEGORY_IMAGES["Home & Kitchen"];
}

function displayDescription(item) {
  const existing = stripMarkup(item.description || item.shortDescription || item.hostDescription);
  if (existing && existing.length >= 35 && !/^from [^—]+—[^.!]+!?$/i.test(existing)) return clipSpeechLine(existing, 150);
  const category = item.category || item.bidCategory || "retail";
  const retailer = item.retailer || item.brand || "a Canadian retailer";
  return clipSpeechLine(`A ${String(category).toLowerCase()} prize available from ${retailer}, selected with a regular Canadian retail price.`, 150);
}

function isDisplayReadyPrize(item) {
  return Boolean(item?.image) && displayDescription(item).length >= 35;
}

function buildCanadianRetailerCatalog() {
  const prizes = [];
  for (const section of CANADIAN_RETAILER_PRIZE_BLUEPRINTS) {
    section.items.forEach(([baseName, basePrice], itemIndex) => {
      section.retailers.forEach((retailer, retailerIndex) => {
        CANADIAN_RETAILER_VARIANTS.forEach(([variant, multiplier], variantIndex) => {
          const name = `${variant} ${baseName}`;
          const description = fallbackDescription(retailer, variant, baseName, section.category);
          const exactPrice = Math.max(
            MIN_PRICE,
            Math.round((basePrice * (1 + multiplier) + retailerIndex * 37 + itemIndex * 11) * 100) / 100,
          );
          prizes.push({
            id: `canadian-retail-${slugify(retailer)}-${slugify(name)}-${variantIndex}`,
            name,
            brand: retailer,
            retailer,
            exactPrice,
            price: Math.round(exactPrice),
            priceIsLive: false,
            priceKind: "regular",
            currency: "CAD",
            url: `catalogue:${slugify(retailer)}/${slugify(name)}`,
            image: fallbackImage(baseName, section.category),
            imageAlt: name,
            description,
            category: section.category,
            hostDescription: clipSpeechLine(`${makeHostDescription(retailer, name)} ${description}`, 170),
          });
        });
      });
    });
  }
  return prizes;
}

async function fetchData(url) {
  const response = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
}

function chooseShopifyRegularPrice(product) {
  const available = (product.variants || []).filter((variant) => variant.available !== false);
  const variants = available.length ? available : product.variants || [];
  const prices = variants
    .map((variant) => {
      const sellingPrice = asMoney(variant.price);
      const compareAtPrice = asMoney(variant.compare_at_price);
      // Shopify compare_at_price is the crossed-out regular price during a sale.
      return compareAtPrice && compareAtPrice > sellingPrice ? compareAtPrice : sellingPrice;
    })
    .filter(plausiblePrice);
  return prices.length ? Math.min(...prices) : null;
}

function normalizeShopifyProduct(config, product) {
  const regularPrice = chooseShopifyRegularPrice(product);
  if (!regularPrice || !product.handle || !product.title) return null;

  const image = product.images?.[0]?.src || product.image?.src || null;
  const brand = stripMarkup(product.vendor) || config.retailer;
  const name = stripMarkup(product.title);
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
    imageAlt: name,
    description: displayDescription({ description: product.body_html, category: product.product_type, retailer: config.retailer }),
    category: stripMarkup(product.product_type) || "General merchandise",
    hostDescription: makeHostDescription(config.retailer, name, product.body_html),
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
  const excluded = /\b(open[ -]?box|refurbished|renewed|used|pre-owned|monthly financing|digital download)\b/;
  const firstParty = product.isMarketplace === false || product.seller?.name === "Best Buy";
  return (
    firstParty &&
    product.isVisible !== false &&
    !excluded.test(text) &&
    plausiblePrice(asMoney(product.regularPrice))
  );
}

function normalizeBestBuyProduct(product) {
  if (!isSuitableBestBuyProduct(product)) return null;
  const regularPrice = asMoney(product.regularPrice);
  const name = stripMarkup(product.name);
  const url = new URL(product.productUrl, "https://www.bestbuy.ca").href;

  return {
    id: `best-buy-${product.sku}`,
    name,
    brand: name.split(/\s+/)[0] || "Best Buy",
    retailer: "Best Buy Canada",
    exactPrice: regularPrice,
    price: Math.round(regularPrice),
    priceIsLive: true,
    priceKind: "regular",
    currency: "CAD",
    url,
    image: product.highResImage || product.thumbnailImage || null,
    imageAlt: name,
    description: displayDescription({ description: product.shortDescription, category: product.categoryName, retailer: "Best Buy Canada" }),
    category: stripMarkup(product.categoryName) || "Electronics",
    hostDescription: makeHostDescription(
      "Best Buy Canada",
      name,
      product.shortDescription,
    ),
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
    name: candidate.name,
    brand: candidate.brand,
    retailer: candidate.retailer,
    exactPrice,
    price: Math.round(exactPrice),
    priceIsLive,
    priceKind: "regular",
    currency: "CAD",
    url: candidate.url,
    image,
    imageAlt: candidate.imageAlt,
    description: displayDescription(candidate),
    category: candidate.category || "General merchandise",
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
  if (/\b(tv|television|laptop|computer|tablet|phone|camera|speaker|headphone|console|gaming|electronics?)\b/.test(text)) return "Electronics";
  if (/\b(toy|game|puzzle|doll|lego|playset|scooter)\b/.test(text)) return "Toys & Games";
  if (/\b(baby|infant|stroller|car seat|crib|nursery|toddler)\b/.test(text)) return "Baby & Family";
  if (/\b(kitchen|cook|coffee|toaster|blender|mixer|furniture|lamp|bedding|blanket|vacuum|home)\b/.test(text)) return "Home & Kitchen";
  if (/\b(skincare|beauty|shampoo|conditioner|makeup|wellness|oil|cream|lotion|diffuser)\b/.test(text)) return "Beauty & Wellness";
  if (/\b(backpack|luggage|bag|wallet|watch|sunglasses|travel)\b/.test(text)) return "Travel & Accessories";
  if (/\b(outdoor|camp|bike|sport|fitness|golf|hockey|garden)\b/.test(text)) return "Sports & Outdoors";
  if (/\b(shirt|tee|t-shirt|hoodie|sweater|sweatshirt|pant|jogger|legging|dress|bra|underwear|sock|jacket|coat|apparel|clothing)\b/.test(text)) return "Apparel";
  return "General Merchandise";
}

// Deliberately broad: once a T-shirt has appeared in a room, another T-shirt
// is not considered a fresh experience merely because its colour or logo is
// different.
export function prizeFamily(item) {
  const text = `${item.category || ""} ${item.name || ""}`.toLowerCase();
  const families = [
    ["t-shirt", /\b(t-?shirt|tee)\b/], ["hoodie", /\b(hoodie|sweatshirt)\b/],
    ["sweater", /\b(sweater|cardigan|crewneck)\b/], ["pants", /\b(sweatpant|jogger|legging|trouser|pants?)\b/],
    ["underwear", /\b(bra|underwear|brief|boxer)\b/], ["socks", /\bsocks?\b/],
    ["outerwear", /\b(jacket|coat|parka|vest)\b/], ["backpack", /\b(backpack|rucksack)\b/],
    ["luggage", /\b(luggage|suitcase|duffel)\b/], ["stroller", /\bstroller\b/],
    ["car-seat", /\bcar seat\b/], ["headphones", /\b(headphone|earbud|headset)\b/],
    ["speaker", /\bspeaker\b/], ["television", /\b(tv|television)\b/], ["computer", /\b(laptop|computer|chromebook)\b/],
    ["game-console", /\b(console|nintendo switch|playstation|xbox)\b/], ["coffee-maker", /\b(coffee maker|espresso|keurig)\b/],
    ["skincare", /\b(serum|face cream|moisturizer|cleanser|skincare)\b/], ["diffuser", /\bdiffuser\b/],
    ["board-game", /\b(board game|puzzle|card game)\b/], ["building-toy", /\b(lego|building set|blocks)\b/],
  ];
  const matched = families.find(([, regex]) => regex.test(text));
  if (matched) return matched[0];
  const normalized = (item.name || "prize").toLowerCase()
    .replace(/\b(men'?s|women'?s|kids?'?|black|white|blue|red|green|pink|grey|gray|small|medium|large|new|classic|original)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).slice(0, 4).join("-");
  return normalized || item.id;
}

function enrichPrize(item) {
  const enriched = { ...item, description: displayDescription(item) };
  return { ...enriched, bidCategory: prizeCategory(enriched), prizeFamily: prizeFamily(enriched) };
}

function reduceSimilarPrizes(items) {
  const familyCounts = new Map();
  const apparelLimit = 36;
  let apparelCount = 0;
  return items.filter(item => {
    const family = item.prizeFamily;
    const count = familyCounts.get(family) || 0;
    if (count >= 3) return false;
    if (item.bidCategory === "Apparel" && apparelCount >= apparelLimit) return false;
    familyCounts.set(family, count + 1);
    if (item.bidCategory === "Apparel") apparelCount += 1;
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
const REFILL_THRESHOLD = 120;
const buildLocalFallbackPool = () => reduceSimilarPrizes(
  [
    ...CURATED_FALLBACKS.map(enrichPrize),
    ...expandedBiddingCatalog().map(enrichPrize),
    ...buildCanadianRetailerCatalog().map(enrichPrize),
  ].filter(isDisplayReadyPrize),
);
let cache = { items: buildLocalFallbackPool(), fetchedAt: 0 };
let refreshPromise = null;

async function refreshPrizePool() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetchPrizePool()
    .then((items) => {
      const available = items.filter((item) => !retiredPrizeIds.has(item.id));
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
  const alreadyRetired = retiredPrizeIds.has(id);
  retiredPrizeIds.add(id);
  cache = { ...cache, items: cache.items.filter((item) => item.id !== id) };
  if (cache.items.length < REFILL_THRESHOLD) void refreshPrizePool();
  return !alreadyRetired;
}

export function prizeBankStats() {
  return {
    available: cache.items.length,
    used: retiredPrizeIds.size,
    refilling: Boolean(refreshPromise),
    threshold: REFILL_THRESHOLD,
  };
}

export function resetPrizeBankForTests() {
  retiredPrizeIds.clear();
  cache = { items: buildLocalFallbackPool(), fetchedAt: Date.now() };
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
