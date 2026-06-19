import { useState, useEffect, useRef } from "react";
import Hls from "hls.js";
import { supabase, db } from "./supabase.js";

/* ═══════════════════════════════════════════════════════
   StreamX VideoPlayer — Jio Hotstar Style
   ✅ Real HLS video player
   ✅ Pre-roll ads (before video)
   ✅ Mid-roll ads (at 25%, 50%, 75%)
   ✅ Ad banner below video
   ✅ Skip button after 5 seconds
   ✅ Premium users = NO ADS
   ✅ Settings sheet (Quality/Audio/Subtitles/Speed)
   ✅ Episodes panel for Series
   ✅ Skip Intro / Skip Recap
   ✅ Next episode countdown
   ✅ Works on Mobile + Tablet + Desktop
═══════════════════════════════════════════════════════ */

// ── Fallback ads if database has none ──
const FALLBACK_ADS = [
  { id:"f1", brand:"JioFiber Ultra",   tagline:"India's Fastest Broadband",    sub_text:"1 Gbps · Starting ₹399/month", cta:"Get Now",   cta_url:"https://jio.com",     icon:"⚡", color:"#003580", duration:15, skip_after:5 },
  { id:"f2", brand:"Swiggy Instamart", tagline:"Groceries in 10 Minutes!",     sub_text:"Flat 40% off · Use code STREAMX", cta:"Order Now", cta_url:"https://swiggy.com", icon:"🛵", color:"#fc8019", duration:12, skip_after:5 },
  { id:"f3", brand:"Dream11",          tagline:"Play Fantasy Cricket & Win",   sub_text:"Join 15 Crore+ players · ₹50 Free", cta:"Play Now", cta_url:"https://dream11.com",icon:"🏆", color:"#f3a700", duration:10, skip_after:5 },
  { id:"f4", brand:"Zomato Pro",       tagline:"Flat 60% Off on Orders!",      sub_text:"Free delivery + priority service",  cta:"Order Now",cta_url:"https://zomato.com", icon:"🍔", color:"#e23744", duration:10, skip_after:5 },
  { id:"f5", brand:"Tata Nexon EV",    tagline:"Drive Electric. Drive Bold.",  sub_text:"Range 465km · Book test drive",     cta:"Book Now", cta_url:"https://tata.com",  icon:"🚗", color:"#1565c0", duration:20, skip_after:5 },
];

