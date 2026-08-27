# Come On Down! — The Bidding Game

A "Price is Right"-style Item Up For Bid game. One screen acts as the host
(TV/laptop); up to 4 players join from their phones. Empty seats are filled
by AI contestants with their own bidding personalities.

The landing page also offers **Remote Play**. It creates one shareable
`/remote/CODE` link so every household gets the synchronized show, audio, and
its own contestant controls on the same device. The room creator starts the
show and is the only browser that drives automatic game transitions.

Prizes come from Canadian retailer feeds plus curated Canadian fallback banks.
Regular CAD prices are refreshed from the feeds, while a unified persistent
ledger prevents used prizes—or cosmetic variants of them—from returning.

## Project structure

```
price-is-right/
├── server/        Express API + game state machine
│   ├── index.js        routes, serves built client in production
│   ├── rooms.js         room store + lobby→calling→item→bidding→reveal
│   ├── gameLogic.js      AI names/strategies, winner calculation
│   ├── prizeSource.js    Canadian Contestants' Row pool
│   ├── smallPrizeSource.js live Canadian $1–$10 pool
│   ├── prizeBank.js      unified persistent retirement ledger
│   └── tts.js             OpenAI host-voice TTS (optional)
└── client/        React (Vite) frontend
    └── src/
        ├── Landing.jsx    host-or-join screen
        ├── HostView.jsx   TV/laptop display + audio orchestration
        ├── PlayerView.jsx phone screen (join + bid)
        └── styles.css     shared "game show" look
```

## Environment variables

| Variable         | Required? | Notes                                                              |
| ---------------- | --------- | ------------------------------------------------------------------ |
| `OPENAI_API_KEY` | optional  | Enables the host voice via OpenAI TTS. Without it, the game still works — it just paces itself with timed pauses instead of audio. |
| `HOST_VOICE`     | optional  | OpenAI TTS voice name, e.g. `coral` (default), `alloy`, `nova`, etc. |
| `ANNOUNCER_VOICE` | optional | OpenAI TTS voice name; defaults to the energetic `cedar` voice. |
| `PORT`           | optional  | Set automatically by Railway.                                       |

## Local development

Two terminals from the project root (after `npm install` once at the root —
npm workspaces will install both `client` and `server` deps):

```bash
npm install

# terminal 1
npm run dev:server

# terminal 2
npm run dev:client
```

Open the client URL Vite prints (usually `http://localhost:5173`). The Vite
dev server proxies `/api/*` to `http://localhost:3001`.

- Host: `http://localhost:5173/host` → click "Host on This Screen" from `/`
  (the landing page creates the room and redirects you to `/host/<CODE>`).
- Players: on the landing page, enter the room code + a name, or visit
  `http://localhost:5173/play/<CODE>` directly.
- Remote players: choose "Start Remote Play," then share the generated
  `http://localhost:5173/remote/<CODE>` link with every household.

## Deploying to Railway

Same pattern as the other family game projects:

1. Push this repo to GitHub, create a new Railway project from it.
2. Build command: `npm run build` (builds the client into `client/dist`).
3. Start command: `npm run start` (runs the server, which serves
   `client/dist` *and* the `/api/*` routes on the same port).
4. If Railway's "Root Directory" needs to point at a subfolder because of
   how the zip unpacks, set it to wherever `package.json` (the root one)
   ends up.
5. Add `OPENAI_API_KEY` (and optionally `HOST_VOICE`) under Variables if you
   want the host voice. The game works without it.
6. Add a Railway Volume to the server service so all used prizes survive
   redeploys and restarts. Mount it anywhere, for example `/data`; Railway
   automatically exposes `RAILWAY_VOLUME_MOUNT_PATH`, and the app writes the
   unified bank to `price-is-right-unified-prize-bank.json` inside that volume.
   If you want an explicit path instead, set:

```bash
UNIFIED_PRIZE_BANK_FILE=/data/price-is-right-unified-prize-bank.json
```

Once deployed, open the Railway URL on a laptop/TV for the host, and have
players visit the same URL on their phones to join.

## How the live prize pool works

`server/prizeSource.js` builds Contestants' Row prizes, while
`server/smallPrizeSource.js` builds a live $1–$10 pool from ten Canadian
storefronts for grocery-style pricing games. Cars, grand prizes, trips and
showcase replacements are Canadian-specific curated banks.

- On server startup (and again whenever the cache is older than 30 minutes),
  `getPrizePool()` refreshes the prize bank in the background.
- Every displayed prize is retired immediately in one shared ledger. Exact
  identities and semantic families are both recorded, so changing a colour,
  seller, year or words such as “deluxe” cannot make an old prize look new.
- The current generation is `canadian-reset-2026-08-12-v2`. A generation
  change intentionally starts from an empty ledger; the three legacy bank
  files are ignored. Pools never silently clear or recycle when exhausted.
- Prize descriptions are normalized to short English copy that names the maker
  or seller and gives enough detail to estimate price. Feed items with missing
  photos, French copy, product numbers, or vague meta descriptions are filtered
  out.
- Each item carries a `priceIsLive` flag so you can see whether a price came
  from a live retailer feed or a fallback catalogue item.

### Testing the scraper on its own

```bash
node server/prizeSource.js
```

This prints the current pool as JSON — useful for checking whether the
Canadian Tire price regex is matching correctly on Railway (where outbound
requests to these sites will actually succeed, unlike in a sandboxed dev
environment). If you run this and the Canadian Tire `priceIsLive` values are
`false`, send me the output and we can tune the regex against the real HTML.

You can also hit `/api/prizes?refresh=1` on a running server to force a
re-fetch and see the current pool as JSON.

`/api/prize-banks/status` reports the active generation, whether persistent
volume storage was detected, and the available/retired totals for each pool.

## Known limitations / next steps

- Room codes are 4 letters, in-memory only — rooms are cleaned up after 4
  hours of inactivity. Restarting the server clears all rooms.
