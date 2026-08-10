import test from "node:test";
import assert from "node:assert/strict";
import { prizeCategory, prizeFamily } from "./prizeSource.js";

test("similar shirts collapse into the same bidding family", () => {
  const a = { name: "Men's Classic Blue Logo T-Shirt", category: "Apparel" };
  const b = { name: "Women's Red Toronto Tee", category: "Clothing" };
  assert.equal(prizeFamily(a), "t-shirt");
  assert.equal(prizeFamily(b), "t-shirt");
  assert.equal(prizeCategory(a), "Apparel");
});
