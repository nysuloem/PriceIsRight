import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { MAJOR_BIDDING_RETAILERS, majorRetailerBiddingCatalog } from "./majorRetailerBiddingCatalog.js";
import {
  configurePrizeBankStorageForTests,
  chooseShopifyRegularPrice,
  essentialProductName,
  getPrizePool,
  isBiddingPrizeEligible,
  isClothingPrize,
  normalizePrizePresentation,
  normalizeBestBuyProduct,
  prizeBankStats,
  prizeCategory,
  prizeFamily,
  resetPrizeBankForTests,
  retirePrize,
} from "./prizeSource.js";

test("live product titles become a one-line identity plus a useful specification line", () => {
  assert.equal(essentialProductName('ASUS Vivobook 15.6" Laptop - 32GB RAM - 1TB SSD', "Laptops", "ASUS"), "Laptop computer");
  const laptop = normalizeBestBuyProduct({
    sku: "12345",
    name: 'ASUS Vivobook 15.6" Laptop - 32GB RAM - 1TB SSD',
    manufacturer: "ASUS",
    categoryName: "Laptops",
    shortDescription: "Power through daily work and entertainment with a portable design.",
    regularPrice: 1899.99,
    salePrice: 1899.99,
    isMarketplace: false,
    isVisible: true,
    productUrl: "/en-ca/product/12345",
    highResImage: "https://example.com/asus.jpg",
  });
  assert.equal(laptop.brand, "ASUS");
  assert.equal(laptop.name, "Laptop computer");
  assert.equal(laptop.description, "A laptop with a 15.6-inch display, 32 GB of RAM and a 1 TB solid-state drive.");
  assert.match(laptop.hostDescription, /ASUS Laptop computer.*15\.6-inch.*32 GB.*1 TB/i);
});

test("live bidding feeds reject Last Call, clearance, and discounted variants", () => {
  const regular = { title: "Modal Rib Shirt", handle: "modal-rib-shirt", variants: [{ available: true, price: "79.00", compare_at_price: null }] };
  assert.equal(chooseShopifyRegularPrice(regular), 79);
  assert.equal(chooseShopifyRegularPrice({ ...regular, title: "Modal Rib Shirt - Last Call" }), null);
  assert.equal(chooseShopifyRegularPrice({ ...regular, tags: ["Clearance"] }), null);
  assert.equal(chooseShopifyRegularPrice({ ...regular, variants: [{ available: true, price: "49.00", compare_at_price: "79.00" }] }), null);
});

test("clothing is recognized and excluded from the bidding bank", () => {
  const a = { name: "Men's Classic Blue Logo T-Shirt", category: "Apparel" };
  const b = { name: "Women's Red Toronto Tee", category: "Clothing" };
  assert.equal(prizeFamily(a), "t-shirt");
  assert.equal(prizeFamily(b), "t-shirt");
  assert.equal(prizeCategory(a), "Clothing");
  assert.equal(isClothingPrize(a),true);
  assert.equal(isBiddingPrizeEligible(a),false);
  assert.equal(isBiddingPrizeEligible({name:"Cross-country ski package",category:"Outdoor Equipment",retailer:"Sport Chek",description:"Skis, boots and poles for two."}),true);
  assert.equal(isBiddingPrizeEligible({name:"Cross-country ski package",category:"Outdoor Equipment",retailer:"Boutique Web Shop",description:"Skis, boots and poles for two."}),false);
});

test("familiar durable goods collapse across brands",()=>{
  assert.equal(prizeFamily({name:"Sony 65-inch OLED television",brand:"Sony",category:"Electronics"}),"television");
  assert.equal(prizeFamily({name:"Samsung 55-inch smart television",brand:"Samsung",category:"Electronics"}),"television");
  assert.equal(prizeFamily({name:"Bosch laser level kit",brand:"Bosch",category:"Tools"}),"laser-level");
  assert.equal(prizeFamily({name:"DeWalt laser level",brand:"DeWalt",category:"Tools"}),"laser-level");
});

test("the fallback bidding bank has 150+ genuinely distinct Canadian families", async () => {
  resetPrizeBankForTests();
  const pool = await getPrizePool();
  const retailers = new Set(pool.map((item) => item.retailer));
  assert.ok(pool.length >= 150);
  assert.equal(new Set(pool.map(prizeFamily)).size, pool.length);
  assert.ok(retailers.has("The Brick"));
  assert.ok(retailers.has("Leon's"));
  assert.ok(retailers.has("RONA"));
  assert.ok(retailers.has("Best Buy Canada"));
  assert.ok(retailers.has("Canadian Tire"));
  assert.ok(retailers.has("Home Depot Canada"));
  assert.ok(retailers.has("Sport Chek"));
  assert.ok(retailers.has("Walmart Canada"));
  assert.equal(pool.every(item => MAJOR_BIDDING_RETAILERS.includes(item.retailer)), true);
  assert.equal(pool.some(item => /Canadian (?:Family )?Prize Catalogue|Herschel|Saje|Mastermind|Snuggle Bugz/i.test(item.retailer)), false);
  assert.equal(pool.some(isClothingPrize),false);
  for (const category of ["Tools", "Appliances", "Jewellery", "Outdoor Equipment", "Electronics", "Furniture"]) {
    assert.ok(pool.filter(item => item.bidCategory === category).length >= 40, `${category} needs at least forty fresh families`);
  }
});

