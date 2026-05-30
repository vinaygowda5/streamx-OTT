import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import { db } from "./supabase.js";

const AD_DATA = [
  {id:"a1", brand:"JioFiber Ultra",  tagline:"1 Gbps. No buffering.", cta:"Get Now",    emoji:"⚡", color:"#003580", duration:15, skip:5},
  {id:"a2", brand:"Zomato Pro",       tagline:"Free delivery 1000+.",  cta:"Order Now",  emoji:"🍔", color:"#e23744", duration:10, skip:5},
  {id:"a3", brand:"Tata Nexon EV",    tagline:"Drive Electric.",        cta:"Test Drive", emoji:"🚗", color:"#1a1a2e", duration:20, skip:5},
  {id:"a4", brand:"Dream11",          tagline:"Play & Win Big.",        cta:"Play Now",   emoji:"🏆", color:"#f59e0b", duration:10, skip:5},
];

export default function VideoPlayer({ content, user, onClose, onNext }) {
  const videoRef  = useRef(null);
  const hlsRef    = useRef(null);
  const hideTimer = useRef(null);

  const [phase,       setPhase]      = useState("loading");
  const [playing,     setPlaying]    = useState(false);
  const [progress,    setProgress]   = useState(0);
  const [duration,    setDuration]   = useState(0);
  const [volume,      setVol]        = useState(0.85);
  const [muted,       setMuted]      = useState(false);
  const [buffered,    setBuffered]   = useState(0);
  const [showCtrl,    setShowCtrl]   = useState(true);
  const [quality,     setQuality]    = useState("Auto");
  const [speed,       setSpeed]      = useState(1.0);
  const [subtitles,   setSubs]       = useState(false);
  const [fullscreen,  setFullscreen] = useState(false);
  const [ad,          setAd]         = useState(null);
  const [adTime,      setAdTime]     = useState(0);
  const [adSkip,      setAdSkip]     = useState(false);
  const [midrollDone, setMidDone]    = useState([]);
  const [nextCount,   setNextCount]  = useState(null);
  const [toast,       setToast]      = useState(null);
  const [inWL,        setInWL]       = useState(false);
  const [showInfo,    setShowInfo]   = useState(false);
  const [seeking,     setSeeking]    = useState(false);
  const [hoverTime,   setHoverTime]  = useState(null);
  const [hoverX,      setHoverX]     = useState(0);
  const [audioTrack,  setAudioTrack] = useState("Hindi");
  const [showAudio,   setShowAudio]  = useState(false);
  const [showSpeed,   setShowSpeed]  = useState(false);
  const [error,       setError]      = useState(null);

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
    hideTimer.current = setTimeout(()=>setShowCtrl(false), 3500);
  };

  // Initialize HLS player
  useEffect(() => {
    initPlayer();
    checkWatchlist();
    return () => { cleanup(); };
  }, []);

  async function checkWatchlist() {
    if (user?.id && content?.id) {
      const inW = await db.isInWatchlist(user.id, content.id).catch(()=>false);
      setInWL(inW);
    }
  }

  function cleanup() {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    clearTimeout(hideTimer.current);
  }

  async function initPlayer() {
    // Show pre-roll ad first (free users only)
    if (!isPremium) {
      const randomAd = AD_DATA[Math.floor(Math.random() * AD_DATA.length)];
      setAd(randomAd);
      setAdTime(randomAd.duration);
      setPhase("preroll");
      return;
    }
    startVideo();
  }

  function startVideo() {
    setPhase("playing");
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(()=>{});
        setPlaying(true);
        resetHide();
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setError("Stream unavailable. Please try again.");
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      video.play().catch(()=>{});
      setPlaying(true);
      resetHide();
    } else {
      setError("Your browser doesn't support this stream format.");
    }
  }

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video || phase !== "playing") return;

    const onTime = () => {
      if (!seeking) {
        setProgress(video.currentTime);
        setDuration(video.duration || 0);
      }
      // Buffered
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
      // Mid-roll ads at 25%, 50%, 75%
      if (!isPremium && video.duration) {
        const pct = (video.currentTime / video.duration) * 100;
        [25, 50, 75].forEach(p => {
          if (pct >= p && !midrollDone.includes(p)) {
            setMidDone(d => [...d, p]);
            video.pause();
            const randomAd = AD_DATA[Math.floor(Math.random() * AD_DATA.length)];
            setAd(randomAd);
            setAdTime(randomAd.duration);
            setAdSkip(false);
            setPhase("midroll");
          }
        });
      }
      // Next episode countdown
      if (video.duration && video.currentTime >= video.duration * 0.95 && nextCount === null) {
        if (content?.type === "Series") setNextCount(10);
      }
      // Save progress every 10 seconds
      if (user?.id && content?.id && Math.floor(video.currentTime) % 10 === 0) {
        db.saveProgress(user.id, content.id, Math.floor(video.currentTime), Math.floor(video.duration || 0)).catch(()=>{});
      }
    };

    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => { setPhase("ended"); setPlaying(false); };
    const onError = () => setError("Playback error. Trying to recover...");

    video.addEventListener("timeupdate", onTime);
    video.addEventListener("play",        onPlay);
    video.addEventListener("pause",       onPause);
    video.addEventListener("ended",       onEnded);
    video.addEventListener("error",       onError);

    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("play",        onPlay);
      video.removeEventListener("pause",       onPause);
      video.removeEventListener("ended",       onEnded);
      video.removeEventListener("error",       onError);
    };
  }, [phase, seeking, midrollDone, isPremium, nextCount]);

  // Ad countdown
  useEffect(() => {
    if (phase !== "preroll" && phase !== "midroll") return;
    if (adTime <= 0) {
      resumeFromAd(); return;
    }
    const t = setInterval(() => {
      setAdTime(s => {
        if (s <= 1) { clearInterval(t); resumeFromAd(); return 0; }
        return s - 1;
      });
    }, 1000);
    // Show skip button after skip_after seconds
    const skipTimer = setTimeout(() => setAdSkip(true), (ad?.skip || 5) * 1000);
    return () => { clearInterval(t); clearTimeout(skipTimer); };
  }, [phase]);

  // Next episode countdown
  useEffect(() => {
    if (nextCount === null || nextCount <= 0) return;
    if (nextCount === 0) { onNext?.(); return; }
    const t = setTimeout(() => setNextCount(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [nextCount]);

  function resumeFromAd() {
    if (phase === "preroll") { startVideo(); }
    else { setPhase("playing"); videoRef.current?.play(); setPlaying(true); }
    setAd(null); setAdSkip(false);
  }

  function skipAd() {
    if (!adSkip) return;
    resumeFromAd();
    showToast("Ad skipped");
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
    resetHide();
  }

  function seek(val) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = val;
    setProgress(val);
  }

  function skip(secs) {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration||0, v.currentTime + secs));
    showToast(secs > 0 ? `+${secs}s` : `${secs}s`);
  }

  function changeVolume(val) {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVol(val);
    if (val === 0) setMuted(true); else setMuted(false);
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function changeSpeed(s) {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    showToast(`${s}x speed`);
    setShowSpeed(false);
  }

  async function toggleWatchlist() {
    if (!user?.id || !content?.id) return;
    try {
      if (inWL) {
        await db.removeFromWatchlist(user.id, content.id);
        setInWL(false); showToast("Removed from watchlist");
      } else {
        await db.addToWatchlist(user.id, content.id);
        setInWL(true); showToast("Added to watchlist ✓");
      }
    } catch (e) { showToast("Error"); }
  }

  function toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(()=>setFullscreen(true));
    } else {
      document.exitFullscreen?.().then(()=>setFullscreen(false));
    }
  }

  function handleProgressHover(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setHoverTime(pct * (duration || 0));
    setHoverX(e.clientX - rect.left);
  }

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;
  const bufferedPct  = duration > 0 ? (buffered  / duration) * 100 : 0;

  return (
    <div
      onMouseMove={resetHide}
      onClick={e => { if (e.target === e.currentTarget) togglePlay(); }}
      style={{position:"fixed",inset:0,zIndex:700,background:"#000",display:"flex",flexDirection:"column",userSelect:"none",fontFamily:"Inter,sans-serif"}}
    >
      {/* ── REAL VIDEO ELEMENT ── */}
      <video
        ref={videoRef}
        style={{
          position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"contain",
          display: phase==="playing"||phase==="ended" ? "block" : "none",
        }}
        playsInline
        onClick={togglePlay}
      />

      {/* ── LOADING ── */}
      {phase==="loading" && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20,background:`radial-gradient(ellipse at center,${RED}18,#000)`}}>
          <div style={{fontSize:80}}>{content?.type==="Live"?"🔴":"🎬"}</div>
          <div style={{width:48,height:48,border:"3px solid #333",borderTop:`3px solid ${RED}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          <div style={{color:"#888",fontSize:13}}>Loading {content?.title}...</div>
        </div>
      )}

      {/* ── PRE-ROLL / MID-ROLL AD ── */}
      {(phase==="preroll"||phase==="midroll") && ad && (
        <div style={{position:"absolute",inset:0,zIndex:50,background:`linear-gradient(135deg,${ad.color}44,#000 60%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          {/* Ad label */}
          <div style={{position:"absolute",top:20,left:20,background:"rgba(0,0,0,.7)",color:"#aaa",fontSize:10,padding:"4px 12px",borderRadius:4,letterSpacing:3,textTransform:"uppercase"}}>
            {phase==="midroll"?"Mid-roll Ad":"Advertisement"}
          </div>
          {/* Ad brand */}
          <div style={{textAlign:"center",maxWidth:500,padding:32}}>
            <div style={{fontSize:80,marginBottom:16}}>{ad.emoji}</div>
            <div style={{fontFamily:"serif",fontSize:34,fontWeight:900,color:"#fff",marginBottom:8,letterSpacing:1}}>{ad.brand}</div>
            <div style={{color:"rgba(255,255,255,.7)",fontSize:16,marginBottom:28}}>{ad.tagline}</div>
            <button style={{background:"#fff",color:"#111",border:"none",borderRadius:10,padding:"13px 36px",fontSize:14,fontWeight:700,cursor:"pointer"}}>
              {ad.cta}
            </button>
          </div>
          {/* Skip */}
          <div style={{position:"absolute",bottom:100,right:40,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:10}}>
            {adSkip
              ? <button onClick={skipAd} style={{background:"rgba(0,0,0,.8)",border:"1px solid rgba(255,255,255,.4)",color:"#fff",borderRadius:8,padding:"10px 20px",fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>Skip Ad ❯</button>
              : <div style={{background:"rgba(0,0,0,.7)",color:"#999",borderRadius:6,padding:"10px 16px",fontSize:12}}>Skip in {Math.max(0,(ad.skip||5)-((ad.duration||15)-adTime))}s</div>
            }
            <div style={{width:220,height:3,background:"rgba(255,255,255,.15)",borderRadius:2,overflow:"hidden"}}>
              <div style={{height:"100%",background:"#fff",borderRadius:2,width:`${((ad.duration-adTime)/ad.duration)*100}%`,transition:"width 1s linear"}}/>
            </div>
            <div style={{color:"rgba(255,255,255,.4)",fontSize:11}}>Ad ends in {adTime}s</div>
          </div>
          {/* Premium upsell */}
          {!isPremium && (
            <div style={{position:"absolute",top:20,right:20,background:"rgba(229,9,20,.15)",border:"1px solid rgba(229,9,20,.3)",borderRadius:8,padding:"6px 14px",fontSize:11,color:RED,fontWeight:600,cursor:"pointer"}}>
              👑 Go Ad-Free
            </div>
          )}
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,background:"rgba(0,0,0,.9)"}}>
          <div style={{fontSize:48}}>⚠️</div>
          <div style={{color:"#fff",fontSize:16,fontWeight:700}}>{error}</div>
          <button onClick={()=>{setError(null);initPlayer();}} style={{background:RED,color:"#fff",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:700,cursor:"pointer"}}>Retry</button>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{position:"absolute",top:"45%",left:"50%",transform:"translate(-50%,-50%)",background:"rgba(0,0,0,.75)",color:"#fff",padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:600,pointerEvents:"none",zIndex:200}}>
          {toast}
        </div>
      )}

      {/* ── SKIP INTRO BUTTON ── */}
      {phase==="playing" && showCtrl && progress>30 && progress<300 && (
        <button onClick={()=>{ skip(90); showToast("Intro skipped"); }} style={{position:"absolute",right:40,bottom:120,background:"rgba(0,0,0,.8)",border:"1px solid rgba(255,255,255,.3)",color:"#fff",borderRadius:8,padding:"11px 22px",fontSize:14,fontWeight:600,cursor:"pointer",backdropFilter:"blur(8px)",zIndex:50}}>
          Skip Intro ❯
        </button>
      )}

      {/* ── NEXT EPISODE ── */}
      {nextCount !== null && (
        <div style={{position:"absolute",right:40,bottom:140,background:"rgba(0,0,0,.95)",border:`1px solid ${RED}`,borderRadius:14,padding:"16px 20px",zIndex:50,minWidth:220}}>
          <div style={{fontSize:11,color:"#888",marginBottom:4}}>Next Episode in {nextCount}s</div>
          <div style={{fontWeight:700,marginBottom:12,fontSize:14}}>Continue Watching</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{onNext?.();setNextCount(null);}} style={{background:RED,border:"none",color:"#fff",borderRadius:7,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>▶ Play Next</button>
            <button onClick={()=>setNextCount(null)} style={{background:"rgba(255,255,255,.08)",border:"none",color:"#fff",borderRadius:7,padding:"8px 12px",fontSize:12,cursor:"pointer"}}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── ENDED SCREEN ── */}
      {phase==="ended" && (
        <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
          <div style={{fontSize:64}}>✅</div>
          <div style={{fontSize:20,fontWeight:800}}>{content?.title} · Finished</div>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            <button onClick={()=>{setPhase("loading");setProgress(0);setMidDone([]);setNextCount(null);initPlayer();}} style={{background:"#fff",color:"#111",border:"none",borderRadius:9,padding:"12px 24px",fontWeight:800,fontSize:14,cursor:"pointer"}}>▶ Watch Again</button>
            {onNext && <button onClick={onNext} style={{background:RED,color:"#fff",border:"none",borderRadius:9,padding:"12px 24px",fontWeight:800,fontSize:14,cursor:"pointer"}}>Next →</button>}
            <button onClick={onClose} style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,padding:"12px 20px",fontSize:14,cursor:"pointer"}}>✕ Close</button>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      {showCtrl && phase!=="preroll" && phase!=="midroll" && (
        <div style={{position:"absolute",top:0,left:0,right:0,zIndex:30,background:"linear-gradient(to bottom,rgba(0,0,0,.9),transparent)",padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer",lineHeight:1}}>←</button>
            <div>
              <div style={{fontWeight:700,fontSize:16}}>{content?.title}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>
                {content?.type} · {content?.release_year} · {content?.rating}
                {content?.type==="Live"&&<span style={{color:RED,fontWeight:700,marginLeft:8,animation:"pulse 1.5s infinite"}}>● LIVE</span>}
              </div>
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            <TopBtn active={inWL} onClick={toggleWatchlist}>{inWL?"✓":"+"} List</TopBtn>
            <TopBtn active={subtitles} onClick={()=>{setSubs(s=>!s);showToast(subtitles?"Subtitles Off":"Subtitles On");}}>CC</TopBtn>
            <TopBtn onClick={()=>setShowInfo(i=>!i)}>ⓘ</TopBtn>
            <TopBtn onClick={()=>showToast("Downloaded!")}>⬇</TopBtn>
            <TopBtn onClick={()=>showToast("Casting to TV...")}>📺</TopBtn>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROLS ── */}
      {showCtrl && (phase==="playing"||phase==="ended") && (
        <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:30,background:"linear-gradient(to top,rgba(0,0,0,.95),transparent)",padding:"0 20px 20px"}}>
          {/* Progress bar */}
          <div
            style={{position:"relative",height:20,display:"flex",alignItems:"center",marginBottom:6,cursor:"pointer"}}
            onMouseMove={handleProgressHover}
            onMouseLeave={()=>setHoverTime(null)}
          >
            {/* Hover time */}
            {hoverTime!==null && (
              <div style={{position:"absolute",bottom:24,left:Math.max(0,Math.min(hoverX-20,300)),background:"rgba(0,0,0,.85)",color:"#fff",fontSize:11,padding:"3px 8px",borderRadius:4,pointerEvents:"none",whiteSpace:"nowrap"}}>
                {fmt(hoverTime)}
              </div>
            )}
            {/* Track */}
            <div style={{position:"absolute",left:0,right:0,height:4,borderRadius:2,background:"rgba(255,255,255,.15)"}}>
              {/* Buffered */}
              <div style={{position:"absolute",left:0,height:"100%",background:"rgba(255,255,255,.25)",borderRadius:2,width:`${bufferedPct}%`}}/>
              {/* Played */}
              <div style={{position:"absolute",left:0,height:"100%",background:RED,borderRadius:2,width:`${progressPct}%`}}/>
            </div>
            <input
              type="range" min={0} max={duration||100} value={progress} step={0.1}
              onChange={e=>seek(+e.target.value)}
              onMouseDown={()=>setSeeking(true)}
              onMouseUp={()=>setSeeking(false)}
              style={{position:"absolute",left:0,right:0,width:"100%",opacity:0,cursor:"pointer",height:20,zIndex:5}}
            />
          </div>

          {/* Time */}
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:10}}>
            <span>{fmt(progress)}</span>
            <span>-{fmt((duration||0)-progress)}</span>
          </div>

          {/* Controls */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            {/* Left */}
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <CtrlBtn onClick={()=>skip(-10)}>⏮ 10</CtrlBtn>
              <button
                onClick={togglePlay}
                style={{width:52,height:52,borderRadius:"50%",background:"#fff",border:"none",fontSize:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#111",fontWeight:900,flexShrink:0}}
              >{playing?"⏸":"▶"}</button>
              <CtrlBtn onClick={()=>skip(10)}>10 ⏭</CtrlBtn>
              <button onClick={toggleMute} style={{background:"none",border:"none",color:"#fff",fontSize:18,cursor:"pointer"}}>
                {muted||volume===0?"🔇":volume<0.5?"🔉":"🔊"}
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={muted?0:volume}
                onChange={e=>changeVolume(+e.target.value)}
                style={{width:72,accentColor:"#fff"}}
              />
            </div>

            {/* Centre — Audio */}
            <div style={{position:"relative"}}>
              <button onClick={()=>setShowAudio(s=>!s)} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.15)",color:"#fff",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:500}}>
                🎙️ {audioTrack}
              </button>
              {showAudio && (
                <div style={{position:"absolute",bottom:40,left:"50%",transform:"translateX(-50%)",background:"#111120",border:"1px solid #1a1a26",borderRadius:10,padding:8,minWidth:120,zIndex:100}}>
                  {["Hindi","English","Tamil","Telugu"].map(l=>(
                    <button key={l} onClick={()=>{setAudioTrack(l);showToast(`Audio: ${l}`);setShowAudio(false);}} style={{display:"block",width:"100%",background:audioTrack===l?"rgba(229,9,20,.2)":"none",border:"none",color:audioTrack===l?RED:"#aaa",padding:"8px 12px",fontSize:12,cursor:"pointer",borderRadius:6,textAlign:"left",fontWeight:audioTrack===l?700:400}}>
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right */}
            <div style={{display:"flex",gap:6,alignItems:"center",position:"relative"}}>
              {/* Speed */}
              <div style={{position:"relative"}}>
                <CtrlBtn onClick={()=>setShowSpeed(s=>!s)}>{speed}x</CtrlBtn>
                {showSpeed && (
                  <div style={{position:"absolute",bottom:36,right:0,background:"#111120",border:"1px solid #1a1a26",borderRadius:10,padding:8,minWidth:80,zIndex:100}}>
                    {[0.5,0.75,1,1.25,1.5,2].map(s=>(
                      <button key={s} onClick={()=>changeSpeed(s)} style={{display:"block",width:"100%",background:speed===s?"rgba(229,9,20,.2)":"none",border:"none",color:speed===s?RED:"#aaa",padding:"7px 12px",fontSize:12,cursor:"pointer",borderRadius:6,textAlign:"center",fontWeight:speed===s?700:400}}>
                        {s}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <CtrlBtn onClick={()=>showToast("Quality: "+quality)}>{quality}</CtrlBtn>
              <CtrlBtn onClick={toggleFullscreen}>{fullscreen?"⊠":"⛶"}</CtrlBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── INFO PANEL ── */}
      {showInfo && (
        <div style={{position:"absolute",right:0,top:60,bottom:80,width:300,background:"rgba(7,7,12,.97)",borderLeft:"1px solid #1a1a26",padding:20,overflowY:"auto",zIndex:40}}>
          <div style={{fontWeight:700,fontSize:16,marginBottom:6}}>{content?.title}</div>
          <div style={{fontSize:12,color:"#888",marginBottom:12}}>{content?.type} · {content?.release_year} · {content?.rating}</div>
          <div style={{fontSize:13,color:"#aaa",lineHeight:1.7,marginBottom:14}}>{content?.description}</div>
          {content?.director&&<div style={{fontSize:12,color:"#555",marginBottom:4}}>Director: <span style={{color:"#888"}}>{content.director}</span></div>}
          {content?.studio&&<div style={{fontSize:12,color:"#555",marginBottom:14}}>Studio: <span style={{color:"#888"}}>{content.studio}</span></div>}
          {!isPremium && (
            <div style={{background:"rgba(229,9,20,.08)",border:"1px solid rgba(229,9,20,.2)",borderRadius:8,padding:12,marginTop:8}}>
              <div style={{fontSize:12,color:RED,fontWeight:700,marginBottom:4}}>📢 Ad-Supported</div>
              <div style={{fontSize:11,color:"#666"}}>Upgrade to Premium for ad-free viewing</div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin{to{transform:rotate(360deg);}}
        @keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
      `}</style>
    </div>
  );
}

function TopBtn({children,onClick,active}){
  return <button onClick={onClick} style={{background:active?"rgba(229,9,20,.2)":"rgba(255,255,255,.08)",border:`1px solid ${active?"#e50914":"rgba(255,255,255,.12)"}`,color:active?"#e50914":"#ccc",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>{children}</button>;
}
function CtrlBtn({children,onClick}){
  return <button onClick={onClick} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff",borderRadius:6,padding:"5px 10px",fontSize:12,cursor:"pointer",fontWeight:500,whiteSpace:"nowrap"}}>{children}</button>;
}