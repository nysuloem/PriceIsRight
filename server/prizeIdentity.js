const slug = value => String(value || "")
  .normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const FAMILY_RULES = [
  ["sofa", /\b(sofa|sectional|loveseat)\b/], ["recliner", /\b(recliner|accent chair|armchair)\b/],
  ["dining-set", /\b(dining (room )?set|dining table)\b/], ["bedroom-suite", /\b(bedroom suite|bedroom collection)\b/],
  ["mattress", /\b(mattress|bed base)\b/], ["coffee-table", /\bcoffee table\b/], ["office-desk", /\b(office desk|writing desk|workstation)\b/],
  ["lamp", /\b(lamp|task light)\b/],
  ["refrigerator", /\b(refrigerator|fridge)\b/], ["freezer", /\bfreezer\b/], ["washer", /\bwasher|washing machine\b/],
  ["dryer", /\bdryer\b/], ["range", /\b(range|stove|cooktop)\b/], ["dishwasher", /\bdishwasher\b/],
  ["microwave", /\bmicrowave\b/], ["television", /\b(tv|television)\b/], ["computer", /\b(laptop|computer|chromebook)\b/],
  ["tablet", /\btablet\b/], ["headphones", /\b(headphone|earbud|headset)\b/], ["speaker", /\bspeaker|sound bar\b/],
  ["camera", /\bcamera\b/], ["game-console", /\b(console|nintendo switch|playstation|xbox)\b/],
  ["coffee-maker", /\b(coffee maker|espresso|keurig)\b/], ["air-fryer", /\bair fryer\b/], ["mixer", /\b(stand mixer|hand mixer)\b/],
  ["vacuum", /\bvacuum\b/], ["barbecue", /\b(barbecue|grill)\b/], ["patio-set", /\bpatio .*set|outdoor .*set\b/],
  ["lawn-mower", /\blawn mower\b/], ["snow-blower", /\bsnow blower\b/], ["drill", /\bdrill\b/], ["saw", /\b(mitre|circular|table) saw\b/],
  ["t-shirt", /\b(t-?shirt|tee)\b/], ["hoodie", /\b(hoodie|sweatshirt)\b/], ["sweater", /\b(sweater|cardigan|crewneck)\b/],
  ["pants", /\b(sweatpant|jogger|legging|trouser|pants?)\b/], ["outerwear", /\b(jacket|coat|parka|vest)\b/],
  ["backpack", /\b(backpack|rucksack)\b/], ["luggage", /\b(luggage|suitcase|duffel)\b/], ["stroller", /\bstroller\b/],
  ["car-seat", /\bcar seat\b/], ["skincare", /\b(serum|face cream|moisturizer|cleanser|skincare)\b/],
  ["diffuser", /\bdiffuser\b/], ["board-game", /\b(board game|puzzle|card game)\b/], ["building-toy", /\b(lego|building set|blocks)\b/],
];

function normalizedName(item) {
  return String(typeof item === "string" ? item : item?.name || item?.id || "prize")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\b(classic|deluxe|premium|compact|space-saving|upgraded|featured|new|black|white|blue|red|green|pink|grey|gray)\b/gi, " ")
    .replace(/\b(men'?s|women'?s|kids?'?|small|medium|large|xl|xxl)\b/gi, " ")
    .replace(/\s+/g, " ").trim();
}

export function exactPrizeKey(item) {
  if (typeof item === "string") return slug(item);
  return slug(item?.id || item?.url || `${item?.brand || item?.retailer || "prize"}-${item?.name || "item"}`);
}

export function prizeFamilyKey(item) {
  const name = normalizedName(item), text = `${typeof item === "string" ? "" : item?.category || ""} ${name}`.toLowerCase();
  if (/\b(trip|holiday|vacation|escape|getaway|journey|adventure|tour|cruise)\b/.test(text)) {
    const destination = name.replace(/\b(trip|holiday|vacation|escape|getaway|journey|adventure|tour|cruise|for two|family)\b/gi, " ").replace(/\s+/g, " ").trim();
    return `trip-${slug(destination).split("-").slice(0, 4).join("-")}`;
  }
  if (/\b(sedan|suv|crossover|hatchback|pickup|car)\b/.test(text) && /\b(hyundai|toyota|nissan|honda|mazda|kia|subaru|volkswagen|chevrolet|ford|mitsubishi|buick|jeep|gmc|mini)\b/.test(text)) {
    return `car-${slug(name).split("-").slice(0, 3).join("-")}`;
  }
  const matched = FAMILY_RULES.find(([, regex]) => regex.test(text));
  if (matched) {
    // Apparel silhouettes are intentionally broad; repeated colour/logo
    // changes do not make another T-shirt feel new. For durable goods, retain
    // maker/model words so a Samsung television and a Sony television remain
    // genuinely different while “Classic/Deluxe/Premium” variants collapse.
    if (["t-shirt","hoodie","sweater","pants","outerwear"].includes(matched[0])) return matched[0];
    const brand = typeof item === "string" ? "prize" : item?.brand || item?.retailer || "prize";
    return `${matched[0]}-${slug(brand)}-${slug(name).split("-").slice(0, 6).join("-")}`;
  }
  const brand = typeof item === "string" ? "" : item?.brand || "";
  return slug(`${brand} ${name}`).split("-").slice(0, 6).join("-") || "prize";
}
