// prizeSource.js — fetches LIVE prices from real Canadian retailer pages.
//
// The product list is curated (hand-picked URLs), but prices are fetched
// fresh every 30 minutes so they stay current.
//
// Run standalone to test:  node prizeSource.js

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-CA,en;q=0.9",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const CANDIDATES = [
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
    // Short 1–2 sentence host description (TTS reads this aloud)
    hostDescription: "From Canadian Tire — the Instant Pot Duo V5! Seven appliances in one six-quart pot: pressure cooker, slow cooker, rice maker, steamer, sauté pan, yogurt maker, and warmer.",
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
    hostDescription: "From Canadian Tire — the Keurig K-Express! A slim single-serve brewer that makes six to twelve ounce cups from K-Cup pods, with a strong brew button for when you really need it.",
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
    imageAlt: "Nintendo Switch 2 Console",
    hostDescription: "From Best Buy Canada — the Nintendo Switch 2! A seven point nine inch HDR screen, four-K docked output, and magnetic Joy-Con 2 controllers — and it plays your whole Switch library.",
  },
  {
    id: "roots-original-sweatpant",
    type: "static",
    url: "https://www.roots.com/ca/en/",
    name: "Roots Organic Original Sweatpant",
    brand: "Roots",
    retailer: "Roots Canada",
    fallbackPrice: 84.00,
    image: null,
    imageAlt: "Roots Organic Original Sweatpant",
    hostDescription: "From Roots Canada — the Organic Original Sweatpant! Soft organic cotton fleece, a true Canadian classic that's been in closets from coast to coast for generations.",
  },
];

// Minimum plausible product price — filters out loyalty point values,
// shipping thresholds, and other incidental dollar amounts on CT pages.
const MIN_PRICE = 20;

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Extract the main product price from a Canadian Tire page.
// Strategy: find ALL dollar amounts on the page, filter to plausible product
// prices (>= MIN_PRICE), and take the first one. This avoids grabbing
// "$2.99 shipping" or "$10 in CT Money" type values.
function extractCtPrice(html) {
  const matches = [...html.matchAll(/\$\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g)];
  for (const m of matches) {
    const val = parseFloat(m[1].replace(/,/g, ""));
    if (val >= MIN_PRICE) return val;
  }
  return null;
}

async function fetchOne(candidate) {
  let exactPrice = candidate.fallbackPrice;
  let priceIsLive = false;
  let image = candidate.image || null;

  try {
    if (candidate.type === "canadianTire") {
      const html = await fetchHtml(candidate.url);
      const price = extractCtPrice(html);
      if (price !== null) {
        exactPrice = price;
        priceIsLive = true;
      }
    } else if (candidate.type === "bestBuy") {
      const code = candidate.webCode;
      image = `https://multimedia.bbycastatic.ca/multimedia/products/500x500/${code.slice(0,3)}/${code.slice(0,5)}/${code}.jpg`;
      const html = await fetchHtml(candidate.url);
      // BBY renders price client-side; try JSON blobs embedded in the page
      const priceMatch = html.match(/"(?:currentPrice|salePrice|regularPrice)"\s*:\s*"?(\d+(?:\.\d{2})?)/);
      if (priceMatch) {
        const val = parseFloat(priceMatch[1]);
        if (val >= MIN_PRICE) { exactPrice = val; priceIsLive = true; }
      }
    }
    // static: use fallback as-is
  } catch (err) {
    console.error(`[prizeSource] ${candidate.id}: ${err.message}`);
  }

  // Safety net: if live price is suspiciously low, fall back
  if (priceIsLive && exactPrice < MIN_PRICE) {
    console.warn(`[prizeSource] ${candidate.id}: live price $${exactPrice} too low, using fallback $${candidate.fallbackPrice}`);
    exactPrice = candidate.fallbackPrice;
    priceIsLive = false;
  }

  return {
    id: candidate.id,
    name: candidate.name,
    brand: candidate.brand,
    retailer: candidate.retailer,
    exactPrice,
    price: Math.round(exactPrice),
    priceIsLive,
    url: candidate.url,
    image,
    imageAlt: candidate.imageAlt,
    hostDescription: candidate.hostDescription,
  };
}

export async function fetchPrizePool() {
  return Promise.all(CANDIDATES.map(fetchOne));
}

let cache = { items: null, fetchedAt: 0 };
const CACHE_TTL_MS = 30 * 60 * 1000;

export async function getPrizePool(forceRefresh = false) {
  const stale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
  if (!cache.items || stale || forceRefresh) {
    cache.items = await fetchPrizePool();
    cache.fetchedAt = Date.now();
  }
  return cache.items;
}

export function pickRandomItem(pool, excludeId = null) {
  const candidates = excludeId ? pool.filter((p) => p.id !== excludeId) : pool;
  const list = candidates.length ? candidates : pool;
  return list[Math.floor(Math.random() * list.length)];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPrizePool().then((items) => console.log(JSON.stringify(items, null, 2)));
}
