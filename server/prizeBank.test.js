import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  PRIZE_BANK_GENERATION,
  configureUnifiedPrizeBankForTests,
  resetUnifiedPrizeBankForTests,
  retiredKeys,
  retireKeys,
} from "./prizeBank.js";

test("retired families are blocked across every prize pool", () => {
  configureUnifiedPrizeBankForTests(null);
  resetUnifiedPrizeBankForTests();
  retireKeys("bidding", { exact: ["sony-tv-123"], families: ["television-sony-bravia"] });
  assert.equal(retiredKeys("pricing").exact.has("sony-tv-123"), true);
  assert.equal(retiredKeys("showcase").families.has("television-sony-bravia"), true);
});

test("a new bank generation starts empty and replaces the stale ledger", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "pir-unified-prize-bank-"));
  const file = path.join(dir, "bank.json");
  try {
    writeFileSync(file, JSON.stringify({ generation: "old-pool", pools: { global: { exact: ["old-prize"], families: ["old-family"] } } }));
    configureUnifiedPrizeBankForTests(file);
    assert.equal(retiredKeys("bidding").exact.has("old-prize"), false);
    const saved = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(saved.generation, PRIZE_BANK_GENERATION);
    assert.deepEqual(saved.pools, {});
  } finally {
    configureUnifiedPrizeBankForTests(null);
    rmSync(dir, { recursive: true, force: true });
  }
});
