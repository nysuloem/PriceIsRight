import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  configurePrizeBankStorageForTests,
  getPrizePool,
  prizeBankStats,
  prizeCategory,
  prizeFamily,
  resetPrizeBankForTests,
  retirePrize,
} from "./prizeSource.js";

test("similar shirts collapse into the same bidding family", () => {
  const a = { name: "Men's Classic Blue Logo T-Shirt", category: "Apparel" };
  const b = { name: "Women's Red Toronto Tee", category: "Clothing" };
  assert.equal(prizeFamily(a), "t-shirt");
  assert.equal(prizeFamily(b), "t-shirt");
  assert.equal(prizeCategory(a), "Apparel");
});

test("the fallback bidding bank is broad and Canadian-retailer weighted", async () => {
  resetPrizeBankForTests();
  const pool = await getPrizePool();
  const retailers = new Set(pool.map((item) => item.retailer));
  assert.ok(pool.length >= 500);
  assert.ok(retailers.has("The Brick"));
  assert.ok(retailers.has("Leon's"));
  assert.ok(retailers.has("RONA"));
});

test("fallback bidding prizes are display-ready with photos and useful copy", async () => {
  resetPrizeBankForTests();
  const pool = await getPrizePool();
  const visibleCopy = (item) => `${item.name} ${item.brand} ${item.retailer} ${item.category} ${item.description}`;
  assert.equal(pool.some((item) => !item.image), false);
  assert.equal(pool.some((item) => !item.description || item.description.length < 35), false);
  assert.equal(pool.some((item) => /^From [^—]+—[^.!]+!?$/i.test(item.description)), false);
  assert.equal(pool.some((item) => /contestants?'? row|substantial|department/i.test(item.description)), false);
  assert.equal(pool.some((item) => /\b(modèle|modele|sku|web code|product code)\b/i.test(visibleCopy(item))), false);
  assert.equal(pool.some((item) => /\b(laveuse|sécheuse|secheuse|réfrigérateur|refrigerateur|congélateur|congelateur|cuisinière|cuisiniere)\b/i.test(visibleCopy(item))), false);
});

test("a used bidding prize leaves the available bank permanently", async () => {
  resetPrizeBankForTests();
  const before = await getPrizePool();
  const used = before[0];
  const statsBefore = prizeBankStats();
  assert.equal(retirePrize(used.id), true);
  assert.equal(retirePrize(used.id), false);
  const after = await getPrizePool();
  assert.equal(after.some((item) => item.id === used.id), false);
  assert.equal(prizeBankStats().used, statsBefore.used + 1);
});

test("retiring a generated prize also removes same-seller variants", async () => {
  resetPrizeBankForTests();
  const before = await getPrizePool();
  const used = before.find((item) => item.retailer === "The Brick" && /home office desk/i.test(item.name));
  assert.ok(used);
  assert.equal(retirePrize(used.id), true);
  const after = await getPrizePool();
  assert.equal(after.some((item) => item.retailer === used.retailer && /home office desk/i.test(item.name)), false);
  assert.equal(prizeBankStats().usedFingerprints, 1);
});

test("used bidding prizes persist when a prize-bank file is configured", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pir-prize-bank-"));
  const file = path.join(dir, "bank.json");
  try {
    configurePrizeBankStorageForTests(file);
    resetPrizeBankForTests({ clearStorage: true });
    const before = await getPrizePool();
    const used = before[0];
    assert.equal(retirePrize(used.id), true);
    configurePrizeBankStorageForTests(file);
    const after = await getPrizePool();
    assert.equal(after.some((item) => item.id === used.id), false);
    assert.equal(prizeBankStats().persistent, true);
    assert.equal(prizeBankStats().used, 1);
  } finally {
    configurePrizeBankStorageForTests(null);
    rmSync(dir, { recursive: true, force: true });
  }
});
