import { useEffect, useRef, useState, useCallback, Component } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mic2, Bot, Trophy, ArrowRight, ChefHat } from "lucide-react";
import {
  getState, startGame, callNext, advance,
  nextTurn, restartGame, resetBids, ttsUrl, playerPhotoUrl, getConfig,
  startPricingGame,
  beginPricingGame,
  settlePricingGame,
  revealPricingPrice, continuePricingPrice,
  revealReplacement,
  settleWheel, acknowledgeWheel, resolveWheelAI, finishShowdown, advanceShowcase, resolveShowcaseAI,
} from "./api.js";
import OpeningSequence from "./OpeningSequence.jsx";
import { playAudioReliably } from "./mediaPlayback.js";
const cliffYodelUrl="/media/cliff-hangers-yodel.mp3";
const clockBellUrl="/media/clock-game-bell.mp3";
const clockGotItUrl="/media/clock-game-got-it.mp3";
const endCreditsMusicUrl="/media/end-credits.mp3";
const newCarIntroUrl="/media/new-car-intro.mp3";
const plinkoIntroUrl="/media/plinko-intro.mp3";
const prizeModelsUrl="/media/prize-models.webp";

const POLL_MS = 500;
let sharedAudioContext;
function audioContext(){
  if(!sharedAudioContext||sharedAudioContext.state==="closed")sharedAudioContext=new(window.AudioContext||window.webkitAudioContext)();
  if(sharedAudioContext.state==="suspended")sharedAudioContext.resume().catch(()=>{});
  return sharedAudioContext;
}
export function unlockSoundEffects(){
  try{audioContext();}catch{}
}

// ---------------------------------------------------------------------------
// playTTS — fetch audio from the server and play it.
// onDone fires when it ends, or after 1.5 s on error.
// ---------------------------------------------------------------------------
function playTTS(audioEl, text, onDone, voice, style = "host") {
  if (!text) { onDone(); return; }
  const wordCount=text.trim().split(/\s+/).length;
  const speechFallback=Math.min(65000,Math.max(9000,Math.ceil(wordCount/2.2*1000)+5000));
  playAudioReliably(audioEl, ttsUrl(text, voice, style), onDone,{unknownDurationTimeout:speechFallback});
}

function playRecorded(audioEl,src,onDone){
  playAudioReliably(audioEl,src,onDone,{errorDelay:0});
}

// ---------------------------------------------------------------------------
// HostView
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Error boundary — shows a message instead of blank screen on crash
// ---------------------------------------------------------------------------
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div className="pir-root" style={{ textAlign: "center", paddingTop: "20vh" }}>
          <div className="pir-title" style={{ fontSize: 28 }}>Something went wrong</div>
          <p className="pir-helptext" style={{ marginTop: 16 }}>{this.state.error.message}</p>
          <button className="pir-btn" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Sound effects — generated via Web Audio API, no files needed
// ---------------------------------------------------------------------------
function playBuzzer() {
  try {
    const ctx = audioContext();
    [392,294].forEach((frequency,i)=>{const osc=ctx.createOscillator(),gain=ctx.createGain(),t=ctx.currentTime+i*.22;osc.connect(gain);gain.connect(ctx.destination);osc.type="sine";osc.frequency.setValueAtTime(frequency,t);osc.frequency.exponentialRampToValueAtTime(frequency*.82,t+.18);gain.gain.setValueAtTime(.001,t);gain.gain.exponentialRampToValueAtTime(.13,t+.015);gain.gain.exponentialRampToValueAtTime(.001,t+.2);osc.start(t);osc.stop(t+.22);});
  } catch (e) { console.warn("buzzer failed", e); }
}

function playAlarm() {
  try {
    const ctx = audioContext();
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = 880;
      const t = ctx.currentTime + i * 0.25;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.05);
      gain.gain.linearRampToValueAtTime(0, t + 0.2);
      osc.start(t); osc.stop(t + 0.25);
    }
  } catch (e) { console.warn("alarm failed", e); }
}

function playSuccess() {
  try { const ctx=audioContext(); [523,659,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.1;o.connect(g);g.connect(ctx.destination);o.frequency.value=f;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.start(t);o.stop(t+.3);}); } catch {}
}

function playClockTick(){
  try{const ctx=audioContext(),o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type="square";o.frequency.setValueAtTime(1250,t);o.frequency.exponentialRampToValueAtTime(760,t+.035);g.gain.setValueAtTime(.12,t);g.gain.exponentialRampToValueAtTime(.001,t+.055);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.06);}catch{}
}

function playClockBell(){
  try{const audio=new Audio(clockGotItUrl);audio.volume=.78;audio.play().catch(()=>{const fallback=new Audio(clockBellUrl);fallback.volume=.78;fallback.play().catch(()=>playSuccess());});}catch{playSuccess();}
}

function playCarFanfare() {
  try { const ctx=audioContext(); [392,523,659,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.11;o.type="square";o.connect(g);g.connect(ctx.destination);o.frequency.value=f;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.2,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.42);o.start(t);o.stop(t+.44);}); } catch {}
}

function playPlinkoFanfare() {
  try { const ctx=audioContext();[392,523,659,784,1047,1319].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.13;o.type=i%2?"triangle":"square";o.connect(g);g.connect(ctx.destination);o.frequency.value=f;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.24,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+.5);o.start(t);o.stop(t+.52);});}catch{}
}

function playShowcaseCelebration() {
  try { const ctx=audioContext(); [523,659,784,1047,1319,1568].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.13;o.type=i%2?"triangle":"square";o.connect(g);g.connect(ctx.destination);o.frequency.value=f;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.22,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.55);o.start(t);o.stop(t+.58);}); } catch {}
}

function playWomp() {
  try { const ctx=audioContext(); [330,262,220].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.2;o.type="sine";o.connect(g);g.connect(ctx.destination);o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.88,t+.18);g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.11,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.2);o.start(t);o.stop(t+.22);}); } catch {}
}

function playOrTwoSting(){
  try{const ctx=audioContext(),notes=[196,247,294,392,523];notes.forEach((frequency,index)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+index*.14;oscillator.type=index<3?"sawtooth":"square";oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.001,start);gain.gain.exponentialRampToValueAtTime(.16,start+.025);gain.gain.exponentialRampToValueAtTime(.001,start+.42);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(start);oscillator.stop(start+.44);});}catch{}
}
function playSecretXSting(){
  try{const ctx=audioContext();[220,277,330,440,659].forEach((frequency,index)=>{const oscillator=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+index*.16;oscillator.type=index<3?"triangle":"square";oscillator.frequency.value=frequency;gain.gain.setValueAtTime(.001,start);gain.gain.exponentialRampToValueAtTime(.15,start+.03);gain.gain.exponentialRampToValueAtTime(.001,start+.55);oscillator.connect(gain);gain.connect(ctx.destination);oscillator.start(start);oscillator.stop(start+.58);});}catch{}
}

function playWheelClicks(duration=3400){
  let stopped=false,timer=null,elapsed=0;
  const click=()=>{if(stopped)return;try{const ctx=audioContext(),o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime;o.type="square";o.frequency.setValueAtTime(1450,t);o.frequency.exponentialRampToValueAtTime(620,t+.025);g.gain.setValueAtTime(.09,t);g.gain.exponentialRampToValueAtTime(.001,t+.035);o.connect(g);g.connect(ctx.destination);o.start(t);o.stop(t+.04);}catch{}const progress=Math.min(1,elapsed/duration),delay=38+Math.pow(progress,2.7)*245;elapsed+=delay;if(elapsed<duration)timer=setTimeout(click,delay);};
  click();return()=>{stopped=true;clearTimeout(timer);};
}