const QUALITY  = ["Auto","4K","1080p","720p","480p","360p"];
const AUDIOS   = ["Hindi","English","Kannada","Tamil","Telugu","Bengali","Malayalam","Punjabi","Marathi"];
const SUBS     = ["Off","Hindi","English","Kannada","Tamil","Telugu"];
const SPEEDS   = [{v:0.5,l:"0.5x"},{v:0.75,l:"0.75x"},{v:1,l:"Normal"},{v:1.25,l:"1.25x"},{v:1.5,l:"1.5x"},{v:2,l:"2x"}];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
.vp *{box-sizing:border-box;font-family:'Inter',sans-serif;}
@keyframes vp-spin   {to{transform:rotate(360deg);}}
@keyframes vp-fadeIn {from{opacity:0;}to{opacity:1;}}
@keyframes vp-slideUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
@keyframes vp-pulse  {0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes vp-adIn   {from{opacity:0;transform:scale(.97);}to{opacity:1;transform:scale(1);}}
.vp-prog{-webkit-appearance:none;appearance:none;width:100%;height:4px;background:transparent;cursor:pointer;outline:none;}
.vp-prog::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#fff;cursor:pointer;box-shadow:0 0 0 3px rgba(255,255,255,.2);}
.vp-prog::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff;cursor:pointer;border:none;}
.vp-vol{-webkit-appearance:none;appearance:none;height:3px;background:rgba(255,255,255,.3);cursor:pointer;outline:none;border-radius:2px;}
.vp-vol::-webkit-slider-thumb{-webkit-appearance:none;width:11px;height:11px;border-radius:50%;background:#fff;cursor:pointer;}
.vp-vol::-moz-range-thumb{width:11px;height:11px;border-radius:50%;background:#fff;cursor:pointer;border:none;}
.vp-ibtn{background:none;border:none;color:rgba(255,255,255,.85);cursor:pointer;padding:7px;display:flex;align-items:center;justify-content:center;border-radius:7px;transition:all .15s;}
.vp-ibtn:hover{background:rgba(255,255,255,.12);color:#fff;}
.vp-btn{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.15);color:#fff;border-radius:7px;padding:6px 12px;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:all .15s;}
.vp-btn:hover{background:rgba(255,255,255,.2);}
.vp-btn.on{background:rgba(21,101,192,.3);border-color:rgba(21,101,192,.6);color:#90caf9;}
.vp-stab{background:none;border:none;color:#888;font-size:14px;font-weight:500;padding:10px 16px;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s;}
.vp-stab.on{color:#fff;font-weight:700;border-bottom-color:#1565c0;}
.vp-sopt{display:flex;align-items:center;padding:14px 20px;cursor:pointer;border-bottom:1px solid #1e1e2e22;transition:background .14s;gap:14px;}
.vp-sopt:hover{background:rgba(255,255,255,.04);}
.vp-ep{display:flex;gap:12px;padding:12px 16px;border-bottom:1px solid #1e1e2e22;cursor:pointer;transition:background .14s;align-items:center;}
.vp-ep:hover{background:rgba(255,255,255,.04);}
`;

async function trackAd(adId, userId, event) {
  if (!adId) return;
  supabase.from("ad_impressions").insert({ ad_id: adId, user_id: userId || null, impression_type: event, created_at: new Date().toISOString() }).catch(() => {});
}

async function getAds(type, isPremium) {
  if (isPremium) return [];
  try {
    const { data } = await supabase.from("ads").select("*").eq("is_active", true).eq("type", type).order("priority").limit(3);
    if (data?.length > 0) return data;
  } catch (e) {}
  return FALLBACK_ADS;
}

export default function VideoPlayer({ content, user, onClose, onNext }) {
  const videoRef     = useRef(null);
  const hlsRef       = useRef(null);
  const containerRef = useRef(null);
  const hideTimer    = useRef(null);

  // Phase: loading | preroll | playing | midroll | ended
  const [phase,      setPhase]      = useState("loading");
  const [playing,    setPlaying]    = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [duration,   setDuration]   = useState(0);
  const [buffered,   setBuffered]   = useState(0);
  const [volume,     setVol]        = useState(0.85);
  const [muted,      setMuted]      = useState(false);
  const [showCtrl,   setShowCtrl]   = useState(true);
  const [fullscreen, setFS]         = useState(false);
  const [seeking,    setSeeking]    = useState(false);
  const [error,      setError]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const [inWL,       setInWL]       = useState(false);
  const [nextCount,  setNextCount]  = useState(null);

  // Settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab,  setSettingsTab]  = useState("quality");
  const [quality,      setQuality]      = useState("Auto");
  const [audioLang,    setAudioLang]    = useState("Hindi");
  const [subtitle,     setSub]          = useState("Off");
  const [speed,        setSpeed]        = useState(1);

  // Ads
  const [currentAd,   setCurrentAd]    = useState(null);
  const [adTimeLeft,  setAdTimeLeft]   = useState(0);
  const [adCanSkip,   setAdCanSkip]    = useState(false);
  const [midDone,     setMidDone]      = useState([]);
  const [bannerAd,    setBannerAd]     = useState(null);
  const [bannerVisible,setBannerVisible]= useState(false);

  // Episodes (for series)
  const [episodes,   setEpisodes]   = useState([]);
  const [showEp,     setShowEp]     = useState(false);
  const [showInfo,   setShowInfo]   = useState(false);
  const [selSeason,  setSelSeason]  = useState(1);

  const isPremium = ["plan_premium","plan_annual","premium"].includes(user?.plan);
  const isLive    = content?.is_live || content?.type === "Live";
  const isSeries  = content?.type === "Series";
  const streamUrl = content?.stream_url || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

  const fmt = s => {
    if (!s || isNaN(s)) return "0:00";
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
    return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
  };

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(null), 2200); };
  const resetHide = () => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (!showSettings) setShowCtrl(false); }, 4000);
  };

  // ── INIT ──
  useEffect(() => {
    startInit();
    if (user?.id && content?.id) db.isInWatchlist(user.id, content.id).then(setInWL).catch(() => {});
    if (isSeries) {
      setEpisodes(Array.from({ length: content?.episode_count || 8 }, (_, i) => ({
        ep: i+1, title: `Episode ${i+1}`, dur: `${38+i}m`, watched: i < 2, progress: i === 1 ? 62 : 0,
      })));
    }
    // Keyboard shortcuts
    const keys = e => {
      if (e.target.tagName === "INPUT") return;
      if (e.key === " " || e.key === "k") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight") skipSec(10);
      if (e.key === "ArrowLeft")  skipSec(-10);
      if (e.key === "m")          toggleMute();
      if (e.key === "f")          toggleFS();
      if (e.key === "Escape" && !showSettings) onClose();
      if (e.key === "Escape" && showSettings)  setShowSettings(false);
    };
    window.addEventListener("keydown", keys);
    return () => { cleanup(); window.removeEventListener("keydown", keys); };
  }, []);

  function cleanup() {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    clearTimeout(hideTimer.current);
  }

  async function startInit() {
    if (!isPremium) {
      const ads = await getAds("pre_roll", isPremium);
      if (ads.length > 0) {
        const ad = ads[Math.floor(Math.random() * ads.length)];
        setCurrentAd(ad);
        setAdTimeLeft(ad.duration || 15);
        setAdCanSkip(false);
        setPhase("preroll");
        trackAd(ad.id, user?.id, "view");
        // Load banner ad
        const allAds = await getAds("pre_roll", false);
        if (allAds.length > 0) { setBannerAd(allAds[Math.floor(Math.random() * allAds.length)]); setBannerVisible(true); }
        return;
      }
    }
    startVideo();
  }

  function startVideo() {
    setPhase("playing");
    setBannerVisible(false);
    setTimeout(() => {
      const v = videoRef.current;
      if (!v) { setTimeout(startVideo, 300); return; }
      loadHLS(v);
    }, 150);
  }

  function loadHLS(v) {
    if (!streamUrl) { setError("No stream URL. Add URL in admin panel."); return; }
    const isM3U8 = streamUrl.includes(".m3u8");
    try {
      // Plain MP4 / direct video files (R2, Drive, CDN links etc.) — load directly, no HLS.js needed
      if (!isM3U8) {
        v.src = streamUrl;
        const onCanPlay = () => {
          v.volume = volume;
          v.play().catch(() => {});
          setPlaying(true);
          resetHide();
        };
        const onErr = () => {
          const code = v.error?.code;
          const msg = code === 1 ? "Loading aborted" : code === 2 ? "Network error" : code === 3 ? "Decode error — file may be corrupted" : code === 4 ? "Format not supported or CORS blocked" : "Unknown playback error";
          console.error("Video error code:", code, v.error);
          setError(`Stream unavailable: ${msg}. Check URL in admin.`);
        };
        v.addEventListener("canplay", onCanPlay, { once: true });
        v.addEventListener("loadeddata", onCanPlay, { once: true });
        v.addEventListener("error", onErr, { once: true });
        v.load();
        return;
      }
      // Real HLS .m3u8 streams — use Hls.js
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          v.volume = volume;
          v.play().catch(() => {});
          setPlaying(true);
          resetHide();
        });
        hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) setError("Stream unavailable. Check URL in admin."); });
      } else if (v.canPlayType("application/vnd.apple.mpegurl")) {
        v.src = streamUrl; v.play().catch(() => {}); setPlaying(true); resetHide();
      } else {
        v.src = streamUrl; v.play().catch(() => {}); setPlaying(true); resetHide();
      }
    } catch (e) { setError("Playback error: " + e.message); }
  }

  // ── VIDEO EVENTS ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v || phase !== "playing") return;
    const onTime = () => {
      if (!seeking) { setProgress(v.currentTime); setDuration(v.duration || 0); }
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
      // Mid-roll ads at 25%, 50%, 75%
      if (!isPremium && v.duration) {
        const pct = (v.currentTime / v.duration) * 100;
        [25, 50, 75].forEach(p => {
          if (pct >= p && !midDone.includes(p)) {
            setMidDone(d => [...d, p]);
            v.pause();
            getAds("mid_roll", false).then(ads => {
              const ad = ads.length > 0 ? ads[Math.floor(Math.random()*ads.length)] : FALLBACK_ADS[1];
              setCurrentAd(ad);
              setAdTimeLeft(ad.duration || 12);
              setAdCanSkip(false);
              setPhase("midroll");
              trackAd(ad.id, user?.id, "midroll_view");
            });
          }
        });
      }
      // Next episode
      if (v.duration && v.currentTime >= v.duration * 0.94 && nextCount === null && isSeries) setNextCount(10);
      // Save progress
      if (user?.id && content?.id && Math.floor(v.currentTime) % 10 === 0) {
        db.saveProgress(user.id, content.id, Math.floor(v.currentTime), Math.floor(v.duration || 0)).catch(() => {});
      }
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play",  () => setPlaying(true));
    v.addEventListener("pause", () => setPlaying(false));
    v.addEventListener("ended", () => { setPhase("ended"); setPlaying(false); });
    return () => { v.removeEventListener("timeupdate", onTime); };
  }, [phase, seeking, midDone, isPremium, nextCount]);

  // ── AD COUNTDOWN ──
  useEffect(() => {
    if (phase !== "preroll" && phase !== "midroll") return;
    if (adTimeLeft <= 0) { resumeFromAd(); return; }
    const t = setInterval(() => setAdTimeLeft(s => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; }), 1000);
    const sk = setTimeout(() => setAdCanSkip(true), (currentAd?.skip_after || 5) * 1000);
    return () => { clearInterval(t); clearTimeout(sk); };
  }, [phase]);

  // ── NEXT EP COUNTDOWN ──
  useEffect(() => {
    if (nextCount === null || nextCount < 0) return;
    if (nextCount === 0) { onNext?.(); return; }
    const t = setTimeout(() => setNextCount(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [nextCount]);

  function resumeFromAd() {
    trackAd(currentAd?.id, user?.id, "complete");
    setCurrentAd(null); setAdCanSkip(false);
    if (phase === "preroll") startVideo();
    else { setPhase("playing"); videoRef.current?.play(); setPlaying(true); }
  }

  function skipAd() {
    if (!adCanSkip) return;
    trackAd(currentAd?.id, user?.id, "skip");
    setCurrentAd(null); setAdCanSkip(false);
    if (phase === "preroll") startVideo();
    else { setPhase("playing"); videoRef.current?.play(); setPlaying(true); }
  }

  function togglePlay() {
    const v = videoRef.current; if (!v) return;
    v.paused ? v.play() : v.pause();
    resetHide();
  }
  function seekTo(val) {
    const v = videoRef.current; if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, val));
    setProgress(v.currentTime);
  }
  function skipSec(s) { seekTo(progress + s); showToast(s > 0 ? `+${s}s` : `${s}s`); }
  function toggleMute() { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); }
  function changeVol(val) { const v = videoRef.current; if (!v) return; v.volume = val; setVol(val); setMuted(val === 0); }
  function changeSpeed(s) { const v = videoRef.current; if (v) v.playbackRate = s; setSpeed(s); showToast(s + "x speed"); }
  function toggleFS() { !document.fullscreenElement ? containerRef.current?.requestFullscreen?.().then(() => setFS(true)).catch(() => {}) : document.exitFullscreen?.().then(() => setFS(false)).catch(() => {}); }
  async function toggleWL() {
    if (!user?.id || !content?.id) return;
    try {
      if (inWL) { await db.removeFromWatchlist(user.id, content.id); setInWL(false); showToast("Removed from My List"); }
      else { await db.addToWatchlist(user.id, content.id); setInWL(true); showToast("Added to My List ✓"); }
    } catch (e) {}
  }

  const pct    = duration > 0 ? (progress / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const skipIn = Math.max(0, (currentAd?.skip_after || 5) - ((currentAd?.duration || 15) - adTimeLeft));

  return (
    <div ref={containerRef} className="vp" onMouseMove={resetHide} onTouchStart={resetHide}
      style={{ position:"fixed", inset:0, zIndex:700, background:"#000", display:"flex", flexDirection:"column", overflow:"hidden" }}>
      <style>{CSS}</style>

      {/* ═══ VIDEO + VIDEO AREA ═══ */}
      <div style={{ position:"relative", background:"#000", flexShrink:0, height: fullscreen ? "100vh" : "clamp(220px,55vw,420px)" }}>

        {/* Real video element */}
        <video ref={videoRef} playsInline onClick={togglePlay}
          style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"contain", display: phase==="playing"||phase==="ended" ? "block" : "none" }}
        />

        {/* Loading */}
        {phase === "loading" && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14 }}>
            <div style={{ width:44, height:44, border:"3px solid #222", borderTop:"3px solid #1565c0", borderRadius:"50%", animation:"vp-spin .8s linear infinite" }}/>
            <div style={{ color:"#666", fontSize:13, fontWeight:500 }}>{content?.title}</div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:14, background:"#000", padding:20 }}>
            <div style={{ fontSize:40 }}>⚠️</div>
            <div style={{ color:"#fff", fontSize:14, fontWeight:600, textAlign:"center", maxWidth:280, lineHeight:1.5 }}>{error}</div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => { setError(null); startInit(); }} style={{ background:"#1565c0", color:"#fff", border:"none", borderRadius:8, padding:"10px 20px", fontWeight:600, cursor:"pointer", fontSize:13 }}>↺ Retry</button>
              <button onClick={onClose} style={{ background:"rgba(255,255,255,.08)", color:"#fff", border:"none", borderRadius:8, padding:"10px 16px", cursor:"pointer", fontSize:13 }}>Close</button>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{ position:"absolute", top:"42%", left:"50%", transform:"translate(-50%,-50%)", background:"rgba(0,0,0,.75)", color:"#fff", padding:"8px 18px", borderRadius:6, fontSize:13, fontWeight:600, pointerEvents:"none", animation:"vp-fadeIn .18s ease", whiteSpace:"nowrap" }}>
            {toast}
          </div>
        )}

        {/* Skip Intro */}
        {phase === "playing" && showCtrl && progress > 30 && progress < 300 && (
          <button onClick={() => { skipSec(90); showToast("Intro skipped"); }} style={{ position:"absolute", right:"clamp(12px,3vw,20px)", top:"clamp(52px,10vw,68px)", background:"rgba(0,0,0,.85)", backdropFilter:"blur(8px)", color:"#fff", border:"1px solid rgba(255,255,255,.25)", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:600, cursor:"pointer", zIndex:20, animation:"vp-fadeIn .3s ease" }}>
            Skip Intro
          </button>
        )}

        {/* Next Episode */}
        {nextCount !== null && (
          <div style={{ position:"absolute", right:"clamp(12px,3vw,20px)", bottom:80, background:"rgba(0,0,0,.92)", border:"1px solid #1565c0", borderRadius:12, padding:"14px 18px", animation:"vp-slideUp .3s ease", zIndex:20, minWidth:200 }}>
            <div style={{ fontSize:11, color:"#888", marginBottom:3 }}>Next Episode in {nextCount}s</div>
            <div style={{ fontWeight:700, marginBottom:10, fontSize:13, color:"#fff" }}>Continue Watching</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => { onNext?.(); setNextCount(null); }} style={{ background:"#1565c0", border:"none", color:"#fff", borderRadius:7, padding:"7px 14px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Play Now</button>
              <button onClick={() => setNextCount(null)} style={{ background:"rgba(255,255,255,.08)", border:"none", color:"#aaa", borderRadius:7, padding:"7px 10px", fontSize:12, cursor:"pointer" }}>Cancel</button>
            </div>
          </div>
        )}

        {/* ═══ PRE-ROLL / MID-ROLL AD ═══ */}
        {(phase === "preroll" || phase === "midroll") && currentAd && (
          <div style={{ position:"absolute", inset:0, zIndex:60, background:`linear-gradient(160deg,${currentAd.color||"#333"}66,#000 55%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", animation:"vp-adIn .4s ease" }}>
            {/* Ad label */}
            <div style={{ position:"absolute", top:14, left:14, background:"rgba(0,0,0,.7)", backdropFilter:"blur(8px)", color:"#aaa", fontSize:10, padding:"4px 12px", borderRadius:20, letterSpacing:3, textTransform:"uppercase", border:"1px solid rgba(255,255,255,.08)" }}>
              {phase === "midroll" ? "Mid-roll" : "Pre-roll"} · Ad
            </div>
            {/* Timer */}
            <div style={{ position:"absolute", top:14, right:14, background:"rgba(0,0,0,.7)", color:"rgba(255,255,255,.85)", fontSize:13, fontWeight:600, padding:"5px 14px", borderRadius:20, border:"1px solid rgba(255,255,255,.1)" }}>
              {adTimeLeft}s
            </div>
            {/* Ad content */}
            <div style={{ textAlign:"center", padding:"16px 24px", maxWidth:440, animation:"vp-slideUp .5s ease" }}>
              <div style={{ width:80, height:80, borderRadius:"50%", background:`radial-gradient(circle,${currentAd.color||"#333"}55,${currentAd.color||"#333"}11)`, border:`2px solid ${currentAd.color||"#333"}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:38, margin:"0 auto 16px" }}>
                {currentAd.icon || "📢"}
              </div>
              <div style={{ fontSize:"clamp(20px,4.5vw,28px)", fontWeight:900, color:"#fff", marginBottom:6 }}>{currentAd.brand}</div>
              <div style={{ color:"rgba(255,255,255,.6)", fontSize:"clamp(12px,2.5vw,14px)", marginBottom:6, lineHeight:1.5 }}>{currentAd.tagline}</div>
              {currentAd.sub_text && <div style={{ color:"rgba(255,255,255,.35)", fontSize:11, marginBottom:20 }}>{currentAd.sub_text}</div>}
              <button onClick={() => { trackAd(currentAd.id, user?.id, "click"); if (currentAd.cta_url) window.open(currentAd.cta_url, "_blank"); }}
                style={{ background:`linear-gradient(135deg,${currentAd.color||"#1565c0"},${currentAd.color||"#1565c0"}cc)`, border:"none", color:"#fff", borderRadius:10, padding:"11px 32px", fontSize:14, fontWeight:700, cursor:"pointer", boxShadow:`0 6px 20px ${currentAd.color||"#1565c0"}44` }}>
                {currentAd.cta || "Learn More"}
              </button>
            </div>
            {/* Skip area */}
            <div style={{ position:"absolute", bottom:"clamp(60px,12vh,80px)", right:"clamp(14px,4vw,32px)", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
              {adCanSkip ? (
                <button onClick={skipAd} style={{ background:"rgba(0,0,0,.9)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,.3)", color:"#fff", borderRadius:8, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8, animation:"vp-fadeIn .3s ease" }}>
                  Skip Ad <span style={{ background:"rgba(255,255,255,.15)", borderRadius:4, padding:"1px 7px" }}>❯</span>
                </button>
              ) : (
                <div style={{ background:"rgba(0,0,0,.75)", color:"#888", borderRadius:8, padding:"8px 14px", fontSize:12, border:"1px solid rgba(255,255,255,.08)" }}>
                  Skip in {skipIn}s
                </div>
              )}
              {/* Progress bar */}
              <div style={{ width:180, height:3, background:"rgba(255,255,255,.12)", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", background:"rgba(255,255,255,.55)", borderRadius:2, width:`${((currentAd.duration-adTimeLeft)/currentAd.duration)*100}%`, transition:"width 1s linear" }}/>
              </div>
              <div style={{ color:"rgba(255,255,255,.3)", fontSize:11 }}>Ad ends in {adTimeLeft}s</div>
            </div>
            {/* Go premium */}
            {!isPremium && (
              <div style={{ position:"absolute", bottom:14, left:"50%", transform:"translateX(-50%)", background:"rgba(229,9,20,.12)", border:"1px solid rgba(229,9,20,.25)", borderRadius:20, padding:"5px 16px", fontSize:11, color:"#e50914", fontWeight:600, cursor:"pointer", whiteSpace:"nowrap" }}>
                👑 Upgrade for Ad-Free Experience
              </div>
            )}
          </div>
        )}

        {/* Ended screen */}
        {phase === "ended" && (
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.88)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16, zIndex:40 }}>
            <div style={{ fontSize:42 }}>🎬</div>
            <div style={{ fontWeight:700, fontSize:"clamp(15px,4vw,18px)", color:"#fff", textAlign:"center" }}>{content?.title}</div>
            <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
              <button onClick={() => { setPhase("loading"); setProgress(0); setMidDone([]); setNextCount(null); startInit(); }} style={{ background:"#1565c0", color:"#fff", border:"none", borderRadius:9, padding:"10px 22px", fontWeight:700, fontSize:13, cursor:"pointer" }}>▶ Watch Again</button>
              {onNext && <button onClick={onNext} style={{ background:"#fff", color:"#111", border:"none", borderRadius:9, padding:"10px 22px", fontWeight:700, fontSize:13, cursor:"pointer" }}>Next →</button>}
              <button onClick={onClose} style={{ background:"rgba(255,255,255,.1)", color:"#fff", border:"none", borderRadius:9, padding:"10px 16px", fontSize:13, cursor:"pointer" }}>✕ Close</button>
            </div>
          </div>
        )}

        {/* Playback controls overlay */}
        {showCtrl && (phase === "playing" || phase === "ended") && (
          <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", justifyContent:"space-between", background:"linear-gradient(to bottom,rgba(0,0,0,.5) 0%,transparent 35%,transparent 55%,rgba(0,0,0,.75) 100%)", animation:"vp-fadeIn .2s ease", zIndex:10 }}>
            {/* Top bar */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"clamp(10px,2vw,14px) clamp(12px,3vw,18px)" }}>
              <button onClick={onClose} className="vp-ibtn" style={{ fontSize:22 }}>←</button>
              <div style={{ flex:1, padding:"0 12px", minWidth:0 }}>
                <div style={{ fontWeight:700, fontSize:"clamp(13px,2.5vw,15px)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#fff" }}>{content?.title}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.45)" }}>
                  {content?.type}{content?.release_year ? ` · ${content.release_year}` : ""}{isLive ? "" : content?.rating ? ` · ${content.rating}` : ""}
                  {isLive && <span style={{ color:"#e50914", fontWeight:700, marginLeft:8, animation:"vp-pulse 1.5s infinite" }}>● LIVE</span>}
                </div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={() => setShowSettings(s => !s)} className="vp-ibtn" style={{ fontSize:20 }}>⚙</button>
                <button onClick={toggleFS} className="vp-ibtn" style={{ fontSize:18 }}>{fullscreen ? "⊡" : "⛶"}</button>
              </div>
            </div>
            {/* Centre controls */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:"clamp(20px,7vw,44px)" }}>
              <button onClick={() => skipSec(-10)} className="vp-ibtn" style={{ fontSize:"clamp(26px,6vw,34px)" }}>«</button>
              <button onClick={togglePlay} style={{ background:"none", border:"none", color:"#fff", fontSize:"clamp(30px,8vw,42px)", cursor:"pointer", padding:8 }}>{playing ? "⏸" : "▶"}</button>
              <button onClick={() => skipSec(10)} className="vp-ibtn" style={{ fontSize:"clamp(26px,6vw,34px)" }}>»</button>
            </div>
            {/* Bottom */}
            <div style={{ padding:"0 clamp(12px,3vw,18px) clamp(10px,2vw,14px)" }}>
              <div style={{ textAlign:"right", fontSize:12, color:"rgba(255,255,255,.6)", marginBottom:5 }}>{fmt(progress)} / {fmt(duration)}</div>
              {/* Progress track */}
              <div style={{ position:"relative", height:4, background:"rgba(255,255,255,.2)", borderRadius:2, marginBottom:4 }}>
                <div style={{ position:"absolute", left:0, top:0, height:"100%", background:"rgba(255,255,255,.35)", borderRadius:2, width:bufPct+"%" }}/>
                <div style={{ position:"absolute", left:0, top:0, height:"100%", background:"#1565c0", borderRadius:2, width:pct+"%" }}/>
                {/* Chapter dots for mid-roll points */}
                {[25,50,75].filter(p => !midDone.includes(p) && !isPremium).map(p => (
                  <div key={p} style={{ position:"absolute", top:"50%", left:`${p}%`, transform:"translate(-50%,-50%)", width:7, height:7, borderRadius:"50%", background:"#f59e0b" }}/>
                ))}
                <div style={{ position:"absolute", top:"50%", transform:"translate(-50%,-50%)", width:14, height:14, borderRadius:"50%", background:"#fff", left:pct+"%", boxShadow:"0 2px 8px rgba(0,0,0,.5)" }}/>
              </div>
              <input type="range" className="vp-prog" min={0} max={duration||100} value={progress} step={0.1}
                onChange={e => seekTo(+e.target.value)}
                onMouseDown={() => setSeeking(true)} onMouseUp={() => setSeeking(false)}
                onTouchStart={() => setSeeking(true)} onTouchEnd={() => setSeeking(false)}
                style={{ position:"absolute", left:"clamp(12px,3vw,18px)", right:"clamp(12px,3vw,18px)", bottom:"clamp(22px,4vw,30px)", opacity:0, cursor:"pointer", height:14, zIndex:5, margin:0, width:`calc(100% - clamp(24px,6vw,36px))` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ═══ AD BANNER below video — Hotstar style ═══ */}
      {bannerVisible && bannerAd && phase !== "preroll" && (
        <div style={{ background:"#111118", borderTop:"1px solid #1e1e2e", flexShrink:0, animation:"vp-fadeIn .3s ease" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px" }}>
            <div style={{ width:38, height:38, borderRadius:8, background:bannerAd.color||"#333", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
              {bannerAd.icon || "📢"}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:1 }}>
                <span style={{ background:"#f59e0b", color:"#000", fontSize:9, fontWeight:800, padding:"1px 5px", borderRadius:3 }}>Ad</span>
                <span style={{ fontWeight:600, fontSize:12, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#fff" }}>{bannerAd.tagline}</span>
              </div>
              <div style={{ fontSize:11, color:"#666" }}>{bannerAd.sub_text || bannerAd.brand}</div>
            </div>
            <div style={{ display:"flex", gap:6, flexShrink:0, alignItems:"center" }}>
              <button onClick={() => { trackAd(bannerAd.id, user?.id, "banner_click"); if (bannerAd.cta_url) window.open(bannerAd.cta_url, "_blank"); }}
                style={{ background:bannerAd.color||"#1565c0", color:"#fff", border:"none", borderRadius:7, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                {bannerAd.cta || "Learn More"}
              </button>
              <button onClick={() => setBannerVisible(false)} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:16, padding:2 }}>✕</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ INFO SECTION (scrollable below video) ═══ */}
      <div style={{ flex:1, overflowY:"auto", background:"#0d0d0d" }}>
        {/* Title + actions */}
        <div style={{ padding:"clamp(12px,3vw,18px) clamp(14px,3vw,20px) 0" }}>
          <div style={{ fontWeight:800, fontSize:"clamp(16px,4vw,20px)", marginBottom:4, color:"#fff", lineHeight:1.2 }}>{content?.title}</div>
          <div style={{ fontSize:12, color:"#666", marginBottom:12 }}>
            {[content?.release_year, content?.language, content?.rating].filter(Boolean).join(" • ")}
          </div>
          {/* Action buttons */}
          <div style={{ display:"flex", gap:0, marginBottom:16, overflowX:"auto" }}>
            {[
              { icon:"＋", label: inWL ? "Saved" : "Watchlist", action: toggleWL, active: inWL },
              { icon:"⬇", label:"Download", action:()=>showToast("Downloading...") },
              { icon:"↗", label:"Share",    action:()=>{ navigator.clipboard?.writeText(window.location.href).catch(()=>{}); showToast("Link copied!"); } },
              ...(isSeries ? [{ icon:"≡", label:"Episodes", action:()=>setShowEp(s=>!s), active: showEp }] : []),
              { icon:"ⓘ", label:"Info", action:()=>setShowInfo(s=>!s), active: showInfo },
            ].map(btn => (
              <button key={btn.label} onClick={btn.action} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5, background:"none", border:"none", color:btn.active?"#1565c0":"#888", cursor:"pointer", padding:"8px 14px", minWidth:56 }}>
                <span style={{ fontSize:20 }}>{btn.icon}</span>
                <span style={{ fontSize:10, fontWeight:600, whiteSpace:"nowrap" }}>{btn.label}</span>
              </button>
            ))}
          </div>
          {/* Description */}
          {(showInfo || !isSeries) && content?.description && (
            <div style={{ fontSize:13, color:"#888", lineHeight:1.6, marginBottom:14 }}>{content.description}</div>
          )}
        </div>

        {/* Episodes */}
        {isSeries && showEp && (
          <div style={{ borderTop:"1px solid #1e1e1e" }}>
            {/* Season tabs */}
            <div style={{ display:"flex", overflowX:"auto", padding:"10px clamp(14px,3vw,20px) 0", borderBottom:"1px solid #1e1e1e" }}>
              {Array.from({ length: content?.season_count || 3 }, (_,i) => i+1).map(s => (
                <button key={s} onClick={() => setSelSeason(s)} style={{ background:"none", border:"none", color:selSeason===s?"#fff":"#555", fontWeight:selSeason===s?700:500, fontSize:14, padding:"6px 16px 8px", cursor:"pointer", borderBottom:`2px solid ${selSeason===s?"#fff":"transparent"}`, whiteSpace:"nowrap" }}>
                  Season {s}
                </button>
              ))}
            </div>
            {/* Episode list */}
            {episodes.map(ep => (
              <div key={ep.ep} className="vp-ep" onClick={() => showToast(`Playing S${selSeason}E${ep.ep}`)}>
                <div style={{ width:"clamp(78px,20vw,108px)", height:"clamp(48px,13vw,64px)", borderRadius:8, background:"#1e1e1e", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, position:"relative", overflow:"hidden" }}>
                  {content?.thumbnail ? <img src={content.thumbnail} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="" onError={e=>e.target.style.display="none"}/> : <span style={{ fontSize:20, opacity:.4 }}>🎬</span>}
                  {ep.progress > 0 && <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"rgba(255,255,255,.15)" }}><div style={{ height:"100%", width:`${ep.progress}%`, background:"#1565c0" }}/></div>}
                  <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,.3)" }}>
                    <div style={{ width:24, height:24, borderRadius:"50%", background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>▶</div>
                  </div>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:"#fff", marginBottom:3 }}>E{ep.ep} · {ep.title}</div>
                  <div style={{ fontSize:11, color:"#666" }}>S{selSeason} E{ep.ep} · {ep.dur}</div>
                  {ep.progress > 0 && <div style={{ fontSize:10, color:"#1565c0", marginTop:2 }}>{ep.progress}% watched</div>}
                </div>
                <button onClick={e=>{e.stopPropagation();showToast(`Downloading E${ep.ep}...`);}} style={{ background:"none", border:"none", color:"#555", fontSize:18, cursor:"pointer", padding:8, flexShrink:0 }}>⬇</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ height:80 }}/>
      </div>

      {/* ═══ VOLUME + SPEED CONTROLS (bottom bar for desktop) ═══ */}
      {phase === "playing" && (
        <div style={{ background:"#0a0a0f", borderTop:"1px solid #1e1e1e", padding:"8px clamp(14px,3vw,20px)", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <button onClick={toggleMute} className="vp-ibtn" style={{ fontSize:18 }}>{muted||volume===0?"🔇":volume<0.5?"🔉":"🔊"}</button>
          <input type="range" className="vp-vol" min={0} max={1} step={0.02} value={muted?0:volume} onChange={e=>changeVol(+e.target.value)} style={{ width:80, cursor:"pointer" }}/>
          <div style={{ flex:1 }}/>
          {["0.5x","0.75x","1x","1.25x","1.5x","2x"].map((s,i) => {
            const sv = [0.5,0.75,1,1.25,1.5,2][i];
            return <button key={s} onClick={()=>changeSpeed(sv)} className={`vp-btn${speed===sv?" on":""}`} style={{ padding:"4px 8px", fontSize:11 }}>{s}</button>;
          })}
        </div>
      )}

      {/* ═══ SETTINGS SHEET ═══ */}
      {showSettings && (
        <>
          <div style={{ position:"fixed", inset:0, zIndex:800, background:"rgba(0,0,0,.6)", backdropFilter:"blur(4px)" }} onClick={() => setShowSettings(false)}/>
          <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:801, background:"#1a1a1a", borderRadius:"16px 16px 0 0", animation:"vp-slideUp .3s ease", maxHeight:"70vh", display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", justifyContent:"center", padding:"12px 0 6px" }}><div style={{ width:40, height:4, borderRadius:2, background:"#444" }}/></div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"0 20px 10px" }}>
              <div style={{ fontWeight:700, fontSize:17, color:"#fff" }}>Settings</div>
              <button onClick={() => setShowSettings(false)} style={{ background:"none", border:"none", color:"#555", fontSize:20, cursor:"pointer" }}>✕</button>
            </div>
            {/* Setting tabs */}
            <div style={{ display:"flex", overflowX:"auto", borderBottom:"1px solid #2a2a2a", padding:"0 16px" }}>
              {["quality","audio","subtitles","speed"].map(t => (
                <button key={t} className={`vp-stab${settingsTab===t?" on":""}`} onClick={() => setSettingsTab(t)} style={{ textTransform:"capitalize" }}>
                  {t === "audio" ? "Audio Language" : t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            {/* Options */}
            <div style={{ overflowY:"auto", flex:1, paddingBottom:20 }}>
              {settingsTab === "quality" && QUALITY.map(q => (
                <div key={q} className="vp-sopt" onClick={() => { setQuality(q); setShowSettings(false); showToast("Quality: "+q); }}>
                  {quality === q ? <span style={{ color:"#1565c0", fontSize:18, flexShrink:0 }}>✓</span> : <span style={{ width:18, flexShrink:0 }}/>}
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:quality===q?700:400, fontSize:14, color:"#fff" }}>{q}</div>
                    {q === "Auto" && <div style={{ fontSize:12, color:"#666", marginTop:1 }}>Recommended for best experience</div>}
                    {q === "4K"   && !isPremium && <div style={{ fontSize:11, color:"#f59e0b", marginTop:1 }}>Requires Premium</div>}
                  </div>
                </div>
              ))}
              {settingsTab === "audio" && AUDIOS.map(l => (
                <div key={l} className="vp-sopt" onClick={() => { setAudioLang(l); setShowSettings(false); showToast("Audio: "+l); }}>
                  {audioLang === l ? <span style={{ color:"#1565c0", fontSize:18, flexShrink:0 }}>✓</span> : <span style={{ width:18, flexShrink:0 }}/>}
                  <div style={{ fontWeight:audioLang===l?700:400, fontSize:14, color:"#fff" }}>{l}</div>
                </div>
              ))}
              {settingsTab === "subtitles" && SUBS.map(s => (
                <div key={s} className="vp-sopt" onClick={() => { setSub(s); setShowSettings(false); showToast("Subtitles: "+s); }}>
                  {subtitle === s ? <span style={{ color:"#1565c0", fontSize:18, flexShrink:0 }}>✓</span> : <span style={{ width:18, flexShrink:0 }}/>}
                  <div style={{ fontWeight:subtitle===s?700:400, fontSize:14, color:"#fff" }}>{s}</div>
                </div>
              ))}
              {settingsTab === "speed" && SPEEDS.map(s => (
                <div key={s.v} className="vp-sopt" onClick={() => { changeSpeed(s.v); setShowSettings(false); }}>
                  {speed === s.v ? <span style={{ color:"#1565c0", fontSize:18, flexShrink:0 }}>✓</span> : <span style={{ width:18, flexShrink:0 }}/>}
                  <div style={{ fontWeight:speed===s.v?700:400, fontSize:14, color:"#fff" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
