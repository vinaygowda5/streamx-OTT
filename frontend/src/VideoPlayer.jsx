import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import { db } from "./supabase.js";

const ADS = [
  {id:"a1",brand:"JioFiber Ultra",tagline:"1 Gbps. Zero buffering.",cta:"Get Now",emoji:"⚡",color:"#003580",duration:15,skip:5},
  {id:"a2",brand:"Zomato Pro",tagline:"Free delivery on 1000+ restaurants.",cta:"Order Now",emoji:"🍔",color:"#cb202d",duration:10,skip:5},
  {id:"a3",brand:"Dream11",tagline:"Create team. Win big.",cta:"Play Now",emoji:"🏆",color:"#f3a700",duration:10,skip:5},
  {id:"a4",brand:"Swiggy Instamart",tagline:"Groceries in 10 minutes.",cta:"Shop Now",emoji:"🛒",color:"#fc8019",duration:12,skip:5},
];

export default function VideoPlayer({ content, user, onClose, onNext }) {
  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const hideTimer = useRef(null);
  const containerRef = useRef(null);

  const [phase,      setPhase]      = useState("loading");
  const [playing,    setPlaying]    = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [buffered,   setBuffered]   = useState(0);
  const [volume,     setVol]        = useState(0.85);
  const [muted,      setMuted]      = useState(false);
  const [showCtrl,   setShowCtrl]   = useState(true);
  const [ad,         setAd]         = useState(null);
  const [adTime,     setAdTime]     = useState(0);
  const [adSkip,     setAdSkip]     = useState(false);
  const [midDone,    setMidDone]    = useState([]);
  const [toast,      setToast]      = useState(null);
  const [error,      setError]      = useState(null);
  const [inWL,       setInWL]       = useState(false);
  const [seeking,    setSeeking]    = useState(false);
  const [speed,      setSpeed]      = useState(1.0);
  const [fullscreen, setFS]         = useState(false);
  const [showSpeed,  setShowSpeed]  = useState(false);
  const [nextCount,  setNextCount]  = useState(null);
  const [quality,    setQuality]    = useState("Auto");
  const [brighten,   setBrighten]   = useState(false);

  const isPremium = ["plan_premium","plan_annual","premium"].includes(user?.plan);
  const streamUrl = content?.stream_url || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
  const isLive    = content?.is_live || content?.type === "Live";

  const fmt = s => {
    if (!s||isNaN(s)) return "0:00";
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=Math.floor(s%60);
    return h>0?`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${m}:${String(sec).padStart(2,"0")}`;
  };

  const showToast = (msg,dur=2000) => { setToast(msg); setTimeout(()=>setToast(null),dur); };

  const resetHide = () => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    if (!showSpeed) hideTimer.current = setTimeout(()=>setShowCtrl(false), 4000);
  };

  useEffect(() => {
    initPlayer();
    if (user?.id && content?.id) db.isInWatchlist(user.id,content.id).then(setInWL).catch(()=>{});
    const handleKey = e => {
      if (e.key===" "||e.key==="k") { e.preventDefault(); togglePlay(); }
      if (e.key==="ArrowRight") skip(10);
      if (e.key==="ArrowLeft")  skip(-10);
      if (e.key==="m")          toggleMute();
      if (e.key==="f")          toggleFS();
      if (e.key==="Escape")     onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      cleanup();
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  function cleanup() {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    clearTimeout(hideTimer.current);
  }

  async function initPlayer() {
    try {
      if (!isPremium) {
        const ads = await db.getAdsForUser(user?.id,"pre_roll").catch(()=>[]);
        if (ads?.length>0) {
          setAd(ads[0]); setAdTime(ads[0].duration||15); setPhase("preroll"); return;
        }
      }
    } catch(e) {}
    startVideo();
  }

  function startVideo() {
    setPhase("playing");
    setTimeout(() => {
      const v = videoRef.current;
      if (!v) { setTimeout(startVideo, 300); return; }
      loadHLS(v);
    }, 100);
  }

  function loadHLS(v) {
    if (!streamUrl) { setError("No stream URL. Add URL in admin panel."); return; }
    try {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ enableWorker:true, lowLatencyMode:true });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          v.volume = volume;
          v.play().catch(()=>{});
          setPlaying(true); resetHide();
        });
        hls.on(Hls.Events.ERROR, (_,data) => {
          if (data.fatal) setError("Stream unavailable. Check URL in admin panel.");
        });
      } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = streamUrl; v.play().catch(()=>{});
        setPlaying(true); resetHide();
      } else {
        v.src = streamUrl; v.play().catch(()=>{});
        setPlaying(true); resetHide();
      }
    } catch(e) { setError("Playback error: "+e.message); }
  }

  useEffect(() => {
    const v = videoRef.current;
    if (!v||phase!=="playing") return;
    const onTime = () => {
      if (!seeking) { setProgress(v.currentTime); setDuration(v.duration||0); }
      if (v.buffered.length>0) setBuffered(v.buffered.end(v.buffered.length-1));
      if (!isPremium && v.duration) {
        const pct=(v.currentTime/v.duration)*100;
        [25,50,75].forEach(p=>{
          if(pct>=p&&!midDone.includes(p)){
            setMidDone(d=>[...d,p]); v.pause();
            const a=ADS[Math.floor(Math.random()*ADS.length)];
            setAd(a); setAdTime(a.duration); setAdSkip(false); setPhase("midroll");
          }
        });
      }
      if(v.duration&&v.currentTime>=v.duration*0.94&&nextCount===null&&content?.type==="Series") setNextCount(10);
      if(user?.id&&content?.id&&Math.floor(v.currentTime)%10===0){
        db.saveProgress(user.id,content.id,Math.floor(v.currentTime),Math.floor(v.duration||0)).catch(()=>{});
      }
    };
    const onPlay  = ()=>setPlaying(true);
    const onPause = ()=>setPlaying(false);
    const onEnded = ()=>{ setPhase("ended"); setPlaying(false); };
    v.addEventListener("timeupdate",onTime);
    v.addEventListener("play",onPlay);
    v.addEventListener("pause",onPause);
    v.addEventListener("ended",onEnded);
    return ()=>{
      v.removeEventListener("timeupdate",onTime);
      v.removeEventListener("play",onPlay);
      v.removeEventListener("pause",onPause);
      v.removeEventListener("ended",onEnded);
    };
  }, [phase,seeking,midDone,isPremium,nextCount]);

  // Ad countdown
  useEffect(() => {
    if(phase!=="preroll"&&phase!=="midroll") return;
    if(adTime<=0){ resumeFromAd(); return; }
    const t=setInterval(()=>setAdTime(s=>{ if(s<=1){clearInterval(t);return 0;} return s-1; }),1000);
    const sk=setTimeout(()=>setAdSkip(true),(ad?.skip||5)*1000);
    return()=>{ clearInterval(t); clearTimeout(sk); };
  }, [phase]);

  // Next episode
  useEffect(() => {
    if(nextCount===null||nextCount<0) return;
    if(nextCount===0){ onNext?.(); return; }
    const t=setTimeout(()=>setNextCount(n=>n-1),1000);
    return()=>clearTimeout(t);
  }, [nextCount]);

  function resumeFromAd() {
    setAd(null); setAdSkip(false);
    if(phase==="preroll"){ startVideo(); }
    else { setPhase("playing"); videoRef.current?.play(); setPlaying(true); }
  }

  function togglePlay() {
    const v=videoRef.current; if(!v) return;
    v.paused ? v.play() : v.pause();
    resetHide();
  }

  function seek(val) {
    const v=videoRef.current; if(!v) return;
    v.currentTime=Math.max(0,Math.min(v.duration||0,typeof val==="number"&&val<200?v.currentTime+val:val));
    setProgress(v.currentTime);
  }

  function skip(s) { seek(s); showToast(s>0?`+${s}s`:`${s}s`); }

  function toggleMute() {
    const v=videoRef.current; if(!v) return;
    v.muted=!v.muted; setMuted(v.muted);
  }

  function changeVol(val) {
    const v=videoRef.current; if(!v) return;
    v.volume=val; setVol(val); setMuted(val===0);
  }

  function changeSpeed(s) {
    const v=videoRef.current; if(v) v.playbackRate=s;
    setSpeed(s); setShowSpeed(false); showToast(s+"x speed");
  }

  async function toggleWatchlist() {
    if(!user?.id||!content?.id) return;
    try {
      if(inWL){ await db.removeFromWatchlist(user.id,content.id); setInWL(false); showToast("Removed from list"); }
      else{ await db.addToWatchlist(user.id,content.id); setInWL(true); showToast("Added to My List ✓"); }
    } catch(e) {}
  }

  function toggleFS() {
    const el=containerRef.current||document.documentElement;
    if(!document.fullscreenElement){ el.requestFullscreen?.().then(()=>setFS(true)).catch(()=>{}); }
    else{ document.exitFullscreen?.().then(()=>setFS(false)).catch(()=>{}); }
  }

  const pct     = duration>0?(progress/duration)*100:0;
  const bufPct  = duration>0?(buffered/duration)*100:0;

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHide}
      onTouchStart={resetHide}
      style={{
        position:"fixed",inset:0,zIndex:700,background:"#000",
        display:"flex",flexDirection:"column",
        userSelect:"none",fontFamily:"'Inter',sans-serif",
        filter: brighten?"brightness(1.2)":"none",
      }}
    >
      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
        @keyframes slideUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes adIn{from{opacity:0;transform:scale(.96);}to{opacity:1;transform:scale(1);}}
        .ctrl-btn{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.13);color:#fff;border-radius:7px;padding:6px 12px;font-size:12px;cursor:pointer;font-weight:600;white-space:nowrap;transition:all .15s;font-family:'Inter',sans-serif;}
        .ctrl-btn:hover{background:rgba(255,255,255,.18);}
        .ctrl-btn.red{background:rgba(229,9,20,.2);border-color:rgba(229,9,20,.4);color:#e50914;}
      `}</style>

      {/* ── REAL VIDEO ── */}
      <video
        ref={videoRef}
        style={{
          position:"absolute",inset:0,width:"100%",height:"100%",
          objectFit:"contain",
          display:phase==="playing"||phase==="ended"?"block":"none",
        }}
        playsInline
        onClick={togglePlay}
      />

      {/* ── LOADING ── */}
      {phase==="loading" && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20,background:"radial-gradient(ellipse at center,#1a0a0a,#000)"}}>
          <div style={{fontSize:"clamp(60px,12vw,100px)",opacity:.15}}>{isLive?"🔴":"🎬"}</div>
          <div style={{width:48,height:48,border:"3px solid #222",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          <div style={{color:"#555",fontSize:14,fontWeight:500}}>Loading {content?.title}...</div>
        </div>
      )}

      {/* ── AD OVERLAY ── */}
      {(phase==="preroll"||phase==="midroll") && ad && (
        <div style={{
          position:"absolute",inset:0,zIndex:60,
          background:`linear-gradient(160deg,${ad.color}66 0%,#000 55%)`,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          animation:"adIn .4s ease",
        }}>
          {/* Ad label top-left */}
          <div style={{position:"absolute",top:20,left:20,background:"rgba(0,0,0,.65)",backdropFilter:"blur(8px)",color:"#aaa",fontSize:10,padding:"4px 12px",borderRadius:20,letterSpacing:3,textTransform:"uppercase",border:"1px solid rgba(255,255,255,.08)"}}>
            {phase==="midroll"?"Mid-roll":"Pre-roll"} · Advertisement
          </div>

          {/* Go ad-free */}
          {!isPremium && (
            <div onClick={()=>showToast("Upgrade to Premium for ad-free!")} style={{position:"absolute",top:18,right:20,background:"rgba(229,9,20,.12)",backdropFilter:"blur(8px)",border:"1px solid rgba(229,9,20,.3)",borderRadius:20,padding:"5px 14px",fontSize:11,color:"#e50914",fontWeight:700,cursor:"pointer"}}>
              👑 Go Ad-Free
            </div>
          )}

          {/* Ad content */}
          <div style={{textAlign:"center",padding:"24px 20px",maxWidth:480,animation:"slideUp .5s ease"}}>
            <div style={{
              width:100,height:100,borderRadius:"50%",
              background:`radial-gradient(circle,${ad.color}55,${ad.color}11)`,
              border:`2px solid ${ad.color}66`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:52,margin:"0 auto 20px",
            }}>{ad.emoji}</div>
            <div style={{fontSize:"clamp(22px,5vw,34px)",fontWeight:900,color:"#fff",marginBottom:8,letterSpacing:.5}}>{ad.brand}</div>
            <div style={{color:"rgba(255,255,255,.6)",fontSize:"clamp(13px,3vw,16px)",marginBottom:28,lineHeight:1.5}}>{ad.tagline}</div>
            <button style={{
              background:`linear-gradient(135deg,${ad.color},${ad.color}cc)`,
              border:"none",color:"#fff",borderRadius:10,
              padding:"12px 36px",fontSize:14,fontWeight:700,cursor:"pointer",
              boxShadow:`0 6px 24px ${ad.color}44`,
            }}>{ad.cta}</button>
          </div>

          {/* Skip area */}
          <div style={{position:"absolute",bottom:"clamp(70px,12vh,100px)",right:"clamp(16px,4vw,40px)",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
            {adSkip ? (
              <button onClick={resumeFromAd} style={{
                background:"rgba(0,0,0,.85)",backdropFilter:"blur(12px)",
                border:"1px solid rgba(255,255,255,.3)",color:"#fff",
                borderRadius:8,padding:"11px 20px",fontSize:13,fontWeight:700,
                cursor:"pointer",display:"flex",alignItems:"center",gap:8,
                boxShadow:"0 4px 20px rgba(0,0,0,.5)",animation:"fadeIn .3s ease",
              }}>
                Skip Ad <span style={{background:"rgba(255,255,255,.2)",borderRadius:4,padding:"1px 6px"}}>❯</span>
              </button>
            ) : (
              <div style={{background:"rgba(0,0,0,.75)",backdropFilter:"blur(8px)",color:"#888",borderRadius:8,padding:"9px 16px",fontSize:12,border:"1px solid rgba(255,255,255,.08)"}}>
                Skip in {Math.max(0,(ad.skip||5)-((ad.duration||15)-adTime))}s
              </div>
            )}
            {/* Ad progress */}
            <div style={{width:180,height:3,background:"rgba(255,255,255,.12)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:"rgba(255,255,255,.6)",borderRadius:2,width:`${((ad.duration-adTime)/ad.duration)*100}%`,transition:"width 1s linear"}}/>
            </div>
            <div style={{color:"rgba(255,255,255,.3)",fontSize:11}}>Ad ends in {adTime}s</div>
          </div>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"rgba(0,0,0,.92)",padding:20}}>
          <div style={{fontSize:52}}>⚠️</div>
          <div style={{color:"#fff",fontSize:16,fontWeight:700,textAlign:"center",maxWidth:300,lineHeight:1.5}}>{error}</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setError(null);initPlayer();}} style={{background:"#e50914",color:"#fff",border:"none",borderRadius:9,padding:"11px 24px",fontWeight:700,fontSize:14,cursor:"pointer"}}>↺ Retry</button>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",color:"#fff",border:"1px solid rgba(255,255,255,.15)",borderRadius:9,padding:"11px 20px",fontSize:14,cursor:"pointer"}}>✕ Close</button>
          </div>
        </div>
      )}

      {/* ── CENTRE PLAY/PAUSE indicator ── */}
      {phase==="playing" && showCtrl && !playing && (
        <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",zIndex:25}}>
          <div style={{width:72,height:72,borderRadius:"50%",background:"rgba(255,255,255,.15)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,animation:"fadeIn .2s ease"}}>
            ▶
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{position:"absolute",top:"48%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,.78)",backdropFilter:"blur(12px)",color:"#fff",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:600,pointerEvents:"none",zIndex:200,whiteSpace:"nowrap",animation:"fadeIn .2s ease"}}>
          {toast}
        </div>
      )}

      {/* ── NEXT EPISODE ── */}
      {nextCount!==null && (
        <div style={{position:"absolute",right:"clamp(16px,4vw,40px)",bottom:"clamp(100px,18vh,140px)",background:"rgba(0,0,0,.92)",border:"1px solid #e50914",borderRadius:14,padding:"16px 20px",zIndex:50,animation:"slideUp .3s ease",minWidth:220}}>
          <div style={{fontSize:11,color:"#888",marginBottom:4}}>Next Episode in {nextCount}s</div>
          <div style={{fontWeight:700,marginBottom:12,fontSize:14}}>Continue Watching</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{onNext?.();setNextCount(null);}} style={{background:"#e50914",border:"none",color:"#fff",borderRadius:7,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>▶ Play Now</button>
            <button onClick={()=>setNextCount(null)} style={{background:"rgba(255,255,255,.08)",border:"none",color:"#aaa",borderRadius:7,padding:"8px 12px",fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── SKIP INTRO ── */}
      {phase==="playing" && showCtrl && progress>28 && progress<290 && (
        <button
          onClick={()=>{seek(90);showToast("Intro skipped");}}
          style={{
            position:"absolute",right:"clamp(16px,4vw,40px)",
            bottom:"clamp(100px,18vh,130px)",
            background:"rgba(0,0,0,.82)",backdropFilter:"blur(10px)",
            border:"1px solid rgba(255,255,255,.25)",color:"#fff",
            borderRadius:8,padding:"10px 22px",fontSize:13,fontWeight:600,
            cursor:"pointer",zIndex:40,animation:"slideUp .3s ease",
          }}
        >
          Skip Intro ❯
        </button>
      )}

      {/* ── TOP BAR ── */}
      {showCtrl && phase!=="preroll" && phase!=="midroll" && (
        <div style={{
          position:"absolute",top:0,left:0,right:0,zIndex:30,
          background:"linear-gradient(to bottom,rgba(0,0,0,.88) 0%,transparent 100%)",
          padding:"clamp(12px,2vh,18px) clamp(14px,3vw,24px)",
          display:"flex",alignItems:"center",gap:14,
          animation:"fadeIn .2s ease",
        }}>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",backdropFilter:"blur(8px)",border:"1px solid rgba(255,255,255,.12)",color:"#fff",fontSize:18,cursor:"pointer",borderRadius:9,width:38,height:38,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:"clamp(13px,2vw,16px)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{content?.title}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:2}}>
              {content?.type}{content?.release_year?` · ${content.release_year}`:""}{content?.rating?` · ${content.rating}`:""}
              {isLive&&<span style={{color:"#e50914",fontWeight:700,marginLeft:8,animation:"pulse 1.5s infinite"}}>● LIVE</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0}}>
            <button className={`ctrl-btn${inWL?" red":""}`} onClick={toggleWatchlist}>{inWL?"✓ Saved":"+ My List"}</button>
            <button className="ctrl-btn" onClick={()=>showToast("Share link copied!")}>Share</button>
            <button className="ctrl-btn" onClick={()=>showToast("Downloading...")}>⬇</button>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROLS ── */}
      {showCtrl && (phase==="playing"||phase==="ended") && (
        <div style={{
          position:"absolute",bottom:0,left:0,right:0,zIndex:30,
          background:"linear-gradient(to top,rgba(0,0,0,.95) 0%,transparent 100%)",
          padding:"0 clamp(14px,3vw,24px) clamp(14px,3vh,24px)",
          animation:"fadeIn .2s ease",
        }}>

          {/* ── PROGRESS BAR ── */}
          <div style={{marginBottom:10,position:"relative"}}>
            {/* Track bg */}
            <div style={{position:"relative",height:4,background:"rgba(255,255,255,.18)",borderRadius:2,marginBottom:4}}>
              {/* Buffered */}
              <div style={{position:"absolute",left:0,top:0,height:"100%",background:"rgba(255,255,255,.25)",borderRadius:2,width:bufPct+"%",pointerEvents:"none"}}/>
              {/* Played */}
              <div style={{position:"absolute",left:0,top:0,height:"100%",background:"#e50914",borderRadius:2,width:pct+"%",pointerEvents:"none"}}/>
              {/* Thumb */}
              <div style={{position:"absolute",top:"50%",transform:"translate(-50%,-50%)",width:14,height:14,borderRadius:"50%",background:"#e50914",left:pct+"%",pointerEvents:"none",boxShadow:"0 0 0 3px rgba(229,9,20,.3)"}}/>
            </div>
            {/* Invisible range input */}
            <input
              type="range" min={0} max={duration||100} value={progress} step={0.1}
              onChange={e=>seek(+e.target.value)}
              onMouseDown={()=>setSeeking(true)} onMouseUp={()=>setSeeking(false)}
              onTouchStart={()=>setSeeking(true)} onTouchEnd={()=>setSeeking(false)}
              style={{position:"absolute",left:0,top:-6,width:"100%",opacity:0,cursor:"pointer",height:16,zIndex:5,margin:0}}
            />
            {/* Time labels */}
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.45)"}}>
              <span>{fmt(progress)}</span>
              {isLive ? <span style={{color:"#e50914",fontWeight:700,fontSize:10,letterSpacing:1}}>● LIVE</span> : <span>-{fmt((duration||0)-progress)}</span>}
            </div>
          </div>

          {/* ── CONTROLS ROW ── */}
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>

            {/* Left group */}
            <div style={{display:"flex",alignItems:"center",gap:8,flex:1}}>
              {/* Skip back */}
              <button
                onClick={()=>skip(-10)}
                style={{background:"none",border:"none",color:"rgba(255,255,255,.8)",fontSize:"clamp(18px,3vw,22px)",cursor:"pointer",lineHeight:1,padding:4}}
              >⏮</button>

              {/* Play/Pause */}
              <button
                onClick={togglePlay}
                style={{
                  width:"clamp(44px,7vw,52px)",height:"clamp(44px,7vw,52px)",
                  borderRadius:"50%",background:"#fff",border:"none",
                  fontSize:"clamp(18px,3vw,22px)",cursor:"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  color:"#111",fontWeight:900,flexShrink:0,
                  boxShadow:"0 4px 16px rgba(0,0,0,.5)",
                }}
              >{playing?"⏸":"▶"}</button>

              {/* Skip forward */}
              <button
                onClick={()=>skip(10)}
                style={{background:"none",border:"none",color:"rgba(255,255,255,.8)",fontSize:"clamp(18px,3vw,22px)",cursor:"pointer",lineHeight:1,padding:4}}
              >⏭</button>

              {/* Volume */}
              <button onClick={toggleMute} style={{background:"none",border:"none",color:"rgba(255,255,255,.8)",fontSize:18,cursor:"pointer",padding:4,flexShrink:0}}>
                {muted||volume===0?"🔇":volume<0.5?"🔉":"🔊"}
              </button>
              <input
                type="range" min={0} max={1} step={0.02} value={muted?0:volume}
                onChange={e=>changeVol(+e.target.value)}
                style={{width:"clamp(50px,8vw,80px)",accentColor:"#fff",cursor:"pointer"}}
              />
            </div>

            {/* Right group */}
            <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0,position:"relative"}}>
              {/* Speed */}
              <div style={{position:"relative"}}>
                <button className="ctrl-btn" onClick={()=>setShowSpeed(s=>!s)}>{speed}x</button>
                {showSpeed && (
                  <div style={{position:"absolute",bottom:40,right:0,background:"#111120",border:"1px solid #1a1a2c",borderRadius:10,padding:6,minWidth:80,zIndex:100,boxShadow:"0 8px 32px rgba(0,0,0,.6)",animation:"fadeIn .15s ease"}}>
                    {[0.5,0.75,1,1.25,1.5,2].map(s=>(
                      <button key={s} onClick={()=>changeSpeed(s)} style={{display:"block",width:"100%",background:speed===s?"rgba(229,9,20,.2)":"none",border:"none",color:speed===s?"#e50914":"#aaa",padding:"8px 12px",fontSize:12,cursor:"pointer",borderRadius:6,textAlign:"center",fontWeight:speed===s?700:400,fontFamily:"'Inter',sans-serif"}}>
                        {s}x {speed===s?"✓":""}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quality */}
              <button className="ctrl-btn" onClick={()=>{const q=["Auto","4K","1080p","720p","480p"];const i=q.indexOf(quality);setQuality(q[(i+1)%q.length]);showToast(q[(i+1)%q.length]);}}>
                {quality}
              </button>

              {/* Fullscreen */}
              <button className="ctrl-btn" onClick={toggleFS}>
                {fullscreen?"⊠":"⛶"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ENDED SCREEN ── */}
      {phase==="ended" && (
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.88)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20,padding:20,animation:"fadeIn .3s ease"}}>
          <div style={{fontSize:56}}>🎬</div>
          <div style={{fontSize:"clamp(18px,4vw,22px)",fontWeight:800,textAlign:"center"}}>{content?.title}</div>
          <div style={{color:"#666",fontSize:13}}>You've finished watching</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            <button onClick={()=>{setPhase("loading");setProgress(0);setMidDone([]);setNextCount(null);initPlayer();}} style={{background:"#fff",color:"#111",border:"none",borderRadius:10,padding:"12px 24px",fontWeight:800,fontSize:14,cursor:"pointer"}}>▶ Watch Again</button>
            {onNext&&<button onClick={onNext} style={{background:"#e50914",color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Next →</button>}
            <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"12px 20px",fontSize:14,cursor:"pointer"}}>✕ Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
