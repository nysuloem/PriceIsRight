// prizeSource.js
//
// The CATALOG of products is curated (hand-picked, see CANDIDATES below) —
// there's no realistic way to make that part fully automatic without an
// official retailer API. What IS live: every time the pool is fetched, we
// re-check each candidate's current page and pull today's price.
//
// - Canadian Tire: price renders as plain server-side text, so this is
//   reliably scrapeable.
// - Best Buy Canada: price is loaded client-side (not in the raw HTML), so
//   the regex below is best-effort and usually falls back to the last-known
//   price. The product IMAGE is reliable via Best Buy's media CDN, which is
//   derived from the product's "web code".
// - Amazon.ca is intentionally NOT included — its robots.txt disallows
//   automated access.
// - Roots is a "static" entry (no live source found yet); easy to upgrade
//   later if we find a reliable way to read roots.com pricing.
//
// Run `node prizeSource.js` directly to print the current pool to the
// console — handy for testing this against the real sites.

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  "Accept-Language": "en-CA,en;q=0.9",
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
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Instant_Pot_%2849907000991%29.jpg",
    imageAlt: "An Instant Pot multi-cooker on a kitchen counter",
    hostDescription:
      "Tonight's first item up for bid comes to us from Canadian Tire: the Instant Pot Duo V5 with 14 Smart Programs! This six quart marvel combines seven kitchen appliances in one: pressure cooker, slow cooker, rice cooker, steamer, saute pan, yogurt maker, and warmer, with a stainless steel inner pot and one touch programs that get a hearty stew on the table up to seventy percent faster.",
  },
  {
    id: "keurig-k-express",
    type: "canadianTire",
    url: "https://www.canadiantire.ca/en/pdp/keurig-k-expresstm-single-serve-coffee-maker-black-0430788p.html",
    name: "Keurig K-Express Single Serve Coffee Maker",
    brand: "Keurig",
    retailer: "Canadian Tire",
    fallbackPrice: 109.99,
    image: "https://i.ebayimg.com/images/g/ozoAAOSwo7NmNXcA/s-l500.jpg",
    imageAlt: "A Keurig K-Express single serve coffee maker",
    hostDescription:
      "Next up, fresh from Canadian Tire: the Keurig K-Express single serve coffee maker! This slim brewer fits anywhere, under five inches wide, and brews three cup sizes from six to twelve ounces using your favourite K-Cup pods. Hit the strong button for a bolder cup, and back to back brewing means no waiting around for a refill.",
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
    imageAlt: "The Nintendo Switch 2 console with Joy-Con 2 controllers",
    hostDescription:
      "Up next, from Best Buy Canada: the all new Nintendo Switch 2! This hybrid console steps up the original with a bigger seven point nine inch HDR screen, frame rates up to one hundred twenty frames per second, and four K output when docked. It comes with two Joy-Con 2 controllers and is backward compatible with your whole Switch library.",
  },
  {
    id: "roots-original-sweatpant",
    type: "static",
    url: "https://www.roots.com/ca/en/",
    name: "Organic Original Sweatpant",
    brand: "Roots",
    retailer: "Roots Canada",
    fallbackPrice: 84.0,
    image: null,
    imageAlt: "Roots Organic Original Sweatpant",
    hostDescription:
      "And here's a true Canadian classic from Roots: the Organic Original Sweatpant! Made from soft fleece blended with organic cotton and recycled fibres, these are the sweats that have been a staple in Canadian closets for generations, comfortable enough for lounging, sharp enough for the airport.",
  },
];

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function fetchOne(candidate) {
  let exactPrice = candidate.fallbackPrice;
  let priceIsLive = false;
  let image = candidate.image || null;

  try {
    if (candidate.type === "canadianTire") {
      const html = await fetchHtml(candidate.url);
      // First "$159.99"-style price on the page is the current price.
      const priceMatch = html.match(/\$\s?(\d{1,3}(?:,\d{3})*\.\d{2})/);
      if (priceMatch) {
        exactPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
        priceIsLive = true;
      }
    } else if (candidate.type === "bestBuy") {
      const code = candidate.webCode;
      image = `https://multimedia.bbycastatic.ca/multimedia/products/500x500/${code.slice(
        0,
        3
      )}/${code.slice(0, 5)}/${code}.jpg`;

      const html = await fetchHtml(candidate.url);
      const priceMatch = html.match(
        /"(?:currentPrice|salePrice|regularPrice)"\s*:\s*"?(\d+(?:\.\d{2})?)/
      );
      if (priceMatch) {
        exactPrice = parseFloat(priceMatch[1]);
        priceIsLive = true;
      }
    }
    // "static" candidates: nothing to fetch, fallback values are used as-is.
  } catch (err) {
    console.error(`[prizeSource] ${candidate.id}: ${err.message}`);
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

// Simple in-memory cache so we're not hitting these sites on every poll.
let cache = { items: null, fetchedAt: 0 };
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

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

// Allow running directly: `node prizeSource.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchPrizePool().then((items) => {
    console.log(JSON.stringify(items, null, 2));
  });
}
