import { useEffect, useRef, useState, useCallback, Component } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Mic2, Bot, Trophy, ArrowRight, ChefHat } from "lucide-react";
import {
  getState, startGame, callNext, advance,
  resolveAITurn, nextTurn, restartGame, resetBids, ttsUrl, playerPhotoUrl, getConfig,
  startPricingGame,
  beginPricingGame,
  settlePricingGame,
  revealReplacement,
  settleWheel, resolveWheelAI, finishShowdown, advanceShowcase, resolveShowcaseAI,
} from "./api.js";
import OpeningSequence from "./OpeningSequence.jsx";

const POLL_MS = 1200;

// ---------------------------------------------------------------------------
// playTTS — fetch audio from the server and play it.
// onDone fires when it ends, or after 1.5 s on error.
// ---------------------------------------------------------------------------
function playTTS(audioEl, text, onDone, voice, style = "host") {
  if (!text) { onDone(); return; }
  let fired = false;
  let hardStop;
  const fire = () => { if (fired) return; fired = true; clearTimeout(hardStop); onDone(); };
  audioEl.pause();
  audioEl.currentTime = 0;
  audioEl.src = ttsUrl(text, voice, style);
  audioEl.onended = fire;
  audioEl.onerror = () => setTimeout(fire, 1500);
  audioEl.play().catch(() => setTimeout(fire, 1500));
  // If the TTS request hangs, cancel the audio resource before advancing.
  // Clearing src is important: a late response can no longer begin speaking
  // over the next phase.
  hardStop = setTimeout(() => {
    if (fired) return;
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
    fire();
  }, 25000);
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
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.8);
    gain.gain.setValueAtTime(0.6, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) { console.warn("buzzer failed", e); }
}

function playAlarm() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
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
  try { const ctx=new (window.AudioContext||window.webkitAudioContext)(); [523,659,784,1047].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.1;o.connect(g);g.connect(ctx.destination);o.frequency.value=f;g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.001,t+.28);o.start(t);o.stop(t+.3);}); } catch {}
}

function playWomp() {
  try { const ctx=new (window.AudioContext||window.webkitAudioContext)(); [220,174,130].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain(),t=ctx.currentTime+i*.34;o.type="triangle";o.connect(g);g.connect(ctx.destination);o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(f*.65,t+.3);g.gain.setValueAtTime(.35,t);g.gain.exponentialRampToValueAtTime(.001,t+.32);o.start(t);o.stop(t+.34);}); } catch {}
}

