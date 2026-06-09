import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

/*
 ╔══════════════════════════════════════════════════╗
 ║  StreamX Real Ads System — Jio Hotstar Style     ║
 ║  - Pre-roll ads before video                     ║
 ║  - Mid-roll ads at 25%, 50%, 75%                 ║
 ║  - Ad banner below video (like Hotstar)          ║
 ║  - Skip after 5 seconds                          ║
 ║  - Premium users = NO ADS                        ║
 ║  - Real ads from Supabase database               ║
 ║  - Impression + click tracking                   ║
 ╚══════════════════════════════════════════════════╝
*/

// Fallback local ads if DB has none
const FALLBACK_ADS = [
  {
    id: "fb1",
    brand: "JioFiber Ultra",
    tagline: "India's Fastest Broadband",
    sub_text: "1 Gbps · Starting ₹399/month",
    cta: "Get Now",
    cta_url: "https://jio.com",
    icon: "⚡",
    color: "#003580",
    bg_color: "#00091a",
    type: "pre_roll",
    duration: 15,
    skip_after: 5,
    is_active: true,
    priority: 1,
  },
  {
    id: "fb2",
    brand: "Swiggy Instamart",
    tagline: "Groceries in 10 Minutes!",
    sub_text: "Flat 40% off · Use code STREAMX",
    cta: "Order Now",
    cta_url: "https://swiggy.com",
    icon: "🛵",
    color: "#fc8019",
    bg_color: "#1a0800",
    type: "mid_roll",
    duration: 12,
    skip_after: 5,
    is_active: true,
    priority: 2,
  },
  {
    id: "fb3",
    brand: "Dream11",
    tagline: "Play Fantasy Cricket & Win",
    sub_text: "Join 15 Crore+ players · ₹50 Free",
    cta: "Play Now",
    cta_url: "https://dream11.com",
    icon: "🏆",
    color: "#f3a700",
    bg_color: "#1a1000",
    type: "pre_roll",
    duration: 10,
    skip_after: 5,
    is_active: true,
    priority: 1,
  },
  {
    id: "fb4",
    brand: "Zomato Pro",
    tagline: "Flat 60% Off on Orders!",
    sub_text: "Free delivery + priority service",
    cta: "Order Now",
    cta_url: "https://zomato.com",
    icon: "🍔",
    color: "#e23744",
    bg_color: "#1a0005",
    type: "mid_roll",
    duration: 10,
    skip_after: 5,
    is_active: true,
    priority: 2,
  },
  {
    id: "fb5",
    brand: "Tata Nexon EV",
    tagline: "Drive Electric. Drive Bold.",
    sub_text: "Range 465km · Book test drive",
    cta: "Book Now",
    cta_url: "https://tata.com",
    icon: "🚗",
    color: "#1565c0",
    bg_color: "#000d1a",
    type: "pre_roll",
    duration: 20,
    skip_after: 5,
    is_active: true,
    priority: 3,
  },
];

// Track impressions
async function trackImpression(adId, userId, event) {
  try {
    await supabase.from("ad_impressions").insert({
      ad_id: adId,
      user_id: userId || null,
      impression_type: event, // 'view' | 'skip' | 'click' | 'complete'
      created_at: new Date().toISOString(),
    });
  } catch (e) {}
}

// Load ads from DB, fallback to local
async function loadAds(type, userId, isPremium) {
  if (isPremium) return []; // No ads for premium
  try {
    const { data } = await supabase
      .from("ads")
      .select("*")
      .eq("is_active", true)
      .eq("type", type)
      .order("priority", { ascending: true })
      .limit(3);
    if (data && data.length > 0) return data;
  } catch (e) {}
  // Fallback to local ads
  return FALLBACK_ADS.filter(a => a.type === type || type === "any");
}

