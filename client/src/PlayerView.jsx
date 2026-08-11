import { useEffect, useRef, useState, useCallback } from "react";
import { Bot, Trophy, Camera, Upload, X, Check, Mic, MicOff } from "lucide-react";
import { getState, joinRoom, submitBid, kissHost, pricingGameAction, showcaseAction, wheelAction } from "./api.js";

const POLL_MS = 500;

export default function PlayerView({ code, navigate }) {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [playerId, setPlayerId] = useState(
    () => localStorage.getItem(`pir_player_${code}`)
  );
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState(null);       // base64 data URL or null
  const [cameraOpen, setCameraOpen] = useState(false);
  const [bidDraft, setBidDraft] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

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

  // Stop any open camera stream on unmount
  useEffect(() => {
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, []);

  // When cameraOpen becomes true, the <video> element is now in the DOM.
  // Assign srcObject here so we know the ref is ready.
  useEffect(() => {
    if (!cameraOpen || !streamRef.current) return;
    const vid = videoRef.current;
    if (vid) {
      vid.srcObject = streamRef.current;
      vid.play().catch(() => {});
    }
  }, [cameraOpen]);

  const startCamera = useCallback(async () => {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported — try uploading a photo instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true); // render the <video>, then the useEffect above wires it up
    } catch (err) {
      console.error("Camera error:", err.name, err.message);
      setError(`Camera error (${err.name}) — try uploading a photo instead.`);
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const takeSnapshot = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth) {
      setError("Camera feed not ready — wait a moment and try again.");
      return;
    }
    const SIZE = 320;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    const s = Math.min(vid.videoWidth, vid.videoHeight);
    const ox = (vid.videoWidth - s) / 2;
    const oy = (vid.videoHeight - s) / 2;
    // Mirror to match the previewed selfie
    ctx.translate(SIZE, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(vid, ox, oy, s, s, 0, 0, SIZE, SIZE);
    setPhoto(canvas.toDataURL("image/jpeg", 0.75));
    stopCamera();
  }, [stopCamera]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ""; // allow re-selecting same file
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 320;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext("2d");
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, SIZE, SIZE);
        setPhoto(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  const doJoin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const data = await joinRoom(code, name.trim(), photo);
      localStorage.setItem(`pir_player_${code}`, data.playerId);
      localStorage.setItem(`pir_name_${code}`, name.trim());
      setPlayerId(data.playerId);
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Not connected yet ──────────────────────────────────────────────
  if (!state) {
    return (
      <div className="pir-root pir-loading">
        <div className="pir-title">Come On Down!</div>
        <p className="pir-helptext">Connecting to room {code}…</p>
      </div>
    );
  }

  // ── Join screen ────────────────────────────────────────────────────
  if (!playerId) {
    if (state.phase !== "lobby" && state.phase !== "demoLobby") {
      return (
        <div className="pir-root pir-player pir-center">
          <h1 className="pir-title">Come On Down!</h1>
          <p className="pir-helptext">
            Game already started — ask the host for a new room code.
          </p>
        </div>
      );
    }

    return (
      <div className="pir-root pir-player">
        <h1 className="pir-title">Come On Down!</h1>
        <div className="pir-subtitle">Room {code}</div>

        <div className="pir-photo-area">
          {cameraOpen ? (
            <div className="pir-camera-box">
              {/* playsInline prevents iOS from going fullscreen */}
              <video ref={videoRef} playsInline muted className="pir-camera-feed" />
              <div className="pir-camera-controls">
                <button type="button" className="pir-btn" onClick={takeSnapshot}>
                  <Camera size={18} /> Take Photo
                </button>
                <button type="button" className="pir-btn secondary" onClick={stopCamera}>
                  <X size={18} /> Cancel
                </button>
              </div>
            </div>
          ) : photo ? (
            <div className="pir-photo-preview">
              <img src={photo} alt="Your photo" />
              <button type="button" className="pir-photo-clear"
                onClick={() => setPhoto(null)} title="Remove photo">
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="pir-photo-placeholder">
              <div className="pir-photo-prompt">Add a photo (optional)</div>
              <div className="pir-photo-btns">
                <button type="button" className="pir-btn secondary small"
                  onClick={startCamera}>
                  <Camera size={15} /> Selfie
                </button>
                <button type="button" className="pir-btn secondary small"
                  onClick={() => fileRef.current?.click()}>
                  <Upload size={15} /> Upload
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*"
                style={{ display: "none" }} onChange={handleFileUpload} />
            </div>
          )}
        </div>

        <form onSubmit={doJoin} className="pir-join-form">
          <input
            placeholder="Your name"
            value={name}
            maxLength={24}
            autoFocus
            onChange={(e) => setName(e.target.value)}
          />
          <button className="pir-btn" type="submit" disabled={!name.trim()}>
            <Check size={18} /> Join Game
          </button>
        </form>

        {error && <div className="pir-error">{error}</div>}
      </div>
    );
  }

  // ── In game ────────────────────────────────────────────────────────
  const myIndex = state.contestants.findIndex((c) => c.id === playerId);
  const me = state.contestants[myIndex];
  const myName = me?.name || localStorage.getItem(`pir_name_${code}`) || "You";

  return (
    <div className="pir-root pir-player">
      <h1 className="pir-title">Come On Down!</h1>
      <div className="pir-subtitle">{myName} · Room {code}</div>

      {state.phase === "lobby" && (
        <div className="pir-panel pir-center">
          <p>You're in, {myName}! Waiting for the host to start…</p>
        </div>
      )}

      {state.phase === "calling" && (
        <div className="pir-panel pir-center">
          {myIndex !== -1 && myIndex <= state.callIndex
            ? <p>You've been called — watch the big screen!</p>
            : <p>Get ready — the host is introducing everyone…</p>}
        </div>
      )}

      {state.phase === "replacement" && (
        <div className="pir-panel pir-center">
          {state.replacementVisible && state.replacementContestantId === playerId
            ? <p><b>Come on down!</b> You are the next contestant on The Price Is Right!</p>
            : <p>A new contestant is being called—watch the big screen!</p>}
        </div>
      )}

      {state.phase === "item" && state.item && (
        <div className="pir-panel pir-center">
          <PlayerItemImage item={state.item} />
          <h3 style={{ marginTop: 10 }}>{state.item.name}</h3>
          <p className="pir-helptext">Get your bid ready!</p>
        </div>
      )}

      {state.phase === "bidding" && (
        <BiddingPhase
          state={state}
          playerId={playerId}
          bidDraft={bidDraft}
          setBidDraft={setBidDraft}
          onSubmit={async () => {
            try {
              await submitBid(code, playerId, bidDraft);
              setBidDraft("");
            } catch (e) {
              setError(e.message);
            }
          }}
        />
      )}

      {state.phase === "reveal" && (
        <RevealPhase state={state} myIndex={myIndex} onKiss={async()=>{try{await kissHost(code,playerId);}catch(e){setError(e.message);}}} />
      )}

      {state.phase === "pricingIntro" && (
        <div className="pir-panel pir-center"><h2>Get ready!</h2><p>The host and announcer are introducing your game on the main screen.</p></div>
      )}
      {state.phase === "pricingPrizeIntro" && (
        <div className="pir-panel pir-center"><h2>Here comes the next prize!</h2><p>Watch the main screen while the announcer introduces it.</p></div>
      )}
      {(state.phase === "pricingRevealCue" || state.phase === "pricingPriceShown") && (
        <div className="pir-panel pir-center"><h2>Show us the price!</h2><p>Your choice is locked in. Watch the reveal on the main screen.</p></div>
      )}

      {state.phase === "pricingGame" && (
        <>
          <PricingGamePhone game={state.pricingGame} playerId={playerId} code={code}
            isDemo={state.isDemo} onBackToGames={() => navigate?.("/games")}
            onError={(message) => setError(message)} />
        </>
      )}
      {state.phase === "showcaseShowdown" && <WheelPhone showdown={state.showdown} playerId={playerId} code={code} onError={setError} />}
      {state.phase.startsWith("showcase") && state.finalShowcase && <ShowcasePhone finalShowcase={state.finalShowcase} playerId={playerId} code={code} onError={setError} />}
      {state.phase.startsWith("credits") && <div className="pir-panel pir-center"><h2>Thanks for playing!</h2><p>Watch the closing credits on the big screen.</p></div>}

      {error && <div className="pir-error">{error}</div>}
    </div>
  );
}

function WheelPhone({showdown,playerId,code,onError}){const[busy,setBusy]=useState(false);const[strength,setStrength]=useState("medium");const p=showdown?.participants?.[showdown.currentIndex];const mine=p?.id===playerId||p?.controllerPlayerId===playerId;const send=async action=>{setBusy(true);try{await wheelAction(code,playerId,action);}catch(e){onError(e.message);}finally{setBusy(false);}};if(!showdown)return null;if(showdown.stage==="complete")return <div className="pir-panel pir-center"><h2>Showcase Showdown</h2><p>{showdown.result}</p></div>;if(!mine)return <div className="pir-panel pir-center"><h2>The Big Wheel</h2><p>{p?.name} is at the wheel. Watch the main screen!</p></div>;if(showdown.stage==="announcing")return <div className="pir-panel pir-center"><h2>Your spin has stopped!</h2><p>Listen to the result on the main screen. Your controls will unlock afterward.</p></div>;const spinning=["spinning","bonusSpinning"].includes(showdown.stage);const spinControl=<><p><b>Choose your spin strength</b></p><div className="pir-strength-picker">{[["gentle","GENTLE"],["medium","GOOD SPIN"],["mighty","MIGHTY"]].map(([v,label])=><button key={v} className={`pir-btn small ${strength===v?"selected":"secondary"}`} disabled={busy} onClick={()=>setStrength(v)}>{label}</button>)}</div><button className="pir-btn" disabled={busy} onClick={()=>send({type:"spin",strength})}>SPIN THE WHEEL</button></>;return <div className="pir-panel pir-center"><h2 className="pir-pricing-title">THE BIG WHEEL</h2><p>{spinning?"Watch your spin on the main screen!":showdown.stage==="decision"?`Your total is ${p.score}¢.`:showdown.stage==="bonusTurn"?"Spin for your cash bonus!":"Give the wheel a mighty spin!"}</p>{["turn","bonusTurn"].includes(showdown.stage)&&spinControl}{showdown.stage==="decision"&&<div className="pir-actions">{spinControl}<button className="pir-btn secondary" disabled={busy||p.score<showdown.leaderScore} onClick={()=>send("stay")}>STAY ON {p.score}¢</button></div>}</div>}

function ShowcasePhone({finalShowcase,playerId,code,onError}){const[bid,setBid]=useState("");const[busy,setBusy]=useState(false);const send=async action=>{setBusy(true);try{await showcaseAction(code,playerId,action);setBid("");}catch(e){onError(e.message);}finally{setBusy(false);}};const f=finalShowcase,controls=c=>c?.id===playerId||c?.controllerPlayerId===playerId;if(f.stage==="complete")return <div className="pir-panel pir-center"><h2>Final Showcase</h2><p className="pir-pricing-result">{f.result}</p></div>;if(f.stage==="choice"&&controls(f.contestants[0]))return <div className="pir-panel pir-center"><h2>Bid or Pass?</h2><p>As the top winner, the first Showcase is yours to bid on—or pass to your opponent.</p><div className="pir-actions"><button className="pir-btn" disabled={busy} onClick={()=>send({choice:"bid"})}>BID ON IT</button><button className="pir-btn secondary" disabled={busy} onClick={()=>send({choice:"pass"})}>PASS</button></div></div>;const i=f.stage==="firstBid"?0:f.stage==="secondBid"?1:-1,assigned=i>=0?f.contestants.find(c=>c.id===f.assignments[i]):null;if(i>=0&&controls(assigned))return <div className="pir-panel pir-center"><h2>Your Showcase Bid</h2><div className="pir-led pir-bid-input"><span>$</span><input type="number" min="1" value={bid} onChange={e=>setBid(e.target.value)}/></div><button className="pir-btn" disabled={busy||!bid} onClick={()=>send({bid})}>LOCK IN BID</button></div>;return <div className="pir-panel pir-center"><h2>The Final Showcase</h2><p>Watch the prizes and bidding on the main screen!</p></div>}

function parseSpokenNumber(transcript){
  const numeric=String(transcript).replace(/[$,]/g,"").match(/\d+/);
  if(numeric)return Number(numeric[0]);
  const small={zero:0,oh:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19},tens={twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  let total=0,current=0,recognized=false;
  for(const word of String(transcript).toLowerCase().replace(/-/g," ").split(/\s+/)){
    if(word in small){current+=small[word];recognized=true;}
    else if(word in tens){current+=tens[word];recognized=true;}
    else if(word==="hundred"){current=Math.max(1,current)*100;recognized=true;}
    else if(word==="thousand"){total+=Math.max(1,current)*1000;current=0;recognized=true;}
  }
  return recognized?total+current:null;
}

function audienceOptions(game){
  if(game.mode==="choice"&&game.options?.length)return game.options.slice(0,10);
  if(game.mode==="drop")return ["1","2","3","4","5","6","7","8","9"];
  if(game.mode==="multi")return ["Higher","Lower"];
  if(game.mode==="order")return (game.items||[]).slice(0,8).map(item=>item.name);
  if(game.mode==="number"){
    if(game.type==="tenChances")return game.digitSets?.[game.prizeIndex]||[];
    if(game.type==="groceryGame"&&game.stage==="quantity")return ["1","2","3","4","5","6"];
    if(game.type==="clockGame")return ["25","50","75","100","150","200"];
    if(game.type==="cliffHangers")return ["20","30","40","50","60","75"];
    return ["1","2","3","4","5"];
  }
  return [];
}

function PricingGamePhone({ game, playerId, code, isDemo, onBackToGames, onError }) {
  const [number, setNumber] = useState("");
  const [order, setOrder] = useState([]);
  const [busy, setBusy] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [listening,setListening]=useState(false);
  const [heard,setHeard]=useState("");
  const recognitionRef=useRef(null);
  const continuousMicRef=useRef(false),micSendingRef=useRef(false);
  useEffect(()=>()=>{continuousMicRef.current=false;recognitionRef.current?.abort();},[]);
  if (!game) return <div className="pir-panel">Loading pricing game…</div>;
  const isPlayer = game.playerId === playerId;
  const send = async (action) => {
    setBusy(true); onError("");
    try { await pricingGameAction(code, playerId, action); setNumber(""); }
    catch (e) { onError(e.message); }
    finally { setBusy(false); }
  };
  const speechRecognition=typeof window!=="undefined"&&(window.SpeechRecognition||window.webkitSpeechRecognition);
  const stopClockMic=()=>{continuousMicRef.current=false;recognitionRef.current?.stop();setListening(false);};
  const startClockMic=()=>{
    if(!speechRecognition){onError("Voice guesses are not supported in this browser. You can still type your guess.");return;}
    recognitionRef.current?.abort();
    continuousMicRef.current=true;
    const recognition=new speechRecognition();recognitionRef.current=recognition;recognition.lang="en-CA";recognition.continuous=true;recognition.interimResults=false;recognition.maxAlternatives=1;
    recognition.onstart=()=>{setListening(true);setHeard("");onError("");};
    recognition.onend=()=>{if(!continuousMicRef.current){setListening(false);return;}setTimeout(()=>{try{recognition.start();}catch{}},180);};
    recognition.onerror=e=>{setListening(false);if(e.error!=="aborted"&&e.error!=="no-speech")onError(`Microphone error: ${e.error}. You can still type your guess.`);};
    recognition.onresult=async e=>{const result=e.results?.[e.resultIndex],transcript=result?.[0]?.transcript||"",value=parseSpokenNumber(transcript);setHeard(transcript);if(value==null){onError(`I heard “${transcript},” but not a number. Please try again.`);return;}if(micSendingRef.current)return;micSendingRef.current=true;setNumber(String(value));await send({value});micSendingRef.current=false;};
    recognition.start();
  };
  if (game.status !== "playing") return <div className="pir-panel pir-center"><h2>{game.title}</h2><p className="pir-pricing-result">{game.result}</p>{isDemo && <button className="pir-btn" onClick={onBackToGames}>Try Another Game</button>}</div>;
  if (!isPlayer){const suggestions=audienceOptions(game);return <div className="pir-panel pir-center pir-audience-phone"><h2>{game.title}</h2><p><b>{game.playerName}</b> is playing. Help them like the studio audience!</p><div className="pir-audience-buttons">{suggestions.map(option=><button key={option} className="pir-btn secondary" disabled={busy} onClick={()=>send({audienceChoice:option})}>{option}</button>)}</div><small>Your shout will pop up on the big screen.</small></div>;}
  const addOrder = (id) => { if (!order.includes(id)) setOrder([...order, id]); };
  const orderedNames = order.map(id => game.items?.find(x => x.id === id)?.name).filter(Boolean);
  return (
    <div className="pir-panel pir-pricing-phone">
      <h2 className="pir-pricing-title">{game.title}</h2>
      <p className="pir-helptext">{game.instructions}</p>
      <div className="pir-pricing-prompt">{game.prompt}</div>
      {game.mode === "number" && <>
        {game.type==="tenChances"&&<><div className="pir-ten-phone-prize">Pricing: <strong>{game.prizes[game.prizeIndex]?.name}</strong> · {game.chancesLeft} chances left</div><div className="pir-ten-digits">{game.digitSets[game.prizeIndex]?.map((digit,i)=><span key={`${digit}-${i}`}>{digit}</span>)}</div>{!!game.guesses?.length&&<div className="pir-ten-phone-history"><b>Previous guesses</b>{game.guesses.map(entry=><span key={entry.chance}>#{entry.chance} · ${Number(entry.guess).toLocaleString("en-CA")} {entry.correct?"✓":""}</span>)}</div>}</>}
        <div className="pir-led pir-bid-input"><span>{game.type==="groceryGame"&&game.stage==="quantity"?"QTY":"$"}</span><input type="number" value={number} autoFocus min="0" onChange={e=>setNumber(e.target.value)} /></div>
        {game.type==="clockGame"&&<div className="pir-clock-mic"><button className={`pir-btn ${listening?"listening":"secondary"}`} disabled={busy&&!listening} onClick={listening?stopClockMic:startClockMic}>{listening?<><MicOff size={20}/> LISTENING — TAP TO STOP</>:<><Mic size={20}/> START MICROPHONE</>}</button>{heard&&<small>Heard: “{heard}”</small>}<small>Once started, it keeps listening for guesses. Typed entry remains available.</small></div>}
        <button className="pir-btn" disabled={busy || number === ""} onClick={()=>send({ value: number })}>Submit</button>
      </>}
      {game.mode === "choice" && <div className="pir-choice-grid">{game.options.map(option=><button key={option} className="pir-btn secondary" disabled={busy} onClick={()=>send({ choice: option })}>{option}</button>)}</div>}
      {game.mode === "drop" && <><p className="pir-helptext">Tap where you want the chip released.</p><div className="pir-drop-picker">{Array.from({length:9},(_,i)=><button key={i} disabled={busy} onClick={()=>send({position:i+1})}>{i+1}</button>)}</div></>}
      {game.mode === "multi" && <><div className="pir-one-away-phone">{game.shownDigits.map((digit,i)=><div key={i}><b>{digit}</b><button className={answers[i]==="Higher"?"selected":""} onClick={()=>setAnswers(a=>{const n=[...a];n[i]="Higher";return n;})}>+1</button><button className={answers[i]==="Lower"?"selected":""} onClick={()=>setAnswers(a=>{const n=[...a];n[i]="Lower";return n;})}>−1</button></div>)}</div><button className="pir-btn" disabled={busy||answers.filter(Boolean).length!==5} onClick={()=>send({answers})}>Lock In Final Price</button></>}
      {game.mode === "order" && <>
        <div className="pir-order-list">{orderedNames.map((name,i)=><span key={i}>{i+1}. {name}</span>)}</div>
        <div className="pir-choice-grid">{game.items.filter(x=>!order.includes(x.id)).map(item=><button key={item.id} className="pir-btn secondary" onClick={()=>addOrder(item.id)}>{item.name}</button>)}</div>
        <div className="pir-actions"><button className="pir-btn secondary" disabled={!order.length} onClick={()=>setOrder([])}>Reset</button><button className="pir-btn" disabled={busy || order.length !== game.items.length} onClick={()=>send({ order })}>Lock In Order</button></div>
      </>}
      {!!game.history?.length && <div className="pir-game-history">{game.history.slice(-4).map((line,i)=><div key={i}>{line}</div>)}</div>}
    </div>
  );
}

function BiddingPhase({ state, playerId, bidDraft, setBidDraft, onSubmit }) {
  const { contestants, turn } = state;
  const isMyTurn = contestants[turn]?.id === playerId && contestants[turn]?.bid == null;
  return (
    <div className="pir-panel">
      {isMyTurn ? (
        <>
          <p className="pir-helptext">It's your turn — what's your bid?</p>
          <div className="pir-led pir-bid-input">
            $
            <input
              type="number" min={0} max={9999} autoFocus
              value={bidDraft} placeholder="0"
              onChange={(e) => setBidDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && bidDraft !== "" && onSubmit()}
            />
          </div>
          <div className="pir-actions">
            <button className="pir-btn" disabled={bidDraft === ""} onClick={onSubmit}>
              Lock In Bid
            </button>
          </div>
        </>
      ) : (
        <p className="pir-helptext pir-center">
          {contestants[turn]?.bid != null
            ? "Waiting for the next bid…"
            : `Waiting for ${contestants[turn]?.name} to bid…`}
        </p>
      )}
      <div className="pir-bid-list">
        {contestants.map((c, i) => (
          <div key={i} className="pir-bid-row">
            <span>
              {c.name}
              {c.isAI && <Bot size={12} style={{ marginLeft: 4, verticalAlign: "middle" }} />}
              {c.id === playerId && " (you)"}
            </span>
            <span>{c.bid != null ? `$${c.bid}` : "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevealPhase({ state, myIndex, onKiss }) {
  const { item, contestants, winnerIndices, revealType } = state;
  const allOverbid=revealType==="overbid";
  const me = contestants[myIndex];
  const isWinner = winnerIndices.includes(myIndex);
  const over = !allOverbid && me && me.bid > item.price;
  const diff = me ? (over ? me.bid - item.price : item.price - me.bid) : 0;
  return (
    <div className="pir-panel pir-center">
      <div className={`pir-price-reveal ${allOverbid?"pir-price-hidden":""}`}>
        <div className="label">Actual Retail Price</div>
        <div className="price">{allOverbid?"????":`$${item.price}`}</div>
      </div>
      {me && (
        <p style={{ marginTop: 12 }}>
          You bid <b>${me.bid}</b> —{" "}
          {allOverbid ? "everyone overbid—the price remains secret for the re-bid"
            : isWinner
            ? <span style={{ color: "var(--led-green)" }}>
                <Trophy size={16} style={{ verticalAlign: "middle" }} /> You win it!
              </span>
            : over ? `over by $${diff}` : `under by $${diff}`}
        </p>
      )}
      {isWinner&&!me?.isAI&&<button className="pir-btn pir-kiss-btn" onClick={onKiss}>💋 KISS THE HOST</button>}
    </div>
  );
}

function PlayerItemImage({ item }) {
  const [err, setErr] = useState(false);
  if (err || !item.image) {
    return (
      <div className="pir-item-frame pir-centered-frame">
        <div className="pir-item-placeholder"><span className="pir-item-visual">{item.visual||"🎁"}</span><span>{item.name}</span></div>
      </div>
    );
  }
  return (
    <div className="pir-item-frame pir-centered-frame">
      <img src={item.image} alt={item.imageAlt} onError={() => setErr(true)} />
    </div>
  );
}
