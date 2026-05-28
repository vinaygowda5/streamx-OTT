import { useState, useEffect, useRef } from "react";
import { db } from "./supabase.js";

/* ══════════════════════════════════════════
   StreamX Video Player + Complete Ad System
   Pre-roll, Mid-roll, Skip, Rewarded, Banner
══════════════════════════════════════════ */

const AD_EMOJIS = {
  "JioFiber Ultra": "⚡",
  "Zomato Pro": "🍔",
  "Tata Nexon EV": "🚗",
  "HDFC SmartPay": "💳",
  "Swiggy Instamart": "🛒",
  "Ola Electric": "⚡",
  "Byju's": "📚",
  "Dream11": "🏆",
};

const AD_COLORS = {
  "JioFiber Ultra": "#003580",
  "Zomato Pro": "#e23744",
  "Tata Nexon EV": "#1a1a2e",
  "HDFC SmartPay": "#004c8c",
  "Swiggy Instamart": "#fc8019",
  "Ola Electric": "#2dd4bf",
  "Byju's": "#663399",
  "Dream11": "#f59e0b",
};

export default function VideoPlayer({ content, user, onClose, onNext }) {
  const [phase,      setPhase]      = useState("loading"); // loading | preroll | playing | midroll | ended
  const [progress,   setProgress]   = useState(0);
  const [volume,     setVol]        = useState(85);
  const [muted,      setMuted]      = useState(false);
  const [playing,    setPlaying]    = useState(false);
  const [speed,      setSpeed]      = useState(1.0);
  const [quality,    setQuality]    = useState("Auto");
  const [showCtrl,   setShowCtrl]   = useState(true);
  const [subtitles,  setSubs]       = useState(false);
  const [ad,         setAd]         = useState(null);
  const [adTime,     setAdTime]     = useState(0);
  const [adSkippable,setAdSkippable]= useState(false);
  const [midrollDone,setMidrollDone]= useState([]);
  const [nextCount,  setNextCount]  = useState(null);
  const [seeking,    setSeeking]    = useState(false);
  const [toast,      setToast]      = useState(null);
  const [showInfo,   setShowInfo]   = useState(false);
  const [inWatchlist,setInWL]       = useState(false);
  const hideTimer = useRef(null);
  const dur = content?.duration || 7200;
  const currentTime = (progress / 100) * dur;
  const isPremium = user?.plan === "plan_premium" || user?.plan === "plan_annual" || user?.plan === "premium";

  useEffect(() => {
    init();
    return () => clearTimeout(hideTimer.current);
  }, []);

  // Auto-hide controls
  const resetHide = () => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowCtrl(false), 3500);
  };

  async function init() {
    // Check watchlist
    if (user?.id && content?.id) {
      const inWL = await db.isInWatchlist(user.id, content.id).catch(() => false);
      setInWL(inWL);
    }

    setTimeout(async () => {
      if (!isPremium) {
        // Load pre-roll ad
        const ads = await db.getAdsForUser(user?.id, "pre_roll", content?.genre, user?.language).catch(() => []);
        if (ads.length > 0) {
          setAd(ads[0]);
          setAdTime(ads[0].duration);
          setPhase("preroll");
          if (user?.id) db.trackAdImpression(ads[0].id, user.id, "impression");
          return;
        }
      }
      startPlaying();
    }, 800);
  }

  function startPlaying() {
    setPhase("playing");
    setPlaying(true);
    resetHide();
  }

  // Ad countdown
  useEffect(() => {
    if (phase !== "preroll" && phase !== "midroll") return;
    if (adTime <= 0) {
      if (phase === "preroll") startPlaying();
      else { setPhase("playing"); setPlaying(true); }
      return;
    }
    const t = setInterval(() => {
      setAdTime(s => {
        if (s <= 1) { clearInterval(t); return 0; }
        return s - 1;
      });
      if (ad && adTime <= ad.duration - ad.skip_after) setAdSkippable(true);
    }, 1000);
    return () => clearInterval(t);
  }, [phase, adTime]);

  // Progress
  useEffect(() => {
    if (phase !== "playing" || !playing || seeking) return;
    const t = setInterval(async () => {
      setProgress(p => {
        const np = Math.min(p + (100 / dur) * speed, 100);

        // Check mid-roll (at 25%, 50%, 75%)
        if (!isPremium) {
          [25, 50, 75].forEach(async pct => {
            if (np >= pct && !midrollDone.includes(pct) && p < pct) {
              setMidrollDone(d => [...d, pct]);
              const mads = await db.getAdsForUser(user?.id, "mid_roll", content?.genre).catch(() => []);
              if (mads.length > 0) {
                setPlaying(false);
                setAd(mads[0]);
                setAdTime(mads[0].duration);
                setAdSkippable(false);
                setPhase("midroll");
                if (user?.id) db.trackAdImpression(mads[0].id, user.id, "impression");
              }
            }
          });
        }

        // Next episode countdown at 95%
        if (np >= 95 && nextCount === null && content?.type === "Series") setNextCount(10);

        // Save progress
        if (user?.id && content?.id && Math.floor(np) % 5 === 0) {
          db.saveProgress(user.id, content.id, Math.floor((np / 100) * dur), dur).catch(() => {});
        }

        if (np >= 100) { setPlaying(false); setPhase("ended"); return 100; }
        return np;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, playing, seeking, speed]);

  // Next episode
  useEffect(() => {
    if (nextCount === null) return;
    if (nextCount <= 0) { onNext?.(); return; }
    const t = setTimeout(() => setNextCount(n => n - 1), 1000);
    return () => clearTimeout(t);
  }, [nextCount]);

  function skipAd() {
    if (!adSkippable) return;
    if (user?.id && ad) db.trackAdImpression(ad.id, user.id, "skip", Math.round(((ad.duration - adTime) / ad.duration) * 100), true);
    if (phase === "preroll") startPlaying();
    else { setPhase("playing"); setPlaying(true); }
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2000); }

  async function toggleWatchlist() {
    if (!user?.id || !content?.id) return;
    try {
      if (inWatchlist) {
        await db.removeFromWatchlist(user.id, content.id);
        setInWL(false); showToast("Removed from watchlist");
      } else {
        await db.addToWatchlist(user.id, content.id);
        setInWL(true); showToast("Added to watchlist ✓");
      }
    } catch (e) { showToast("Error updating watchlist"); }
  }

  const fmt = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}` : `${m}:${String(sec).padStart(2,"0")}`;
  };

  const adColor = ad ? (AD_COLORS[ad.brand] || "#e50914") : "#e50914";
  const adEmoji = ad ? (AD_EMOJIS[ad.brand] || "📢") : "📢";

  return (
    <div onMouseMove={resetHide} style={{ position:"fixed", inset:0, zIndex:700, background:"#000", display:"flex", flexDirection:"column", userSelect:"none" }}>

      {/* ── LOADING ── */}
      {phase === "loading" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20 }}>
          <div style={{ fontSize:80 }}>{content?.thumbnail || "🎬"}</div>
          <div style={{ width:48, height:48, border:"3px solid #333", borderTop:`3px solid #e50914`, borderRadius:"50%", animation:"spin .8s linear infinite" }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
        </div>
      )}

      {/* ── PRE-ROLL / MID-ROLL AD ── */}
      {(phase === "preroll" || phase === "midroll") && ad && (
        <div style={{ position:"absolute", inset:0, zIndex:50, background:`linear-gradient(135deg, ${adColor}22, #000)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
          {/* Ad label */}
          <div style={{ position:"absolute", top:20, left:20, background:"rgba(0,0,0,.7)", color:"#aaa", fontSize:10, padding:"4px 12px", borderRadius:4, letterSpacing:3, textTransform:"uppercase" }}>
            {phase === "midroll" ? "Mid-roll Ad" : "Advertisement"}
          </div>

          {/* Ad content */}
          <div style={{ textAlign:"center", maxWidth:480, padding:32 }}>
            <div style={{ fontSize:80, marginBottom:20 }}>{adEmoji}</div>
            <div style={{ fontFamily:"serif", fontSize:32, fontWeight:900, color:"#fff", marginBottom:8 }}>{ad.brand}</div>
            <div style={{ color:"rgba(255,255,255,.7)", fontSize:16, marginBottom:28 }}>{ad.tagline}</div>
            <button style={{ background:"#fff", color:"#111", border:"none", borderRadius:8, padding:"12px 32px", fontSize:14, fontWeight:700, cursor:"pointer" }}>
              {ad.cta_text}
            </button>
          </div>

          {/* Skip button */}
          <div style={{ position:"absolute", bottom:80, right:40, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10 }}>
            {adSkippable ? (
              <button onClick={skipAd} style={{ background:"rgba(0,0,0,.8)", border:"1px solid rgba(255,255,255,.3)", color:"#fff", borderRadius:6, padding:"10px 20px", fontSize:13, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", gap:8 }}>
                Skip Ad ❯
              </button>
            ) : (
              <div style={{ background:"rgba(0,0,0,.7)", color:"#888", borderRadius:6, padding:"10px 20px", fontSize:13 }}>
                Skip in {Math.max(0, (ad.skip_after || 5) - (ad.duration - adTime))}s
              </div>
            )}

            {/* Ad progress bar */}
            <div style={{ width:200, height:3, background:"rgba(255,255,255,.2)", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", background:"#fff", borderRadius:2, width:`${((ad.duration - adTime) / ad.duration) * 100}%`, transition:"width 1s linear" }}/>
            </div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:11 }}>Ad ends in {adTime}s</div>
          </div>
        </div>
      )}

      {/* ── FAKE VIDEO CANVAS ── */}
      {(phase === "playing" || phase === "ended") && (
        <div style={{ flex:1, position:"relative", background:`radial-gradient(ellipse at 30% 50%, ${content?.accent || "#e50914"}18, #000)`, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}
          onClick={() => { setPlaying(p => !p); showToast(playing ? "Paused" : "Playing"); }}>
          <div style={{ fontSize:140, opacity:.08, userSelect:"none" }}>{content?.thumbnail || "🎬"}</div>

          {/* Centre play/pause */}
          {!playing && (
            <div style={{ position:"absolute", width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,.15)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, backdropFilter:"blur(8px)" }}>▶</div>
          )}

          {/* Skip intro */}
          {currentTime > 30 && currentTime < 300 && showCtrl && (
            <button onClick={e => { e.stopPropagation(); setProgress(p => Math.min(p + (90/dur)*100, 100)); showToast("Intro skipped"); }} style={{ position:"absolute", right:40, bottom:100, background:"rgba(0,0,0,.7)", border:"1px solid rgba(255,255,255,.3)", color:"#fff", borderRadius:7, padding:"10px 22px", fontSize:13, fontWeight:600, cursor:"pointer", backdropFilter:"blur(8px)" }}>
              Skip Intro ❯
            </button>
          )}

          {/* Next episode */}
          {nextCount !== null && (
            <div style={{ position:"absolute", right:40, bottom:120, background:"rgba(0,0,0,.9)", border:"1px solid #e50914", borderRadius:12, padding:"16px 20px" }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:6 }}>Next Episode in {nextCount}s</div>
              <div style={{ fontWeight:700, marginBottom:10, fontSize:14 }}>Next Episode</div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={() => { onNext?.(); setNextCount(null); }} style={{ background:"#e50914", border:"none", color:"#fff", borderRadius:6, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer" }}>Play Now</button>
                <button onClick={() => setNextCount(null)} style={{ background:"rgba(255,255,255,.1)", border:"none", color:"#fff", borderRadius:6, padding:"8px 12px", fontSize:12, cursor:"pointer" }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && (
        <div style={{ position:"absolute", top:"45%", left:"50%", transform:"translate(-50%,-50%)", background:"rgba(0,0,0,.75)", color:"#fff", padding:"10px 20px", borderRadius:8, fontSize:14, fontWeight:600, pointerEvents:"none", zIndex:200 }}>
          {toast}
        </div>
      )}

      {/* ── TOP BAR ── */}
      {showCtrl && phase !== "preroll" && phase !== "midroll" && (
        <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:30, background:"linear-gradient(to bottom,rgba(0,0,0,.85),transparent)", padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between", animation:"fadeIn .2s" }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button onClick={onClose} style={{ background:"none", border:"none", color:"#fff", fontSize:20, cursor:"pointer" }}>←</button>
            <div>
              <div style={{ fontWeight:700, fontSize:15 }}>{content?.title}</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.5)" }}>{content?.type} · {content?.release_year} · {fmt(dur)}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <Pill active={inWatchlist} onClick={toggleWatchlist}>{inWatchlist ? "✓ List" : "+ List"}</Pill>
            <Pill active={subtitles} onClick={() => setSubs(s => !s)}>CC</Pill>
            <Pill onClick={() => setShowInfo(i => !i)}>ⓘ</Pill>
            <Pill onClick={() => showToast("Downloading...")}>⬇</Pill>
            <Pill onClick={() => showToast("Casting...")}>📺</Pill>
          </div>
        </div>
      )}

      {/* ── BOTTOM CONTROLS ── */}
      {showCtrl && (phase === "playing" || phase === "ended") && (
        <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:30, background:"linear-gradient(to top,rgba(0,0,0,.9),transparent)", padding:"0 20px 20px", animation:"fadeIn .2s" }}>
          {/* Progress */}
          <div style={{ marginBottom:8 }}>
            <input type="range" min={0} max={100} value={progress} step={.01}
              onChange={e => setProgress(+e.target.value)}
              onMouseDown={() => setSeeking(true)} onMouseUp={() => setSeeking(false)}
              style={{ width:"100%", accentColor:"#e50914", height:4 }}
            />
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"rgba(255,255,255,.5)" }}>
              <span>{fmt(currentTime)}</span>
              <span>-{fmt(dur - currentTime)}</span>
            </div>
          </div>

          {/* Controls row */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            {/* Left */}
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <CtrlBtn onClick={() => setProgress(p => Math.max(0, p - (10/dur)*100))}>⏮10</CtrlBtn>
              <button onClick={() => setPlaying(p => !p)} style={{ width:50, height:50, borderRadius:"50%", background:"#fff", border:"none", fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"#111" }}>
                {playing ? "⏸" : "▶"}
              </button>
              <CtrlBtn onClick={() => setProgress(p => Math.min(100, p + (10/dur)*100))}>10⏭</CtrlBtn>
              <button onClick={() => setMuted(m => !m)} style={{ background:"none", border:"none", color:"#fff", fontSize:18, cursor:"pointer" }}>{muted||volume===0?"🔇":volume<50?"🔉":"🔊"}</button>
              <input type="range" min={0} max={100} value={muted?0:volume} onChange={e => { setVol(+e.target.value); setMuted(false); }} style={{ width:72, accentColor:"#fff" }}/>
              <span style={{ fontSize:11, color:"rgba(255,255,255,.5)", minWidth:28 }}>{muted?0:volume}%</span>
            </div>

            {/* Centre — audio */}
            <div style={{ display:"flex", gap:6 }}>
              {["Hindi","English","Tamil"].map(l => (
                <button key={l} onClick={() => showToast(`Audio: ${l}`)} style={{ background:"rgba(255,255,255,.1)", border:"none", color:"#fff", borderRadius:5, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>{l}</button>
              ))}
            </div>

            {/* Right */}
            <div style={{ display:"flex", gap:6 }}>
              <CtrlBtn onClick={() => { const s=[.5,.75,1,1.25,1.5,2]; const i=s.indexOf(speed); setSpeed(s[(i+1)%s.length]); showToast(s[(i+1)%s.length]+"x"); }}>{speed}x</CtrlBtn>
              <CtrlBtn onClick={() => { const q=["Auto","4K","1080p","720p"]; const i=q.indexOf(quality); setQuality(q[(i+1)%q.length]); showToast(q[(i+1)%q.length]); }}>{quality}</CtrlBtn>
              <CtrlBtn onClick={() => showToast("Fullscreen")}>⛶</CtrlBtn>
            </div>
          </div>
        </div>
      )}

      {/* ── INFO PANEL ── */}
      {showInfo && (
        <div style={{ position:"absolute", right:0, top:60, bottom:80, width:320, background:"rgba(0,0,0,.95)", borderLeft:"1px solid #1a1a26", padding:20, overflowY:"auto", zIndex:40 }}>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>{content?.title}</div>
          <div style={{ fontSize:12, color:"#888", marginBottom:12 }}>{content?.type} · {content?.release_year} · {content?.rating}</div>
          <div style={{ fontSize:13, color:"#aaa", lineHeight:1.7, marginBottom:16 }}>{content?.description}</div>
          {content?.director && <div style={{ fontSize:12, color:"#666" }}>Director: {content.director}</div>}
          {content?.studio && <div style={{ fontSize:12, color:"#666" }}>Studio: {content.studio}</div>}
          {!isPremium && (
            <div style={{ marginTop:16, background:"rgba(229,9,20,.1)", border:"1px solid rgba(229,9,20,.2)", borderRadius:8, padding:12 }}>
              <div style={{ fontSize:12, color:"#e50914", fontWeight:700, marginBottom:4 }}>📢 Ad-supported</div>
              <div style={{ fontSize:11, color:"#888" }}>Upgrade to Premium for ad-free viewing</div>
            </div>
          )}
        </div>
      )}

      {/* ── ENDED ── */}
      {phase === "ended" && (
        <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.85)", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20 }}>
          <div style={{ fontSize:64 }}>🎬</div>
          <div style={{ fontSize:22, fontWeight:800 }}>You finished {content?.title}</div>
          <div style={{ display:"flex", gap:12 }}>
            <button onClick={() => { setProgress(0); setPlaying(true); setPhase("playing"); setMidrollDone([]); setNextCount(null); }} style={{ background:"#fff", color:"#111", border:"none", borderRadius:8, padding:"12px 24px", fontWeight:800, fontSize:14, cursor:"pointer" }}>▶ Watch Again</button>
            {onNext && <button onClick={onNext} style={{ background:"#e50914", color:"#fff", border:"none", borderRadius:8, padding:"12px 24px", fontWeight:800, fontSize:14, cursor:"pointer" }}>Next →</button>}
            <button onClick={onClose} style={{ background:"rgba(255,255,255,.1)", color:"#fff", border:"1px solid rgba(255,255,255,.2)", borderRadius:8, padding:"12px 24px", fontSize:14, cursor:"pointer" }}>✕ Close</button>
          </div>
        </div>
      )}

      <style>{`@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}`}</style>
    </div>
  );
}

function Pill({ children, onClick, active }) {
  return (
    <button onClick={onClick} style={{ background: active ? "#e5091422" : "rgba(255,255,255,.08)", border:`1px solid ${active ? "#e50914" : "rgba(255,255,255,.12)"}`, color: active ? "#e50914" : "#ccc", borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>
      {children}
    </button>
  );
}

function CtrlBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{ background:"rgba(255,255,255,.08)", border:"1px solid rgba(255,255,255,.12)", color:"#fff", borderRadius:6, padding:"5px 10px", fontSize:12, cursor:"pointer", fontWeight:500 }}>
      {children}
    </button>
  );
}