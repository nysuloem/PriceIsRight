// Live Canadian grocery/drug/small-item pool for grocery-style pricing games.
// Prices are regular CAD prices from Canadian storefront product feeds.
import { exactPrizeKey, prizeFamilyKey } from "./prizeIdentity.js";
import { retiredKeys } from "./prizeBank.js";

const MIN_PRICE=1,MAX_PRICE=10,TARGET_SIZE=1050,CACHE_MS=30*60*1000,TIMEOUT_MS=15000;
const RETAILERS=[
  ["Candy Funhouse","https://www.candyfunhouse.ca","Candy and snacks"],
  ["Goodness Me!","https://www.goodnessme.ca","Grocery and wellness"],
  ["Vegan Supply","https://vegansupply.ca","Grocery and personal care"],
  ["Good Rebel","https://goodrebelvegan.com","Grocery and household"],
  ["Showcase Canada","https://ca.shopatshowcase.com","Beauty and household"],
  ["Wonder Pens","https://wonderpens.ca","Stationery"],
  ["Midoco","https://midoco.ca","Stationery and art supplies"],
  ["Saje Natural Wellness","https://www.saje.ca","Personal care"],
  ["Mastermind Toys","https://mastermindtoys.com","Small toys and activities"],
  ["Snuggle Bugz","https://snugglebugz.ca","Baby and personal care"],
].map(([retailer,baseUrl,category])=>({retailer,baseUrl,category}));
const headers={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36","Accept-Language":"en-CA,en;q=0.9",Accept:"application/json,text/html;q=0.8,*/*;q=0.5"};
const slug=value=>String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,80);
const clean=value=>String(value||"").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
const money=value=>{const parsed=Number.parseFloat(String(value??"").replace(/[$,]/g,""));return Number.isFinite(parsed)?parsed:null;};
const inRange=value=>Number.isFinite(value)&&value>=MIN_PRICE&&value<=MAX_PRICE;

function regularPrice(variant){const selling=money(variant.price),regular=money(variant.compare_at_price);return regular&&regular>selling?regular:selling;}
function normalize(config,product){
  const text=`${product?.title||""} ${product?.product_type||""}`.toLowerCase();
  if(!product?.id||!product.handle||!product.title||/\b(gift card|e-?gift|digital|subscription|deposit|replacement part)\b/.test(text))return null;
  const variants=(product.variants||[]).filter(variant=>variant.available!==false),eligible=(variants.length?variants:product.variants||[]).map(variant=>({variant,price:regularPrice(variant)})).filter(row=>inRange(row.price)).sort((a,b)=>a.price-b.price);
  if(!eligible.length)return null;
  const {variant,price}=eligible[0],variantName=clean(variant.title),brand=clean(product.vendor)||config.retailer;
  const escapedBrand=brand.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const name=clean(product.title)
    .replace(/\b(?:model|sku|item|article|part|product code)\s*[:#]?\s*[A-Z0-9][A-Z0-9-]{3,}\b/gi," ")
    .replace(/\b(?=[A-Z0-9-]{6,}\b)(?=[A-Z0-9-]*[A-Z])(?=[A-Z0-9-]*\d)[A-Z0-9]+(?:-[A-Z0-9]+)*\b/g," ")
    .replace(/\bAmuseables?\b/gi," ").replace(new RegExp(`^${escapedBrand}\\s+`,"i"),"").replace(/\s{2,}/g," ").trim();
  const image=product.images?.[0]?.src||product.image?.src||null;
  const description=clean(product.body_html).replace(/^(?:(?:sold by|available (?:from|at)|from)\s+[^,.;—]+[,.;—]\s*)+/i,"").split(/(?<=[.!?])\s+/)[0].slice(0,145);
  return {id:`${slug(config.retailer)}-${product.id}-${variant.id||slug(variantName)}`,name,brand,retailer:config.retailer,exactPrice:price,price,roundedPrice:Math.round(price),priceIsLive:true,priceKind:"regular",currency:"CAD",url:`${config.baseUrl}/products/${product.handle}`,image,imageAlt:name,category:clean(product.product_type)||config.category,description,hostDescription:description};
}
async function fetchRetailer(config){
  const items=[],seen=new Set();
  for(let page=1;page<=5;page+=1){const response=await fetch(`${config.baseUrl}/products.json?limit=250&page=${page}`,{headers,signal:AbortSignal.timeout(TIMEOUT_MS)});if(!response.ok)throw new Error(`HTTP ${response.status}`);const products=(await response.json()).products||[];if(!products.length)break;for(const product of products){if(seen.has(product.id))continue;seen.add(product.id);const item=normalize(config,product);if(item)items.push(item);}if(products.length<250)break;}
  return items.sort((a,b)=>a.name.localeCompare(b.name));
}
function interleave(groups){const result=[],positions=groups.map(()=>0),ids=new Set(),families=new Set();let advanced=true;while(result.length<TARGET_SIZE&&advanced){advanced=false;for(let i=0;i<groups.length&&result.length<TARGET_SIZE;i+=1){const item=groups[i][positions[i]++];if(!item)continue;advanced=true;const exact=exactPrizeKey(item),family=prizeFamilyKey(item);if(ids.has(exact)||families.has(family))continue;ids.add(exact);families.add(family);result.push(item);}}return result;}
function available(items){const retired=retiredKeys("pricing");return items.filter(item=>!retired.exact.has(exactPrizeKey(item))&&!retired.families.has(prizeFamilyKey(item)));}

export async function fetchSmallPrizePool(){const settled=await Promise.allSettled(RETAILERS.map(fetchRetailer)),groups=settled.map((result,index)=>{if(result.status==="fulfilled")return result.value;console.warn(`[smallPrizeSource] ${RETAILERS[index].retailer}: ${result.reason?.message||result.reason}`);return [];});const items=interleave(groups);if(items.length<250)console.warn(`[smallPrizeSource] Only ${items.length} unique Canadian small-item families were available.`);return available(items);}
let cache={items:[],fetchedAt:0},refreshPromise=null;
export async function getSmallPrizePool(force=false){const stale=Date.now()-cache.fetchedAt>CACHE_MS;if(force||stale||cache.items.length<120){if(!refreshPromise)refreshPromise=fetchSmallPrizePool().then(items=>{if(items.length||!cache.items.length)cache={items,fetchedAt:Date.now()};return cache.items;}).finally(()=>{refreshPromise=null;});await refreshPromise;}return available(cache.items);}
export function smallPrizePoolStats(){return {available:available(cache.items).length,live:cache.items.filter(item=>item.priceIsLive).length,refilling:Boolean(refreshPromise),retailers:RETAILERS.map(item=>item.retailer)};}
