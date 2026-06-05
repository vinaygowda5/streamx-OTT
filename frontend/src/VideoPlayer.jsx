import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import { db } from "./supabase.js";

/* ═══════════════════════════════════════════
   StreamX Video Player — Exact Jio Hotstar Style
   - Video plays top half
   - Info + Episodes bottom half (scrollable)
   - Settings sheet (Quality/Audio/Subtitles/Speed)
   - Ad banner below video
   - Skip Intro / Skip Recap buttons
   - Responsive: Mobile + Tablet + Desktop
═══════════════════════════════════════════ */

const ADS = [
  { id:"a1", brand:"Swiggy", icon:"🛵", tagline:"Order food, right here!", sub:"Grab dishes at ₹9", cta:"Order Now", color:"#fc8019", bg:"#1a0a00" },
  { id:"a2", brand:"JioFiber", icon:"⚡", tagline:"1 Gbps broadband!", sub:"Starting ₹399/month", cta:"Get Now", color:"#003580", bg:"#00091a" },
  { id:"a3", brand:"Dream11", icon:"🏆", tagline:"Play fantasy. Win big.", sub:"Join 15 Crore+ players", cta:"Play Now", color:"#f3a700", bg:"#1a1000" },
  { id:"a4", brand:"Zomato", icon:"🍔", tagline:"Flat 60% off on orders!", sub:"Use code: HOTSTAR", cta:"Order Now", color:"#e23744", bg:"#1a0005" },
];

const QUALITY_OPTIONS = [
  { id:"auto",  label:"Auto",    sub:"Recommended for best experience", lock:false },
  { id:"1080p", label:"Full HD", sub:"Up to 1080p", lock:true },
  { id:"720p",  label:"HD",      sub:"Up to 720p",  lock:false },
  { id:"480p",  label:"Data Saver", sub:"Up to 480p", lock:false },
];

