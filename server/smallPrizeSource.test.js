import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSmallPrizeProduct } from "./smallPrizeSource.js";

const retailer = { retailer: "Canadian Shop", baseUrl: "https://example.ca", category: "Small prizes" };
const product = {
  id: 1,
  handle: "travel-mug",
  title: "Travel Mug",
  vendor: "Thermos",
  product_type: "Kitchen",
  body_html: "A stainless-steel insulated mug for drinks on the go.",
  images: [{ src: "https://example.ca/mug.jpg" }],
  variants: [{ id: 2, available: true, title: "Default", price: "8.99", compare_at_price: null }],
};

test("small-prize feeds admit regular merchandise and reject markdowns", () => {
  assert.equal(normalizeSmallPrizeProduct(retailer, product)?.price, 8.99);
  assert.equal(normalizeSmallPrizeProduct(retailer, { ...product, title: "Travel Mug - Final Sale" }), null);
  assert.equal(normalizeSmallPrizeProduct(retailer, { ...product, variants: [{ ...product.variants[0], price: "5.99", compare_at_price: "8.99" }] }), null);
});