function HostViewInner({ code }) {
  const [state, setState] = useState(null);
  const [phase, setPhase] = useState("lobby"); // "lobby" | "opening" | "game"
  const [error, setError] = useState("");
  const [config, setConfig] = useState({ hostName: "Robbie Archer", announcerVoice: "onyx", hostVoice: "coral" });
  const lastSeqRef = useRef(-1);
  const audioRef = useRef(null);       // host voice
  const announcerRef = useRef(null);   // announcer voice (for prize descriptions)
  const speechRunRef = useRef(0);
  const lastOutcomeRef = useRef(0);
  const lastSettledDropRef = useRef(0);
  const lastSettledWheelRef = useRef(0);

  useEffect(() => { if (state?.isDemo && phase !== "game") setPhase("game"); }, [state?.isDemo]);

  useEffect(() => {
    const event = state?.pricingGame?.lastOutcome;
    if (!event || event.seq === lastOutcomeRef.current) return;
    lastOutcomeRef.current = event.seq;
    if (event.kind === "success" || event.kind === "win") playSuccess();
    else if (event.kind === "loss") playWomp();
    else if (event.kind === "failure") playBuzzer();
  }, [state?.pricingGame?.lastOutcome]);

  useEffect(() => {
    const game=state?.pricingGame, drop=game?.lastDrop;
    if(game?.type!=="plinko"||game.stage!=="dropping"||!drop||drop.id===lastSettledDropRef.current)return;
    lastSettledDropRef.current=drop.id;
    const timer=setTimeout(()=>settlePricingGame(code).catch(e=>setError(e.message)),2300);
    return()=>clearTimeout(timer);
  },[state?.pricingGame?.lastDrop?.id,state?.pricingGame?.stage,code]);

  useEffect(()=>{const s=state?.showdown;if(!s||!["spinning","bonusSpinning"].includes(s.stage)||s.spinSeq===lastSettledWheelRef.current)return;lastSettledWheelRef.current=s.spinSeq;const timer=setTimeout(()=>settleWheel(code).catch(e=>setError(e.message)),3200);return()=>clearTimeout(timer);},[state?.showdown?.spinSeq,state?.showdown?.stage,code]);

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
    [el, ann].forEach(audio => { if (audio) { audio.pause(); audio.currentTime = 0; } });
    const current = (fn) => { if (speechRun === speechRunRef.current) fn(); };
    const safely = (fn) => current(() => fn().catch((e) => setError(e.message)));

    const voice = config.hostVoice || "coral";
    // "welcome" and "call" types are handled by the opening sequence.
    // The game loop only handles item onwards.
    if (type === "welcome" || type === "call") {
      return; // opening already did this — ignore
    } else if (type === "replacementIntro") {
      const [hostPart = "", announcerPart = ""] = text.split("||");
      const annVoice = config.announcerVoice || "onyx";
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
      const annVoice = config.announcerVoice || "onyx";
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
      const c = state.contestants[state.turn];
      if (c?.isAI) playTTS(el, text, () => safely(() => resolveAITurn(code)), voice);
      else playTTS(el, text, () => {}, voice);
    } else if (type === "bidResult") {
      const last = state.turn >= state.contestants.length - 1;
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
    } else if (type === "pricingGameIntro") {
      const game = state.pricingGame;
      const hostIntro = `${text} ${game.instructions}`;
      playTTS(el, hostIntro, () => safely(() => beginPricingGame(code)), voice, "host");
    } else if (type === "pricingPrizeIntro") {
      setTimeout(() => current(() => playTTS(ann, text, () => safely(() => beginPricingGame(code)), config.announcerVoice || "onyx", "announcer")), 650);
    } else if (type === "pricingGame" || type === "pricingPrompt") {
      playTTS(el, text, () => {}, voice);
    } else if (type === "pricingResult") {
      playTTS(el, text, () => { if (!state.isDemo) safely(() => restartGame(code, "sameLineup")); }, voice);
    } else if (type === "wheelIntro" || type === "wheelPrompt" || type === "wheelAdvance") {
      playTTS(el,text,()=>current(()=>{const s=state.showdown,p=s?.participants?.[s.currentIndex];if(p?.isAI&&["turn","decision","bonusTurn"].includes(s.stage))safely(()=>resolveWheelAI(code));}),voice);
    } else if (type === "wheelSpin") {
      playTTS(el,text,()=>{},voice);
    } else if (type === "wheelResult") {
      playTTS(el,text,()=>safely(()=>finishShowdown(code)),voice);
    } else if (type === "showcaseTheme") {
      playTTS(el,text,()=>safely(()=>advanceShowcase(code)),voice);
    } else if (type === "showcasePrize") {
      playTTS(ann,text,()=>safely(()=>advanceShowcase(code)),config.announcerVoice||"onyx","announcer");
    } else if (type === "showcaseChoice" || type === "showcaseBid") {
      playTTS(el,text,()=>current(()=>{const f=state.finalShowcase;const id=f?.stage==="choice"?f.contestants[0].id:f?.assignments?.[f.stage==="firstBid"?0:1];if(f?.contestants?.find(c=>c.id===id)?.isAI)safely(()=>resolveShowcaseAI(code));}),voice);
    } else if (type === "showcaseResult") {
      playTTS(el,text,()=>{},voice);
    }
  }, [state, code, phase]);

  const action = (fn) => () => fn().catch((e) => setError(e.message));
  const forceAction = (fn) => () => {
    speechRunRef.current += 1;
    [audioRef.current, announcerRef.current].forEach(audio => {
      if (audio) { audio.pause(); audio.currentTime = 0; }
    });
    fn().catch((e) => setError(e.message));
  };

  // "Start Game" — unlock audio, start game (builds lineup), wait for
  // contestants to appear in state, THEN show opening.
  const handleStart = async () => {
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



  const joinUrl = typeof window !== "undefined"
    ? `${window.location.origin}/play/${code}`
    : `/play/${code}`;

  return (
    <>
      {/* Audio elements always in DOM */}
      <audio ref={audioRef} style={{ display: "none" }} />
      <audio ref={announcerRef} style={{ display: "none" }} />

      {phase === "opening" && state && (
        <OpeningSequence
          contestants={state.contestants}
          roomCode={code}
          announcerVoice={config.announcerVoice}
          hostVoice={config.hostVoice}
          onDone={handleOpeningDone}
        />
      )}

      {phase !== "opening" && (
        <div className="pir-root">
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
                <Lobby state={state} code={code} joinUrl={joinUrl} onStart={handleStart} />
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
                  onStartPricing={forceAction(() => startPricingGame(code))}
                  onNextRound={forceAction(() => restartGame(code, "sameLineup"))}
                  onNewPlayers={action(() => restartGame(code, "newPlayers"))} />
              )}
              {(state.phase === "pricingIntro" || state.phase === "pricingPrizeIntro" || state.phase === "pricingGame") && (
                <PricingGameView game={state.pricingGame} spotlight={state.phase === "pricingPrizeIntro" ? state.pricingAnnouncement : null} />
              )}
              {state.phase === "showcaseShowdown" && <WheelView showdown={state.showdown} />}
              {state.phase.startsWith("showcase") && state.finalShowcase && <FinalShowcaseView state={state} />}
            </>
          )}

          {error && <div className="pir-error">{error}</div>}
        </div>
      )}
    </>
  );
}

