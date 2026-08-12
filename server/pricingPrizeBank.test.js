import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  configurePricingPrizeBankStorageForTests,
  pricingPrizeBankStats,
  resetPricingPrizeBankForTests,
  retirePricingPrizes,
  retiredPricingPrizeNamesList,
} from "./pricingPrizeBank.js";

test("pricing game prize retirements persist to the configured bank file", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pir-pricing-prize-bank-"));
  const file = path.join(dir, "bank.json");
  try {
    configurePricingPrizeBankStorageForTests(file);
    resetPricingPrizeBankForTests({ clearStorage: true });
    assert.equal(retirePricingPrizes(["Electric Kettle", "Desk Lamp"]), true);
    configurePricingPrizeBankStorageForTests(file);
    assert.deepEqual(retiredPricingPrizeNamesList().sort(), ["desk-lamp", "electric-kettle", "lamp-prize-desk-lamp"]);
    assert.equal(pricingPrizeBankStats().persistent, true);
    assert.equal(pricingPrizeBankStats().used, 2);
  } finally {
    configurePricingPrizeBankStorageForTests(null);
    rmSync(dir, { recursive: true, force: true });
  }
});
