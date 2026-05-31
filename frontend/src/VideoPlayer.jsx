import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import { db } from "./supabase.js";

const ADS = [
  {id:"a1", brand:"JioFiber Ultra",  tagline:"1 Gbps. No buffering.", cta:"Get Now",    emoji:"⚡", color:"#003580", duration:15, skip:5},
  {id:"a2", brand:"Zomato Pro",      tagline:"Free delivery 1000+.", cta:"Order Now",   emoji:"🍔", color:"#e23744", duration:10, skip:5},
  {id:"a3", brand:"Dream11",         tagline:"Play & Win Big.",       cta:"Play Now",   emoji:"🏆", color:"#f59e0b", duration:10, skip:5},
  {id:"a4", brand:"Swiggy",          tagline:"Food in 30 minutes.",   cta:"Order Now",  emoji:"🛵", color:"#fc8019", duration:12, skip:5},
];

export default function VideoPlayer({ content, user, onClose, onNext }) {
  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const hideTimer = useRef(null);

  const [phase,     setPhase]     = useState("loading");
  const [playing,   setPlaying]   = useState(false);
  const [progress,  setProgress]  = useState(0);
  const [duration,  setDuration]  = useState(0);
  const [volume,    setVol]       = useState(0.85);
  const [muted,     setMuted]     = useState(false);
  const [showCtrl,  setShowCtrl]  = useState(true);
  const [ad,        setAd]        = useState(null);
  const [adTime,    setAdTime]    = useState(0);
  const [adSkip,    setAdSkip]    = useState(false);
  const [midDone,   setMidDone]   = useState([]);
  const [toast,     setToast]     = useState(null);
  const [error,     setError]     = useState(null);
  const [inWL,      setInWL]      = useState(false);
  const [seeking,   setSeeking]   = useState(false);
  const [speed,     setSpeed]     = useState(1.0);
  const [fullscreen,setFullscreen]= useState(false);

  const isPremium = ["plan_premium","plan_annual","premium"].includes(user?.plan);
  const streamUrl = content?.stream_url || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  const fmt = s => {
    if (!s || isNaN(s)) return "0:00";
    const h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60);
    return h>0?`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${m}:${String(sec).padStart(2,"0")}`;
  };

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),2000); };

  const resetHide = () => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(()=>setShowCtrl(false), 4000);
  };

  useEffect(() => {
    initPlayer();
    if (user?.id && content?.id) {
      db.isInWatchlist(user.id, content.id).then(setInWL).catch(()=>{});
    }
    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      clearTimeout(hideTimer.current);
    };
  }, []);

  async function initPlayer() {
    try {
      if (!isPremium) {
        const ads = await db.getAdsForUser(user?.id, "pre_roll").catch(()=>[]);
        if (ads && ads.length > 0) {
          setAd(ads[0]);
          setAdTime(ads[0].duration || 15);
          setPhase("preroll");
          return;
        }
      }
    } catch(e) {}
    startVideo();
  }

  function startVideo() {
    setPhase("playing");
    setTimeout(() => {
      const video = videoRef.current;
      if (!video) { setTimeout(()=>loadHLS(), 500); return; }
      loadHLS(video);
    }, 100);
  }

  function loadHLS(video) {
    const v = video || videoRef.current;
    if (!v) { setError("Player not ready. Please try again."); return; }
    if (!streamUrl) { setError("No stream URL."); return; }

    try {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          v.play().catch(()=>{});
          setPlaying(true);
          resetHide();
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setError("Stream unavailable. Check URL in admin panel.");
        });
      } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = streamUrl;
        v.play().catch(()=>{});
        setPlaying(true);
        resetHide();
      } else {
        v.src = streamUrl;
        v.play().catch(()=>{});
        setPlaying(true);
        resetHide();
      }
    } catch(e) {
      setError("Playback error: " + e.message);
    }
  }

  // Video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v || phase !== "playing") return;
    const onTime  = () => {
      if (!seeking) { setProgress(v.currentTime); setDuration(v.duration||0); }
      if (!isPremium && v.duration) {
        const pct = (v.currentTime/v.duration)*100;
        [25,50,75].forEach(p => {
          if (pct>=p && !midDone.includes(p)) {
            setMidDone(d=>[...d,p]);
            v.pause();
            const a = ADS[Math.floor(Math.random()*ADS.length)];
            setAd(a); setAdTime(a.duration); setAdSkip(false); setPhase("midroll");
          }
        });
      }
      if (user?.id && content?.id && Math.floor(v.currentTime)%10===0) {
        db.saveProgress(user.id, content.id, Math.floor(v.currentTime), Math.floor(v.duration||0)).catch(()=>{});
      }
    };
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPhase("ended"); setPlaying(false); };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play",  onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play",  onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
    };
  }, [phase, seeking, midDone, isPremium]);

  // Ad countdown
  useEffect(() => {
    if (phase!=="preroll" && phase!=="midroll") return;
    if (adTime<=0) { resumeFromAd(); return; }
    const t = setInterval(()=>setAdTime(s=>{ if(s<=1){clearInterval(t);return 0;} return s-1; }), 1000);
    const sk = setTimeout(()=>setAdSkip(true), (ad?.skip||5)*1000);
    return ()=>{ clearInterval(t); clearTimeout(sk); };
  }, [phase]);

  function resumeFromAd() {
    setAd(null); setAdSkip(false);
    if (phase==="preroll") { startVideo(); }
    else { setPhase("playing"); videoRef.current?.play(); setPlaying(true); }
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); } else { v.pause(); }
    resetHide();
  }

  function seek(val) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
    setProgress(val);
  }

  function skip(s) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration||0, v.currentTime+s));
    showToast(s>0?`+${s}s`:`${s}s`);
  }

  async function toggleWatchlist() {
    if (!user?.id || !content?.id) return;
    try {
      if (inWL) { await db.removeFromWatchlist(user.id,content.id); setInWL(false); showToast("Removed"); }
      else { await db.addToWatchlist(user.id,content.id); setInWL(true); showToast("Added ✓"); }
    } catch(e) {}
  }

  const pct = duration>0 ? (progress/duration)*100 : 0;

  return (
    <div
      onMouseMove={resetHide}
      style={{position:"fixed",inset:0,zIndex:700,background:"#000",display:"flex",flexDirection:"column",userSelect:"none",fontFamily:"Inter,sans-serif"}}
    >
      {/* Real video element */}
      <video
        ref={videoRef}
        style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",display:phase==="playing"||phase==="ended"?"block":"none"}}
        playsInline
        onClick={togglePlay}
      />

      {/* Loading */}
      {phase==="loading" && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
          <div style={{fontSize:72,opacity:.3}}>{content?.type==="Live"?"🔴":"🎬"}</div>
          <div style={{width:44,height:44,border:"3px solid #222",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          <div style={{color:"#555",fontSize:13}}>Loading {content?.title}...</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        </div>
      )}

      {/* Ad */}
      {(phase==="preroll"||phase==="midroll") && ad && (
        <div style={{position:"absolute",inset:0,zIndex:50,background:`linear-gradient(135deg,${ad.color}55,#000 65%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{position:"absolute",top:16,left:16,background:"rgba(0,0,0,.7)",color:"#aaa",fontSize:10,padding:"3px 10px",borderRadius:4,letterSpacing:3,textTransform:"uppercase"}}>
            {phase==="midroll"?"Mid-roll Ad":"Advertisement"}
          </div>
          {!isPremium&&<div style={{position:"absolute",top:16,right:16,background:"rgba(229,9,20,.15)",border:"1px solid rgba(229,9,20,.3)",borderRadius:7,padding:"5px 12px",fontSize:11,color:"#e50914",fontWeight:600,cursor:"pointer"}} onClick={()=>showToast("Upgrade to remove ads!")}>👑 Go Ad-Free</div>}
          <div style={{textAlign:"center",maxWidth:460,padding:28}}>
            <div style={{fontSize:72,marginBottom:14}}>{ad.emoji}</div>
            <div style={{fontSize:30,fontWeight:900,color:"#fff",marginBottom:6}}>{ad.brand}</div>
            <div style={{color:"rgba(255,255,255,.65)",fontSize:15,marginBottom:24}}>{ad.tagline}</div>
            <button style={{background:"#fff",color:"#111",border:"none",borderRadius:8,padding:"11px 32px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{ad.cta}</button>
          </div>
          <div style={{position:"absolute",bottom:80,right:32,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
            {adSkip
              ? <button onClick={resumeFromAd} style={{background:"rgba(0,0,0,.85)",border:"1px solid rgba(255,255,255,.35)",color:"#fff",borderRadius:7,padding:"10px 18px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Skip Ad ❯</button>
              : <div style={{background:"rgba(0,0,0,.7)",color:"#888",borderRadius:6,padding:"9px 14px",fontSize:12}}>Skip in {Math.max(0,(ad.skip||5)-((ad.duration||15)-adTime))}s</div>
            }
            <div style={{width:200,height:3,background:"rgba(255,255,255,.15)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:"#fff",borderRadius:2,width:`${((ad.duration-adTime)/ad.duration)*100}%`,transition:"width 1s linear"}}/>
            </div>
            <div style={{color:"rgba(255,255,255,.4)",fontSize:11}}>Ad ends in {adTime}s</div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"rgba(0,0,0,.9)"}}>
          <div style={{fontSize:48}}>⚠️</div>
          <div style={{color:"#fff",fontSize:16,fontWeight:700,textAlign:"center",maxWidth:300}}>{error}</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setError(null);initPlayer();}} style={{background:"#e50914",color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",fontWeight:700,cursor:"pointer"}}>Retry</button>
            <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"10px 18px",cursor:"pointer"}}>Close</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position:"absolute",top:"45%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,.75)",color:"#fff",padding:"9px 18px",borderRadius:8,fontSize:14,fontWeight:600,pointerEvents:"none",zIndex:200}}>
          {toast}
        </div>
      )}

      {/* Top bar */}
      {showCtrl && phase!=="preroll" && phase!=="midroll" && (
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:30,background:"linear-gradient(to bottom,rgba(0,0,0,.88),transparent)",padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",lineHeight:1}}>←</button>
            <div>
              <div style={{fontWeight:700,fontSize:15}}>{content?.title}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>{content?.type} · {content?.release_year} · {content?.rating}
                {(content?.is_live||content?.type==="Live")&&<span style={{color:"#e50914",fontWeight:700,marginLeft:8}}>● LIVE</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <Pill active={inWL} onClick={toggleWatchlist}>{inWL?"✓ List":"+ List"}</Pill>
            <Pill onClick={()=>showToast("Downloading...")}>⬇</Pill>
            <Pill onClick={()=>showToast("Casting...")}>📺</Pill>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {showCtrl && (phase==="playing"||phase==="ended") && (
        <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:30,background:"linear-gradient(to top,rgba(0,0,0,.92),transparent)",padding:"0 18px 18px"}}>
          {/* Progress */}
          <div style={{marginBottom:6}}>
            <div style={{position:"relative",height:4,background:"rgba(255,255,255,.15)",borderRadius:2,marginBottom:4,cursor:"pointer"}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();seek(((e.clientX-r.left)/r.width)*(duration||0));}}>
              <div style={{position:"absolute",left:0,top:0,height:"100%",background:"#e50914",borderRadius:2,width:pct+"%"}}/>
            </div>
            <input type="range" min={0} max={duration||100} value={progress} step={0.1}
              onChange={e=>seek(+e.target.value)}
              onMouseDown={()=>setSeeking(true)} onMouseUp={()=>setSeeking(false)}
              style={{position:"absolute",width:"calc(100% - 36px)",opacity:0,cursor:"pointer",height:16,marginTop:-10}}
            />
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.4)"}}>
              <span>{fmt(progress)}</span>
              <span>-{fmt((duration||0)-progress)}</span>
            </div>
          </div>
          {/* Buttons */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <Pill onClick={()=>skip(-10)}>⏮10</Pill>
              <button onClick={togglePlay} style={{width:50,height:50,borderRadius:"50%",background:"#fff",border:"none",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#111",fontWeight:900,flexShrink:0}}>
                {playing?"⏸":"▶"}
              </button>
              <Pill onClick={()=>skip(10)}>10⏭</Pill>
              <button onClick={()=>{const v=videoRef.current;if(!v)return;v.muted=!v.muted;setMuted(v.muted);}} style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer"}}>
                {muted?"🔇":volume<0.5?"🔉":"🔊"}
              </button>
              <input type="range" min={0} max={1} step={0.01} value={muted?0:volume}
                onChange={e=>{const v=videoRef.current;if(v){v.volume=+e.target.value;setVol(+e.target.value);setMuted(false);}}}
                style={{width:68,accentColor:"#fff"}}
              />
            </div>
            <div style={{display:"flex",gap:6}}>
              <Pill onClick={()=>{const v=videoRef.current;const speeds=[0.5,0.75,1,1.25,1.5,2];const i=speeds.indexOf(speed);const ns=speeds[(i+1)%speeds.length];if(v)v.playbackRate=ns;setSpeed(ns);showToast(ns+"x");}}>{speed}x</Pill>
              <Pill onClick={()=>{if(!document.fullscreenElement){document.documentElement.requestFullscreen?.().then(()=>setFullscreen(true)).catch(()=>{});}else{document.exitFullscreen?.().then(()=>setFullscreen(false)).catch(()=>{});}}}>
                {fullscreen?"⊠":"⛶"}
              </Pill>
            </div>
          </div>
        </div>
      )}

      {/* Ended screen */}
      {phase==="ended" && (
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:18}}>
          <div style={{fontSize:56}}>✅</div>
          <div style={{fontSize:18,fontWeight:800}}>{content?.title}</div>
          <div style={{display:"flex",gap:12}}>
            <button onClick={()=>{setPhase("loading");setProgress(0);setMidDone([]);initPlayer();}} style={{background:"#fff",color:"#111",border:"none",borderRadius:8,padding:"11px 22px",fontWeight:800,fontSize:14,cursor:"pointer"}}>▶ Again</button>
            {onNext&&<button onClick={onNext} style={{background:"#e50914",color:"#fff",border:"none",borderRadius:8,padding:"11px 22px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Next →</button>}
            <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"11px 18px",fontSize:14,cursor:"pointer"}}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Pill({children,onClick,active}){
  return <button onClick={onClick} style={{background:active?"rgba(229,9,20,.2)":"rgba(255,255,255,.08)",border:`1px solid ${active?"#e50914":"rgba(255,255,255,.12)"}`,color:active?"#e50914":"#ccc",borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>{children}</button>;
}