// ── PRE-ROLL AD COMPONENT (Full screen before video) ──
export function PreRollAd({ ad, onSkip, onComplete, userId }) {
  const [timeLeft, setTimeLeft] = useState(ad?.duration || 15);
  const [canSkip,  setCanSkip]  = useState(false);
  const [clicked,  setClicked]  = useState(false);
  const skipAfter = ad?.skip_after || 5;

  useEffect(() => {
    // Track view
    trackImpression(ad.id, userId, "view");

    const t = setInterval(() => {
      setTimeLeft(s => {
        if (s <= 1) { clearInterval(t); onComplete?.(); return 0; }
        return s - 1;
      });
    }, 1000);

    const sk = setTimeout(() => setCanSkip(true), skipAfter * 1000);
    return () => { clearInterval(t); clearTimeout(sk); };
  }, []);

  function handleSkip() {
    trackImpression(ad.id, userId, "skip");
    onSkip?.();
  }

  function handleClick() {
    trackImpression(ad.id, userId, "click");
    setClicked(true);
    if (ad.cta_url) window.open(ad.cta_url, "_blank");
  }

  const skipIn = Math.max(0, skipAfter - (ad.duration - timeLeft));

  return (
    <div style={{ position:"absolute", inset:0, zIndex:60, background:`linear-gradient(160deg,${ad.color||"#333"}66 0%,#000 55%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      <style>{`@keyframes adIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      {/* Ad label */}
      <div style={{ position:"absolute", top:16, left:16, background:"rgba(0,0,0,.7)", backdropFilter:"blur(8px)", color:"#aaa", fontSize:10, padding:"4px 12px", borderRadius:20, letterSpacing:3, textTransform:"uppercase", border:"1px solid rgba(255,255,255,.08)" }}>
        Advertisement
      </div>

      {/* Timer top right */}
      <div style={{ position:"absolute", top:16, right:16, background:"rgba(0,0,0,.7)", backdropFilter:"blur(8px)", color:"rgba(255,255,255,.8)", fontSize:13, fontWeight:600, padding:"5px 14px", borderRadius:20, border:"1px solid rgba(255,255,255,.1)", fontFamily:"Inter,sans-serif" }}>
        {timeLeft}s
      </div>

      {/* Ad Content */}
      <div style={{ textAlign:"center", padding:"20px 28px", maxWidth:460, animation:"adIn .4s ease" }}>
        {/* Brand icon */}
        <div style={{ width:90, height:90, borderRadius:"50%", background:`radial-gradient(circle,${ad.color||"#333"}55,${ad.color||"#333"}11)`, border:`2px solid ${ad.color||"#333"}66`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, margin:"0 auto 18px" }}>
          {ad.icon || "📢"}
        </div>
        <div style={{ fontSize:"clamp(22px,5vw,30px)", fontWeight:900, color:"#fff", marginBottom:6, fontFamily:"Inter,sans-serif", letterSpacing:.5 }}>
          {ad.brand}
        </div>
        <div style={{ color:"rgba(255,255,255,.65)", fontSize:"clamp(13px,2.5vw,15px)", marginBottom:8, lineHeight:1.5, fontFamily:"Inter,sans-serif" }}>
          {ad.tagline}
        </div>
        {ad.sub_text && (
          <div style={{ color:"rgba(255,255,255,.4)", fontSize:12, marginBottom:24, fontFamily:"Inter,sans-serif" }}>
            {ad.sub_text}
          </div>
        )}
        <button onClick={handleClick} style={{ background:`linear-gradient(135deg,${ad.color||"#e50914"},${ad.color||"#e50914"}cc)`, border:"none", color:"#fff", borderRadius:10, padding:"13px 36px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Inter,sans-serif", boxShadow:`0 6px 24px ${ad.color||"#e50914"}44`, transition:"transform .15s" }}
          onMouseEnter={e=>e.target.style.transform="scale(1.05)"}
          onMouseLeave={e=>e.target.style.transform="scale(1)"}
        >
          {ad.cta || "Learn More"}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ position:"absolute", bottom:"clamp(90px,15vh,110px)", right:"clamp(16px,4vw,40px)", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
        {canSkip ? (
          <button onClick={handleSkip} style={{ background:"rgba(0,0,0,.9)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,.3)", color:"#fff", borderRadius:8, padding:"11px 20px", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", gap:8, fontFamily:"Inter,sans-serif", boxShadow:"0 4px 20px rgba(0,0,0,.5)" }}>
            Skip Ad <span style={{ background:"rgba(255,255,255,.15)", borderRadius:4, padding:"1px 7px" }}>❯</span>
          </button>
        ) : (
          <div style={{ background:"rgba(0,0,0,.75)", backdropFilter:"blur(8px)", color:"#888", borderRadius:8, padding:"9px 16px", fontSize:12, border:"1px solid rgba(255,255,255,.08)", fontFamily:"Inter,sans-serif" }}>
            Skip in {skipIn}s
          </div>
        )}
        {/* Ad timer bar */}
        <div style={{ width:200, height:3, background:"rgba(255,255,255,.12)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", background:"rgba(255,255,255,.6)", borderRadius:2, width:`${((ad.duration-timeLeft)/ad.duration)*100}%`, transition:"width 1s linear" }}/>
        </div>
        <div style={{ color:"rgba(255,255,255,.3)", fontSize:11, fontFamily:"Inter,sans-serif" }}>
          Ad ends in {timeLeft}s
        </div>
      </div>

      {/* Go premium */}
      <div style={{ position:"absolute", bottom:16, left:"50%", transform:"translateX(-50%)", background:"rgba(229,9,20,.12)", border:"1px solid rgba(229,9,20,.25)", borderRadius:20, padding:"5px 16px", fontSize:11, color:"#e50914", fontWeight:600, cursor:"pointer", fontFamily:"Inter,sans-serif", whiteSpace:"nowrap" }}>
        👑 Upgrade for Ad-Free Experience
      </div>
    </div>
  );
}

// ── AD BANNER COMPONENT (Below video like Hotstar) ──
export function AdBanner({ ad, onClose, userId }) {
  const [visible, setVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!ad) return;
    trackImpression(ad.id, userId, "banner_view");
    // Auto hide after 30 seconds
    const t = setTimeout(() => setVisible(false), 30000);
    return () => clearTimeout(t);
  }, [ad]);

  if (!visible || !ad) return null;

  return (
    <div style={{ background:"#111118", borderTop:"1px solid #1e1e2e", overflow:"hidden", transition:"all .3s", fontFamily:"Inter,sans-serif" }}>
      {/* Main banner row */}
      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 16px" }}>
        {/* Brand icon */}
        <div style={{ width:40, height:40, borderRadius:9, background:ad.color||"#333", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
          {ad.icon || "📢"}
        </div>
        {/* Text */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:1 }}>
            <span style={{ background:"#f59e0b", color:"#000", fontSize:9, fontWeight:800, padding:"1px 5px", borderRadius:3, flexShrink:0 }}>Ad</span>
            <span style={{ fontWeight:600, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", color:"#fff" }}>{ad.tagline}</span>
          </div>
          <div style={{ fontSize:11, color:"#666" }}>{ad.sub_text || ad.brand}</div>
        </div>
        {/* Actions */}
        <div style={{ display:"flex", gap:8, flexShrink:0, alignItems:"center" }}>
          <button onClick={()=>setExpanded(e=>!e)} style={{ fontSize:18, background:"none", border:"none", color:"#666", cursor:"pointer", padding:2, transition:"transform .2s", transform:expanded?"rotate(180deg)":"none" }}>∧</button>
          <button onClick={()=>{trackImpression(ad.id,userId,"click");if(ad.cta_url)window.open(ad.cta_url,"_blank");}} style={{ background:ad.color||"#e50914", color:"#fff", border:"none", borderRadius:7, padding:"7px 14px", fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
            {ad.cta || "Learn More"}
          </button>
          <button onClick={()=>{trackImpression(ad.id,userId,"dismiss");setVisible(false);}} style={{ background:"none", border:"none", color:"#444", cursor:"pointer", fontSize:18, padding:2 }}>✕</button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div style={{ padding:"0 16px 14px", borderTop:"1px solid #1e1e2e22", display:"flex", gap:12, alignItems:"center" }}>
          <div style={{ width:60, height:60, borderRadius:12, background:`linear-gradient(135deg,${ad.color||"#333"}55,#000)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, flexShrink:0 }}>
            {ad.icon || "📢"}
          </div>
          <div>
            <div style={{ fontWeight:700, fontSize:14, color:"#fff", marginBottom:3 }}>{ad.brand}</div>
            <div style={{ fontSize:12, color:"#888", marginBottom:8, lineHeight:1.5 }}>{ad.tagline}</div>
            <button onClick={()=>{trackImpression(ad.id,userId,"click_expanded");if(ad.cta_url)window.open(ad.cta_url,"_blank");}} style={{ background:ad.color||"#e50914", color:"#fff", border:"none", borderRadius:7, padding:"8px 18px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
              {ad.cta || "Learn More"} →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MID-ROLL AD (pauses video, shows ad) ──
export function MidRollAd({ ad, onDone, userId }) {
  const [timeLeft, setTimeLeft] = useState(ad?.duration || 12);
  const [canSkip,  setCanSkip]  = useState(false);
  const skipAfter = ad?.skip_after || 5;

  useEffect(() => {
    trackImpression(ad.id, userId, "midroll_view");
    const t = setInterval(() => {
      setTimeLeft(s => { if (s <= 1) { clearInterval(t); onDone?.(); return 0; } return s - 1; });
    }, 1000);
    const sk = setTimeout(() => setCanSkip(true), skipAfter * 1000);
    return () => { clearInterval(t); clearTimeout(sk); };
  }, []);

  return (
    <div style={{ position:"absolute", inset:0, zIndex:60, background:`linear-gradient(160deg,${ad.color||"#333"}55 0%,#000 55%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
      {/* Mid-roll label */}
      <div style={{ position:"absolute", top:16, left:16, background:"rgba(0,0,0,.7)", color:"#aaa", fontSize:10, padding:"4px 12px", borderRadius:20, letterSpacing:3, textTransform:"uppercase" }}>
        Mid-roll Ad
      </div>
      <div style={{ position:"absolute", top:16, right:16, background:"rgba(0,0,0,.7)", color:"#fff", fontSize:13, fontWeight:600, padding:"5px 14px", borderRadius:20, fontFamily:"Inter,sans-serif" }}>
        {timeLeft}s
      </div>
      {/* Ad content */}
      <div style={{ textAlign:"center", padding:24, maxWidth:400 }}>
        <div style={{ fontSize:56, marginBottom:12 }}>{ad.icon || "📢"}</div>
        <div style={{ fontSize:26, fontWeight:900, color:"#fff", marginBottom:6, fontFamily:"Inter,sans-serif" }}>{ad.brand}</div>
        <div style={{ color:"rgba(255,255,255,.6)", fontSize:14, marginBottom:20, fontFamily:"Inter,sans-serif" }}>{ad.tagline}</div>
        <button onClick={()=>{trackImpression(ad.id,userId,"click");if(ad.cta_url)window.open(ad.cta_url,"_blank");}} style={{ background:ad.color||"#e50914", border:"none", color:"#fff", borderRadius:10, padding:"12px 32px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
          {ad.cta || "Learn More"}
        </button>
      </div>
      {/* Skip */}
      <div style={{ position:"absolute", bottom:80, right:24 }}>
        {canSkip ? (
          <button onClick={()=>{trackImpression(ad.id,userId,"skip");onDone?.();}} style={{ background:"rgba(0,0,0,.9)", border:"1px solid rgba(255,255,255,.3)", color:"#fff", borderRadius:8, padding:"10px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"Inter,sans-serif" }}>
            Skip Ad ❯
          </button>
        ) : (
          <div style={{ background:"rgba(0,0,0,.7)", color:"#888", borderRadius:8, padding:"8px 14px", fontSize:12, fontFamily:"Inter,sans-serif" }}>
            Skip in {Math.max(0,skipAfter-(ad.duration-timeLeft))}s
          </div>
        )}
      </div>
      {/* Progress */}
      <div style={{ position:"absolute", bottom:50, left:24, right:24, height:3, background:"rgba(255,255,255,.15)", borderRadius:2, overflow:"hidden" }}>
        <div style={{ height:"100%", background:ad.color||"#e50914", borderRadius:2, width:`${((ad.duration-timeLeft)/ad.duration)*100}%`, transition:"width 1s linear" }}/>
      </div>
    </div>
  );
}

// ── MAIN ADS HOOK — use this in VideoPlayer ──
export function useAds(userId, isPremium) {
  const [preRollAd,  setPreRollAd]  = useState(null);
  const [midRollAds, setMidRollAds] = useState([]);
  const [bannerAd,   setBannerAd]   = useState(null);
  const [loaded,     setLoaded]     = useState(false);

  useEffect(() => {
    if (isPremium) { setLoaded(true); return; }
    loadAllAds();
  }, [isPremium]);

  async function loadAllAds() {
    try {
      const [pre, mid] = await Promise.all([
        loadAds("pre_roll", userId, isPremium),
        loadAds("mid_roll", userId, isPremium),
      ]);
      if (pre.length > 0) setPreRollAd(pre[Math.floor(Math.random() * pre.length)]);
      setMidRollAds(mid);
      // Banner = random from all ads
      const all = [...pre, ...mid];
      if (all.length > 0) setBannerAd(all[Math.floor(Math.random() * all.length)]);
    } catch (e) {
      // Use fallback ads
      const pre = FALLBACK_ADS.filter(a => a.type === "pre_roll");
      const mid = FALLBACK_ADS.filter(a => a.type === "mid_roll");
      setPreRollAd(pre[Math.floor(Math.random() * pre.length)]);
      setMidRollAds(mid);
      setBannerAd(FALLBACK_ADS[0]);
    }
    setLoaded(true);
  }

  function getRandomMidRoll() {
    if (midRollAds.length === 0) return FALLBACK_ADS.find(a => a.type === "mid_roll");
    return midRollAds[Math.floor(Math.random() * midRollAds.length)];
  }

  return { preRollAd, midRollAds, bannerAd, loaded, getRandomMidRoll };
}

export { loadAds, trackImpression, FALLBACK_ADS };
