import fs from "node:fs";
import path from "node:path";

const PRICING_PRIZE_BANK_STORAGE_NAME = "price-is-right-pricing-prize-bank.json";
let storageFileOverride;
let loaded = false;
const retiredPricingPrizeNames = new Map();

function normalizePrizeName(name) {
  return String(name || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function storageFile() {
  if (storageFileOverride !== undefined) return storageFileOverride;
  if (process.env.PRICING_PRIZE_BANK_FILE) return process.env.PRICING_PRIZE_BANK_FILE;
  const directory = process.env.PRIZE_BANK_DIR || process.env.RAILWAY_VOLUME_MOUNT_PATH;
  return directory ? path.join(directory, PRICING_PRIZE_BANK_STORAGE_NAME) : null;
}

function load() {
  if (loaded) return;
  loaded = true;
  const file = storageFile();
  if (!file) return;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const names = Array.isArray(parsed?.retiredPricingPrizeNames) ? parsed.retiredPricingPrizeNames : [];
    for (const name of names) {
      const displayName = String(name || "").trim();
      const normalized = normalizePrizeName(displayName);
      if (normalized) retiredPricingPrizeNames.set(normalized, displayName);
    }
  } catch (error) {
    if (error.code !== "ENOENT") console.warn(`[pricingPrizeBank] Could not load pricing prize bank: ${error.message}`);
  }
}

function save() {
  const file = storageFile();
  if (!file) return;
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      retiredPricingPrizeNames: [...retiredPricingPrizeNames.values()].sort(),
    }, null, 2));
  } catch (error) {
    console.warn(`[pricingPrizeBank] Could not save pricing prize bank: ${error.message}`);
  }
}

export function retiredPricingPrizeNamesList() {
  load();
  return [...retiredPricingPrizeNames.values()];
}

export function retirePricingPrizes(names = []) {
  load();
  let changed = false;
  for (const name of names) {
    const displayName = String(name || "").trim();
    const normalized = normalizePrizeName(displayName);
    if (normalized && !retiredPricingPrizeNames.has(normalized)) {
      retiredPricingPrizeNames.set(normalized, displayName);
      changed = true;
    }
  }
  if (changed) save();
  return changed;
}

export function pricingPrizeBankStats() {
  load();
  return { used: retiredPricingPrizeNames.size, persistent: Boolean(storageFile()) };
}

export function resetPricingPrizeBankForTests(options = {}) {
  retiredPricingPrizeNames.clear();
  loaded = true;
  if (options.clearStorage) {
    const file = storageFile();
    if (file) fs.rmSync(file, { force: true });
  }
}

export function configurePricingPrizeBankStorageForTests(file) {
  storageFileOverride = file || null;
  retiredPricingPrizeNames.clear();
  loaded = false;
  load();
}