const WHEEL_VALUES=[100,5,90,25,70,45,10,65,30,85,50,95,55,75,40,20,60,35,80,15];
function WheelView({showdown}){if(!showdown)return null;const p=showdown.participants[showdown.currentIndex]||showdown.participants.find(x=>x.id===showdown.winnerId);const spinning=["spinning","bonusSpinning"].includes(showdown.stage);return <div className="pir-wheel-stage"><div className="pir-pricing-kicker">SHOWCASE SHOWDOWN {showdown.half}</div><h2 className="pir-pricing-title">THE BIG WHEEL</h2><div className="pir-wheel-pointer">▼</div><div key={showdown.spinSeq} className={`pir-big-wheel ${spinning?"spinning":""}`} style={{"--landing":showdown.pendingIndex??0}}>{WHEEL_VALUES.map((v,i)=><span key={i} style={{transform:`rotate(${i*18}deg) translateY(-142px) rotate(${-i*18}deg)`}}>{v===100?"$1.00":`.${String(v).padStart(2,"0")}`}</span>)}</div><h3>{p?.name}{showdown.isSpinoff?" — SPIN-OFF":""}</h3><div className="pir-wheel-scoreboard">{showdown.participants.map(x=><div key={x.id} className={x.id===p?.id?"active":""}><b>{x.name}</b><span>{x.spins?.map(v=>`.${String(v).padStart(2,"0")}`).join(" + ")||"—"}</span><strong>{x.score>100?"BUST":`${x.score}¢`}</strong><small>Winnings: ${x.totalWinnings?.toLocaleString("en-CA")}</small></div>)}</div><div className="pir-pricing-prompt">{spinning?"The wheel is spinning…":showdown.result||`${p?.name}, spin the wheel!`}</div></div>}

function FinalShowcaseView({state}){const f=state.finalShowcase,s=f.showcases[f.showcaseIndex]||f.showcases[0];return <div className="pir-showcase-stage"><div className="pir-pricing-kicker">THE FINAL SHOWCASE</div><h2 className="pir-pricing-title">{s.title}</h2>{state.showcaseAnnouncement?<GameCards items={[state.showcaseAnnouncement]}/>:<div className="pir-showcase-prizes">{s.prizes.map((p,i)=><div key={i}><img src={p.image} alt=""/><b>{p.name}</b></div>)}</div>}<div className="pir-showcase-contestants">{f.contestants.map(c=><div key={c.id} className={c.id===f.winnerId?"winner":""}><b>{c.name}</b><span>Show winnings ${c.totalWinnings?.toLocaleString("en-CA")}</span><strong>{f.bids[c.id]?`BID $${f.bids[c.id].toLocaleString("en-CA")}`:"WAITING"}</strong></div>)}</div>{f.stage==="complete"&&<div className="pir-showcase-results">{f.results.map((r,i)=><div key={i}>Showcase {i+1}: ${r.actual.toLocaleString("en-CA")} · {r.over?"OVER":`Difference $${r.difference.toLocaleString("en-CA")}`}</div>)}</div>}<div className="pir-pricing-prompt">{f.result||state.hostLine.text}</div></div>}

