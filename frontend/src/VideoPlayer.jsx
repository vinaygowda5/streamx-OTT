import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import { db } from "./supabase.js";

const ADS = [
  { id:"a1", brand:"JioFiber Ultra",  tagline:"1 Gbps. Zero buffering.",     cta:"Get Now",   emoji:"⚡", color:"#003580", duration:15, skip:5 },
  { id:"a2", brand:"Zomato Pro",       tagline:"Free delivery on 1000+.",     cta:"Order Now", emoji:"🍔", color:"#cb202d", duration:10, skip:5 },
  { id:"a3", brand:"Dream11",          tagline:"Create team. Win big.",        cta:"Play Now",  emoji:"🏆", color:"#f3a700", duration:10, skip:5 },
  { id:"a4", brand:"Swiggy",           tagline:"Groceries in 10 minutes.",    cta:"Shop Now",  emoji:"🛒", color:"#fc8019", duration:12, skip:5 },
];

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  .vp * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
  @keyframes spin    { to   { transform: rotate(360deg); } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes slideUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.4; } }
  @keyframes adIn    { from { opacity:0; transform:scale(.97); } to { opacity:1; transform:scale(1); } }
  .vp-progress { -webkit-appearance:none; appearance:none; width:100%; height:4px; background:transparent; cursor:pointer; outline:none; }
  .vp-progress::-webkit-slider-thumb { -webkit-appearance:none; width:14px; height:14px; border-radius:50%; background:#e50914; box-shadow:0 0 0 3px rgba(229,9,20,.3); cursor:pointer; }
  .vp-progress::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:#e50914; border:none; cursor:pointer; }
  .vp-vol { -webkit-appearance:none; appearance:none; height:3px; background:rgba(255,255,255,.3); cursor:pointer; outline:none; border-radius:2px; }
  .vp-vol::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; border-radius:50%; background:#fff; cursor:pointer; }
  .vp-vol::-moz-range-thumb { width:12px; height:12px; border-radius:50%; background:#fff; border:none; cursor:pointer; }
  .vp-btn { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.15); color:#fff; border-radius:7px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; white-space:nowrap; transition:all .15s; }
  .vp-btn:hover { background:rgba(255,255,255,.2); }
  .vp-btn.on { background:rgba(229,9,20,.25); border-color:rgba(229,9,20,.5); color:#e50914; }
  .vp-icon { background:none; border:none; color:rgba(255,255,255,.85); cursor:pointer; padding:7px; display:flex; align-items:center; justify-content:center; border-radius:7px; transition:all .15s; }
  .vp-icon:hover { background:rgba(255,255,255,.12); color:#fff; }
  .vp-menu { position:absolute; bottom:42px; right:0; background:#111120; border:1px solid #1a1a2c; border-radius:10px; padding:6px; min-width:130px; box-shadow:0 8px 32px rgba(0,0,0,.7); animation:fadeIn .15s ease; z-index:200; }
  .vp-menu button { display:block; width:100%; background:none; border:none; color:#aaa; padding:8px 12px; font-size:12px; cursor:pointer; border-radius:7px; text-align:left; font-weight:500; transition:all .12s; }
  .vp-menu button:hover { background:rgba(255,255,255,.07); color:#fff; }
  .vp-menu button.on { background:rgba(229,9,20,.15); color:#e50914; font-weight:700; }
  .ep-item { display:flex; gap:12px; padding:12px 16px; border-bottom:1px solid #1a1a2620; cursor:pointer; transition:background .14s; }
  .ep-item:hover { background:rgba(255,255,255,.04); }
`;

export default function VideoPlayer({ content, user, onClose, onNext }) {
  const videoRef     = useRef(null);
  const hlsRef       = useRef(null);
  const containerRef = useRef(null);
  const hideTimer    = useRef(null);
  const progressRef  = useRef(null);

  const [phase,      setPhase]      = useState("loading");
  const [playing,    setPlaying]    = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [buffered,   setBuffered]   = useState(0);
  const [volume,     setVol]        = useState(0.85);
  const [muted,      setMuted]      = useState(false);
  const [showCtrl,   setShowCtrl]   = useState(true);
  const [fullscreen, setFS]         = useState(false);
  const [speed,      setSpeed]      = useState(1.0);
  const [quality,    setQuality]    = useState("Auto");
  const [audioLang,  setAudioLang]  = useState("Hindi");
  const [subtitle,   setSub]        = useState("Off");
  const [showMenu,   setShowMenu]   = useState(null);
  const [ad,         setAd]         = useState(null);
  const [adTime,     setAdTime]     = useState(0);
  const [adSkip,     setAdSkip]     = useState(false);
  const [midDone,    setMidDone]    = useState([]);
  const [nextCount,  setNextCount]  = useState(null);
  const [toast,      setToast]      = useState(null);
  const [error,      setError]      = useState(null);
  const [inWL,       setInWL]       = useState(false);
  const [liked,      setLiked]      = useState(false);
  const [seeking,    setSeeking]    = useState(false);
  const [hoverTime,  setHoverTime]  = useState(null);
  const [hoverX,     setHoverX]     = useState(0);
  const [showInfo,   setShowInfo]   = useState(false);
  const [showEp,     setShowEp]     = useState(false);
  const [episodes,   setEpisodes]   = useState([]);
  const [pip,        setPip]        = useState(false);

  const isPremium = ["plan_premium","plan_annual","premium"].includes(user?.plan);
  const isLive    = content?.is_live || content?.type === "Live";
  const isSeries  = content?.type === "Series";
  const streamUrl = content?.stream_url || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  const fmt = s => {
    if (!s||isNaN(s)) return "0:00";
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=Math.floor(s%60);
    return h>0?`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`:`${m}:${String(sec).padStart(2,"0")}`;
  };

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null), 2200); };

  const resetHide = () => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(()=>{ if(!showMenu) setShowCtrl(false); }, 4000);
  };

  useEffect(()=>{
    initPlayer();
    if(user?.id && content?.id) db.isInWatchlist(user.id,content.id).then(setInWL).catch(()=>{});
    if(isSeries) setEpisodes(Array.from({length:content?.episode_count||8},(_,i)=>({ ep:i+1, title:`Episode ${i+1}`, dur:"42 min", watched:i<2, progress:i===1?45:0 })));
    const keys = e => {
      if(e.target.tagName==="INPUT") return;
      if(e.key===" "||e.key==="k"){ e.preventDefault(); togglePlayKey(); }
      if(e.key==="ArrowRight") skipKey(10);
      if(e.key==="ArrowLeft")  skipKey(-10);
      if(e.key==="m")          toggleMuteKey();
      if(e.key==="f")          toggleFSKey();
      if(e.key==="Escape")     onClose();
    };
    window.addEventListener("keydown", keys);
    return () => { cleanup(); window.removeEventListener("keydown", keys); };
  },[]);

  function cleanup(){ if(hlsRef.current){ hlsRef.current.destroy(); hlsRef.current=null; } clearTimeout(hideTimer.current); }

  const togglePlayKey  = () => { const v=videoRef.current; if(v){ v.paused?v.play():v.pause(); } };
  const skipKey        = s  => { const v=videoRef.current; if(v) v.currentTime=Math.max(0,Math.min(v.duration||0,v.currentTime+s)); showToast(s>0?`+${s}s`:`${s}s`); };
  const toggleMuteKey  = () => { const v=videoRef.current; if(v){ v.muted=!v.muted; setMuted(v.muted); } };
  const toggleFSKey    = () => { if(!document.fullscreenElement) containerRef.current?.requestFullscreen?.().then(()=>setFS(true)).catch(()=>{}); else document.exitFullscreen?.().then(()=>setFS(false)).catch(()=>{}); };

  async function initPlayer(){
    try {
      if(!isPremium){
        const ads = await db.getAdsForUser(user?.id,"pre_roll").catch(()=>[]);
        if(ads?.length>0){ setAd(ads[0]); setAdTime(ads[0].duration||15); setPhase("preroll"); return; }
      }
    } catch(e){}
    startVideo();
  }

  function startVideo(){ setPhase("playing"); setTimeout(()=>{ const v=videoRef.current; if(!v){ setTimeout(startVideo,300); return; } loadHLS(v); },150); }

  function loadHLS(v){
    if(!streamUrl){ setError("No stream URL. Add URL in admin panel."); return; }
    try {
      if(Hls.isSupported()){
        if(hlsRef.current) hlsRef.current.destroy();
        const hls=new Hls({ enableWorker:true, lowLatencyMode:true });
        hlsRef.current=hls; hls.loadSource(streamUrl); hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED,()=>{ v.volume=volume; v.play().catch(()=>{}); setPlaying(true); resetHide(); });
        hls.on(Hls.Events.ERROR,(_,d)=>{ if(d.fatal) setError("Stream unavailable. Check URL in admin."); });
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
      if(!isPremium && v.duration){ const pct=(v.currentTime/v.duration)*100; [25,50,75].forEach(p=>{ if(pct>=p&&!midDone.includes(p)){ setMidDone(d=>[...d,p]); v.pause(); const a=ADS[Math.floor(Math.random()*ADS.length)]; setAd(a); setAdTime(a.duration); setAdSkip(false); setPhase("midroll"); } }); }
      if(v.duration && v.currentTime>=v.duration*0.94 && nextCount===null && isSeries) setNextCount(10);
      if(user?.id && content?.id && Math.floor(v.currentTime)%10===0) db.saveProgress(user.id,content.id,Math.floor(v.currentTime),Math.floor(v.duration||0)).catch(()=>{});
    };
    v.addEventListener("timeupdate",onTime);
    v.addEventListener("play",()=>setPlaying(true));
    v.addEventListener("pause",()=>setPlaying(false));
    v.addEventListener("ended",()=>{ setPhase("ended"); setPlaying(false); });
    return()=>{ v.removeEventListener("timeupdate",onTime); v.removeEventListener("play",()=>{}); v.removeEventListener("pause",()=>{}); v.removeEventListener("ended",()=>{}); };
  },[phase,seeking,midDone,isPremium,nextCount,isSeries]);

  useEffect(()=>{
    if(phase!=="preroll"&&phase!=="midroll") return;
    if(adTime<=0){ resumeAd(); return; }
    const t=setInterval(()=>setAdTime(s=>{ if(s<=1){clearInterval(t);return 0;} return s-1; }),1000);
    const sk=setTimeout(()=>setAdSkip(true),(ad?.skip||5)*1000);
    return()=>{ clearInterval(t); clearTimeout(sk); };
  },[phase]);

  useEffect(()=>{
    if(nextCount===null||nextCount<0) return;
    if(nextCount===0){ onNext?.(); return; }
    const t=setTimeout(()=>setNextCount(n=>n-1),1000);
    return()=>clearTimeout(t);
  },[nextCount]);

  function resumeAd(){ setAd(null); setAdSkip(false); if(phase==="preroll") startVideo(); else { setPhase("playing"); videoRef.current?.play(); setPlaying(true); } }

  function togglePlay(){ const v=videoRef.current; if(!v) return; v.paused?v.play():v.pause(); resetHide(); }
  function seekTo(val){ const v=videoRef.current; if(!v) return; v.currentTime=Math.max(0,Math.min(v.duration||0,val)); setProgress(v.currentTime); }
  function skip(s){ seekTo(progress+s); showToast(s>0?`+${s}s`:`${s}s`); }
  function toggleMute(){ const v=videoRef.current; if(!v) return; v.muted=!v.muted; setMuted(v.muted); }
  function changeVol(val){ const v=videoRef.current; if(!v) return; v.volume=val; setVol(val); setMuted(val===0); }
  function changeSpeed(s){ const v=videoRef.current; if(v) v.playbackRate=s; setSpeed(s); setShowMenu(null); showToast(s+"x speed"); }
  function toggleFS(){ !document.fullscreenElement ? containerRef.current?.requestFullscreen?.().then(()=>setFS(true)).catch(()=>{}) : document.exitFullscreen?.().then(()=>setFS(false)).catch(()=>{}); }
  async function toggleWL(){ if(!user?.id||!content?.id) return; try { if(inWL){ await db.removeFromWatchlist(user.id,content.id); setInWL(false); showToast("Removed from list"); } else { await db.addToWatchlist(user.id,content.id); setInWL(true); showToast("Added to My List ✓"); } } catch(e){} }
  async function togglePiP(){ const v=videoRef.current; if(!v) return; try { document.pictureInPictureElement ? await document.exitPictureInPicture() : await v.requestPictureInPicture(); setPip(p=>!p); } catch(e){ showToast("PiP not supported on this browser"); } }

  const pct    = duration>0?(progress/duration)*100:0;
  const bufPct = duration>0?(buffered/duration)*100:0;
  const subText = subtitle!=="Off" && progress>5 && progress<12 ? "Initializing quantum interface..." : subtitle!=="Off" && progress>18 && progress<25 ? "We need to move. Now." : null;

  return (
    <div ref={containerRef} className="vp" onMouseMove={resetHide} onTouchStart={resetHide}
      style={{position:"fixed",inset:0,zIndex:700,background:"#000",display:"flex",flexDirection:"column",userSelect:"none"}}>
      <style>{CSS}</style>

      {/* VIDEO */}
      <video ref={videoRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain",display:phase==="playing"||phase==="ended"?"block":"none"}} playsInline onClick={togglePlay}/>

      {/* LOADING */}
      {phase==="loading" && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20,background:"radial-gradient(ellipse at center,#120810,#000)"}}>
          <div style={{fontSize:"clamp(60px,12vw,96px)",opacity:.1}}>{isLive?"🔴":"🎬"}</div>
          <div style={{width:48,height:48,border:"3px solid #222",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          <div style={{color:"#555",fontSize:14,fontWeight:500}}>{content?.title||"Loading..."}</div>
        </div>
      )}

      {/* AD */}
      {(phase==="preroll"||phase==="midroll") && ad && (
        <div style={{position:"absolute",inset:0,zIndex:60,background:`linear-gradient(155deg,${ad.color}77,#000 55%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",animation:"adIn .4s ease"}}>
          <div style={{position:"absolute",top:20,left:20,background:"rgba(0,0,0,.65)",backdropFilter:"blur(8px)",color:"#999",fontSize:10,padding:"4px 12px",borderRadius:20,letterSpacing:3,textTransform:"uppercase",border:"1px solid rgba(255,255,255,.08)"}}>
            {phase==="midroll"?"Mid-roll":"Pre-roll"} · Ad
          </div>
          {!isPremium && <div onClick={()=>showToast("Upgrade to Premium for ad-free!")} style={{position:"absolute",top:18,right:20,background:"rgba(229,9,20,.12)",border:"1px solid rgba(229,9,20,.3)",borderRadius:20,padding:"5px 14px",fontSize:11,color:"#e50914",fontWeight:700,cursor:"pointer"}}>👑 Go Ad-Free</div>}
          <div style={{textAlign:"center",padding:"20px 24px",maxWidth:500,animation:"slideUp .5s ease"}}>
            <div style={{width:96,height:96,borderRadius:"50%",background:`radial-gradient(circle,${ad.color}55,${ad.color}11)`,border:`2px solid ${ad.color}66`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:48,margin:"0 auto 18px"}}>{ad.emoji}</div>
            <div style={{fontSize:"clamp(22px,5vw,32px)",fontWeight:900,color:"#fff",marginBottom:6}}>{ad.brand}</div>
            <div style={{color:"rgba(255,255,255,.6)",fontSize:"clamp(13px,2.5vw,15px)",marginBottom:24,lineHeight:1.5}}>{ad.tagline}</div>
            <button style={{background:`linear-gradient(135deg,${ad.color},${ad.color}cc)`,border:"none",color:"#fff",borderRadius:10,padding:"12px 36px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{ad.cta}</button>
          </div>
          <div style={{position:"absolute",bottom:"clamp(70px,13vh,100px)",right:"clamp(16px,4vw,40px)",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
            {adSkip
              ? <button onClick={resumeAd} style={{background:"rgba(0,0,0,.88)",backdropFilter:"blur(12px)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:8,padding:"11px 20px",fontSize:13,fontWeight:700,cursor:"pointer",animation:"fadeIn .3s ease"}}>Skip Ad ❯</button>
              : <div style={{background:"rgba(0,0,0,.75)",color:"#777",borderRadius:8,padding:"9px 16px",fontSize:12,border:"1px solid rgba(255,255,255,.08)"}}>Skip in {Math.max(0,(ad.skip||5)-((ad.duration||15)-adTime))}s</div>
            }
            <div style={{width:180,height:3,background:"rgba(255,255,255,.12)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:"rgba(255,255,255,.55)",borderRadius:2,width:`${((ad.duration-adTime)/ad.duration)*100}%`,transition:"width 1s linear"}}/>
            </div>
            <div style={{color:"rgba(255,255,255,.3)",fontSize:11}}>Ad ends in {adTime}s</div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"rgba(0,0,0,.94)",padding:20,zIndex:80}}>
          <div style={{fontSize:52}}>⚠️</div>
          <div style={{color:"#fff",fontSize:16,fontWeight:700,textAlign:"center",maxWidth:320,lineHeight:1.5}}>{error}</div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={()=>{setError(null);initPlayer();}} className="vp-btn" style={{background:"#e50914",border:"none"}}>↺ Retry</button>
            <button onClick={onClose} className="vp-btn">✕ Close</button>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div style={{position:"absolute",top:"46%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,.78)",backdropFilter:"blur(12px)",color:"#fff",padding:"9px 20px",borderRadius:8,fontSize:14,fontWeight:600,pointerEvents:"none",zIndex:200,animation:"fadeIn .18s ease",whiteSpace:"nowrap"}}>{toast}</div>}

      {/* SUBTITLE */}
      {subText && <div style={{position:"absolute",bottom:"clamp(80px,12vh,110px)",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,.82)",color:"#fff",padding:"6px 20px",borderRadius:6,fontSize:"clamp(14px,2.5vw,17px)",fontWeight:500,textAlign:"center",pointerEvents:"none",zIndex:25,maxWidth:"80%"}}>{subText}</div>}

      {/* NEXT EP */}
      {nextCount!==null && (
        <div style={{position:"absolute",right:"clamp(16px,4vw,40px)",bottom:"clamp(110px,18vh,140px)",background:"rgba(0,0,0,.94)",border:"1px solid #e50914",borderRadius:14,padding:"16px 20px",zIndex:50,animation:"slideUp .3s ease",minWidth:220}}>
          <div style={{fontSize:11,color:"#777",marginBottom:4}}>Next Episode in {nextCount}s</div>
          <div style={{fontWeight:700,marginBottom:12,fontSize:14}}>Continue Watching</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{onNext?.();setNextCount(null);}} style={{background:"#e50914",border:"none",color:"#fff",borderRadius:7,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>▶ Play Next</button>
            <button onClick={()=>setNextCount(null)} style={{background:"rgba(255,255,255,.08)",border:"none",color:"#aaa",borderRadius:7,padding:"8px 12px",fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* SKIP INTRO */}
      {phase==="playing" && showCtrl && progress>28 && progress<290 && (
        <button onClick={()=>{skip(90-progress+28);showToast("Intro skipped");}} style={{position:"absolute",right:"clamp(16px,4vw,40px)",bottom:"clamp(110px,18vh,130px)",background:"rgba(0,0,0,.85)",backdropFilter:"blur(10px)",border:"1px solid rgba(255,255,255,.25)",color:"#fff",borderRadius:8,padding:"10px 22px",fontSize:13,fontWeight:600,cursor:"pointer",zIndex:40,animation:"slideUp .3s ease"}}>
          Skip Intro ❯
        </button>
      )}

      {/* EPISODES PANEL */}
      {showEp && isSeries && (
        <div style={{position:"absolute",right:0,top:60,bottom:80,width:"clamp(260px,35vw,320px)",background:"rgba(7,7,12,.97)",borderLeft:"1px solid #1a1a26",overflowY:"auto",zIndex:60,animation:"fadeIn .2s ease"}}>
          <div style={{padding:"14px 16px",borderBottom:"1px solid #1a1a26",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontWeight:700,fontSize:14}}>Episodes</div>
            <button onClick={()=>setShowEp(false)} className="vp-icon">✕</button>
          </div>
          {episodes.map(ep=>(
            <div key={ep.ep} className="ep-item" onClick={()=>{showToast(`Playing E${ep.ep}`);setShowEp(false);}}>
              <div style={{width:70,height:44,borderRadius:7,background:"linear-gradient(135deg,#e5091422,#0a0a0f)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,position:"relative"}}>
                🎬
                {ep.progress>0 && <div style={{position:"absolute",bottom:0,left:0,right:0,height:2,background:"#1a1a26",borderRadius:"0 0 7px 7px",overflow:"hidden"}}><div style={{height:"100%",width:`${ep.progress}%`,background:"#e50914"}}/></div>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:12,color:"#e0e0ee"}}>E{ep.ep} · {ep.title}</div>
                <div style={{fontSize:11,color:"#555",marginTop:2}}>{ep.dur}</div>
                {ep.progress>0 && <div style={{fontSize:10,color:"#e50914",marginTop:2}}>{ep.progress}% watched</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INFO PANEL */}
      {showInfo && (
        <div style={{position:"absolute",right:showEp?"clamp(260px,35vw,320px)":0,top:60,bottom:80,width:"clamp(240px,30vw,290px)",background:"rgba(7,7,12,.97)",borderLeft:"1px solid #1a1a26",padding:18,overflowY:"auto",zIndex:55,animation:"fadeIn .2s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
            <div style={{fontWeight:700,fontSize:14}}>About</div>
            <button onClick={()=>setShowInfo(false)} className="vp-icon" style={{fontSize:18}}>✕</button>
          </div>
          <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{content?.title}</div>
          <div style={{fontSize:11,color:"#666",marginBottom:10}}>{content?.type} · {content?.release_year} · {content?.rating}</div>
          <div style={{fontSize:13,color:"#aaa",lineHeight:1.7,marginBottom:14}}>{content?.description}</div>
          {content?.director && <div style={{fontSize:12,color:"#555",marginBottom:4}}>Director: <span style={{color:"#888"}}>{content.director}</span></div>}
          {!isPremium && <div style={{background:"rgba(229,9,20,.08)",border:"1px solid rgba(229,9,20,.2)",borderRadius:8,padding:12,marginTop:8}}><div style={{fontSize:12,color:"#e50914",fontWeight:700,marginBottom:4}}>📢 Ad-Supported</div><div style={{fontSize:11,color:"#666"}}>Upgrade to Premium for ad-free 4K.</div></div>}
        </div>
      )}

      {/* TOP BAR */}
      {showCtrl && phase!=="preroll" && phase!=="midroll" && (
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:30,background:"linear-gradient(to bottom,rgba(0,0,0,.92),transparent)",padding:"clamp(12px,2.5vh,18px) clamp(14px,3vw,22px)",display:"flex",alignItems:"center",gap:12,animation:"fadeIn .2s ease"}}>
          <button onClick={onClose} className="vp-icon" style={{width:38,height:38,borderRadius:9,background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.14)",flexShrink:0,fontSize:18}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:"clamp(13px,2.5vw,16px)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{content?.title}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:1}}>
              {content?.type}{content?.release_year?` · ${content.release_year}`:""}{content?.rating?` · ${content.rating}`:""}
              {isLive && <span style={{color:"#e50914",fontWeight:700,marginLeft:8,animation:"pulse 1.5s infinite"}}>● LIVE</span>}
            </div>
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <button onClick={toggleWL}           className={`vp-btn${inWL?" on":""}`}>{inWL?"✓ Saved":"+ My List"}</button>
            <button onClick={()=>{setLiked(l=>!l);showToast(liked?"Unliked":"Liked ❤️");}} className={`vp-btn${liked?" on":""}`}>{liked?"❤️":"🤍"}</button>
            <button onClick={()=>{navigator.clipboard?.writeText(window.location.href).catch(()=>{});showToast("Link copied!");}} className="vp-btn">↗ Share</button>
            {isSeries && <button onClick={()=>setShowEp(s=>!s)} className={`vp-btn${showEp?" on":""}`}>≡ Eps</button>}
            <button onClick={()=>setShowInfo(s=>!s)} className={`vp-btn${showInfo?" on":""}`}>ⓘ Info</button>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS */}
      {showCtrl && (phase==="playing"||phase==="ended") && (
        <div style={{position:"absolute",bottom:0,left:0,right:showEp||showInfo?"clamp(240px,30vw,320px)":0,zIndex:30,background:"linear-gradient(to top,rgba(0,0,0,.96),rgba(0,0,0,.5) 70%,transparent)",padding:"0 clamp(14px,3vw,22px) clamp(14px,3vh,22px)",animation:"fadeIn .2s ease"}}>

          {/* Progress track */}
          <div style={{marginBottom:8,position:"relative"}}
            onMouseMove={e=>{ const r=e.currentTarget.getBoundingClientRect(); setHoverTime(((e.clientX-r.left)/r.width)*(duration||0)); setHoverX(e.clientX-r.left); }}
            onMouseLeave={()=>setHoverTime(null)}
          >
            {hoverTime!==null && <div style={{position:"absolute",bottom:28,left:Math.max(20,Math.min(hoverX-20,300)),background:"rgba(0,0,0,.9)",color:"#fff",fontSize:11,padding:"3px 8px",borderRadius:5,pointerEvents:"none",whiteSpace:"nowrap",zIndex:10}}>{fmt(hoverTime)}</div>}
            <div style={{position:"relative",height:5,background:"rgba(255,255,255,.18)",borderRadius:3}}>
              <div style={{position:"absolute",left:0,top:0,height:"100%",background:"rgba(255,255,255,.25)",borderRadius:3,width:bufPct+"%"}}/>
              <div style={{position:"absolute",left:0,top:0,height:"100%",background:"#e50914",borderRadius:3,width:pct+"%"}}/>
              <div style={{position:"absolute",top:"50%",transform:"translate(-50%,-50%)",width:14,height:14,borderRadius:"50%",background:"#e50914",left:pct+"%",boxShadow:"0 0 0 3px rgba(229,9,20,.3)"}}/>
            </div>
            <input ref={progressRef} type="range" className="vp-progress" min={0} max={duration||100} value={progress} step={0.1}
              onChange={e=>seekTo(+e.target.value)} onMouseDown={()=>setSeeking(true)} onMouseUp={()=>setSeeking(false)} onTouchStart={()=>setSeeking(true)} onTouchEnd={()=>setSeeking(false)}
              style={{position:"absolute",left:0,top:-4,width:"100%",opacity:0,cursor:"pointer",height:14,zIndex:5,margin:0}}
            />
          </div>

          {/* Time labels */}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"rgba(255,255,255,.45)",marginBottom:10}}>
            <span>{fmt(progress)}</span>
            {isLive ? <span style={{color:"#e50914",fontWeight:800,fontSize:11,letterSpacing:1}}>⬤ LIVE</span> : <span>-{fmt((duration||0)-progress)}</span>}
          </div>

          {/* Controls row */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {/* Left */}
            <div style={{display:"flex",alignItems:"center",gap:6,flex:1}}>
              <button onClick={()=>skip(-10)} className="vp-icon" style={{fontSize:"clamp(16px,3vw,20px)"}}>⏮</button>
              <button onClick={togglePlay} style={{width:"clamp(44px,7vw,52px)",height:"clamp(44px,7vw,52px)",borderRadius:"50%",background:"#fff",border:"none",fontSize:"clamp(18px,3vw,22px)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#111",fontWeight:900,flexShrink:0,boxShadow:"0 4px 16px rgba(0,0,0,.5)"}}>
                {playing?"⏸":"▶"}
              </button>
              <button onClick={()=>skip(10)} className="vp-icon" style={{fontSize:"clamp(16px,3vw,20px)"}}>⏭</button>
              <button onClick={toggleMute} className="vp-icon" style={{fontSize:18}}>{muted||volume===0?"🔇":volume<0.5?"🔉":"🔊"}</button>
              <input type="range" className="vp-vol" min={0} max={1} step={0.02} value={muted?0:volume} onChange={e=>changeVol(+e.target.value)} style={{width:"clamp(50px,8vw,80px)",cursor:"pointer"}}/>
              <span style={{fontSize:11,color:"rgba(255,255,255,.4)",minWidth:28}}>{Math.round((muted?0:volume)*100)}%</span>
            </div>

            {/* Right */}
            <div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0,position:"relative"}}>
              {/* Speed */}
              <div style={{position:"relative"}}>
                <button onClick={()=>setShowMenu(m=>m==="speed"?null:"speed")} className={`vp-btn${showMenu==="speed"?" on":""}`}>{speed}x</button>
                {showMenu==="speed" && <div className="vp-menu">{[0.5,0.75,1,1.25,1.5,2].map(s=><button key={s} onClick={()=>changeSpeed(s)} className={speed===s?"on":""}>{s}x {speed===s?"✓":""}</button>)}</div>}
              </div>
              {/* Audio */}
              <div style={{position:"relative"}}>
                <button onClick={()=>setShowMenu(m=>m==="audio"?null:"audio")} className={`vp-btn${showMenu==="audio"?" on":""}`}>🎙️ {audioLang}</button>
                {showMenu==="audio" && <div className="vp-menu">{["Hindi","English","Kannada","Tamil","Telugu","Bengali","Malayalam","Punjabi","Marathi"].map(l=><button key={l} onClick={()=>{setAudioLang(l);setShowMenu(null);showToast("Audio: "+l);}} className={audioLang===l?"on":""}>{l} {audioLang===l?"✓":""}</button>)}</div>}
              </div>
              {/* Subtitles */}
              <div style={{position:"relative"}}>
                <button onClick={()=>setShowMenu(m=>m==="sub"?null:"sub")} className={`vp-btn${subtitle!=="Off"?" on":""}`}>CC</button>
                {showMenu==="sub" && <div className="vp-menu">{["Off","English","Hindi","Kannada","Tamil","Telugu"].map(s=><button key={s} onClick={()=>{setSub(s);setShowMenu(null);showToast("Subtitle: "+s);}} className={subtitle===s?"on":""}>{s} {subtitle===s?"✓":""}</button>)}</div>}
              </div>
              {/* Quality */}
              <div style={{position:"relative"}}>
                <button onClick={()=>setShowMenu(m=>m==="quality"?null:"quality")} className={`vp-btn${showMenu==="quality"?" on":""}`}>{quality}</button>
                {showMenu==="quality" && <div className="vp-menu">{["Auto","4K","1080p","720p","480p","360p"].map(q=><button key={q} onClick={()=>{setQuality(q);setShowMenu(null);showToast("Quality: "+q);}} className={quality===q?"on":""}>{q} {quality===q?"✓":""}</button>)}</div>}
              </div>
              <button onClick={togglePiP} className={`vp-btn${pip?" on":""}`} title="Picture-in-Picture">⧉</button>
              <button onClick={()=>showToast("Downloading...")} className="vp-btn">⬇</button>
              <button onClick={()=>showToast("Casting...")} className="vp-btn">📺</button>
              <button onClick={toggleFS} className="vp-btn">{fullscreen?"⊡":"⛶"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ENDED */}
      {phase==="ended" && (
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.88)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:18,padding:20,animation:"fadeIn .3s ease",zIndex:70}}>
          <div style={{fontSize:52}}>🎬</div>
          <div style={{fontSize:"clamp(16px,4vw,20px)",fontWeight:800,textAlign:"center"}}>{content?.title}</div>
          <div style={{color:"#555",fontSize:13}}>You finished watching</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            <button onClick={()=>{setPhase("loading");setProgress(0);setMidDone([]);setNextCount(null);initPlayer();}} style={{background:"#fff",color:"#111",border:"none",borderRadius:10,padding:"12px 24px",fontWeight:800,fontSize:14,cursor:"pointer"}}>▶ Watch Again</button>
            {onNext && <button onClick={onNext} style={{background:"#e50914",color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Next →</button>}
            <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.15)",borderRadius:10,padding:"12px 20px",fontSize:14,cursor:"pointer"}}>✕ Close</button>
          </div>
        </div>
      )}

      {showMenu && <div style={{position:"absolute",inset:0,zIndex:29}} onClick={()=>setShowMenu(null)}/>}
    </div>
  );
}