test("the rebuilt reserve uses only major Canadian retailers and plausible brand departments", () => {
  const catalog = majorRetailerBiddingCatalog();
  assert.equal(catalog.length >= 250, true);
  assert.equal(catalog.every(item => MAJOR_BIDDING_RETAILERS.includes(item.retailer)), true);
  assert.equal(catalog.some(item => item.brand === "Ninja" && /refrigerator|washer|dryer|freezer/i.test(item.name)), false);
  assert.equal(catalog.some(item => item.brand === "Citizen" && !/watch|chronograph/i.test(item.name)), false);
  assert.equal(catalog.some(item => item.brand === "Apple" && /e-reader|printer|camera/i.test(item.name)), false);
});

test("prize presentation keeps only brand, clean name and concise copy", () => {
  const item = normalizePrizePresentation({
    name: "Amuseables Peanut Cat Plush Toy SKU JEL12345",
    brand: "Jellycat",
    retailer: "Snuggle Bugz",
    category: "Toys",
    description: "sold by Snuggle Bugz, sold by Snuggle Bugz, The Jellycat Amuseables Peanut Cat is a playful plush featuring everyone's favourite peanut!",
  });
  assert.equal(item.brand, "Jellycat");
  assert.equal(item.name, "Peanut Cat Plush Toy");
  assert.equal(item.description, "A playful plush featuring everyone's favourite peanut.");
  assert.equal(item.hostDescription, "It's the Jellycat Peanut Cat Plush Toy! A playful plush featuring everyone's favourite peanut.");
  assert.doesNotMatch(`${item.name} ${item.description}`, /Snuggle Bugz|SKU|JEL12345|Amuseables/i);
});

test("underwear prizes use specific apparel descriptions instead of generic design copy",()=>{
  const underwear=normalizePrizePresentation({name:"Ultra-soft boxer briefs model SXBB30",brand:"SAXX",retailer:"Sport Chek",category:"Men's underwear",description:"Practical features, everyday usefulness, and a polished home-ready design."});
  assert.equal(underwear.name,"Ultra-soft boxer briefs");
  assert.equal(underwear.description,"Soft, breathable fabric, comfortable stretch, and smooth seams for all-day comfort.");
  assert.doesNotMatch(underwear.description,/practical|home-ready|everyday design/i);
  const bra=normalizePrizePresentation({name:"Wireless comfort bra style 12345",brand:"Knix",retailer:"Knix",category:"Bras",description:"Everyday design with practical features."});
  assert.equal(bra.description,"Soft fabric, adjustable details, and a supportive fit for lasting comfort.");
});

test("fallback bidding prizes use only verified photos or matched visuals", async () => {
  resetPrizeBankForTests();
  const pool = await getPrizePool();
  const visibleCopy = (item) => `${item.name} ${item.brand} ${item.retailer} ${item.category} ${item.description}`;
  assert.equal(pool.some((item) => !item.image&&!item.visual), false);
  assert.equal(pool.some((item) => item.image&&!item.imageVerified), false);
  assert.equal(pool.some((item) => !item.description || item.description.length < 35), false);
  assert.equal(pool.some((item) => /^From [^—]+—[^.!]+!?$/i.test(item.description)), false);
  assert.equal(pool.some((item) => /contestants?'? row|substantial|department/i.test(item.description)), false);
  assert.equal(pool.some((item) => /\b(modèle|modele|sku|web code|product code)\b/i.test(visibleCopy(item))), false);
  assert.equal(pool.some((item) => /\b(laveuse|sécheuse|secheuse|réfrigérateur|refrigerateur|congélateur|congelateur|cuisinière|cuisiniere)\b/i.test(visibleCopy(item))), false);
  for (const item of pool) {
    assert.ok(item.hostDescription.includes(item.brand), `${item.name} announcement includes brand`);
    assert.ok(item.hostDescription.includes(item.name), `${item.name} announcement includes item name`);
    assert.ok(item.hostDescription.includes(item.description), `${item.name} announcement includes description`);
  }
});

test("bidding feed and refill capacity are doubled",async()=>{
  resetPrizeBankForTests();const pool=await getPrizePool(),stats=prizeBankStats();
  assert.ok(pool.length>=300);assert.equal(stats.target,2400);assert.equal(stats.threshold,240);
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

test("retiring a generated prize removes its whole semantic family", async () => {
  resetPrizeBankForTests();
  const before = await getPrizePool();
  const used = before.find((item) => /home office desk/i.test(item.name));
  assert.ok(used);
  const family = prizeFamily(used);
  assert.equal(retirePrize(used.id), true);
  const after = await getPrizePool();
  assert.equal(after.some((item) => prizeFamily(item) === family), false);
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
