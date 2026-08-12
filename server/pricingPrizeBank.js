import { exactPrizeKey, prizeFamilyKey } from "./prizeIdentity.js";
import { configureUnifiedPrizeBankForTests, resetUnifiedPrizeBankForTests, retireKeys, retiredKeys, unifiedPrizeBankStats } from "./prizeBank.js";

const POOL = "pricing";

export function retiredPricingPrizeNamesList() {
  const retired = retiredKeys(POOL);
  return [...new Set([...retired.exact, ...retired.families])];
}

export function retirePricingPrizes(prizes = []) {
  const values = prizes.filter(Boolean);
  return retireKeys(POOL, {
    exact: values.map(exactPrizeKey),
    families: values.map(prizeFamilyKey),
  });
}

export function pricingPrizeBankStats() {
  const retired = retiredKeys(POOL), unified = unifiedPrizeBankStats();
  return { used: retired.exact.size, usedFamilies: retired.families.size, persistent: unified.persistent, generation: unified.generation };
}

export function resetPricingPrizeBankForTests(options = {}) {
  resetUnifiedPrizeBankForTests(options);
}

export function configurePricingPrizeBankStorageForTests(file) {
  configureUnifiedPrizeBankForTests(file);
}
