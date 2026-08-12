# Come On Down! — The Bidding Game

A "Price is Right"-style Item Up For Bid game. One screen acts as the host
(TV/laptop); up to 4 players join from their phones. Empty seats are filled
by AI contestants with their own bidding personalities.

Prizes come from a small **curated list** of real Canadian product pages
(Canadian Tire, Best Buy Canada, Roots) — but every time the prize pool is
loaded, the server re-fetches each page so the **price is current**, not
hardcoded. See `server/prizeSource.js` for details and caveats.

## Project structure

```
price-is-right/
├── server/        Express API + game state machine
│   ├── index.js        routes, serves built client in production
│   ├── rooms.js         room store + lobby→calling→item→bidding→reveal
│   ├── gameLogic.js      AI names/strategies, winner calculation
│   ├── prizeSource.js    live prize pool (CT/BBY/Roots)
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
| `HOST_VOICE`     | optional  | OpenAI TTS voice name, e.g. `onyx` (default), `alloy`, `nova`, etc. |
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
6. Add a Railway Volume to the server service so used bidding prizes survive
   redeploys and restarts. Mount it anywhere, for example `/data`; Railway
   automatically exposes `RAILWAY_VOLUME_MOUNT_PATH`, and the app writes the
   used-prize bank to `price-is-right-prize-bank.json` inside that volume.
   If you want an explicit path instead, set:

```bash
PRIZE_BANK_FILE=/data/price-is-right-prize-bank.json
```

Once deployed, open the Railway URL on a laptop/TV for the host, and have
players visit the same URL on their phones to join.

## How the live prize pool works

`server/prizeSource.js` builds a large Contestants' Row prize pool from live
Canadian retailer feeds, curated fallbacks, the family prize catalogue, and a
generated Canadian brick-and-mortar catalogue.

- On server startup (and again whenever the cache is older than 30 minutes),
  `getPrizePool()` refreshes the prize bank in the background.
- Selected bidding prizes are retired immediately. With a Railway Volume
  attached, retired prize IDs and same-seller prize fingerprints persist
  across restarts so the same prize does not come back later.
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

## Known limitations / next steps

- Room codes are 4 letters, in-memory only — rooms are cleaned up after 4
  hours of inactivity. Restarting the server clears all rooms.
