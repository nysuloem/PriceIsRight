import test from "node:test";
import assert from "node:assert/strict";
import {
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
  assert.equal(pool.some((item) => !item.image), false);
  assert.equal(pool.some((item) => !item.description || item.description.length < 35), false);
  assert.equal(pool.some((item) => /^From [^—]+—[^.!]+!?$/i.test(item.description)), false);
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
