import fs from "node:fs";
import path from "node:path";

export const PRIZE_BANK_GENERATION = "canadian-reset-2026-08-12-v2";
const STORAGE_NAME = "price-is-right-unified-prize-bank.json";
let storageOverride;
let loaded = false;
let state = freshState();

function freshState() {
  return { generation: PRIZE_BANK_GENERATION, updatedAt: null, pools: {} };
}

function storageFile() {
  if (storageOverride !== undefined) return storageOverride;
  if (process.env.UNIFIED_PRIZE_BANK_FILE) return process.env.UNIFIED_PRIZE_BANK_FILE;
  const directory = process.env.PRIZE_BANK_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH;
  return directory ? path.join(directory, STORAGE_NAME) : null;
}

function ensurePool(pool) {
  if (!state.pools[pool]) state.pools[pool] = { exact: [], families: [] };
  return state.pools[pool];
}

function load() {
  if (loaded) return;
  loaded = true;
  const file = storageFile();
  if (!file) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    // A generation change intentionally starts every pool from scratch. Old
    // bank files remain untouched but are no longer consulted.
    if (parsed?.generation === PRIZE_BANK_GENERATION && parsed?.pools) state = parsed;
    else save();
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`[prizeBank] Could not read unified bank: ${error.message}`);
    save();
  }
}

function save() {
  const file = storageFile();
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    state.updatedAt = new Date().toISOString();
    const temporary = `${file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2));
    fs.renameSync(temporary, file);
  } catch (error) {
    console.warn(`[prizeBank] Could not write unified bank: ${error.message}`);
  }
}

export function retiredKeys(pool) {
  load();
  const data = ensurePool(pool);
  const global = ensurePool("global");
  return {
    exact: new Set([...data.exact, ...global.exact]),
    families: new Set([...data.families, ...global.families]),
  };
}

export function retireKeys(pool, { exact = [], families = [] } = {}) {
  load();
  const cleanExact = exact.filter(Boolean), cleanFamilies = families.filter(Boolean);
  const targets = pool === "global" ? [ensurePool("global")] : [ensurePool(pool), ensurePool("global")];
  let changed = false;
  targets.forEach(data => {
    const before = data.exact.length + data.families.length;
    data.exact = [...new Set([...data.exact, ...cleanExact])].sort();
    data.families = [...new Set([...data.families, ...cleanFamilies])].sort();
    changed ||= data.exact.length + data.families.length !== before;
  });
  if (changed) save();
  return changed;
}

export function unifiedPrizeBankStats() {
  load();
  return {
    generation: PRIZE_BANK_GENERATION,
    persistent: Boolean(storageFile()),
    volumeDetected: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.PRIZE_BANK_DIR || process.env.UNIFIED_PRIZE_BANK_FILE),
    pools: Object.fromEntries(Object.entries(state.pools).map(([name, pool]) => [name, { used: pool.exact.length, usedFamilies: pool.families.length }])),
    updatedAt: state.updatedAt,
  };
}

export function resetUnifiedPrizeBankForTests({ clearStorage = false } = {}) {
  state = freshState(); loaded = true;
  if (clearStorage && storageFile()) fs.rmSync(storageFile(), { force: true });
  else save();
}

export function configureUnifiedPrizeBankForTests(file) {
  storageOverride = file || null; state = freshState(); loaded = false; load();
}