function DemoLobby({ state, joinUrl }) {
  return <div className="pir-panel pir-center"><h2 className="pir-pricing-title">PRICING GAME TEST</h2><div className="pir-qr-box" style={{margin:"20px auto",width:"fit-content"}}><QRCodeSVG value={joinUrl} size={220} fgColor="#fff8e7" bgColor="transparent" /></div><p className="pir-helptext">Scan with a phone, enter the contestant's name, and the game will begin on this screen.</p><b>{state.players.length ? "Contestant connected — get ready!" : "Waiting for contestant…"}</b></div>;
}

// ---------------------------------------------------------------------------
// Lobby
// ---------------------------------------------------------------------------
function Lobby({ state, code, joinUrl, onStart }) {
  return (
    <div className="pir-panel">
      <div className="pir-lobby-layout">
        <div className="pir-lobby-qr">
          <div className="pir-qr-box">
            <QRCodeSVG value={joinUrl} size={160} fgColor="#fff8e7" bgColor="transparent" level="M" />
          </div>
          <p className="pir-helptext" style={{ fontSize: 13 }}>Scan to join on your phone</p>
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
          {state.players.length === 0 && (
            <p className="pir-helptext">AI contestants fill any empty seats.</p>
          )}
        </div>
      </div>
      <div className="pir-actions">
        <button className="pir-btn" onClick={onStart}>
          Start Game <ArrowRight size={18} />
        </button>
      </div>
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
            <h3>{item.name}</h3>
            <div className="pir-item-tag">{item.brand} · {item.retailer}</div>
            <div className="pir-item-desc">{item.hostDescription}</div>
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
        <div><span>ITEM UP FOR BID</span><h3>{state.item.name}</h3><p>{state.item.brand || state.item.retailer}</p></div>
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
        <div className="pir-price-reveal">
          <div className="label">Actual Retail Price</div>
          <div className="price">${item.price}</div>
        </div>
        <ContestantRow contestants={contestants} showBids showDiff itemPrice={item.price} code={code} />
        <p className="pir-helptext">Lowest bid: {lowestName} at ${lowest} — still too high!</p>
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
        {item.name} · {item.retailer} · ${item.price}
      </div>
      <div className="pir-actions">
        {winnerIndices.some(i => !contestants[i]?.isAI)
          ? <button className="pir-btn" onClick={onStartPricing}>Start Pricing Game Now</button>
          : <button className="pir-btn" onClick={onNextRound}>Call Next Contestant Now</button>}
        <button className="pir-btn secondary" onClick={onNewPlayers}>New Players</button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pricing games — the contestant controls these from their phone. The host
// screen is a read-only game board that mirrors every choice.
// ---------------------------------------------------------------------------
export function PricingGameView({ game, spotlight = null }) {
  if (!game) return <div className="pir-loading">Loading pricing game…</div>;
  if (spotlight) return <div className={`pir-pricing-board pir-game-${game.type}`}><div className="pir-pricing-kicker">PRIZE INTRODUCTION</div><h2 className="pir-pricing-title">{game.title}</h2><GameCards items={[spotlight]} /><div className="pir-pricing-prompt">Listen to the announcer…</div></div>;
  return (
    <div className={`pir-pricing-board pir-game-${game.type}`}>
      <div className="pir-pricing-kicker">{game.playerName}, COME ON UP!</div>
      <h2 className="pir-pricing-title">{game.title}</h2>
      <p className="pir-pricing-rules">{game.instructions}</p>

      {game.type === "plinko" && (
        <div className="pir-plinko-board">
          {game.stage === "qualify" && <GameCards items={[game.qualifiers[game.qualifierIndex]].filter(Boolean)} />}
          <div className="pir-plinko-drop-line">{Array.from({length:9},(_,i)=><span key={i}>{i+1}</span>)}</div>
          <div className="pir-plinko-field"><div className="pir-plinko-pegs">{Array.from({ length: 63 }, (_, i) => <i key={i} />)}</div>{game.lastDrop && <div key={game.lastDrop.id} className="pir-plinko-chip" style={{"--start":game.lastDrop.start,"--land":game.lastDrop.landing}} />}</div>
          <div className="pir-plinko-slots">{game.slots.map((v,i) => <span key={i}>${v}</span>)}</div>
          {game.lastDrop?.value != null && <div className="pir-plinko-result">LANDED ON ${game.lastDrop.value.toLocaleString("en-CA")}</div>}
          <b>{game.stage === "qualify" ? `${game.chips} chip${game.chips === 1 ? "" : "s"} earned` : `${game.chipsLeft} chip${game.chipsLeft === 1 ? "" : "s"} left`}</b>
        </div>
      )}
      {game.type === "cliffHangers" && <><GameCards items={[game.items[game.itemIndex]].filter(Boolean)} /><div className="pir-cliff"><div className="pir-climber" style={{ left: `${Math.min(100, game.climber * 4)}%` }}>🧗</div><div className="pir-cliff-track" /><b>Step {game.climber} / 25</b></div></>}
      {game.type === "punchABunch" && <><div className="pir-punch-status">PUNCHES EARNED: {game.punches}</div>{game.stage === "qualify" ? <GameCards items={[game.qualifiers[game.qualifierIndex]].filter(Boolean)} /> : <div className="pir-punch-grid">{Array.from({length:50},(_,i)=><span key={i} className={game.punched?.includes(i)?"punched":""}>{game.punched?.includes(i)?"💥":i+1}</span>)}</div>}</>}
      {game.type === "diceGame" && <><GameCards items={[game.car]} /><div className="pir-dice-board"><div className="pir-price-digits"><span>{game.firstDigit}</span>{game.revealed.map((n,i)=><span key={i} className={game.correct[i]===false?"wrong":game.correct[i]===true?"right":""}>{n ?? "?"}</span>)}</div><div className="pir-dice-columns">{game.rolls.map((roll,i)=><div key={i}><div className={`pir-die ${i===game.digitIndex&&game.stage==="roll"?"rolling":""}`}>{roll ?? "–"}</div><b>{game.choices[i] || "WAITING"}</b><small>{game.correct[i]===true?"✓ RIGHT":game.correct[i]===false?"✕ WRONG":"LOCKED"}</small></div>)}</div></div></>}
      {game.type === "groceryGame" && <><div className="pir-register">TOTAL ${game.total.toFixed(2)}</div><GameCards items={game.items} /></>}
      {game.type === "oneAway" && <><GameCards items={[game.car]} /><div className="pir-price-digits">{game.shownDigits.map((n,i)=><span key={i}>{game.answers[i] ? n+(game.answers[i]==="Higher"?1:-1) : n}</span>)}</div>{game.rightCount != null && <div className="pir-pricing-clue">{game.rightCount} RIGHT</div>}</>}
      {game.type === "clockGame" && <><div className="pir-clock">{game.secondsLeft}</div><GameCards items={[game.items[game.itemIndex]].filter(Boolean)} /></>}
      {game.type === "anyNumber" && <div className="pir-any-number">{game.boards.map(b => <div key={b.label}><b>{b.label}</b><div className="pir-price-digits">{b.cells.map((n,i)=><span key={i}>{n ?? "_"}</span>)}</div></div>)}</div>}
      {game.type === "grandGame" && <><div className="pir-grand-money">${game.winnings}</div><div>Target: under ${game.target}</div><GameCards items={game.items} /></>}
      {game.type === "shellGame" && <><div className="pir-shells">🐚 🐚 🐚 🐚</div><GameCards items={game.stage==="prices"?[game.items[game.itemIndex]].filter(Boolean):[]} /></>}

      <div className={`pir-pricing-prompt ${game.status}`}>{game.status === "playing" ? game.prompt : game.result}</div>
      {!!game.clue && <div className="pir-pricing-clue">{game.clue}</div>}
      {!!game.history?.length && <div className="pir-game-history">{game.history.slice(-4).map((line,i)=><div key={i}>{line}</div>)}</div>}
      {game.status !== "playing" && <div className="pir-helptext">The next item up for bids is loading…</div>}
    </div>
  );
}

function GameCards({ items = [] }) {
  return <div className="pir-game-cards">{items.map((item,i)=><div key={item.id ?? i} className={item.used || item.selected ? "used" : ""}>{item.image && <img src={item.image} alt="" onError={e=>{e.currentTarget.style.display="none"}} />}<b>{item.brand && <small>{item.brand}</small>}{item.name}</b>{item.description && <p>{item.description}</p>}{item.shownPrice != null && <span>${item.shownPrice}</span>}</div>)}</div>;
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
        <div className="pir-item-placeholder"><ChefHat size={40} /><span>{item.name}</span></div>
      </div>
    );
  }
  return (
    <div className="pir-item-frame">
      <img src={item.image} alt={item.imageAlt} onError={() => setErr(true)} />
    </div>
  );
}

export default function HostView({ code }) {
  return (
    <ErrorBoundary>
      <HostViewInner code={code} />
    </ErrorBoundary>
  );
}