function HostViewInner({ code, remoteMode = false, controller = true, embedded = false }) {
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState("lobby"); // "lobby" | "opening" | "game"
  const [error, setError] = useState("");
  const [config, setConfig] = useState({ hostName: "Bob Barker", announcerName: "Rod Roddy", announcerVoice: "cedar", hostVoice: "coral" });
  const [kissBurst,setKissBurst]=useState(null);
  const [shirtBurst,setShirtBurst]=useState(null);
  const [audienceBurst,setAudienceBurst]=useState(null);
  const lastSeqRef = useRef(-1);
  const audioRef = useRef(null);       // host voice
  const announcerRef = useRef(null);   // announcer voice (for prize descriptions)
  const gameClipRef = useRef(null);
  const speechRunRef = useRef(0);
  const lastOutcomeRef = useRef(0);
  const lastSettledDropRef = useRef(0);
  const lastSettledClimbRef = useRef(0);
  const lastYodelClimbRef = useRef(0);
  const lastCliffCelebrationRef = useRef(0);
  const lastSettledPuttRef = useRef(0);
  const cliffYodelRef = useRef(null);
  const lastSettledWheelRef = useRef("");
  const lastAIWheelActionRef = useRef("");
  const lastKissRef=useRef(0);
  const lastShirtRef=useRef(0);
  const lastAudienceRef=useRef(0);
  const openingSeenRef=useRef(false);
  const isDriver=!remoteMode||controller;
  const finishPlinkoDrop=useCallback((dropId)=>{if(!isDriver||!dropId||dropId===lastSettledDropRef.current)return;lastSettledDropRef.current=dropId;settlePricingGame(code).catch(e=>{lastSettledDropRef.current=0;setError(e.message);});},[code,isDriver]);
  const finishCliffClimb=useCallback((climbId)=>{if(!isDriver||!climbId||climbId===lastSettledClimbRef.current)return;lastSettledClimbRef.current=climbId;settlePricingGame(code).catch(e=>{lastSettledClimbRef.current=0;setError(e.message);});},[code,isDriver]);
  const finishHolePutt=useCallback((puttId)=>{if(!isDriver||!puttId||puttId===lastSettledPuttRef.current)return;lastSettledPuttRef.current=puttId;settlePricingGame(code,{kind:"holePutt",id:puttId}).catch(e=>{lastSettledPuttRef.current=0;setError(e.message);});},[code,isDriver]);

  useEffect(() => { if (state?.isDemo && phase !== "game") setPhase("game"); }, [state?.isDemo]);

  useEffect(()=>{
    if(!remoteMode||openingSeenRef.current||phase!=="lobby"||state?.phase!=="calling")return;
    openingSeenRef.current=true;
    setPhase("opening");
  },[remoteMode,phase,state?.phase]);

  useEffect(() => {
    const event = state?.pricingGame?.lastOutcome;
    if (!event || event.seq === lastOutcomeRef.current) return;
    lastOutcomeRef.current = event.seq;
    if(event.silent)return;
    if (state?.pricingGame?.type==="clockGame"&&(event.kind==="success"||event.kind==="win"))playClockBell();
    else if (event.kind === "success" || event.kind === "win") playSuccess();
    else if (event.kind === "loss") playWomp();
    else if (event.kind === "failure") playBuzzer();
  }, [state?.pricingGame?.lastOutcome]);

  useEffect(()=>{const event=state?.kissEvent;if(!event||event.seq===lastKissRef.current)return;lastKissRef.current=event.seq;setKissBurst(event);const timer=setTimeout(()=>setKissBurst(current=>current?.seq===event.seq?null:current),2600);return()=>clearTimeout(timer);},[state?.kissEvent?.seq]);
  useEffect(()=>{const event=state?.shirtEvent;if(!event||event.seq===lastShirtRef.current)return;lastShirtRef.current=event.seq;setShirtBurst(event);const timer=setTimeout(()=>setShirtBurst(current=>current?.seq===event.seq?null:current),3000);return()=>clearTimeout(timer);},[state?.shirtEvent?.seq]);
  useEffect(()=>{const suggestions=state?.pricingGame?.audienceSuggestions;if(!suggestions?.latest||suggestions.seq===lastAudienceRef.current)return;lastAudienceRef.current=suggestions.seq;setAudienceBurst({...suggestions.latest,count:suggestions.counts?.[suggestions.latest.choice]||1});const timer=setTimeout(()=>setAudienceBurst(null),2200);return()=>clearTimeout(timer);},[state?.pricingGame?.audienceSuggestions?.seq]);

  useEffect(()=>{const s=state?.showdown;if(!isDriver||!s||!["spinning","bonusSpinning","automaticSpinning"].includes(s.stage))return;const key=`${s.half}-${s.spinSeq}`;if(key===lastSettledWheelRef.current)return;lastSettledWheelRef.current=key;let stopped=false;const attempt=async(retries=0)=>{try{await settleWheel(code);}catch(e){if(!stopped&&retries<2)setTimeout(()=>attempt(retries+1),1200);else if(!stopped){lastSettledWheelRef.current="";setError(e.message);}}};const timer=setTimeout(()=>attempt(),(s.spinDuration||3400)+150);return()=>{stopped=true;clearTimeout(timer);};},[state?.showdown?.half,state?.showdown?.spinSeq,state?.showdown?.stage,state?.showdown?.spinDuration,code,isDriver]);
  useEffect(()=>{const s=state?.showdown;if(!s||!["spinning","bonusSpinning","automaticSpinning"].includes(s.stage))return;return playWheelClicks(s.spinDuration||3400);},[state?.showdown?.spinSeq,state?.showdown?.stage]);

  // TV browsers occasionally omit Web Animations' finished Promise. The
  // animation itself settles first; this watchdog prevents a room from ever
  // remaining stuck in "dropping" if the browser fails to send that event.
  useEffect(()=>{const game=state?.pricingGame,drop=game?.lastDrop;if(game?.type!=="plinko"||game.stage!=="dropping"||!drop)return;const timer=setTimeout(()=>finishPlinkoDrop(drop.id),(drop.duration||5600)+900);return()=>clearTimeout(timer);},[state?.pricingGame?.lastDrop?.id,state?.pricingGame?.stage,state?.pricingGame?.lastDrop?.duration,finishPlinkoDrop]);

  useEffect(()=>{const game=state?.pricingGame,climb=game?.lastClimb;if(game?.type!=="cliffHangers"||game.stage!=="climbing"||!climb)return;const timer=setTimeout(()=>finishCliffClimb(climb.id),(climb.duration||1000)+700);return()=>clearTimeout(timer);},[state?.pricingGame?.lastClimb?.id,state?.pricingGame?.stage,state?.pricingGame?.lastClimb?.duration,finishCliffClimb]);

  useEffect(()=>{const game=state?.pricingGame,putt=game?.lastPutt;if(game?.type!=="holeInOne"||game.stage!=="putting"||!putt)return;const timer=setTimeout(()=>finishHolePutt(putt.id),(putt.duration||2600)+650);return()=>clearTimeout(timer);},[state?.pricingGame?.lastPutt?.id,state?.pricingGame?.stage,state?.pricingGame?.lastPutt?.duration,finishHolePutt]);

  useEffect(()=>{const game=state?.pricingGame,climb=game?.lastClimb,audio=cliffYodelRef.current;if(game?.type!=="cliffHangers"||game.stage!=="climbing"||!climb||climb.correct){if(audio){audio.pause();audio.currentTime=0;}return;}if(climb.id===lastYodelClimbRef.current)return;lastYodelClimbRef.current=climb.id;audio.pause();audio.currentTime=0;audio.loop=true;audio.volume=.72;audio.play().catch(()=>{});return()=>{audio.pause();audio.currentTime=0;};},[state?.pricingGame?.lastClimb?.id,state?.pricingGame?.stage,state?.pricingGame?.lastClimb?.correct]);

  useEffect(()=>{const game=state?.pricingGame,id=game?.lastClimb?.id;if(game?.type!=="cliffHangers"||!game.cliffFinalWin||!id||id===lastCliffCelebrationRef.current)return;lastCliffCelebrationRef.current=id;playShowcaseCelebration();},[state?.pricingGame?.cliffFinalWin,state?.pricingGame?.lastClimb?.id]);

  // AI turns must not depend on speech audio reaching its `ended` event.
  useEffect(()=>{const s=state?.showdown,p=s?.participants?.[s.currentIndex];if(!isDriver||!s||!p?.isAI||!["turn","decision","bonusTurn"].includes(s.stage))return;const key=`${s.half}-${s.currentIndex}-${s.stage}-${p.spins?.length||0}-${s.spinSeq}`;if(key===lastAIWheelActionRef.current)return;lastAIWheelActionRef.current=key;let stopped=false;const timer=setTimeout(async()=>{try{await resolveWheelAI(code);}catch(e){if(!stopped){lastAIWheelActionRef.current="";setError(e.message);}}},1800);return()=>{stopped=true;clearTimeout(timer);};},[state?.showdown?.half,state?.showdown?.currentIndex,state?.showdown?.stage,state?.showdown?.spinSeq,code,isDriver]);

  // Poll server state
  useEffect(() => {
    let stopped = false;
    const tick = async () => {
      try {
        const s = await getState(code);
        if (!stopped) setState(s);
      } catch (e) {
        if (!stopped) setError(e.message);
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { stopped = true; clearInterval(id); };
  }, [code]);

  // Drive host lines (game phase only)
  useEffect(() => {
    if (phase !== "game" || !state?.hostLine) return;
    const { seq, text, type } = state.hostLine;
    if (seq === lastSeqRef.current) return;
    lastSeqRef.current = seq;
    const speechRun = ++speechRunRef.current;
    const el = audioRef.current;
    const ann = announcerRef.current;
    // A new server line owns the sound stage. Stop both channels before it
    // begins so delayed network audio can never talk over a later line.
    const clip=gameClipRef.current;
    [el, ann, clip].forEach(audio => { if (audio) { audio.pause(); audio.currentTime = 0; } });
    const current = (fn) => { if (speechRun === speechRunRef.current) fn(); };
    const safely = (fn) => { if(isDriver) current(() => fn().catch((e) => setError(e.message))); };

    const voice = config.hostVoice || "coral";
    // "welcome" and "call" types are handled by the opening sequence.
    // The game loop only handles item onwards.
    if (type === "welcome" || type === "call") {
      return; // opening already did this — ignore
    } else if (type === "replacementIntro") {
      const [hostPart = "", announcerPart = ""] = text.split("||");
      const annVoice = config.announcerVoice || "cedar";
      playTTS(el, hostPart, () => current(() => {
        revealReplacement(code).then(fresh => current(() => {
          setState(fresh);
          if (announcerPart && ann) playTTS(ann, announcerPart, () => safely(() => advance(code, "item")), annVoice, "announcer");
          else safely(() => advance(code, "item"));
        })).catch(e => setError(e.message));
      }), voice);
    } else if (type === "itemIntro") {
      const parts = text.split("||");
      const hostPart = parts[0] || "";
      const announcerPart = parts[1] || "";
      const annVoice = config.announcerVoice || "cedar";
      const afterAnnounce = () => {
        safely(() => advance(code, "bidding"));
      };
      // There is deliberately no timeout here: the announcer must finish (or
      // definitively fail) before the bidding screen and host prompt begin.
      playTTS(el, hostPart, () => current(() => {
        if (announcerPart && ann) {
          playTTS(ann, announcerPart, afterAnnounce, annVoice, "announcer");
        } else {
          afterAnnounce();
        }
      }), voice);
    } else if (type === "prompt") {
      playTTS(el, text, () => {}, voice);
    } else if (type === "bidResult") {
      const last = state.contestants.every(c => c.bid != null);
      playTTS(el, text, () => safely(() => last ? advance(code, "reveal") : nextTurn(code)), voice);
    } else if (type === "reveal") {
      const humanWinner = state.winnerIndices
        .map(i => state.contestants[i]).find(c => c && !c.isAI);
      playTTS(el, text, () => safely(() => humanWinner
        ? startPricingGame(code)
        : restartGame(code, "sameLineup")), voice);
    } else if (type === "overbid") {
      playBuzzer();
      setTimeout(() => {
        playTTS(el, text, () => {
          // Auto-reset bids after host finishes speaking
          setTimeout(() => safely(() => resetBids(code)), 1200);
        }, voice);
      }, 900); // let buzzer play first
    } else if (type === "exactBid") {
      playAlarm();
      setTimeout(() => {
        current(() => {
          const humanWinner = state.winnerIndices
            .map(i => state.contestants[i]).find(c => c && !c.isAI);
          playTTS(el, text, () => safely(() => humanWinner
            ? startPricingGame(code)
            : restartGame(code, "sameLineup")), voice);
        });
      }, 800);
    } else if (type === "shirtReveal") {
      playTTS(el, text, () => {
        setTimeout(() => safely(() => beginPricingGame(code)), 1400);
      }, voice, "host");
    } else if (type === "pricingGameIntro") {
      const game = state.pricingGame;
      const hostIntro = `${text} ${game.instructions}`;
      if(game?.type==="plinko")playRecorded(clip,plinkoIntroUrl,()=>current(()=>playTTS(el,game.instructions,()=>safely(()=>beginPricingGame(code)),voice,"host")));
      else playTTS(el, hostIntro, () => safely(() => beginPricingGame(code)), voice, "host");
    } else if (type === "pricingPrizeIntro") {
      const isNewCar=/new car/i.test(text);
      if(!isNewCar&&state.pricingGame?.type==="shellGame"&&state.pricingAnnouncement?.id===state.pricingGame?.bonusPrize?.id)playShowcaseCelebration();
      const bellDelay=state.pricingGame?.type==="clockGame"&&state.pricingGame?.lastOutcome?.kind==="success"?4000:650;
      const describe=()=>current(()=>playTTS(ann,isNewCar?text.replace(/^.*?new car[!\s.]*/i,"").trim():text,()=>safely(()=>beginPricingGame(code)),config.announcerVoice||"cedar","announcer"));
      setTimeout(()=>current(()=>isNewCar?playRecorded(clip,newCarIntroUrl,describe):describe()),bellDelay);
    } else if (type === "pricingRevealCue") {
      playTTS(el, text, () => safely(() => revealPricingPrice(code)), voice, "host");
    } else if (type === "pricingPriceShown") {
      setTimeout(() => current(() => playTTS(el, text, () => safely(() => continuePricingPrice(code)), voice, "host")), 650);
    } else if(type==="cliffCheck"){
      playTTS(el,text,()=>current(()=>{if(state.pricingGame?.lastClimb?.correct)playSuccess();else playBuzzer();setTimeout(()=>safely(()=>settlePricingGame(code)),750);}),voice,"host");
    } else if(type==="holeOrderReveal"){
      playTTS(el,text,()=>setTimeout(()=>safely(()=>settlePricingGame(code,{kind:"holeOrder",index:state.pricingGame?.revealedCount||0})),500),voice,"host");
    } else if(type==="holeOrderRevealStep"){
      playTTS(el,text,()=>setTimeout(()=>safely(()=>settlePricingGame(code,{kind:"holeOrder",index:state.pricingGame?.revealedCount||0})),650),voice,"host");
    } else if(type==="holePuttReady"){
      playTTS(el,text,()=>{},voice,"host");
    } else if(type==="holeOrTwoReveal"){
      playOrTwoSting();setTimeout(()=>current(()=>playTTS(el,text,()=>setTimeout(()=>safely(()=>settlePricingGame(code,{kind:"holeOrTwo"})),900),voice,"host")),700);
    } else if(type==="luckySevenDoor"){
      const guess=state.pricingGame?.lastGuess;
      playTTS(el,text,()=>setTimeout(()=>safely(()=>settlePricingGame(code,{kind:"luckyDoor",id:guess?.id})),850),voice,"host");
    } else if(type==="luckySevenCost"){
      const guess=state.pricingGame?.lastGuess;
      playTTS(el,text,()=>setTimeout(()=>safely(()=>settlePricingGame(code,{kind:"luckyCost",id:guess?.id})),650),voice,"host");
    } else if(type==="masterKeyTurn"){
      const turn=state.pricingGame?.lastKeyTurn;
      playTTS(el,text,()=>setTimeout(()=>safely(()=>settlePricingGame(code,{kind:"masterTurn",id:turn?.id})),850),voice,"host");
    } else if(type==="masterKeyResult"){
      const turn=state.pricingGame?.lastKeyTurn;
      playTTS(el,text,()=>setTimeout(()=>safely(()=>settlePricingGame(code,{kind:"masterResult",id:turn?.id})),750),voice,"host");
    } else if(type==="secretXReveal"){
      playTTS(el,text,()=>{playSecretXSting();setTimeout(()=>safely(()=>settlePricingGame(code,{kind:"secretX"})),1100);},voice,"host");
    } else if (type === "pricingGame" || type === "pricingPrompt") {
      const diceReveal=state.pricingGame?.type==="diceGame"&&state.pricingGame?.stage==="reveal";
      if(diceReveal)playTTS(ann,text,()=>{},config.announcerVoice||"cedar","announcer");
      else playTTS(el, text, () => {}, voice);
    } else if (type === "pricingResult") {
      const finish=()=>playTTS(el, text, () => { if (!state.isDemo) safely(() => restartGame(code, "sameLineup")); }, voice);
      if(state.pricingGame?.type==="clockGame"&&state.pricingGame?.status==="won")setTimeout(()=>current(finish),4000);else finish();
    } else if (type === "wheelIntro" || type === "wheelPrompt" || type === "wheelAdvance") {
      playTTS(el,text,()=>{},voice);
    } else if (type === "wheelSpin") {
      playTTS(el,text,()=>{},voice);
    } else if (type === "wheelAnnouncement") {
      playTTS(el,text,()=>safely(()=>acknowledgeWheel(code)),voice);
    } else if (type === "wheelResult") {
      playTTS(el,text,()=>safely(()=>finishShowdown(code)),voice);
    } else if (type === "showcaseTheme") {
      playTTS(el,text,()=>safely(()=>advanceShowcase(code)),voice);
    } else if (type === "showcasePrize") {
      playTTS(ann,text,()=>safely(()=>advanceShowcase(code)),config.announcerVoice||"cedar","announcer");
    } else if (type === "showcaseRevealStep") {
      playTTS(el,text,()=>safely(()=>advanceShowcase(code)),voice);
    } else if (type === "showcaseChoice" || type === "showcaseBid") {
      playTTS(el,text,()=>current(()=>{const f=state.finalShowcase;const id=f?.stage==="choice"?f.contestants[0].id:f?.assignments?.[f.stage==="firstBid"?0:1];if(f?.contestants?.find(c=>c.id===id)?.isAI)safely(()=>resolveShowcaseAI(code));}),voice);
    } else if (type === "showcaseResult") {
      playTTS(el,text,()=>current(()=>{playShowcaseCelebration();setTimeout(()=>safely(()=>advanceShowcase(code)),2600);}),voice);
    } else if(type==="endCreditsTrack"){
      // The supplied recording owns this sequence, including Rod Roddy's
      // sign-off. No synthesized announcer voice should overlap it.
    }
  }, [state, code, phase, isDriver]);

  const action = (fn) => () => { if(isDriver) fn().catch((e) => setError(e.message)); };
  const forceAction = (fn) => () => {
    if(!isDriver)return;
    speechRunRef.current += 1;
    [audioRef.current, announcerRef.current].forEach(audio => {
      if (audio) { audio.pause(); audio.currentTime = 0; }
    });
    fn().catch((e) => setError(e.message));
  };

  // "Start Game" — unlock audio, start game (builds lineup), wait for
  // contestants to appear in state, THEN show opening.
  const handleStart = async () => {
    if(!isDriver)return;
    const el = audioRef.current;
    // Unlock browser autoplay with a silent data URI triggered by this gesture
    el.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";
    el.play().then(() => { el.pause(); el.src = ""; }).catch(() => {});

    try {
      const [cfg] = await Promise.all([
        getConfig().catch(() => ({})),
        startGame(code),
      ]);
      setConfig(cfg);
    } catch (e) { setError(e.message); return; }

    // Poll until the server state has contestants populated (it's immediate
    // but the React state might not have caught up from the poll interval yet)
    for (let i = 0; i < 10; i++) {
      const s = await getState(code).catch(() => null);
      if (s?.contestants?.length > 0) {
        setState(s);
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }

    setPhase("opening");
  };

  const handleOpeningDone = async () => {
    if(!isDriver){setPhase("game");return;}
    // The opening already called all contestants — skip the server's "calling"
    // phase by advancing straight through it to "item".
    // First call-next enough times to exhaust the calling phase,
    // then advance to item.
    try {
      // Fast-forward: call all contestants server-side (sets callIndex)
      const s = await getState(code);
      const needed = (s?.contestants?.length || 4);
      for (let i = 0; i <= needed; i++) {
        await callNext(code).catch(() => {});
      }
      // Now advance to item
      await advance(code, "item");
      // Get the latest state and prime the seq BEFORE entering game phase
      const fresh = await getState(code);
      if (fresh) {
        setState(fresh);
        lastSeqRef.current = fresh.hostLine.seq - 1; // -1 so the next effect fires
      }
    } catch (e) {
      console.error("handleOpeningDone:", e);
    }
    setPhase("game");
  };



  const joinPath=remoteMode?`/remote/${code}`:`/play/${code}`;
  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}${joinPath}`
    : joinPath;

  return (
    <>
      {/* Audio elements always in DOM */}
      <audio ref={audioRef} style={{ display: "none" }} />
      <audio ref={announcerRef} style={{ display: "none" }} />
      <audio ref={gameClipRef} style={{ display: "none" }} />
      <audio ref={cliffYodelRef} src={cliffYodelUrl} preload="none" style={{ display: "none" }} />
      {kissBurst&&<div key={`kiss-${kissBurst.seq}`} className="pir-kiss-burst" aria-live="polite"><span>💋</span><span>😘</span><span>💖</span><b>{kissBurst.playerName} kissed the host!</b><span>💋</span><span>💕</span></div>}
      {shirtBurst&&<div key={`shirt-${shirtBurst.seq}`} className="pir-shirt-burst" aria-live="polite"><span>✨</span><div><small>{shirtBurst.playerName}'s T-shirt</small><div className="pir-shirt"><div className="pir-shirt-copy">{shirtBurst.message}</div></div></div><span>🎉</span><span>👏</span></div>}
      {audienceBurst&&<div className="pir-audience-burst" aria-live="polite"><small>{audienceBurst.playerName} shouts</small><strong>{audienceBurst.choice}!</strong>{audienceBurst.count>1&&<b>{audienceBurst.count} audience votes</b>}</div>}

      {phase === "opening" && state && (
        <OpeningSequence
          contestants={state.contestants}
          contestantCount={state.players?.length || state.contestants.length}
          roomCode={code}
          announcerVoice={config.announcerVoice}
          hostVoice={config.hostVoice}
          onDone={handleOpeningDone}
        />
      )}

      {phase !== "opening" && (
        <div className={`pir-root pir-host-root ${embedded?"pir-host-embedded":""}`}>
          {!state && (
            <div className="pir-loading">
              <div className="pir-title">Come On Down!</div>
              <p className="pir-helptext">Loading room {code}…</p>
            </div>
          )}

          {state && (
            <>
              <div className="pir-title-row">
                <h1 className="pir-title">Come On Down!</h1>
                <div className="pir-subtitle">The Bidding Game · Item Up For Bid</div>
              </div>

              {state.phase === "lobby" && (
                <Lobby state={state} code={code} joinUrl={joinUrl} onStart={isDriver?handleStart:null} remoteMode={remoteMode} />
              )}
              {state.phase === "demoLobby" && <DemoLobby state={state} joinUrl={joinUrl} />}
              {state.phase === "calling" && <CallingView state={state} code={code} />}
              {state.phase === "replacement" && <ReplacementView state={state} code={code} />}
              {state.phase === "item" && (
                <ItemView state={state} />
              )}
              {state.phase === "bidding" && <BiddingView state={state} code={code} />}
              {state.phase === "reveal" && (
                <RevealView state={state} code={code}
                  onStartPricing={isDriver?forceAction(() => startPricingGame(code)):null}
                  onNextRound={isDriver?forceAction(() => restartGame(code, "sameLineup")):null}
                  onNewPlayers={isDriver?action(() => restartGame(code, "newPlayers")):null} />
              )}
              {(state.phase === "pricingIntro" || state.phase === "pricingPrizeIntro" || state.phase === "pricingGame" || state.phase === "pricingRevealCue" || state.phase === "pricingPriceShown") && (
                <PricingGameView game={state.pricingGame} poolWarnings={state.prizePoolWarnings} spotlight={state.phase === "pricingPrizeIntro" ? state.pricingAnnouncement : null} rulesOnly={state.phase === "pricingIntro"} onSkipRules={state.phase==="pricingIntro"&&isDriver?forceAction(()=>beginPricingGame(code)):null} onPlinkoLanded={finishPlinkoDrop} onCliffStopped={finishCliffClimb} onPuttStopped={finishHolePutt} />
              )}
              {state.phase === "showcaseShowdown" && <WheelView showdown={state.showdown} />}
              {(state.phase.startsWith("showcase")||state.phase.startsWith("credits")) && state.finalShowcase && (state.phase.startsWith("credits")?<EndCredits state={state} config={config}/>:<FinalShowcaseView state={state} />)}
            </>
          )}

          {error && <div className="pir-error">{error}</div>}
        </div>
      )}
    </>
  );
}

const WHEEL_VALUES=[100,5,90,25,70,45,10,65,30,85,50,95,55,75,40,20,60,35,80,15];
function WheelView({showdown}) {
  if(!showdown)return null;
  const p=showdown.participants.find(x=>x.id===showdown.announcingPlayerId)||(showdown.participants[showdown.currentIndex]||showdown.participants.find(x=>x.id===showdown.winnerId));
  const spinning=["spinning","bonusSpinning","automaticSpinning"].includes(showdown.stage);
  const finished=showdown.participants.filter(x=>x.status==="done"&&x.score<=100);
  const leader=finished.sort((a,b)=>b.score-a.score)[0]||null;
  const startRotation=showdown.spinStartRotation||0;
  const rotation=showdown.wheelRotation||0;
  return <div className="pir-wheel-stage"><div className="pir-pricing-kicker">SHOWCASE SHOWDOWN {showdown.half}</div><h2 className="pir-pricing-title">THE BIG WHEEL</h2>{leader&&<div className="pir-wheel-leader"><span>CURRENT LEADER</span><b>{leader.name}</b><strong>{leader.score===100?"$1.00":`.${String(leader.score).padStart(2,"0")}`}</strong></div>}<div className="pir-wheel-machine"><div className="pir-wheel-tower"><span>💡</span><b>$</b><span>💡</span></div><div className="pir-wheel-center"><div className="pir-wheel-pointer">▼</div><div key={showdown.spinSeq} className={`pir-big-wheel ${spinning?"spinning":""}`} style={{transform:`rotate(${rotation}deg)`,"--start-rotation":`${startRotation}deg`,"--rotation":`${rotation}deg`,"--spin-duration":`${showdown.spinDuration||3400}ms`}}>{WHEEL_VALUES.map((v,i)=><span key={i} className={v===100?"dollar":""} style={{transform:`rotate(${i*18}deg) translateY(calc(-1 * var(--wheel-radius, 165px))) rotate(${-i*18}deg)`}}>{v===100?"100":String(v).padStart(2,"0")}</span>)}</div></div><div className="pir-wheel-tower"><span>💡</span><b>$</b><span>💡</span></div></div><h3>{p?.name}{showdown.isSpinoff?" — SPIN-OFF":""}</h3><div className="pir-wheel-scoreboard">{showdown.participants.map((x,i)=><div key={`${x.id}-${i}`} className={`${x.id===p?.id?"active":""} ${x.id===leader?.id?"leader":""}`}><b>{x.name}</b><span>{x.spins?.map(v=>v===100?"$1.00":`.${String(v).padStart(2,"0")}`).join(" + ")||"—"}</span><strong>{x.score>100?"BUST":`${x.score}¢`}</strong><small>Wheel bonus: ${x.bonusCash?.toLocaleString("en-CA")||0}</small></div>)}</div><div className="pir-pricing-prompt">{spinning?`${p?.name}'s ${showdown.spinStrength||"medium"} spin is turning…`:showdown.stage==="announcing"?"Listen for the result…":showdown.result||`${p?.name}, spin the wheel!`}</div></div>;
}

function FinalShowcaseView({state}) {
  const f=state.finalShowcase,s=f.showcases[f.showcaseIndex]||f.showcases[0],winner=f.contestants.find(c=>c.id===f.winnerId);
  return <div className={`pir-showcase-stage pir-tv-showcase ${f.stage==="complete"&&winner?"pir-showcase-won":""}`}>
    {f.stage==="complete"&&winner&&<><div className="pir-confetti" aria-hidden="true">{Array.from({length:70},(_,i)=><i key={i} style={{"--i":i}} />)}</div><div className="pir-winner-spectacular"><small>THE SHOWCASE WINNER IS</small><strong>{winner.name}!</strong><span>🎉 🏆 🎉</span><b>{f.doubleShowcase?"YOU WON BOTH SHOWCASES!":"YOU WON YOUR SHOWCASE!"}</b></div></>}
    <div className="pir-pricing-kicker">THE FINAL SHOWCASE</div><h2 className="pir-pricing-title">{s.title}</h2>
    {!f.stage.startsWith("reveal")&&f.stage!=="complete"&&(state.showcaseAnnouncement?<div className="pir-model-presentation pir-showcase-model-presentation"><img className="pir-prize-models" src={prizeModelsUrl} alt="Prize models presenting the showcase prize"/><div className="pir-model-prize"><GameCards items={[state.showcaseAnnouncement]}/></div></div>:<div className="pir-showcase-prizes">{s.prizes.map((p,i)=><div key={p.id||i}><div className="pir-prize-picture"><div className="pir-prize-visual" role="img" aria-label={p.name}>{p.visual||"🎁"}</div><PrizePhoto item={p}/></div><b>{p.name}</b></div>)}</div>)}
    <div className="pir-showcase-podiums">{f.contestants.map((c,i)=>{const showcaseIndex=f.assignments?.indexOf(c.id),r=f.results?.find(x=>x.playerId===c.id);return <div key={`${c.id}-${i}`} className={`pir-showcase-podium ${i%2?"blue":"red"} ${c.id===f.winnerId?"winner":""}`}><div className="pir-showcase-screen"><small>{showcaseIndex>=0?`SHOWCASE ${showcaseIndex+1}`:"FINALIST"}</small><b>{c.name}</b></div><div className="pir-showcase-readouts"><div><small>BID</small><strong>{f.bids[c.id]?`$${f.bids[c.id].toLocaleString("en-CA")}`:"—"}</strong></div><div className={r?"revealed":""}><small>ACTUAL RETAIL PRICE</small><strong>{r?`$${r.actual.toLocaleString("en-CA")}`:"?????"}</strong></div></div><div className={`pir-showcase-difference ${r?.over?"over":""}`}>{r?(r.over?"OVERBID":`DIFFERENCE $${r.difference.toLocaleString("en-CA")}`):"WAITING FOR REVEAL"}</div></div>})}</div>
    <div className="pir-pricing-prompt">{f.result||state.hostLine.text}</div>
  </div>;
}

function EndCredits({state,config}){
  const names=state.players?.map(player=>player.name).join(" · ")||"Our wonderful contestants";
  const standings=state.contestantStandings?.length?state.contestantStandings:state.players?.map(player=>({name:player.name,totalWinnings:0}))||[];
  const [trackEnded,setTrackEnded]=useState(false);
  useEffect(()=>{
    if(state.phase!=="creditsMusic")return;
    setTrackEnded(false);
    const audio=new Audio(endCreditsMusicUrl);audio.volume=.72;
    let fallback=null;
    audio.onended=()=>setTrackEnded(true);
    audio.play().catch(()=>{fallback=setTimeout(()=>setTrackEnded(true),89000);});
    return()=>{clearTimeout(fallback);audio.pause();audio.currentTime=0;audio.onended=null;};
  },[state.phase]);
  return <div className={`pir-end-credits ${trackEnded?"finished":"playing"}`}><div className="pir-credit-logo">THE PRICE IS RIGHT</div>{trackEnded?<div className="pir-final-winnings"><small>FINAL WINNINGS</small>{standings.map((player,index)=><div key={`${player.id||player.name}-${index}`}><b>{index+1}. {player.name}</b><span>${Number(player.totalWinnings||0).toLocaleString("en-CA")}</span></div>)}</div>:<div className="pir-credit-roll"><section><small>YOUR HOST</small><strong>Bob Barker</strong></section><section><small>ANNOUNCER</small><strong>{config.announcerName||"Rod Roddy"}</strong></section><section><small>TODAY'S CONTESTANTS</small><strong>{names}</strong></section><section><small>PRICING GAMES · BIG WHEEL · SHOWCASES</small><strong>Made for Family Game Night</strong></section><section><small>THANK YOU FOR WATCHING</small><strong>See you next time on The Price Is Right!</strong></section></div>}</div>;
}

function prizeSellerLine(item){
  return (item?.brand||"").trim();
}

function cleanPrizeDescription(item){
  return String(item?.description||item?.hostDescription||"")
    .replace(/^(?:(?:sold by|available (?:from|at)|from)\s+[^,.;—]+[,.;—]\s*)+/i,"")
    .replace(/^From\s+[^—]+—\s*/i,"")
    .replace(/^From\s+[^,]+,\s*/i,"")
    .replace(/^From\s+[^.]+?\.\s*/i,"")
    .replace(new RegExp(`^${String(item?.name||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}!?\\s*`,"i"),"")
    .replace(/\bchosen as (?:a )?(?:substantial )?Contestants'? Row prize\b[,.]?/gi,"")
    .replace(/\s{2,}/g," ")
    .trim();
}

function DemoLobby({ state, joinUrl }) {
  return <div className="pir-panel pir-center"><h2 className="pir-pricing-title">PRICING GAME TEST</h2><div className="pir-qr-box" style={{margin:"20px auto",width:"fit-content"}}><QRCodeSVG value={joinUrl} size={220} fgColor="#fff8e7" bgColor="transparent" /></div><p className="pir-helptext">Scan with a phone, enter the contestant's name, and the game will begin on this screen.</p><b>{state.players.length ? "Contestant connected — get ready!" : "Waiting for contestant…"}</b></div>;
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------
function Lobby({ state, code, joinUrl, onStart, remoteMode = false }) {
  return (
    <div className="pir-panel">
      <div className="pir-lobby-layout">
        <div className="pir-lobby-qr">
          <div className="pir-qr-box">
            <QRCodeSVG value={joinUrl} size={160} fgColor="#fff8e7" bgColor="transparent" level="M" />
          </div>
          <p className="pir-helptext" style={{ fontSize: 13 }}>{remoteMode?"Share the room link or code":"Scan to join on your phone"}</p>
        </div>
        <div className="pir-lobby-players">
          <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--gold)" }}>
            {state.players.length === 0 ? "Waiting for players…"
              : `${state.players.length} player${state.players.length !== 1 ? "s" : ""} joined`}
          </div>
          {state.players.map((p) => (
            <div key={p.id} className="pir-lobby-player-row">
              <div className="pir-avatar-sm pir-avatar-human">
                {p.hasPhoto ? "📷" : p.name[0].toUpperCase()}
              </div>
              <span>{p.name}</span>
            </div>
          ))}
          {state.players.length === 0 && <p className="pir-helptext">At least one human player must join to begin.</p>}
        </div>
      </div>
      {onStart?<div className="pir-actions">
        <button className="pir-btn" disabled={!state.players.length} onClick={onStart}>
          Start Game <ArrowRight size={18} />
        </button>
      </div>:<p className="pir-helptext">Waiting for the room creator to start the show…</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calling
// ---------------------------------------------------------------------------
function CallingView({ state, code }) {
  return (
    <>
      <Caption icon={<Mic2 size={20} />}
        text={state.hostLine.text || "Let's meet today's contestants…"} />
      <ContestantRow contestants={state.contestants} highlight={state.callIndex} code={code} />
    </>
  );
}

function ReplacementView({ state, code }) {
  const replacementIndex = state.contestants.findIndex(c => c.id === state.replacementContestantId);
  return (
    <>
      <Caption icon={<Mic2 size={20} />} text="We need a new contestant!" />
      <ContestantRow contestants={state.contestants} activeTurn={replacementIndex} code={code} />
    </>
  );
}

// ---------------------------------------------------------------------------
// Item
// ---------------------------------------------------------------------------
function ItemView({ state }) {
  const { item } = state;
  return (
    <>
      <Caption icon={<ChefHat size={20} />} text="Here's what you're bidding on tonight…" />
      <div className="pir-panel">
        <div className="pir-item-card">
          <ItemImage item={item} />
          <div className="pir-item-info">
            <div className="pir-item-tag">{prizeSellerLine(item)}</div>
            <h3>{item.name}</h3>
            <div className="pir-item-desc">{cleanPrizeDescription(item)}</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Bidding
// ---------------------------------------------------------------------------
function BiddingView({ state, code }) {
  return (
    <>
      <Caption icon={<Mic2 size={20} />} text={state.hostLine.text} />
      <div className="pir-bidding-prize">
        <ItemImage item={state.item} />
        <div><span>ITEM UP FOR BID</span><p className="pir-bidding-brand">{prizeSellerLine(state.item)}</p><h3>{state.item.name}</h3>{cleanPrizeDescription(state.item)&&<p className="pir-bidding-description">{cleanPrizeDescription(state.item)}</p>}</div>
      </div>
      <ContestantRow contestants={state.contestants}
        activeTurn={state.turn} code={code} showBids />
    </>
  );
}

// ---------------------------------------------------------------------------
// Reveal
// ---------------------------------------------------------------------------
function RevealView({ state, code, onStartPricing, onNextRound, onNewPlayers }) {
  const { item, contestants, winnerIndices, revealType } = state;
  const isExact = revealType === "exactBid";
  const isOverbid = revealType === "overbid";
  const exactWinner = isExact ? contestants.find(c => c.bid === item.price) : null;

  // Overbid screen — bids will be reset automatically by TTS completion
  if (isOverbid) {
    const bids = contestants.map(c => c.bid).filter(b => b != null);
    const lowest = bids.length ? Math.min(...bids) : 0;
    const lowestName = contestants.find(c => c.bid === lowest)?.name || "";
    return (
      <>
        <div className="pir-winner-banner" style={{ color: "var(--red)", fontSize: "clamp(20px,4vw,30px)" }}>
          🚫 Everyone overbid! Resetting…
        </div>
        <div className="pir-price-reveal pir-price-hidden"><div className="label">Actual Retail Price</div><div className="price">????</div></div>
        <ContestantRow contestants={contestants} showBids code={code} />
        <p className="pir-helptext">Lowest bid: {lowestName} at ${lowest}. The price remains hidden for the re-bid.</p>
      </>
    );
  }

  return (
    <>
      <div className="pir-price-reveal">
        <div className="label">Actual Retail Price</div>
        <div className="price">${item.price}</div>
      </div>

      {isExact && exactWinner && (
        <div className="pir-exact-bid-banner">
          <div className="pir-exact-label">🎯 EXACT BID! +$100</div>
          <CanadianHundred />
        </div>
      )}

      {winnerIndices.length > 0 ? (
        <div className="pir-winner-banner">
          <Trophy size={26} />
          {winnerIndices.map((i) => contestants[i].name).join(" & ")}{" "}
          {winnerIndices.length > 1 ? "win it!" : "wins it!"}
        </div>
      ) : (
        <div className="pir-winner-banner" style={{ color: "var(--red)" }}>
          Everybody went over — nobody wins this one.
        </div>
      )}

      <ContestantRow contestants={contestants} winnerIndices={winnerIndices}
        showBids showDiff itemPrice={item.price} code={code} />
      <div className="pir-fineprint">
        {item.name} · {prizeSellerLine(item)} · ${item.price}
      </div>
      {(onStartPricing||onNextRound||onNewPlayers)&&<div className="pir-actions">
        {winnerIndices.some(i => !contestants[i]?.isAI)
          ? <button className="pir-btn" onClick={onStartPricing}>Start Pricing Game Now</button>
          : <button className="pir-btn" onClick={onNextRound}>Call Next Contestant Now</button>}
        <button className="pir-btn secondary" onClick={onNewPlayers}>New Players</button>
      </div>}
    </>
  );
}

// ---------------------------------------------------------------------------
// Pricing games — the contestant controls these from their phone. The host
// screen is a read-only game board that mirrors every choice.
// ---------------------------------------------------------------------------
function MoneyBag({ value, selected = false, automatic = false, onScale = false }) {
  return <div className={`pir-money-bag ${selected ? "selected" : ""} ${automatic ? "automatic" : ""} ${onScale ? "on-scale" : ""}`} aria-label={`${Number(value).toLocaleString("en-CA")} dollar bag`}>
    <span className="pir-money-bag-neck" />
    <span className="pir-money-bag-tie" />
    <strong>${Number(value).toLocaleString("en-CA")}</strong>
    <small>{automatic ? "YOURS" : "MONEY BAG"}</small>
  </div>;
}

function LuckySevenBoard({game}){
  return <div className="pir-lucky-stage">
    <div className="pir-lucky-logo">LUCKY <span>$</span>EVEN</div>
    <div className="pir-lucky-doors">
      {game.revealed.map((digit,index)=>{
        const opening=game.stage==="doorOpening"&&game.lastGuess?.index===index;
        return <div key={index} className={`pir-lucky-door ${digit!=null?"open":""} ${opening?"opening":""}`}>
          <strong>{digit??(opening?game.lastGuess?.openingDigit:"")}</strong>
          <i><span>»</span></i>
          {opening&&<small>GUESS {game.lastGuess.guess}</small>}
        </div>;
      })}
    </div>
    <div className="pir-lucky-bank"><small>DOLLARS LEFT</small><div className="pir-lucky-dollars">{Array.from({length:Math.max(0,game.dollars)},(_,i)=><b key={i}>$</b>)}</div></div>
  </div>;
}
function ContestantAction({game}){
  return game.lastAction?<div key={game.lastAction.seq} className="pir-contestant-action" aria-live="polite"><small>{game.lastAction.playerName}</small><strong>{game.lastAction.text}</strong></div>:null;
}
function MasterKeyBoard({game}){
  const qualifier=game.qualifiers[Math.min(game.pricingIndex,game.qualifiers.length-1)];
  return <div className="pir-master-stage">
    <div className="pir-master-logo"><span>MASTER</span><b>KEY</b></div>
    <div className="pir-master-locks">{game.targets.map(target=><div key={target.id} className={`pir-master-lock ${target.unlocked?"unlocked":""} ${game.lastKeyTurn?.targetId===target.id?"turning":""}`}><small>{target.label}</small><div className="pir-padlock"><i/><strong>{target.unlocked?"OPEN":"🔒"}</strong></div><b>{target.brand}</b><span>{target.name}</span></div>)}</div>
    <div className="pir-master-keys">{game.keys.map(key=><div key={key.number} className={`${key.selected?"earned":""} ${game.activeKey?.number===key.number?"active":""}`}><span>KEY</span><b>{key.number}</b><i>⚿</i></div>)}</div>
    {(game.stage==="pricing"||game.stage==="keySelect")&&qualifier&&<div className="pir-master-small"><GameCards items={[qualifier]}/><div className="pir-master-code">{qualifier.code.split("").map((digit,index)=><b key={index}>{digit}</b>)}</div><small>FIRST TWO OR LAST TWO?</small></div>}
    {game.lastKeyTurn&&<div className={`pir-master-turn ${game.lastKeyTurn.result||"turning"}`}>KEY {game.lastKeyTurn.keyNumber} · {game.lastKeyTurn.result==="master"?"MASTER KEY!":game.lastKeyTurn.result==="open"?"IT OPENS!":game.lastKeyTurn.result==="locked"?"NO": "TURNING..."}</div>}
  </div>;
}
function SecretXBoard({game}){
  const qualifier=game.qualifiers[Math.min(game.qualifierIndex,game.qualifiers.length-1)],winning=new Set(game.winningLine||[]);
  return <div className="pir-secret-stage">
    <div className="pir-secret-logo">SECRET <b>“X”</b></div>
    <div className="pir-secret-layout">
      <div className="pir-secret-prize"><small>PLAYING FOR</small><GameCards items={[game.bonusPrize]}/></div>
      <div className={`pir-secret-board ${game.secretRevealed?"revealed":""}`}>{game.board.map((cell,index)=>{const centre=index%3===1;return <div key={index} className={`${centre?"secret":""} ${cell?"has-x":""} ${winning.has(index)?"winner":""}`}><i>{centre&&!game.secretRevealed?"?":cell||""}</i></div>;})}</div>
      {(game.stage==="pricing")&&qualifier?<div className="pir-secret-small"><GameCards items={[qualifier]}/><div>{qualifier.possiblePrices.map(price=><b key={price}>${Number(price).toLocaleString("en-CA")}</b>)}</div></div>:<div className="pir-secret-status"><b>{game.xsToPlace||0}</b><span>X{game.xsToPlace===1?"":"s"} TO PLACE</span></div>}
    </div>
  </div>;
}

export function PricingGameView({ game, poolWarnings = [], spotlight = null, rulesOnly = false, onSkipRules = null, onPlinkoLanded = null, onCliffStopped = null, onPuttStopped = null }) {
  if (!game) return <div className="pir-loading">Loading pricing game…</div>;
  if (rulesOnly) return <div className={`pir-pricing-board pir-game-${game.type} pir-rules-only ${game.type==="plinko"?"pir-plinko-intro":""}`}>{game.type==="plinko"&&<><div className="pir-plinko-logo">PLINKO!</div><div className="pir-plinko-jackpot">A CHANCE TO WIN<br/><strong>$50,000!!!</strong></div></>}<div className="pir-pricing-kicker">HOW TO PLAY</div>{game.type!=="plinko"&&<h2 className="pir-pricing-title">{game.title}</h2>}<p className="pir-pricing-rules">{game.instructions}</p>{game.type==="cliffHangers"&&<CliffBoard game={game} /> }<div className="pir-pricing-prompt">Listen to the rules…</div>{onSkipRules&&<button className="pir-btn pir-skip-rules" onClick={onSkipRules}>SKIP RULES — LET'S PLAY!</button>}</div>;
  if (spotlight) { const isCar=/IT'S A NEW CAR/i.test(spotlight.announcerText||""),isGrand=!isCar&&(spotlight.id===game.bonusPrize?.id||Boolean(game.featuredIntroCount)); return <div className={`pir-pricing-board pir-game-${game.type} pir-model-presentation ${isCar?"pir-new-car-stage":""} ${isGrand?"pir-shell-grand-intro":""}`}><div className="pir-pricing-kicker">PRIZE INTRODUCTION</div>{isCar&&<div className="pir-new-car-flash">IT'S A NEW CAR!!!</div>}{isGrand&&<div className="pir-shell-grand-flash">PLAYING FOR THIS GRAND PRIZE!</div>}<h2 className="pir-pricing-title">{game.title}</h2><img className="pir-prize-models" src={prizeModelsUrl} alt="Prize models presenting the prize"/><div className="pir-model-prize"><GameCards items={[spotlight]} /></div><div className="pir-pricing-prompt">Listen to the announcer…</div></div>; }
  if(game.priceReveal&&game.type==="cliffHangers")return <div className={`pir-pricing-board pir-game-cliffHangers ${game.cliffFinalWin?"pir-cliff-victory":""}`}><div className="pir-pricing-kicker">CLIFF HANGERS</div><h2 className="pir-pricing-title">{game.title}</h2><ContestantAction game={game}/><GameCards items={[game.priceReveal]} /><CliffBoard game={game} reveal={game.priceReveal}/>{game.cliffFinalWin&&game.priceReveal.actual==null&&<div className="pir-cliff-win-flash">HE MADE IT!<small>YOU WON ALL THREE PRIZES!</small></div>}</div>;
  if (game.priceReveal) return <div className={`pir-pricing-board pir-game-${game.type}`}><div className="pir-pricing-kicker">PRICE REVEAL</div><h2 className="pir-pricing-title">{game.title}</h2><ContestantAction game={game}/><GameCards items={[{...game.priceReveal,revealedPrice:game.priceReveal.actual}]} /><div className={`pir-pricing-prompt ${game.priceReveal.actual==null?"":"revealed"}`}>{game.priceReveal.actual==null?"SHOW ME THE PRICE!":game.priceReveal.correct?"THAT'S RIGHT!":"OH, SO CLOSE!"}</div></div>;
  return (
    <div className={`pir-pricing-board pir-game-${game.type}`}>
      <div className="pir-pricing-kicker">{game.playerName}, COME ON UP!</div>
      <h2 className="pir-pricing-title">{game.title}</h2>
      <p className="pir-pricing-rules">{game.instructions}</p>
      <ContestantAction game={game}/>

      {game.type === "plinko" && (
        <div className="pir-plinko-board">
          {game.stage === "qualify" && <GameCards items={[game.qualifiers[game.qualifierIndex]].filter(Boolean)} />}
          <div className="pir-plinko-drop-line">{Array.from({length:9},(_,i)=><span key={i}>{i+1}</span>)}</div>
          <div className="pir-plinko-field"><div className="pir-plinko-pegs">{Array.from({length:12},(_,row)=><div key={row} className={row%2?"offset":""}>{Array.from({length:row%2?8:9},(_,peg)=><i key={peg} />)}</div>)}</div>{game.lastDrop && <PlinkoChip key={game.lastDrop.id} drop={game.lastDrop} onLanded={()=>onPlinkoLanded?.(game.lastDrop.id)} />}</div>
          <div className="pir-plinko-slots">{game.slots.map((v,i) => <span key={i}>${v}</span>)}</div>
          {game.lastDrop?.value != null && <div className="pir-plinko-result">LANDED ON ${game.lastDrop.value.toLocaleString("en-CA")}</div>}
          <b>{game.stage === "qualify" ? `${game.chips} chip${game.chips === 1 ? "" : "s"} earned` : `${game.chipsLeft} chip${game.chipsLeft === 1 ? "" : "s"} left`}</b>
        </div>
      )}
      {game.type === "cliffHangers" && <><GameCards items={[game.items[game.itemIndex]].filter(Boolean)} /><CliffBoard game={game} onStopped={()=>onCliffStopped?.(game.lastClimb?.id)} /></>}
      {game.type === "punchABunch" && <><div className="pir-punch-status">PUNCHES EARNED: {game.punches}</div>{game.stage === "qualify" ? <GameCards items={[game.qualifiers[game.qualifierIndex]].filter(Boolean)} /> : <div className="pir-punch-grid">{Array.from({length:50},(_,i)=><span key={i} className={game.punched?.includes(i)?"punched":""}>{game.punched?.includes(i)?"💥":i+1}</span>)}</div>}</>}
      {game.type === "diceGame" && <><GameCards items={[game.car]} /><div className="pir-dice-board"><div className="pir-price-digits"><span>{game.firstDigit}</span>{game.revealed.map((n,i)=><span key={i} className={game.correct[i]===false?"wrong":game.correct[i]===true?"right":""}>{n ?? "?"}</span>)}</div><div className="pir-dice-columns">{game.rolls.map((roll,i)=><div key={i}><div className={`pir-die ${i===game.digitIndex&&game.stage==="roll"?"rolling":""}`}>{roll ?? "–"}</div><b>{game.choices[i] || "WAITING"}</b><small>{game.correct[i]===true?"✓ RIGHT":game.correct[i]===false?"✕ WRONG":"LOCKED"}</small></div>)}</div></div></>}
      {game.type === "groceryGame" && <><div className="pir-grocery-grand"><b>PLAYING FOR</b><GameCards items={[game.bonusPrize].filter(Boolean)} /></div><div className="pir-register">TOTAL ${game.total.toFixed(2)}</div><GameCards items={game.items} /></>}
      {game.type === "oneAway" && <><GameCards items={[game.car]} /><div className="pir-price-digits">{game.shownDigits.map((n,i)=><span key={i}>{game.answers[i] ? n+(game.answers[i]==="Higher"?1:-1) : n}</span>)}</div>{game.rightCount != null && <div className="pir-pricing-clue">{game.rightCount} RIGHT</div>}</>}
      {game.type === "clockGame" && <><div className="pir-clock-play"><ClockDisplay endsAt={game.clockEndsAt} fallback={game.secondsLeft} running={game.status==="playing"}/><div className={`pir-clock-guess ${game.currentGuess==null?"waiting":"active"}`} aria-live="polite"><small>CONTESTANT'S GUESS</small><strong>{game.currentGuess==null?"—":`$${Number(game.currentGuess).toLocaleString("en-CA")}`}</strong></div></div><GameCards items={[game.items[game.itemIndex]?{...game.items[game.itemIndex],revealedPrice:game.timeoutPrice}:null].filter(Boolean)} /></>}
      {game.type === "anyNumber" && <div className="pir-any-number">{game.boards.map(b => <div key={b.label}><b>{b.label}</b><div className="pir-price-digits">{b.cells.map((n,i)=><span key={i}>{n ?? "_"}</span>)}</div></div>)}</div>}
      {game.type === "grandGame" && <><div className="pir-grand-money">${game.winnings}</div><div>Target: under ${game.target}</div><GameCards items={game.items} /></>}
      {game.type === "shellGame" && <><div className={`pir-shell-prize-stage ${game.stage==="prices"?"pricing":""}`}><div className="pir-shell-bonus"><b>GRAND PRIZE</b><GameCards items={[game.bonusPrize].filter(Boolean)} /></div>{game.stage==="prices"&&<div className="pir-shell-small"><div className="pir-small-prize-label">SMALL PRIZE {game.itemIndex+1} OF 4</div><GameCards items={[game.items[game.itemIndex]].filter(Boolean)} /></div>}</div><div className="pir-shell-status">SHELL MARKERS EARNED: {game.shells} · SMALL PRIZES WON: ${Number(game.wonSmallValue||0).toLocaleString("en-CA")}</div><div className="pir-shell-board">{[1,2,3,4].map(n=><div key={n} className={game.revealedBall===n?"ball-revealed":game.chosenShells?.includes(n)?"shell-lifted":""}><span className="pir-shell-cup">🐚</span><i>{game.revealedBall===n?"●":""}</i><b>{n}</b></div>)}</div></>}
      {game.type === "moneyGame" && <><GameCards items={[game.car]} /><div className="pir-money-board"><div className="pir-money-price"><span>{game.frontValue||"??"}</span><span className="given">{game.middleDigit}</span><span>{game.backValue||"??"}</span></div><small>MIDDLE DIGIT GIVEN FREE</small><b>CASH LINE: ${game.cash}</b><div>{game.wrong?.join(" · ")||"No wrong picks"}</div></div></>}
      {game.type === "luckySeven" && <><GameCards items={[game.car]} /><LuckySevenBoard game={game}/></>}
      {game.type === "doublePrices" && <><GameCards items={[game.prize]} /><div className="pir-double-prices">{game.prices.map(price=><span key={price} className={game.revealedPrice===price?"right":""}>${Number(price).toLocaleString("en-CA")}</span>)}</div></>}
      {game.type === "threeStrikes" && <><GameCards items={[game.car]} /><div className="pir-three-strikes"><div className="pir-strike-price">{game.revealed.map((digit,i)=><span key={i}>{digit??"_"}</span>)}</div><div className="pir-strike-hopper"><div key={game.drawSeq} className={`pir-drawn-ball ${game.currentBall==="X"?"strike":""}`}>{game.currentBall??"?"}</div><small>{game.stage==="place"?"PLACE THIS DIGIT":"DRAW FROM THE HOPPER"}</small></div><div className="pir-strike-count">{[0,1,2].map(i=><b key={i} className={i<game.strikes?"lit":""}>X</b>)}</div></div></>}
      {game.type === "switchGame" && <><GameCards items={game.items.map((item,i)=>({...item,shownPrice:game.finalPrices?.[i]??game.shownPrices[i]}))}/><div className="pir-switch-sign">SWITCH?</div></>}
      {game.type === "pickAPair" && <><div className="pir-grocery-grand"><b>PLAYING FOR</b><GameCards items={[game.bonusPrize].filter(Boolean)} /></div><div className="pir-pair-grid"><GameCards items={game.items} /></div></>}
      {game.type === "balanceGame" && <div className={`pir-balance-stage ${game.balanceState}`}>
        <GameCards items={[{...game.prize,revealedPrice:game.revealedPrice}]} />
        <div className="pir-balance-bag-rack">
          {game.bags.map(bag=><MoneyBag key={bag.id} value={bag.value} selected={bag.selected} />)}
        </div>
        <div className="pir-balance-scale">
          <div className="pir-balance-beam"><span /></div>
          <div className="pir-balance-pan contestant"><b>YOUR BAGS</b><div className="pir-balance-bags"><MoneyBag value={game.smallBag} automatic onScale />{game.bags.filter(bag=>bag.selected).map(bag=><MoneyBag key={bag.id} value={bag.value} selected onScale />)}</div><strong>${Number(game.balanceTotal).toLocaleString("en-CA")}</strong></div>
          <div className="pir-balance-pan prize"><b>ACTUAL PRICE</b><strong>{game.revealedPrice==null?"$????":`$${Number(game.revealedPrice).toLocaleString("en-CA")}`}</strong></div>
          <div className="pir-balance-base">⚖</div>
        </div>
      </div>}
      {game.type === "holeInOne" && <HoleInOneBoard game={game} onPuttStopped={()=>onPuttStopped?.(game.lastPutt?.id)} />}
      {game.type === "masterKey" && <MasterKeyBoard game={game}/>}
      {game.type === "secretX" && <SecretXBoard game={game}/>}
      {game.type === "tenChances" && <div className="pir-ten-stage">
        <div className="pir-ten-logo"><b>10</b><span>CHANCES</span></div>
        <div className="pir-ten-prizes">{game.prizes.map((prize,i)=><div key={prize.name} className={`${i===game.prizeIndex?"active":""} ${i<game.prizeIndex?"won":""}`}><small>{i===0?"2 DIGITS":i===1?"3 DIGITS":"NEW CAR"}</small><strong>{prize.name}</strong></div>)}</div>
        <div className="pir-ten-board">
          <div className="pir-ten-guess-row">{Array.from({length:10},(_,i)=>{const entry=game.guesses?.[i];return <div className={`pir-ten-attempt ${entry?"used":""} ${entry?.correct?"correct":""}`} key={i}><div>{entry?`$${Number(entry.guess).toLocaleString("en-CA")}`:""}</div><span>{i+1}</span></div>;})}</div>
          <div className="pir-ten-current"><div><small>CHANCES LEFT</small><strong>{game.chancesLeft}</strong></div><div className="pir-ten-digits">{game.digitSets[game.prizeIndex]?.map((digit,i)=><span key={`${digit}-${i}`}>{digit}</span>)}</div></div>
        </div>
        <GameCards items={[game.prizes[game.prizeIndex]?{...game.prizes[game.prizeIndex],revealedPrice:game.revealedPrice}:null].filter(Boolean)} />
      </div>}

      <div className={`pir-pricing-prompt ${game.status}`}>{game.status === "playing" ? game.prompt : game.result}</div>
      {!!game.clue && <div className="pir-pricing-clue">{game.clue}</div>}
      {!!game.history?.length && <div className="pir-game-history">{game.history.slice(-4).map((line,i)=><div key={i}>{line}</div>)}</div>}
      {game.status !== "playing" && <div className="pir-helptext">The next item up for bids is loading…</div>}
      {game.status !== "playing" && !!poolWarnings.length && <div className="pir-pool-warning"><b>PRIZE POOL NOTICE</b>{poolWarnings.map((warning,index)=><span key={index}>{warning}</span>)}</div>}
    </div>
  );
}

function PlinkoChip({drop,onLanded}) {
  const ref=useRef(null);
  const landedRef=useRef(onLanded);useEffect(()=>{landedRef.current=onLanded;},[onLanded]);
  useEffect(()=>{const chip=ref.current,field=chip?.parentElement;if(!chip||!field||!drop?.path?.length)return;const width=field.clientWidth-chip.offsetWidth,height=field.clientHeight-chip.offsetHeight,startX=(drop.start+.5)*width/9;const frames=drop.path.map((point,i)=>({transform:`translate(${point.x*width/9-startX}px, ${point.y*height}px) rotate(${point.rotation||0}deg) scale(${i===drop.path.length-1?1.06:1})`,offset:i/(drop.path.length-1),easing:i===drop.path.length-1?"cubic-bezier(.2,.8,.2,1)":"cubic-bezier(.35,.05,.65,.95)"}));const animation=chip.animate(frames,{duration:drop.duration||5600,fill:"forwards"});animation.onfinish=()=>landedRef.current?.();if(animation.finished?.then)animation.finished.then(()=>landedRef.current?.()).catch(()=>{});return()=>animation.cancel();},[drop.id]);
  return <div ref={ref} className="pir-plinko-chip" style={{left:`calc(${(drop.start+.5)*100/9}% - 13px)`}} />;
}

function ClockDisplay({endsAt,fallback=90,running=true}){
  const remaining=()=>endsAt?Math.max(0,Math.ceil((endsAt-Date.now())/1000)):fallback,[seconds,setSeconds]=useState(remaining),previous=useRef(seconds);
  useEffect(()=>{setSeconds(remaining());if(!running||!endsAt)return;const timer=setInterval(()=>{const next=remaining();setSeconds(next);if(next>0&&next!==previous.current)playClockTick();previous.current=next;},100);return()=>clearInterval(timer);},[endsAt,running]);
  const duration=90,angle=Math.min(360,Math.max(0,(duration-seconds)/duration*360)),labels=[90,75,60,45,30,15];
  return <div className="pir-clock-housing" role="timer" aria-label={`${seconds} seconds remaining`}>
    <div className="pir-clock-face">
      <div className="pir-clock-ticks" aria-hidden="true">{Array.from({length:60},(_,index)=><i key={index} className={index%10===0?"major":""} style={{transform:`rotate(${index*6}deg)`}} />)}</div>
      <div className="pir-clock-labels" aria-hidden="true">{labels.map((label,index)=><b key={label} style={{transform:`rotate(${index*60}deg) translateY(calc(-1 * var(--clock-label-radius, 69px))) rotate(${-index*60}deg)`}}>{label}</b>)}</div>
      <span className="pir-clock-hand" style={{transform:`translateX(-50%) rotate(${angle}deg)`}} aria-hidden="true" />
      <span className="pir-clock-pin" aria-hidden="true" />
    </div>
    <strong>CLOCK<br/>GAME</strong>
  </div>;
}

function CliffClimber({position,climb,onStopped}){
  const initial=climb?climb.from:position,[displayPosition,setDisplayPosition]=useState(initial),stoppedRef=useRef(onStopped),settledRef=useRef(0);useEffect(()=>{stoppedRef.current=onStopped;},[onStopped]);
  useEffect(()=>{if(!climb){setDisplayPosition(position);return;}settledRef.current=0;setDisplayPosition(climb.from);let secondFrame,firstFrame=requestAnimationFrame(()=>{secondFrame=requestAnimationFrame(()=>setDisplayPosition(climb.to));});return()=>{cancelAnimationFrame(firstFrame);cancelAnimationFrame(secondFrame);};},[climb?.id,position]);
  const finish=()=>{if(!climb||settledRef.current===climb.id)return;settledRef.current=climb.id;stoppedRef.current?.();},fell=displayPosition>25;
  return <div className={`pir-climber ${fell?"fell":""}`} onTransitionEnd={e=>{if(e.propertyName==="left")finish();}} style={{left:`${Math.min(104,displayPosition*4)}%`,transitionDuration:`${climb?.duration||0}ms`,transitionTimingFunction:"linear",transform:"translateX(-50%)"}}>🧗</div>;
}

function CliffBoard({game,reveal=null,onStopped}){
  return <div className="pir-cliff"><CliffClimber position={game.climber} climb={game.stage==="climbing"?game.lastClimb:null} onStopped={onStopped}/><div className="pir-cliff-track" /><b>{game.stage==="checking"?"IS THAT THE RIGHT PRICE?":game.stage==="climbing"?(game.lastClimb?.correct?"HE STAYS PUT!":"WATCH HIM CLIMB..."):`Step ${game.climber} / 25`}</b>{reveal&&<div className={`pir-cliff-price-pop ${reveal.actual==null?"waiting":game.cliffFinalWin?"subtle":""}`}><small>YOUR GUESS: {reveal.guess}</small>{reveal.actual==null?<span>?</span>:<><em>ACTUAL RETAIL PRICE</em><strong>${Number(reveal.actual).toLocaleString("en-CA")}</strong></>}</div>}</div>;
}

function HolePutt({putt,onStopped}){
  const ref=useRef(null),stoppedRef=useRef(onStopped);useEffect(()=>{stoppedRef.current=onStopped;},[onStopped]);
  useEffect(()=>{const ball=ref.current,green=ball?.parentElement;if(!ball||!green||!putt)return;const width=green.clientWidth,startPercent=9+(6-putt.distanceLine)*8,endPercent=putt.won?88:putt.missDirection==="short"?78:96,start=startPercent*width/100,end=endPercent*width/100,travel=end-start;let fired=false;const finish=()=>{if(fired)return;fired=true;stoppedRef.current?.();};const animation=ball.animate([{transform:"translate(0,0) rotate(0deg)",offset:0},{transform:`translate(${travel*.55}px,-24px) rotate(430deg)`,offset:.55},{transform:`translate(${travel}px,0) rotate(820deg)`,offset:1}],{duration:putt.duration||2600,easing:"cubic-bezier(.18,.65,.28,1)",fill:"forwards"});animation.onfinish=finish;if(animation.finished?.then)animation.finished.then(finish).catch(()=>{});return()=>animation.cancel();},[putt?.id]);
  const startPercent=9+(6-(putt?.distanceLine||6))*8;return <span ref={ref} className="pir-hole-ball" style={{left:`${startPercent}%`}} />;
}

function HoleInOneBoard({game,onPuttStopped}){
  const ordered=game.orderedIds?.length?game.orderedIds.map(id=>game.items.find(item=>item.id===id)).filter(Boolean):game.items,orderedLocked=Boolean(game.orderedIds?.length),showGreen=["puttReady","putting","orTwoReveal"].includes(game.stage)||game.status!=="playing",teeLeft=9+(6-(game.distanceLine||6))*8;
  return <div className={`pir-hole-stage ${game.orTwoRevealed?"or-two":""}`}>
    <div className="pir-hole-logo"><span>HOLE IN ONE</span>{game.orTwoRevealed&&<b>OR TWO!</b>}</div>
    {!orderedLocked?<><div className="pir-hole-direction">CHOOSE THE LEAST EXPENSIVE PRODUCT FIRST</div><div className="pir-hole-groceries"><GameCards items={ordered} /></div></>:<div className="pir-hole-classic-set">
      <div className="pir-hole-flags">{ordered.map((item,index)=>{const revealed=index<game.revealedCount;return <div key={item.id} className={`pir-product-flag ${revealed?"revealed":""} ${index===game.revealedCount-1?"current":""}`}><div className="pir-flag-cloth"><small>{item.brand}</small><b>{item.name}</b><strong>{revealed?`$${Number(item.revealedPrice).toFixed(2)}`:"$ ?.??"}</strong></div><span className="pir-flag-pole"/><i>{index===0?"LEAST":index+1}</i></div>;})}</div>
      <div className="pir-hole-green" style={{"--tee-left":`${teeLeft}%`}}><div className="pir-hole-lines">{[6,5,4,3,2,1].map(line=><i key={line} className={showGreen&&line===game.distanceLine?"active":""}><small>{line}</small></i>)}</div>{showGreen&&<><span className="pir-hole-golfer">🏌️</span><span className="pir-hole-cup">⚑</span>{game.lastPutt&&<HolePutt key={game.lastPutt.id} putt={game.lastPutt} onStopped={game.stage==="putting"?onPuttStopped:null}/>}</>}</div>
    </div>}
    {showGreen&&<><div className="pir-hole-prize"><b>PLAYING FOR</b><span>{game.bonusPrize.brand} {game.bonusPrize.name}</span></div><div className="pir-hole-distance">PUTTING LINE {game.distanceLine} · TARGET ZONE {game.puttWindow?.tolerance?`${game.puttWindow.tolerance*2}% WIDE`:"LOCKED"}</div></>}
    {game.stage==="orTwoReveal"&&<div className="pir-or-two-reveal">OR TWO!</div>}
  </div>;
}

function PrizePhoto({item}){
  const [status,setStatus]=useState("loading");
  const identity=item.imageKey||`${item.id||item.name}|${item.image||"no-photo"}`;
  useEffect(()=>setStatus("loading"),[identity]);
  if(!item.image)return null;
  return <img key={identity} src={item.image} alt={item.imageAlt||item.name} data-prize-image-key={identity} style={{visibility:status==="loaded"?"visible":"hidden"}} onLoad={()=>setStatus("loaded")} onError={()=>setStatus("error")} />;
}

function GameCards({ items = [] }) {
  return <div className="pir-game-cards">{items.map((item,i)=>{const identity=item.imageKey||item.id||`${item.brand||""}-${item.name}-${i}`,seller=prizeSellerLine(item),description=cleanPrizeDescription(item),classes=[item.used?"used":"",item.selected?"selected":""].filter(Boolean).join(" ");return <div key={identity} className={classes}>{item.displayNumber!=null&&<i className="pir-card-number">{item.displayNumber}</i>}<div className="pir-prize-picture"><div className="pir-prize-visual" role="img" aria-label={item.name}>{item.visual||"🎁"}</div><PrizePhoto key={identity} item={item}/></div><b>{seller && <small>{seller}</small>}{item.name}</b>{description && <p>{description}</p>}{item.revealedPrice != null ? <span className="pir-revealed-price">${Number(item.revealedPrice).toLocaleString("en-CA")}</span> : item.shownPrice != null && <span>${item.shownPrice}</span>}</div>})}</div>;
}

// Canadian $100 bill — SVG illustration
function CanadianHundred() {
  return (
    <div className="pir-hundred-wrap">
      <svg viewBox="0 0 340 160" xmlns="http://www.w3.org/2000/svg" className="pir-hundred-bill">
        {/* Bill background */}
        <rect width="340" height="160" rx="8" fill="#e8f5e0" />
        {/* Brown border stripe */}
        <rect width="340" height="160" rx="8" fill="none" stroke="#5a7a3a" strokeWidth="6" />
        {/* Left colour block */}
        <rect x="0" y="0" width="60" height="160" rx="8" fill="#b8d4a0" />
        <rect x="55" y="0" width="10" height="160" fill="#b8d4a0" />
        {/* Security thread */}
        <rect x="105" y="0" width="4" height="160" fill="#7aaa5a" opacity="0.6" />
        {/* Large "100" */}
        <text x="190" y="95" fontFamily="Georgia,serif" fontSize="52" fontWeight="bold"
          fill="#2d5a1a" textAnchor="middle" opacity="0.9">100</text>
        {/* CANADA text */}
        <text x="190" y="118" fontFamily="Arial,sans-serif" fontSize="11"
          fill="#2d5a1a" textAnchor="middle" letterSpacing="4">CANADA</text>
        {/* Maple leaf watermark */}
        <text x="58" y="95" fontFamily="Arial" fontSize="36" fill="#5a7a3a"
          textAnchor="middle" opacity="0.7">🍁</text>
        {/* Right side denomination */}
        <text x="310" y="60" fontFamily="Georgia,serif" fontSize="22" fontWeight="bold"
          fill="#2d5a1a" textAnchor="middle" transform="rotate(90,310,60)">100</text>
        {/* Serial number */}
        <text x="140" y="140" fontFamily="monospace" fontSize="8"
          fill="#2d5a1a" opacity="0.6">HDA 2847291</text>
        {/* Top text */}
        <text x="190" y="24" fontFamily="Arial,sans-serif" fontSize="8"
          fill="#2d5a1a" textAnchor="middle" letterSpacing="1">BANK OF CANADA · BANQUE DU CANADA</text>
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared: contestant row
// ---------------------------------------------------------------------------
function ContestantRow({
  contestants, highlight = -1, activeTurn,
  winnerIndices = [], showBids, showDiff, itemPrice, code,
}) {
  const cols = Math.min(contestants.length, 4);
  return (
    <div className="pir-podium-row" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {contestants.map((c, i) => {
        const called = highlight === -1 ? true : i <= highlight;
        const active = activeTurn === i;
        const winner = winnerIndices.includes(i);
        const over = showDiff && c.bid != null && c.bid > itemPrice;
        const diff = showDiff && c.bid != null
          ? (over ? c.bid - itemPrice : itemPrice - c.bid) : null;
        return (
          <div key={i} className={[
            "pir-podium",
            called ? "called" : "",
            active ? "active" : "",
            winner ? "winner" : "",
          ].filter(Boolean).join(" ")}>
            <div className="pir-contestant-upper">
              <div className="pir-podium-mic" aria-hidden="true">
                <span className="pir-mic-head" />
                <span className="pir-mic-stem" />
              </div>
              <ContestantAvatar contestant={c} code={code} winner={winner} />
              <div className="pir-podium-nameplate">
                <div className="pir-podium-name">
                  {c.name}
                  {c.isAI && <span className="pir-ai-badge"><Bot size={10} /> AI</span>}
                </div>
              </div>
            </div>
            <div className="pir-podium-console">
              {showBids ? (
                <div className={`pir-led ${c.bid == null ? "dim" : ""}`}>
                  {c.bid != null ? `$${c.bid}` : active ? "· · ·" : "$ — —"}
                </div>
              ) : (
                <div className="pir-led dim">$ — — —</div>
              )}
            </div>
            {showDiff && diff !== null && (
              <div className={`pir-result-line ${winner ? "win" : over ? "over" : ""}`}>
                {winner ? `✓ Under by $${diff}` : over ? `Over by $${diff}` : `Under by $${diff}`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ContestantAvatar({ contestant, code, winner }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    setErr(false);
    setSrc(contestant.isAI ? contestant.photo : playerPhotoUrl(code, contestant.id));
  }, [contestant, code]);
  if (err || !src) {
    return (
      <div className="pir-avatar pir-avatar-placeholder">
        {contestant.name[0]?.toUpperCase()}
      </div>
    );
  }
  return (
    <img src={src} alt={contestant.name}
      className={`pir-avatar ${winner ? "pir-avatar-winner" : ""}`}
      onError={() => setErr(true)} />
  );
}

function Caption({ icon, text }) {
  return <div className="pir-caption">{icon}<div>{text}</div></div>;
}

function ItemImage({ item }) {
  const [err, setErr] = useState(false);
  if (err || !item.image) {
    return (
      <div className="pir-item-frame">
        <div className="pir-item-placeholder"><span className="pir-item-visual">{item.visual||<ChefHat size={40} />}</span><span>{item.name}</span></div>
      </div>
    );
  }
  return (
    <div className="pir-item-frame">
      <img src={item.image} alt={item.imageAlt} onError={() => setErr(true)} />
    </div>
  );
}

export default function HostView({ code, remoteMode = false, controller = true, embedded = false }) {
  return (
    <ErrorBoundary>
      <HostViewInner code={code} remoteMode={remoteMode} controller={controller} embedded={embedded} />
    </ErrorBoundary>
  );
}