const AUDIO_LANGS = ["Hindi","English","Kannada","Tamil","Telugu","Bengali","Malayalam","Punjabi","Marathi"];
const SUBTITLE_LANGS = ["Off","Hindi","English","Kannada","Tamil","Telugu"];
const SPEEDS = [{ v:0.5,l:"0.5x" },{ v:0.75,l:"0.75x" },{ v:1,l:"Normal" },{ v:1.25,l:"1.25x" },{ v:1.5,l:"1.5x" },{ v:2,l:"2x" }];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0d0d0d; color: #fff; font-family: 'Inter', sans-serif; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
  @keyframes fadeIn   { from { opacity:0; }                          to { opacity:1; } }
  @keyframes slideUp  { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
  @keyframes slideDown{ from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes spin     { to   { transform: rotate(360deg); } }
  @keyframes pulse    { 0%,100%{opacity:1;} 50%{opacity:.4;} }
  @keyframes blink    { 0%,100%{opacity:1;} 50%{opacity:.3;} }
  .prog { -webkit-appearance:none; appearance:none; width:100%; height:3px; background:transparent; cursor:pointer; outline:none; }
  .prog::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#fff; cursor:pointer; }
  .prog::-moz-range-thumb { width:12px; height:12px; border-radius:50%; background:#fff; border:none; }
  .vol  { -webkit-appearance:none; appearance:none; height:2px; background:rgba(255,255,255,.3); cursor:pointer; outline:none; border-radius:2px; }
  .vol::-webkit-slider-thumb { -webkit-appearance:none; width:10px; height:10px; border-radius:50%; background:#fff; cursor:pointer; }
  .ep-row { display:flex; gap:12px; padding:14px 16px; border-bottom:1px solid #1e1e1e; cursor:pointer; transition:background .14s; align-items:center; }
  .ep-row:hover, .ep-row:active { background:rgba(255,255,255,.05); }
  .settings-tab { background:none; border:none; color:#aaa; font-size:14px; font-weight:500; padding:10px 16px; cursor:pointer; border-bottom:2px solid transparent; font-family:'Inter',sans-serif; white-space:nowrap; transition:all .15s; }
  .settings-tab.on { color:#fff; font-weight:700; border-bottom-color:#1565c0; }
  .settings-opt { display:flex; align-items:center; padding:14px 20px; cursor:pointer; border-bottom:1px solid #1e1e1e20; transition:background .14s; gap:14px; }
  .settings-opt:hover { background:rgba(255,255,255,.04); }
  .icon-btn { background:none; border:none; color:#fff; cursor:pointer; padding:6px; display:flex; align-items:center; justify-content:center; border-radius:6px; transition:all .15s; font-family:'Inter',sans-serif; }
  .icon-btn:hover { background:rgba(255,255,255,.1); }
  .action-btn { display:flex; flex-direction:column; align-items:center; gap:5px; background:none; border:none; color:#aaa; cursor:pointer; font-size:11px; font-family:'Inter',sans-serif; padding:8px 12px; min-width:60px; }
  .action-btn svg, .action-btn span.ico { font-size:20px; }
  /* RESPONSIVE */
  @media(min-width:768px) {
    .player-layout { flex-direction:row !important; height:100vh !important; }
    .video-section { width:60% !important; height:100% !important; flex-shrink:0; }
    .info-section  { width:40% !important; height:100% !important; overflow-y:auto; }
    .video-area    { height:100% !important; }
  }
  @media(min-width:1200px) {
    .video-section { width:65% !important; }
    .info-section  { width:35% !important; }
  }
`;

export default function VideoPlayer({ content, user, onClose, onNext }) {
  const videoRef     = useRef(null);
  const hlsRef       = useRef(null);
  const containerRef = useRef(null);
  const hideTimer    = useRef(null);

  const [phase,       setPhase]       = useState("loading");
  const [playing,     setPlaying]     = useState(false);
  const [progress,    setProgress]    = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [buffered,    setBuffered]    = useState(0);
  const [volume,      setVol]         = useState(0.85);
  const [muted,       setMuted]       = useState(false);
  const [showCtrl,    setShowCtrl]    = useState(true);
  const [fullscreen,  setFS]          = useState(false);
  const [seeking,     setSeeking]     = useState(false);
  const [ad,          setAd]          = useState(null);
  const [adTime,      setAdTime]      = useState(0);
  const [adSkip,      setAdSkip]      = useState(false);
  const [midDone,     setMidDone]     = useState([]);
  const [error,       setError]       = useState(null);
  const [toast,       setToast]       = useState(null);
  const [inWL,        setInWL]        = useState(false);
  const [liked,       setLiked]       = useState(false);
  const [nextCount,   setNextCount]   = useState(null);
  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab,  setSettingsTab]  = useState("quality");
  const [quality,      setQuality]      = useState("auto");
  const [audioLang,    setAudioLang]    = useState("Hindi");
  const [subtitle,     setSub]          = useState("Off");
  const [speed,        setSpeed]        = useState(1);
  // Content info
  const [episodes,     setEpisodes]     = useState([]);
  const [selSeason,    setSelSeason]    = useState(1);
  const [showSkipRecap,setShowSkipRecap]= useState(false);

  const isPremium = ["plan_premium","plan_annual","premium"].includes(user?.plan);
  const isLive    = content?.is_live || content?.type === "Live";
  const isSeries  = content?.type === "Series";
  const streamUrl = content?.stream_url || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  const fmt = s => {
    if(!s||isNaN(s)) return "0:00";
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=Math.floor(s%60);
    return h>0?`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${m}:${String(sec).padStart(2,"0")}`;
  };

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),2200); };
  const resetHide = () => { setShowCtrl(true); clearTimeout(hideTimer.current); hideTimer.current=setTimeout(()=>setShowCtrl(false),4000); };

  useEffect(()=>{
    initPlayer();
    if(user?.id&&content?.id) db.isInWatchlist(user.id,content.id).then(setInWL).catch(()=>{});
    if(isSeries) {
      setEpisodes(Array.from({length:content?.episode_count||8},(_,i)=>({
        ep:i+1, title:`Episode ${i+1}`, date:"29 May 2025", dur:`${38+i}m`,
        watched:i<2, progress:i===1?62:0, thumbnail:content?.thumbnail||null,
      })));
    }
    const keys = e => {
      if(e.target.tagName==="INPUT") return;
      if(e.key===" "||e.key==="k"){ e.preventDefault(); togglePlay(); }
      if(e.key==="ArrowRight") skipSecs(10);
      if(e.key==="ArrowLeft")  skipSecs(-10);
      if(e.key==="m")          toggleMute();
      if(e.key==="f")          toggleFS();
      if(e.key==="Escape"&&!showSettings) onClose();
      if(e.key==="Escape"&&showSettings)  setShowSettings(false);
    };
    window.addEventListener("keydown",keys);
    return()=>{ cleanup(); window.removeEventListener("keydown",keys); };
  },[]);

  function cleanup(){ if(hlsRef.current){hlsRef.current.destroy();hlsRef.current=null;} clearTimeout(hideTimer.current); }

  async function initPlayer(){
    try {
      if(!isPremium){
        const ads=await db.getAdsForUser(user?.id,"pre_roll").catch(()=>[]);
        if(ads?.length>0){ setAd(ads[0]||ADS[0]); setAdTime(ads[0]?.duration||15); setPhase("preroll"); return; }
      }
    } catch(e){}
    // Use local ad fallback for testing
    if(!isPremium){
      const a=ADS[Math.floor(Math.random()*ADS.length)];
      setAd(a); setAdTime(15); setPhase("preroll"); return;
    }
    startVideo();
  }

  function startVideo(){
    setPhase("playing");
    setTimeout(()=>{ const v=videoRef.current; if(!v){setTimeout(startVideo,300);return;} loadHLS(v); },150);
  }

  function loadHLS(v){
    if(!streamUrl){setError("No stream URL. Add URL in admin panel.");return;}
    try {
      if(Hls.isSupported()){
        if(hlsRef.current) hlsRef.current.destroy();
        const hls=new Hls({enableWorker:true,lowLatencyMode:true});
        hlsRef.current=hls; hls.loadSource(streamUrl); hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED,()=>{ v.volume=volume; v.play().catch(()=>{}); setPlaying(true); resetHide(); });
        hls.on(Hls.Events.ERROR,(_,d)=>{ if(d.fatal) setError("Stream error. Check URL."); });
      } else if(v.canPlayType("application/vnd.apple.mpegurl")){
        v.src=streamUrl; v.play().catch(()=>{}); setPlaying(true); resetHide();
      } else {
        v.src=streamUrl; v.play().catch(()=>{}); setPlaying(true); resetHide();
      }
    } catch(e){ setError("Playback error: "+e.message); }
  }

  useEffect(()=>{
    const v=videoRef.current;
    if(!v||phase!=="playing") return;
    const onTime=()=>{
      if(!seeking){ setProgress(v.currentTime); setDuration(v.duration||0); }
      if(v.buffered.length>0) setBuffered(v.buffered.end(v.buffered.length-1));
      // Skip recap button at start
      if(v.currentTime>2&&v.currentTime<90) setShowSkipRecap(true);
      else setShowSkipRecap(false);
      // Mid-roll ads
      if(!isPremium&&v.duration){
        const pct=(v.currentTime/v.duration)*100;
        [25,50,75].forEach(p=>{
          if(pct>=p&&!midDone.includes(p)){
            setMidDone(d=>[...d,p]); v.pause();
            const a=ADS[Math.floor(Math.random()*ADS.length)];
            setAd(a); setAdTime(15); setAdSkip(false); setPhase("midroll");
          }
        });
      }
      if(v.duration&&v.currentTime>=v.duration*0.94&&nextCount===null&&isSeries) setNextCount(10);
      if(user?.id&&content?.id&&Math.floor(v.currentTime)%10===0) db.saveProgress(user.id,content.id,Math.floor(v.currentTime),Math.floor(v.duration||0)).catch(()=>{});
    };
    v.addEventListener("timeupdate",onTime);
    v.addEventListener("play",()=>setPlaying(true));
    v.addEventListener("pause",()=>setPlaying(false));
    v.addEventListener("ended",()=>{setPhase("ended");setPlaying(false);});
    return()=>{ v.removeEventListener("timeupdate",onTime); };
  },[phase,seeking,midDone,isPremium,nextCount]);

  // Ad countdown
  useEffect(()=>{
    if(phase!=="preroll"&&phase!=="midroll") return;
    if(adTime<=0){resumeAd();return;}
    const t=setInterval(()=>setAdTime(s=>{if(s<=1){clearInterval(t);return 0;} return s-1;}),1000);
    const sk=setTimeout(()=>setAdSkip(true),5000);
    return()=>{clearInterval(t);clearTimeout(sk);};
  },[phase]);

  // Next ep
  useEffect(()=>{
    if(nextCount===null||nextCount<0) return;
    if(nextCount===0){onNext?.();return;}
    const t=setTimeout(()=>setNextCount(n=>n-1),1000);
    return()=>clearTimeout(t);
  },[nextCount]);

  function resumeAd(){setAd(null);setAdSkip(false);if(phase==="preroll") startVideo(); else{setPhase("playing");videoRef.current?.play();setPlaying(true);}}
  function togglePlay(){const v=videoRef.current;if(!v)return;v.paused?v.play():v.pause();resetHide();}
  function seekTo(val){const v=videoRef.current;if(!v)return;v.currentTime=Math.max(0,Math.min(v.duration||0,val));setProgress(v.currentTime);}
  function skipSecs(s){seekTo(progress+s);showToast(s>0?`+${s}s`:`${s}s`);}
  function toggleMute(){const v=videoRef.current;if(!v)return;v.muted=!v.muted;setMuted(v.muted);}
  function changeVol(val){const v=videoRef.current;if(!v)return;v.volume=val;setVol(val);setMuted(val===0);}
  function applySpeed(s){const v=videoRef.current;if(v)v.playbackRate=s;setSpeed(s);}
  function toggleFS(){!document.fullscreenElement?containerRef.current?.requestFullscreen?.().then(()=>setFS(true)).catch(()=>{}):document.exitFullscreen?.().then(()=>setFS(false)).catch(()=>{});}
  async function toggleWL(){if(!user?.id||!content?.id)return;try{if(inWL){await db.removeFromWatchlist(user.id,content.id);setInWL(false);showToast("Removed from Watchlist");}else{await db.addToWatchlist(user.id,content.id);setInWL(true);showToast("Added to Watchlist ✓");}}catch(e){}}

  const pct    = duration>0?(progress/duration)*100:0;
  const bufPct = duration>0?(buffered/duration)*100:0;
  const seasons = Array.from({length:content?.season_count||4},(_,i)=>i+1);

  return (
    <div ref={containerRef} style={{position:"fixed",inset:0,zIndex:700,background:"#0d0d0d",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <style>{CSS}</style>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div className="player-layout" style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

        {/* ════ VIDEO SECTION ════ */}
        <div className="video-section" style={{position:"relative",background:"#000",flexShrink:0,height:"clamp(220px,55vw,400px)"}}>
          <div className="video-area" style={{position:"relative",width:"100%",height:"100%",background:"#000"}} onMouseMove={resetHide} onTouchStart={resetHide}>

            {/* REAL VIDEO */}
            <video ref={videoRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",display:phase==="playing"||phase==="ended"?"block":"none"}} playsInline onClick={togglePlay}/>

            {/* LOADING */}
            {phase==="loading" && (
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,background:"#000"}}>
                <div style={{width:44,height:44,border:"3px solid #222",borderTop:"3px solid #1565c0",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                <div style={{color:"#666",fontSize:13}}>{content?.title}</div>
              </div>
            )}

            {/* ERROR */}
            {error && (
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:14,background:"#000",padding:20}}>
                <div style={{fontSize:40}}>⚠️</div>
                <div style={{color:"#fff",fontSize:14,fontWeight:600,textAlign:"center",maxWidth:280}}>{error}</div>
                <div style={{display:"flex",gap:10}}>
                  <button onClick={()=>{setError(null);initPlayer();}} style={{background:"#1565c0",color:"#fff",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:600,cursor:"pointer",fontSize:13}}>↺ Retry</button>
                  <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"none",borderRadius:8,padding:"10px 16px",cursor:"pointer",fontSize:13}}>Close</button>
                </div>
              </div>
            )}

            {/* TOAST */}
            {toast && <div style={{position:"absolute",top:"42%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,.75)",color:"#fff",padding:"8px 18px",borderRadius:6,fontSize:13,fontWeight:600,pointerEvents:"none",animation:"fadeIn .18s ease",whiteSpace:"nowrap"}}>{toast}</div>}

            {/* SKIP RECAP button — top right */}
            {phase==="playing" && showCtrl && showSkipRecap && (
              <button onClick={()=>{seekTo(duration*0.05);showToast("Recap skipped");}} style={{position:"absolute",right:"clamp(12px,3vw,20px)",top:"clamp(40px,8vw,60px)",background:"rgba(30,30,30,.9)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",animation:"fadeIn .3s ease",zIndex:20}}>
                Skip Recap
              </button>
            )}

            {/* SKIP INTRO button — top right */}
            {phase==="playing" && showCtrl && progress>90 && progress<300 && (
              <button onClick={()=>{skipSecs(90);showToast("Intro skipped");}} style={{position:"absolute",right:"clamp(12px,3vw,20px)",top:"clamp(40px,8vw,60px)",background:"rgba(30,30,30,.9)",color:"#fff",border:"1px solid rgba(255,255,255,.25)",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:600,cursor:"pointer",animation:"fadeIn .3s ease",zIndex:20}}>
                Skip Intro
              </button>
            )}

            {/* NEXT EP */}
            {nextCount!==null && (
              <div style={{position:"absolute",right:"clamp(12px,3vw,20px)",bottom:80,background:"rgba(0,0,0,.92)",border:"1px solid #1565c0",borderRadius:12,padding:"14px 18px",animation:"slideUp .3s ease",zIndex:20,minWidth:200}}>
                <div style={{fontSize:11,color:"#888",marginBottom:3}}>Next in {nextCount}s</div>
                <div style={{fontWeight:700,marginBottom:10,fontSize:13}}>Next Episode</div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{onNext?.();setNextCount(null);}} style={{background:"#1565c0",border:"none",color:"#fff",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer"}}>Play Now</button>
                  <button onClick={()=>setNextCount(null)} style={{background:"rgba(255,255,255,.08)",border:"none",color:"#aaa",borderRadius:7,padding:"7px 10px",fontSize:12,cursor:"pointer"}}>Cancel</button>
                </div>
              </div>
            )}

            {/* PLAYBACK CONTROLS overlay */}
            {showCtrl && (phase==="playing"||phase==="ended") && (
              <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",justifyContent:"space-between",background:"linear-gradient(to bottom,rgba(0,0,0,.5) 0%,transparent 35%,transparent 55%,rgba(0,0,0,.7) 100%)",animation:"fadeIn .2s ease",zIndex:10}}>
                {/* Top bar */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"clamp(10px,2vw,14px) clamp(12px,3vw,18px)"}}>
                  <button onClick={onClose} className="icon-btn" style={{fontSize:22}}>←</button>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setShowSettings(s=>!s)} className="icon-btn" style={{fontSize:20}}>⚙</button>
                    <button onClick={toggleFS} className="icon-btn" style={{fontSize:18}}>{fullscreen?"⊡":"⛶"}</button>
                  </div>
                </div>

                {/* Centre controls */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"clamp(24px,8vw,48px)"}}>
                  <button onClick={()=>skipSecs(-10)} className="icon-btn" style={{fontSize:"clamp(28px,6vw,36px)"}}>«</button>
                  <button onClick={togglePlay} style={{background:"none",border:"none",color:"#fff",fontSize:"clamp(32px,8vw,44px)",cursor:"pointer",padding:8}}>
                    {playing?"⏸":"▶"}
                  </button>
                  <button onClick={()=>skipSecs(10)} className="icon-btn" style={{fontSize:"clamp(28px,6vw,36px)"}}>»</button>
                </div>

                {/* Bottom — progress + time */}
                <div style={{padding:"0 clamp(12px,3vw,18px) clamp(10px,2vw,14px)"}}>
                  {/* Time display */}
                  <div style={{textAlign:"right",fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:6,fontWeight:500}}>
                    {fmt(progress)} / {fmt(duration)}
                  </div>
                  {/* Progress bar */}
                  <div style={{position:"relative",height:3,background:"rgba(255,255,255,.25)",borderRadius:2,marginBottom:4}}>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",background:"rgba(255,255,255,.4)",borderRadius:2,width:bufPct+"%"}}/>
                    <div style={{position:"absolute",left:0,top:0,height:"100%",background:"#1565c0",borderRadius:2,width:pct+"%"}}/>
                    {/* Chapter markers (orange dots like Hotstar) */}
                    {[25,50,75].filter(p=>!midDone.includes(p)).map(p=>(
                      <div key={p} style={{position:"absolute",top:"50%",left:`${p}%`,transform:"translate(-50%,-50%)",width:6,height:6,borderRadius:"50%",background:"#f59e0b"}}/>
                    ))}
                    <div style={{position:"absolute",top:"50%",transform:"translate(-50%,-50%)",width:14,height:14,borderRadius:"50%",background:"#fff",left:pct+"%",boxShadow:"0 2px 8px rgba(0,0,0,.5)"}}/>
                  </div>
                  <input type="range" className="prog" min={0} max={duration||100} value={progress} step={0.1}
                    onChange={e=>seekTo(+e.target.value)} onMouseDown={()=>setSeeking(true)} onMouseUp={()=>setSeeking(false)} onTouchStart={()=>setSeeking(true)} onTouchEnd={()=>setSeeking(false)}
                    style={{position:"absolute",left:"clamp(12px,3vw,18px)",right:"clamp(12px,3vw,18px)",bottom:"clamp(22px,4vw,30px)",opacity:0,cursor:"pointer",height:14,zIndex:5,margin:0,width:`calc(100% - clamp(24px,6vw,36px))`}}
                  />
                </div>
              </div>
            )}

            {/* AD OVERLAY */}
            {(phase==="preroll"||phase==="midroll") && ad && (
              <div style={{position:"absolute",inset:0,background:"#000",display:"flex",flexDirection:"column",zIndex:50}}>
                {/* Black video area with ad marker */}
                <div style={{flex:1,background:"#000",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
                  <div style={{fontSize:"clamp(40px,10vw,60px)",opacity:.15}}>{ad.icon}</div>
                  {/* Timer top right */}
                  <div style={{position:"absolute",top:12,right:12,background:"rgba(0,0,0,.75)",color:"rgba(255,255,255,.8)",fontSize:13,fontWeight:600,padding:"5px 12px",borderRadius:6}}>
                    {fmt(adTime)}
                  </div>
                </div>
                {/* Ad progress bar */}
                <div style={{height:3,background:"rgba(255,255,255,.15)"}}>
                  <div style={{height:"100%",background:ad.color,transition:"width 1s linear",width:`${((15-adTime)/15)*100}%`}}/>
                </div>
                {/* Skip button */}
                {adSkip && (
                  <button onClick={resumeAd} style={{position:"absolute",right:"clamp(12px,3vw,18px)",bottom:80,background:"rgba(20,20,20,.95)",color:"#fff",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"10px 18px",fontSize:13,fontWeight:600,cursor:"pointer",animation:"fadeIn .3s ease",zIndex:60}}>
                    Skip Ad ❯
                  </button>
                )}
              </div>
            )}

            {/* ENDED */}
            {phase==="ended" && (
              <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,zIndex:40}}>
                <div style={{fontSize:42}}>🎬</div>
                <div style={{fontWeight:700,fontSize:"clamp(15px,4vw,18px)",textAlign:"center"}}>{content?.title}</div>
                <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
                  <button onClick={()=>{setPhase("loading");setProgress(0);setMidDone([]);setNextCount(null);initPlayer();}} style={{background:"#1565c0",color:"#fff",border:"none",borderRadius:9,padding:"10px 22px",fontWeight:700,fontSize:13,cursor:"pointer"}}>▶ Watch Again</button>
                  {onNext&&<button onClick={onNext} style={{background:"#fff",color:"#111",border:"none",borderRadius:9,padding:"10px 22px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Next →</button>}
                  <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"none",borderRadius:9,padding:"10px 16px",fontSize:13,cursor:"pointer"}}>✕</button>
                </div>
              </div>
            )}
          </div>

          {/* AD BANNER below video — Hotstar style */}
          {(phase==="preroll"||phase==="midroll"||phase==="playing") && ad && phase!=="preroll" && (
            <div style={{background:"#111",borderTop:"1px solid #1e1e1e",padding:"10px clamp(12px,3vw,16px)",display:"flex",alignItems:"center",gap:12,animation:"slideDown .3s ease"}}>
              <div style={{width:38,height:38,borderRadius:8,background:ad.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                {ad.icon}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:1}}>
                  <span style={{background:"#f59e0b",color:"#000",fontSize:9,fontWeight:800,padding:"1px 5px",borderRadius:3}}>Ad</span>
                  <span style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ad.tagline}</span>
                </div>
                <div style={{fontSize:11,color:"#888"}}>{ad.sub}</div>
              </div>
              <div style={{display:"flex",gap:8,flexShrink:0}}>
                <button onClick={()=>{}} style={{fontSize:18,background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>∧</button>
                <button style={{background:ad.color,color:"#fff",border:"none",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>{ad.cta}</button>
              </div>
            </div>
          )}

          {/* AUTO CLOSE countdown for ad banner */}
          {(phase==="preroll"||phase==="midroll") && ad && (
            <div style={{background:"#0d0d0d",padding:"6px 16px",display:"flex",alignItems:"center",gap:6}}>
              <div style={{fontSize:14,color:"#666"}}>⏱</div>
              <div style={{fontSize:12,color:"#666"}}>Auto Closing in {adTime}s</div>
            </div>
          )}
        </div>

        {/* ════ INFO SECTION (scrollable) ════ */}
        <div className="info-section" style={{flex:1,overflowY:"auto",background:"#0d0d0d",paddingBottom:80}}>

          {/* Content title + meta */}
          <div style={{padding:"clamp(14px,3vw,20px) clamp(14px,3vw,20px) 0"}}>
            <div style={{fontWeight:800,fontSize:"clamp(18px,4vw,22px)",marginBottom:4,lineHeight:1.2}}>{content?.title}</div>
            <div style={{fontSize:13,color:"#888",marginBottom:12}}>
              {[content?.release_year, content?.duration?`${Math.floor((content.duration||0)/60)}h ${(content.duration||0)%60}m`:null, content?.language?`${content.language.split("/").length} Languages`:null].filter(Boolean).join(" • ")}
            </div>

            {/* Action buttons — Hotstar style */}
            <div style={{display:"flex",gap:4,marginBottom:16,overflowX:"auto",paddingBottom:4}}>
              <button onClick={toggleWL} className="action-btn" style={{color:inWL?"#1565c0":"#aaa"}}>
                <span className="ico">{inWL?"✓":"+"}</span>
                <span>Watchlist</span>
              </button>
              <button onClick={()=>showToast("Downloading...")} className="action-btn">
                <span className="ico">⬇</span>
                <span>Download</span>
              </button>
              <button onClick={()=>{navigator.clipboard?.writeText(window.location.href).catch(()=>{});showToast("Link copied!");}} className="action-btn">
                <span className="ico">↗</span>
                <span>Share</span>
              </button>
              <button onClick={()=>{setLiked(l=>!l);showToast(liked?"Unliked":"Rated ❤️");}} className="action-btn" style={{color:liked?"#e50914":"#aaa"}}>
                <span className="ico">{liked?"❤️":"🤍"}</span>
                <span>Rate</span>
              </button>
            </div>

            {/* Description */}
            {content?.description && (
              <div style={{fontSize:13,color:"#999",lineHeight:1.6,marginBottom:16}}>{content.description}</div>
            )}
          </div>

          {/* TABS — Watch More / Episodes */}
          <div style={{borderBottom:"1px solid #1e1e1e",display:"flex",overflowX:"auto",padding:"0 clamp(14px,3vw,20px)"}}>
            <button className={`settings-tab on`} style={{color:"#fff",borderBottomColor:"#fff",fontWeight:700}}>Watch More</button>
            {isSeries && <button className="settings-tab" style={{}}>Episodes</button>}
            <button className="settings-tab">Related</button>
          </div>

          {/* EPISODES LIST */}
          {isSeries && (
            <div style={{padding:"0 0 8px"}}>
              {/* Season selector */}
              <div style={{display:"flex",gap:0,overflowX:"auto",padding:"12px clamp(14px,3vw,20px) 4px",borderBottom:"1px solid #1e1e1e"}}>
                {seasons.map(s=>(
                  <button key={s} onClick={()=>setSelSeason(s)} style={{background:"none",border:"none",color:selSeason===s?"#fff":"#666",fontWeight:selSeason===s?700:500,fontSize:14,padding:"6px 16px 8px",cursor:"pointer",borderBottom:`2px solid ${selSeason===s?"#fff":"transparent"}`,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap",transition:"all .15s"}}>
                    Season {s}
                  </button>
                ))}
              </div>

              {/* Episode list */}
              {episodes.map(ep=>(
                <div key={ep.ep} className="ep-row" onClick={()=>showToast(`Playing S${selSeason}E${ep.ep}`)}>
                  {/* Thumbnail */}
                  <div style={{width:"clamp(80px,20vw,110px)",height:"clamp(50px,13vw,68px)",borderRadius:8,background:content?.thumbnail?`url(${content.thumbnail}) center/cover`:"#1e1e1e",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,position:"relative",overflow:"hidden"}}>
                    {!content?.thumbnail && <span style={{fontSize:20,opacity:.4}}>🎬</span>}
                    {/* Progress bar */}
                    {ep.progress>0 && (
                      <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"rgba(255,255,255,.15)"}}>
                        <div style={{height:"100%",width:`${ep.progress}%`,background:"#1565c0"}}/>
                      </div>
                    )}
                    {/* Play icon */}
                    <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.3)"}}>
                      <div style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}}>▶</div>
                    </div>
                  </div>
                  {/* Info */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:14,marginBottom:3}}>{ep.title}</div>
                    <div style={{fontSize:12,color:"#666"}}>S{selSeason} E{ep.ep} • {ep.date} • {ep.dur}</div>
                    {ep.progress>0 && <div style={{fontSize:11,color:"#1565c0",marginTop:3}}>{ep.progress}% watched</div>}
                  </div>
                  {/* Download */}
                  <button onClick={e=>{e.stopPropagation();showToast(`Downloading E${ep.ep}...`);}} style={{background:"none",border:"none",color:"#888",fontSize:18,cursor:"pointer",padding:8,flexShrink:0}}>⬇</button>
                </div>
              ))}
            </div>
          )}

          {/* TOP 10 section */}
          <div style={{padding:"16px clamp(14px,3vw,20px) 8px"}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:12}}>
              Top 10 in India Today{content?.language?" - "+content.language.split("/")[0]:""}
            </div>
            <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:6}}>
              {[1,2,3,4,5].map(n=>(
                <div key={n} style={{flexShrink:0,width:"clamp(100px,22vw,130px)",position:"relative",cursor:"pointer"}}>
                  <div style={{height:"clamp(130px,28vw,160px)",background:"#1e1e1e",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,marginBottom:0}}>🎬</div>
                  <div style={{fontFamily:"'Bebas Neue',serif",fontSize:"clamp(52px,12vw,70px)",color:"#111",WebkitTextStroke:"1.5px #333",position:"absolute",bottom:-10,left:-4,lineHeight:1,fontWeight:900}}>{n}</div>
                  <div style={{marginTop:14,padding:"0 2px"}}>
                    <div style={{fontSize:10,fontWeight:700,color:"#888",textTransform:"uppercase",letterSpacing:.5,marginBottom:3}}>ಕನ್ನಡ</div>
                    <button style={{width:"100%",background:"transparent",border:"1px solid #333",color:"#aaa",borderRadius:5,padding:"5px 0",fontSize:11,cursor:"pointer"}}>+ Watchlist</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════ SETTINGS SHEET — Hotstar style ════ */}
      {showSettings && (
        <>
          <div style={{position:"absolute",inset:0,zIndex:800,background:"rgba(0,0,0,.6)",backdropFilter:"blur(4px)"}} onClick={()=>setShowSettings(false)}/>
          <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:801,background:"#1a1a1a",borderRadius:"16px 16px 0 0",animation:"slideUp .3s ease",maxHeight:"75vh",display:"flex",flexDirection:"column"}}>
            {/* Handle */}
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0 8px"}}><div style={{width:40,height:4,borderRadius:2,background:"#444"}}/></div>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 20px 12px"}}>
              <div style={{fontWeight:700,fontSize:17}}>Settings</div>
              <button onClick={()=>showToast("Issue reported!")} style={{background:"none",border:"none",color:"#1565c0",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Report an Issue</button>
            </div>
            {/* Tabs */}
            <div style={{display:"flex",overflowX:"auto",borderBottom:"1px solid #2a2a2a",padding:"0 20px",gap:0}}>
              {["quality","audio","subtitles","speed"].map(t=>(
                <button key={t} className={`settings-tab${settingsTab===t?" on":""}`} onClick={()=>setSettingsTab(t)} style={{textTransform:"capitalize"}}>
                  {t==="audio"?"Audio Language":t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            {/* Options */}
            <div style={{overflowY:"auto",flex:1,paddingBottom:20}}>
              {settingsTab==="quality" && QUALITY_OPTIONS.map(q=>(
                <div key={q.id} className="settings-opt" onClick={()=>{if(q.lock&&!isPremium){showToast("Upgrade to Premium for "+q.label);}else{setQuality(q.id);setShowSettings(false);showToast("Quality: "+q.label);}}}>
                  {quality===q.id ? <span style={{color:"#1565c0",fontSize:18,flexShrink:0}}>✓</span> : <span style={{width:18,flexShrink:0}}/>}
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14,display:"flex",alignItems:"center",gap:8}}>
                      {q.label}
                      {q.lock&&!isPremium && <span style={{background:"#f59e0b",color:"#000",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:3}}>UPGRADE</span>}
                    </div>
                    <div style={{fontSize:12,color:"#666",marginTop:1}}>{q.sub}</div>
                  </div>
                  {quality===q.id && <div style={{width:6,height:6,borderRadius:"50%",background:"#1565c0",flexShrink:0}}/>}
                </div>
              ))}
              {settingsTab==="audio" && AUDIO_LANGS.map(l=>(
                <div key={l} className="settings-opt" onClick={()=>{setAudioLang(l);setShowSettings(false);showToast("Audio: "+l);}}>
                  {audioLang===l ? <span style={{color:"#1565c0",fontSize:18,flexShrink:0}}>✓</span> : <span style={{width:18,flexShrink:0}}/>}
                  <div style={{fontWeight:audioLang===l?700:400,fontSize:14}}>{l}</div>
                </div>
              ))}
              {settingsTab==="subtitles" && SUBTITLE_LANGS.map(l=>(
                <div key={l} className="settings-opt" onClick={()=>{setSub(l);setShowSettings(false);showToast("Subtitles: "+l);}}>
                  {subtitle===l ? <span style={{color:"#1565c0",fontSize:18,flexShrink:0}}>✓</span> : <span style={{width:18,flexShrink:0}}/>}
                  <div style={{fontWeight:subtitle===l?700:400,fontSize:14}}>{l}</div>
                </div>
              ))}
              {settingsTab==="speed" && SPEEDS.map(s=>(
                <div key={s.v} className="settings-opt" onClick={()=>{applySpeed(s.v);setShowSettings(false);showToast("Speed: "+s.l);}}>
                  {speed===s.v ? <span style={{color:"#1565c0",fontSize:18,flexShrink:0}}>✓</span> : <span style={{width:18,flexShrink:0}}/>}
                  <div style={{fontWeight:speed===s.v?700:400,fontSize:14}}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
