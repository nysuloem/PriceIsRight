import fs from "node:fs";
import path from "node:path";

const STORAGE_NAME="price-is-right-game-rotation.json";
let storageOverride,loaded=false,state={cycle:1,played:[]};
const storageFile=()=>storageOverride!==undefined?storageOverride:(process.env.PRIZE_BANK_DIR||process.env.RAILWAY_VOLUME_MOUNT_PATH)?path.join(process.env.PRIZE_BANK_DIR||process.env.RAILWAY_VOLUME_MOUNT_PATH,STORAGE_NAME):null;
function load(){if(loaded)return;loaded=true;const file=storageFile();if(!file)return;try{const parsed=JSON.parse(fs.readFileSync(file,"utf8"));if(Array.isArray(parsed?.played))state={cycle:Number(parsed.cycle)||1,played:parsed.played};}catch(error){if(error.code!=="ENOENT")console.warn(`[gameRotation] Could not read rotation: ${error.message}`);}}
function save(){const file=storageFile();if(!file)return;try{fs.mkdirSync(path.dirname(file),{recursive:true});const temp=`${file}.tmp`;fs.writeFileSync(temp,JSON.stringify(state,null,2));fs.renameSync(temp,file);}catch(error){console.warn(`[gameRotation] Could not save rotation: ${error.message}`);}}

export function pricingGameCandidates(preferredTypes,allTypes){
  load();
  const valid=new Set(allTypes),played=new Set(state.played.filter(type=>valid.has(type)));
  let remaining=allTypes.filter(type=>!played.has(type));
  if(!remaining.length){state={cycle:state.cycle+1,played:[]};save();remaining=[...allTypes];}
  const preferred=preferredTypes.filter(type=>remaining.includes(type));
  const pool=preferred.length?preferred:remaining;
  return [...pool].sort(()=>Math.random()-.5);
}
export function markPricingGamePlayed(type){load();if(!state.played.includes(type)){state.played.push(type);save();}return pricingGameRotationStatus();}
export function pricingGameRotationStatus(){load();return {cycle:state.cycle,played:[...state.played]};}
export function resetPricingGameRotationForTests(file=null){storageOverride=file;loaded=true;state={cycle:1,played:[]};save();}
