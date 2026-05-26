import { useState, useEffect, useRef } from "react";
import Search from "./Search.jsx";

const G = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#0a0a0f;color:#fff;font-family:'Manrope',sans-serif;overflow-x:hidden;}
::-webkit-scrollbar{height:3px;width:4px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
.row-scroll{display:flex;gap:12px;overflow-x:auto;padding-bottom:6px;scroll-behavior:smooth;}
.row-scroll::-webkit-scrollbar{height:2px;}
.row-scroll::-webkit-scrollbar-thumb{background:#222;}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes heroIn{from{opacity:0;transform:scale(1.04);}to{opacity:1;transform:scale(1);}}
@keyframes slideDots{from{width:6px;}to{width:28px;}}
@keyframes shimmer{0%{background-position:200% 0;}100%{background-position:-200% 0;}}
.shimmer-card{background:linear-gradient(90deg,#131318 25%,#1c1c24 50%,#131318 75%);background-size:200% 100%;animation:shimmer 1.4s infinite;}
.card-item{flex:0 0 auto;cursor:pointer;position:relative;transition:transform .22s ease,box-shadow .22s ease;}
.card-item:hover{transform:scale(1.07) translateY(-5px);}
.pill-tab{background:none;border:none;font-family:'Manrope',sans-serif;font-size:13px;font-weight:500;color:#777;padding:7px 14px;cursor:pointer;white-space:nowrap;position:relative;transition:color .2s;}
.pill-tab.active{color:#fff;font-weight:700;}
.pill-tab.active::after{content:'';position:absolute;bottom:-2px;left:14px;right:14px;height:2px;background:#e50914;border-radius:2px;}
.nav-btn{background:none;border:none;color:#aaa;font-size:22px;cursor:pointer;padding:0 6px;transition:color .15s;}
.nav-btn:hover{color:#fff;}
`;

const HERO_ITEMS = [
  {
    id:1, title:"Apex Protocol", subtitle:"Action · Thriller · 2026",
    desc:"An elite soldier has 48 hours to stop a rogue AI before it triggers nuclear war. Time is not a luxury.",
    badge:"", tags:["4K","HDR","Dolby"], rating:"U/A 16+", score:"9.1",
    btnLabel:"▶  Play", btn2:"+ My List",
    grad:"linear-gradient(100deg,#0a0a0f 35%,transparent 70%)",
    bg:"radial-gradient(ellipse at 70% 50%,#e5091430 0%,#0a0a0f 65%)",
    accent:"#e50914", emoji:"🔥", lang:"EN | HI | TA",
  },
  {
    id:2, title:"IPL 2026 Finals", subtitle:"LIVE · Cricket · Mumbai vs Chennai",
    desc:"Super Over decider! 6 runs needed off the last ball. Don't miss the moment.",
    badge:"LIVE", tags:["LIVE","4K","Free"], rating:"U", score:"LIVE",
    btnLabel:"▶  Watch Live", btn2:"Set Reminder",
    grad:"linear-gradient(100deg,#0a0a0f 35%,transparent 70%)",
    bg:"radial-gradient(ellipse at 70% 50%,#00c85330 0%,#0a0a0f 65%)",
    accent:"#00c853", emoji:"🏏", lang:"HI | EN | TA | TE",
  },
  {
    id:3, title:"Rang De Basanti 2", subtitle:"Drama · 2025 · Hindi",
    desc:"A new generation rises in the shadow of forgotten martyrs. A story of fire, friendship and sacrifice.",
    badge:"NEW", tags:["4K","Dolby","Award"], rating:"U/A", score:"9.0",
    btnLabel:"▶  Play", btn2:"+ My List",
    grad:"linear-gradient(100deg,#0a0a0f 35%,transparent 70%)",
    bg:"radial-gradient(ellipse at 70% 50%,#f59e0b28 0%,#0a0a0f 65%)",
    accent:"#f59e0b", emoji:"🎭", lang:"HI | EN",
  },
  {
    id:4, title:"Dark Meridian", subtitle:"Sci-Fi · Series · S1",
    desc:"A wormhole researcher discovers reality is a simulation — and someone is about to pull the plug.",
    badge:"EXCLUSIVE", tags:["4K","HDR"], rating:"U/A 13+", score:"8.8",
    btnLabel:"▶  Watch S1E1", btn2:"+ My List",
    grad:"linear-gradient(100deg,#0a0a0f 35%,transparent 70%)",
    bg:"radial-gradient(ellipse at 70% 50%,#1d9bf030 0%,#0a0a0f 65%)",
    accent:"#1d9bf0", emoji:"🌌", lang:"EN | HI",
  },
];

const CATEGORIES = ["For You","Live","Movies","Series","Sports","News","Kids","Premium"];

const CONTENT_ROWS = [
  {
    id:"live", label:"🔴  Live Now", sublabel:"Don't miss it",
    items:[
      {id:11,title:"IPL Finals",tag:"LIVE",emoji:"🏏",w:160,accent:"#00c853",genre:"Cricket"},
      {id:12,title:"Formula X – Monaco",tag:"LIVE",emoji:"🏎️",w:160,accent:"#e50914",genre:"Racing"},
      {id:13,title:"India Today",tag:"LIVE",emoji:"📺",w:160,accent:"#f97316",genre:"News"},
      {id:14,title:"KBC S16",tag:"LIVE",emoji:"🎙️",w:160,accent:"#f59e0b",genre:"Reality"},
      {id:15,title:"PKL Match",tag:"LIVE",emoji:"🤸",w:160,accent:"#a855f7",genre:"Kabaddi"},
    ]
  },
  {
    id:"continue", label:"⏯  Continue Watching", sublabel:"Pick up where you left off",
    items:[
      {id:21,title:"Dark Meridian",tag:"S1 E3",emoji:"🌌",progress:62,w:200,accent:"#1d9bf0",genre:"Sci-Fi"},
      {id:22,title:"Steel Horizon",tag:"S2 E4",emoji:"🤖",progress:38,w:200,accent:"#64748b",genre:"Action"},
      {id:23,title:"Apex Protocol",tag:"1h 12m left",emoji:"🔥",progress:51,w:200,accent:"#e50914",genre:"Thriller"},
      {id:24,title:"Dusk Protocol",tag:"S3 E2",emoji:"🕵️",progress:20,w:200,accent:"#06b6d4",genre:"Drama"},
    ]
  },
  {
    id:"trending", label:"🔥  Trending Now", sublabel:"Top picks across India",
    items:[
      {id:31,title:"Apex Protocol",tag:"#1",emoji:"🔥",w:150,accent:"#e50914",genre:"Action"},
      {id:32,title:"Bombay Central",tag:"#2",emoji:"🏙️",w:150,accent:"#f59e0b",genre:"Drama"},
      {id:33,title:"Dark Meridian",tag:"#3",emoji:"🌌",w:150,accent:"#1d9bf0",genre:"Sci-Fi"},
      {id:34,title:"Quantum Cascade",tag:"#4",emoji:"⚡",w:150,accent:"#a855f7",genre:"Thriller"},
      {id:35,title:"Steel Horizon",tag:"#5",emoji:"🤖",w:150,accent:"#64748b",genre:"Action"},
      {id:36,title:"Neon Karma",tag:"#6",emoji:"💫",w:150,accent:"#ec4899",genre:"Romance"},
      {id:37,title:"Rang De 2",tag:"#7",emoji:"🎭",w:150,accent:"#f59e0b",genre:"Drama"},
    ]
  },
  {
    id:"movies", label:"🎬  Blockbuster Movies", sublabel:"Fresh off the press",
    items:[
      {id:41,title:"Apex Protocol",tag:"4K",emoji:"🔥",w:140,accent:"#e50914",genre:"Action",year:2026},
      {id:42,title:"Bombay Central",tag:"4K HDR",emoji:"🏙️",w:140,accent:"#f59e0b",genre:"Drama",year:2025},
      {id:43,title:"Quantum Cascade",tag:"HDR",emoji:"⚡",w:140,accent:"#a855f7",genre:"Thriller",year:2026},
      {id:44,title:"Neon Karma",tag:"HD",emoji:"💫",w:140,accent:"#ec4899",genre:"Romance",year:2026},
      {id:45,title:"Red Covenant",tag:"4K",emoji:"🔺",w:140,accent:"#ef4444",genre:"Thriller",year:2025},
      {id:46,title:"Deep Margin",tag:"Award",emoji:"🌊",w:140,accent:"#38bdf8",genre:"Documentary",year:2025},
      {id:47,title:"Iron Syntax",tag:"NEW",emoji:"⚙️",w:140,accent:"#f97316",genre:"Action",year:2026},
    ]
  },
  {
    id:"series", label:"📺  Binge-Worthy Series", sublabel:"Your next obsession",
    items:[
      {id:51,title:"Dark Meridian",tag:"S1",emoji:"🌌",w:150,accent:"#1d9bf0",genre:"Sci-Fi",eps:"8 eps"},
      {id:52,title:"Steel Horizon",tag:"S2",emoji:"🤖",w:150,accent:"#64748b",genre:"Action",eps:"10 eps"},
      {id:53,title:"Dusk Protocol",tag:"S3",emoji:"🕵️",w:150,accent:"#06b6d4",genre:"Drama",eps:"6 eps"},
      {id:54,title:"Hollow Crown",tag:"S1",emoji:"👑",w:150,accent:"#c084fc",genre:"Drama",eps:"12 eps"},
      {id:55,title:"Quiet Cartels",tag:"S2",emoji:"🎭",w:150,accent:"#e879f9",genre:"Crime",eps:"8 eps"},
      {id:56,title:"Pale Frequency",tag:"NEW",emoji:"📡",w:150,accent:"#818cf8",genre:"Sci-Fi",eps:"6 eps"},
    ]
  },
  {
    id:"sports", label:"🏆  Sports Action", sublabel:"Live & upcoming matches",
    items:[
      {id:61,title:"IPL 2026",tag:"LIVE",emoji:"🏏",w:180,accent:"#00c853",genre:"Cricket"},
      {id:62,title:"Formula X",tag:"LIVE",emoji:"🏎️",w:180,accent:"#e50914",genre:"Racing"},
      {id:63,title:"Pro Kabaddi",tag:"Tonight",emoji:"🤸",w:180,accent:"#a855f7",genre:"Kabaddi"},
      {id:64,title:"Premier League",tag:"Sat 9PM",emoji:"⚽",w:180,accent:"#38bdf8",genre:"Football"},
      {id:65,title:"WWE RAW",tag:"Sun 8PM",emoji:"🥊",w:180,accent:"#ef4444",genre:"Wrestling"},
    ]
  },
  {
    id:"premium", label:"👑  StreamX Originals", sublabel:"Only here. Only premium.",
    items:[
      {id:71,title:"Apex Protocol",tag:"ORIGINAL",emoji:"🔥",w:160,accent:"#e50914",genre:"Action"},
      {id:72,title:"Dark Meridian",tag:"ORIGINAL",emoji:"🌌",w:160,accent:"#1d9bf0",genre:"Sci-Fi"},
      {id:73,title:"Rang De 2",tag:"ORIGINAL",emoji:"🎭",w:160,accent:"#f59e0b",genre:"Drama"},
      {id:74,title:"Dusk Protocol",tag:"ORIGINAL",emoji:"🕵️",w:160,accent:"#06b6d4",genre:"Thriller"},
      {id:75,title:"Pale Frequency",tag:"ORIGINAL",emoji:"📡",w:160,accent:"#818cf8",genre:"Sci-Fi"},
    ]
  },
  {
    id:"kids", label:"🧸  Kids Zone", sublabel:"Safe, fun & colourful",
    items:[
      {id:81,title:"Bheem Returns",tag:"NEW",emoji:"🦸",w:140,accent:"#84cc16",genre:"Animation"},
      {id:82,title:"Doraemon S5",tag:"FREE",emoji:"🤖",w:140,accent:"#3b82f6",genre:"Animation"},
      {id:83,title:"Pokémon XY",tag:"HD",emoji:"⚡",w:140,accent:"#f59e0b",genre:"Animation"},
      {id:84,title:"Motu Patlu",tag:"FREE",emoji:"😄",w:140,accent:"#f97316",genre:"Comedy"},
      {id:85,title:"Magic School Bus",tag:"HD",emoji:"🚌",w:140,accent:"#ec4899",genre:"Education"},
    ]
  },
];

const LANG_PILLS = ["All","Hindi","English","Tamil","Telugu","Bengali","Kannada","Malayalam"];

function useInterval(cb, ms) {
  const r = useRef(cb);
  useEffect(()=>{r.current=cb;},[cb]);
  useEffect(()=>{ if(!ms)return; const id=setInterval(()=>r.current(),ms); return()=>clearInterval(id); },[ms]);
}

function HeroSection({ onPlay }) {
  const [idx, setIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  useInterval(()=>{ setIdx(i=>(i+1)%HERO_ITEMS.length); setAnimKey(k=>k+1); }, 6500);

  const h = HERO_ITEMS[idx];

  function goPrev(){ setIdx(i=>(i-1+HERO_ITEMS.length)%HERO_ITEMS.length); setAnimKey(k=>k+1); }
  function goNext(){ setIdx(i=>(i+1)%HERO_ITEMS.length); setAnimKey(k=>k+1); }

  return (
    <div style={{ position:"relative", height:"100vh", minHeight:560, maxHeight:780, overflow:"hidden", background:h.bg, transition:"background 0.8s ease" }}>
      <div style={{
        position:"absolute", right:"-2%", top:"50%", transform:"translateY(-52%)",
        fontSize:"clamp(280px,38vw,520px)", opacity:0.07, zIndex:0, userSelect:"none",
        filter:"blur(1px)", transition:"all 0.8s ease",
      }}>{h.emoji}</div>

      <div style={{ position:"absolute", inset:0, background:h.grad, zIndex:1 }}/>
      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:"55%", background:"linear-gradient(to top,#0a0a0f 0%,transparent 100%)", zIndex:2 }}/>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"30%", background:"linear-gradient(to bottom,rgba(10,10,15,0.6),transparent)", zIndex:2 }}/>

      <div key={animKey} style={{
        position:"absolute", zIndex:10, left:0, right:0, bottom:0,
        padding:"0 5vw 64px",
        animation:"fadeUp 0.55s ease forwards",
      }}>
        {h.badge && (
          <div style={{ display:"inline-flex", alignItems:"center", gap:7,
            background: h.badge==="LIVE"?"#e50914": h.badge==="NEW"?"#00c853": h.badge==="EXCLUSIVE"?"#1d9bf0":"#f59e0b",
            color:"#fff", padding:"4px 14px", borderRadius:4, fontSize:11, fontWeight:800,
            marginBottom:14, letterSpacing:2,
            animation: h.badge==="LIVE"?"pulse 1.8s infinite":undefined,
          }}>
            {h.badge==="LIVE" && <span style={{ width:7,height:7,background:"#fff",borderRadius:"50%",display:"inline-block" }}/>}
            {h.badge}
          </div>
        )}

        <div style={{
          fontFamily:"'Bebas Neue',sans-serif",
          fontSize:"clamp(42px,6vw,80px)",
          lineHeight:0.93, letterSpacing:1,
          color:"#fff", marginBottom:14,
          textShadow:"0 4px 32px rgba(0,0,0,0.6)",
          maxWidth:640,
        }}>{h.title}</div>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, flexWrap:"wrap" }}>
          <span style={{ fontSize:13, color:"rgba(255,255,255,0.65)", fontWeight:500 }}>{h.subtitle}</span>
          <span style={{ width:3,height:3,borderRadius:"50%",background:"#555" }}/>
          <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{h.lang}</span>
        </div>

        <div style={{ display:"flex", gap:6, marginBottom:16, flexWrap:"wrap" }}>
          {h.tags.map(t=>(
            <span key={t} style={{ background:"rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.8)", fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:4, letterSpacing:1, backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.1)" }}>{t}</span>
          ))}
          <span style={{ background:"rgba(0,0,0,0.4)", color:"rgba(255,255,255,0.5)", fontSize:10, padding:"3px 9px", borderRadius:4, backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.06)" }}>{h.rating}</span>
          {h.score!=="LIVE" && <span style={{ background:"rgba(245,158,11,0.15)", color:"#f59e0b", fontSize:10, fontWeight:700, padding:"3px 9px", borderRadius:4 }}>★ {h.score}</span>}
        </div>

        <div style={{ fontSize:14, color:"rgba(255,255,255,0.55)", maxWidth:480, lineHeight:1.7, marginBottom:28 }}>{h.desc}</div>

        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          <button onClick={()=>onPlay(h)} style={{
            display:"flex", alignItems:"center", gap:10,
            background:h.badge==="LIVE"?"#e50914":"#fff",
            color:h.badge==="LIVE"?"#fff":"#0a0a0f",
            border:"none", borderRadius:8, padding:"13px 28px",
            fontFamily:"'Manrope',sans-serif", fontWeight:800, fontSize:14,
            cursor:"pointer", letterSpacing:0.3,
          }}>{h.btnLabel}</button>
          <button style={{
            background:"rgba(255,255,255,0.1)", color:"#fff",
            border:"1px solid rgba(255,255,255,0.2)", borderRadius:8, padding:"13px 22px",
            fontFamily:"'Manrope',sans-serif", fontWeight:600, fontSize:14, cursor:"pointer",
            backdropFilter:"blur(10px)",
          }}>{h.btn2}</button>
          <button style={{
            background:"rgba(255,255,255,0.08)", color:"#aaa",
            border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"13px 18px",
            fontFamily:"'Manrope',sans-serif", fontSize:14, cursor:"pointer",
            backdropFilter:"blur(10px)",
          }}>ⓘ</button>
        </div>
      </div>

      <button onClick={goPrev} className="nav-btn" style={{ position:"absolute", left:16, top:"50%", transform:"translateY(-50%)", zIndex:20, width:40, height:40, borderRadius:"50%", background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>‹</button>
      <button onClick={goNext} className="nav-btn" style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", zIndex:20, width:40, height:40, borderRadius:"50%", background:"rgba(0,0,0,0.5)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>›</button>

      <div style={{ position:"absolute", bottom:20, left:"50%", transform:"translateX(-50%)", zIndex:20, display:"flex", gap:6, alignItems:"center" }}>
        {HERO_ITEMS.map((_,i)=>(
          <div key={i} onClick={()=>{setIdx(i);setAnimKey(k=>k+1);}} style={{
            height:4, borderRadius:2, cursor:"pointer", transition:"all 0.4s",
            width: i===idx?28:6,
            background: i===idx ? h.accent : "rgba(255,255,255,0.25)",
          }}/>
        ))}
      </div>
    </div>
  );
}

function LiveCard({ item, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div className="card-item" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={()=>onClick(item)}
      style={{ width:160, borderRadius:10, overflow:"hidden", border:`1.5px solid ${h?item.accent+"88":"#1c1c24"}`, boxShadow:h?`0 8px 32px ${item.accent}33`:"none", transition:"all .22s", background:"#0f0f16" }}>
      <div style={{ height:90, background:`linear-gradient(135deg,${item.accent}22,#0a0a0f)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:38, position:"relative" }}>
        {item.emoji}
        <div style={{ position:"absolute", top:6, left:6, background:"#e50914", color:"#fff", fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:3, letterSpacing:2, animation:"pulse 1.8s infinite", display:"flex", gap:4, alignItems:"center" }}>
          <span style={{ width:5,height:5,borderRadius:"50%",background:"#fff",display:"inline-block" }}/>LIVE
        </div>
        {h && <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>▶</div>}
      </div>
      <div style={{ padding:"8px 10px 10px" }}>
        <div style={{ fontWeight:700, fontSize:12, marginBottom:3 }}>{item.title}</div>
        <div style={{ fontSize:10, color:item.accent, fontWeight:600 }}>{item.genre}</div>
      </div>
    </div>
  );
}

function ContinueCard({ item, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div className="card-item" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={()=>onClick(item)}
      style={{ width:200, borderRadius:10, overflow:"hidden", border:`1.5px solid ${h?item.accent+"77":"#1c1c24"}`, boxShadow:h?`0 10px 36px ${item.accent}22`:"none", transition:"all .22s", background:"#0f0f16" }}>
      <div style={{ height:110, background:`linear-gradient(135deg,${item.accent}20,#0a0a0f)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, position:"relative" }}>
        {item.emoji}
        {h && <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:44, height:44, borderRadius:"50%", background:item.accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>▶</div>
        </div>}
      </div>
      <div style={{ height:3, background:"#1a1a24" }}>
        <div style={{ height:"100%", width:`${item.progress}%`, background:item.accent, borderRadius:2 }}/>
      </div>
      <div style={{ padding:"8px 10px 10px" }}>
        <div style={{ fontWeight:700, fontSize:12, marginBottom:3 }}>{item.title}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:10, color:"#555", fontWeight:500 }}>{item.tag}</span>
          <span style={{ fontSize:10, color:item.accent }}>{item.progress}%</span>
        </div>
      </div>
    </div>
  );
}

function RankCard({ item, rank, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div className="card-item" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={()=>onClick(item)}
      style={{ width:150, position:"relative" }}>
      <div style={{
        position:"absolute", bottom:-10, left:-4, zIndex:1,
        fontFamily:"'Bebas Neue',sans-serif", fontSize:96,
        color:"#111", WebkitTextStroke:"2px #1c1c24",
        lineHeight:1, userSelect:"none", pointerEvents:"none",
      }}>{rank}</div>
      <div style={{ position:"relative", zIndex:2, borderRadius:8, overflow:"hidden", border:`1.5px solid ${h?item.accent+"77":"#1c1c24"}`, boxShadow:h?`0 8px 28px ${item.accent}28`:"none", transition:"all .22s" }}>
        <div style={{ height:100, background:`linear-gradient(135deg,${item.accent}22,#0a0a0f)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:38 }}>
          {item.emoji}
          {h && <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ width:38,height:38,borderRadius:"50%",background:item.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>▶</div>
          </div>}
        </div>
        <div style={{ padding:"8px 10px 10px", background:"#0f0f16" }}>
          <div style={{ fontWeight:700, fontSize:12, marginBottom:3 }}>{item.title}</div>
          <div style={{ fontSize:10, color:item.accent, fontWeight:600 }}>{item.genre}</div>
        </div>
      </div>
    </div>
  );
}

function PosterCard({ item, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div className="card-item" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={()=>onClick(item)}
      style={{ width:item.w||140, borderRadius:10, overflow:"hidden", border:`1.5px solid ${h?item.accent+"77":"#1c1c24"}`, boxShadow:h?`0 10px 36px ${item.accent}28`:"none", transition:"all .22s", background:"#0f0f16" }}>
      <div style={{ height:item.w?item.w*0.7:98, background:`linear-gradient(135deg,${item.accent}22,#0a0a0f)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:42, position:"relative" }}>
        {item.emoji}
        {item.tag && (
          <div style={{ position:"absolute", top:6, right:6, background: item.tag==="LIVE"?"#e50914":item.tag==="ORIGINAL"?"linear-gradient(135deg,#e50914,#ff6b35)":item.tag==="NEW"?"#00c853":"rgba(0,0,0,0.65)", color:"#fff", fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:3, letterSpacing:1 }}>{item.tag}</div>
        )}
        {h && <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:40,height:40,borderRadius:"50%",background:item.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>▶</div>
        </div>}
      </div>
      <div style={{ padding:"8px 10px 10px" }}>
        <div style={{ fontWeight:700, fontSize:12, marginBottom:3 }}>{item.title}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:10, color:item.accent, fontWeight:500 }}>{item.genre}</span>
          {item.eps && <span style={{ fontSize:9, color:"#444" }}>{item.eps}</span>}
          {item.year && <span style={{ fontSize:9, color:"#444" }}>{item.year}</span>}
        </div>
      </div>
    </div>
  );
}

function WideCard({ item, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div className="card-item" onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)} onClick={()=>onClick(item)}
      style={{ width:item.w||180, borderRadius:10, overflow:"hidden", border:`1.5px solid ${h?item.accent+"77":"#1c1c24"}`, boxShadow:h?`0 10px 36px ${item.accent}28`:"none", transition:"all .22s", background:"#0f0f16" }}>
      <div style={{ height:100, background:`linear-gradient(135deg,${item.accent}22,#0a0a0f)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:42, position:"relative" }}>
        {item.emoji}
        {item.tag==="LIVE" && (
          <div style={{ position:"absolute", top:6, left:6, background:"#e50914", color:"#fff", fontSize:9, fontWeight:800, padding:"2px 7px", borderRadius:3, letterSpacing:2, animation:"pulse 1.8s infinite", display:"flex", gap:4, alignItems:"center" }}>
            <span style={{ width:5,height:5,borderRadius:"50%",background:"#fff",display:"inline-block" }}/>LIVE
          </div>
        )}
        {item.tag && item.tag!=="LIVE" && <div style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,0.65)", color:"#aaa", fontSize:9, padding:"2px 7px", borderRadius:3, fontWeight:600 }}>{item.tag}</div>}
        {h && <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center" }}>
          <div style={{ width:40,height:40,borderRadius:"50%",background:item.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15 }}>▶</div>
        </div>}
      </div>
      <div style={{ padding:"10px 12px 12px" }}>
        <div style={{ fontWeight:700, fontSize:13, marginBottom:3 }}>{item.title}</div>
        <div style={{ fontSize:10, color:item.accent, fontWeight:500 }}>{item.genre}</div>
      </div>
    </div>
  );
}

function ContentRow({ row, onPlay }) {
  const scrollRef = useRef(null);
  function scroll(dir){ scrollRef.current.scrollBy({ left:dir*340, behavior:"smooth" }); }

  const renderCard = (item) => {
    if (row.id==="live") return <LiveCard key={item.id} item={item} onClick={onPlay} />;
    if (row.id==="continue") return <ContinueCard key={item.id} item={item} onClick={onPlay} />;
    if (row.id==="trending") return <RankCard key={item.id} item={item} rank={item.tag} onClick={onPlay} />;
    if (row.id==="sports") return <WideCard key={item.id} item={item} onClick={onPlay} />;
    return <PosterCard key={item.id} item={item} onClick={onPlay} />;
  };

  return (
    <div style={{ marginBottom:36 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:14, padding:"0 4vw" }}>
        <div>
          <div style={{ fontWeight:800, fontSize:17, letterSpacing:0.2 }}>{row.label}</div>
          <div style={{ fontSize:11, color:"#555", marginTop:2 }}>{row.sublabel}</div>
        </div>
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          <span style={{ fontSize:12, color:"#e50914", fontWeight:600, cursor:"pointer" }}>See all →</span>
          <button onClick={()=>scroll(-1)} className="nav-btn" style={{ width:28,height:28,borderRadius:"50%",background:"#1a1a24",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>‹</button>
          <button onClick={()=>scroll(1)} className="nav-btn" style={{ width:28,height:28,borderRadius:"50%",background:"#1a1a24",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14 }}>›</button>
        </div>
      </div>
      <div ref={scrollRef} className="row-scroll" style={{ padding:`0 4vw 10px` }}>
        {row.items.map(renderCard)}
      </div>
    </div>
  );
}

function Navbar({ activeCat, setActiveCat, onLogoClick, onSearchClick, user, onUpgrade }) {
  const [scrolled, setScrolled] = useState(false);
  const catRef = useRef(null);

  useEffect(()=>{
    const fn = ()=>setScrolled(window.scrollY>10);
    window.addEventListener("scroll",fn);
    return()=>window.removeEventListener("scroll",fn);
  },[]);

  return (
    <nav style={{
      position:"fixed", top:0, left:0, right:0, zIndex:200,
      background:scrolled?"rgba(10,10,15,0.97)":"transparent",
      backdropFilter:scrolled?"blur(16px)":"none",
      borderBottom:scrolled?"1px solid rgba(255,255,255,0.05)":"none",
      transition:"background 0.3s, backdrop-filter 0.3s",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:20, padding:"0 4vw", height:58 }}>
        <div onClick={onLogoClick} style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:2, cursor:"pointer", flexShrink:0, lineHeight:1 }}>
          <span style={{ color:"#e50914" }}>STREAM</span><span style={{ color:"#fff" }}>X</span>
        </div>

        <div style={{ display:"flex", gap:4, flexShrink:0 }}>
          {LANG_PILLS.slice(0,4).map(l=>(
            <button key={l} className="pill-tab" style={{ fontSize:12, padding:"5px 10px" }}>{l}</button>
          ))}
        </div>

        <div style={{ flex:1 }}/>

        {/* Search button */}
        <button onClick={onSearchClick} style={{
          display:"flex", alignItems:"center", gap:8,
          background:"rgba(255,255,255,0.07)",
          border:"1px solid #2a2a36",
          borderRadius:8, padding:"7px 14px",
          color:"#aaa", fontSize:13, cursor:"pointer",
        }}>
          🔍 <span style={{ fontSize:12 }}>Search</span>
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <button onClick={onUpgrade} style={{ background:"rgba(229,9,20,0.12)", border:"1px solid rgba(229,9,20,0.3)", color:"#e50914", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>
            👑 Premium
          </button>
          <div style={{ width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#e50914,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,cursor:"pointer" }}>
            {user?.name?.[0]?.toUpperCase() || "👤"}
          </div>
        </div>
      </div>

      <div ref={catRef} style={{ display:"flex", gap:0, overflowX:"auto", padding:"0 4vw", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
        {CATEGORIES.map(cat=>(
          <button key={cat} className={`pill-tab${activeCat===cat?" active":""}`} onClick={()=>setActiveCat(cat)}>
            {cat}
          </button>
        ))}
      </div>
    </nav>
  );
}

function NowPlayingBar({ item, onClose }) {
  if(!item) return null;
  return (
    <div style={{
      position:"fixed", bottom:0, left:0, right:0, zIndex:300,
      background:"linear-gradient(to right,#0f0f16,#16161f)",
      borderTop:`2px solid ${item.accent||"#e50914"}`,
      padding:"12px 4vw",
      display:"flex", alignItems:"center", gap:16,
      animation:"fadeUp 0.3s ease",
    }}>
      <div style={{ fontSize:28 }}>{item.emoji||"🎬"}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:14 }}>{item.title}</div>
        <div style={{ fontSize:11, color:"#555" }}>Now Playing</div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        <button style={{ background:"#fff", color:"#111", border:"none", borderRadius:6, padding:"7px 20px", fontWeight:700, fontSize:13, cursor:"pointer" }}>▶ Resume</button>
        <button onClick={onClose} style={{ background:"none", border:"1px solid #333", color:"#888", borderRadius:6, padding:"7px 14px", fontSize:13, cursor:"pointer" }}>✕</button>
      </div>
    </div>
  );
}

export default function StreamXHome({ onNavigate, user, onUpgrade }) {
  const [activeCat,   setActiveCat]   = useState("For You");
  const [nowPlaying,  setNowPlaying]  = useState(null);
  const [showSearch,  setShowSearch]  = useState(false);

  function handlePlay(item){ setNowPlaying(item); }

  const visibleRows =
    activeCat==="For You" ? CONTENT_ROWS
    : activeCat==="Live"    ? CONTENT_ROWS.filter(r=>r.id==="live")
    : activeCat==="Movies"  ? CONTENT_ROWS.filter(r=>r.id==="movies"||r.id==="trending")
    : activeCat==="Series"  ? CONTENT_ROWS.filter(r=>r.id==="series"||r.id==="continue")
    : activeCat==="Sports"  ? CONTENT_ROWS.filter(r=>r.id==="sports"||r.id==="live")
    : activeCat==="Kids"    ? CONTENT_ROWS.filter(r=>r.id==="kids")
    : activeCat==="Premium" ? CONTENT_ROWS.filter(r=>r.id==="premium")
    : CONTENT_ROWS;

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0f", paddingBottom:nowPlaying?80:0 }}>
      <style>{G}</style>

      {/* Search overlay */}
      {showSearch && (
        <Search
          onPlay={(item) => { setNowPlaying(item); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}

      <Navbar
        activeCat={activeCat}
        setActiveCat={v=>{ setActiveCat(v); }}
        onLogoClick={()=>{ setActiveCat("For You"); }}
        onSearchClick={() => setShowSearch(true)}
        user={user}
        onUpgrade={onUpgrade}
      />

      {activeCat==="For You" && (
        <HeroSection onPlay={handlePlay} />
      )}

      {activeCat!=="For You" && (
        <div style={{ height:106 }}/>
      )}

      <div style={{ paddingTop: activeCat==="For You" ? 32 : 16 }}>
        {visibleRows.map(row=>(
          row.items.length > 0 &&
          <ContentRow key={row.id} row={row} onPlay={handlePlay} />
        ))}
      </div>

      {activeCat==="For You" && (
        <div style={{ margin:"8px 4vw 40px", borderRadius:16, overflow:"hidden", background:"linear-gradient(120deg,#e50914 0%,#ff6b35 50%,#e50914 100%)", backgroundSize:"200% 100%", padding:"28px 36px", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
          <div>
            <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:28, letterSpacing:1, marginBottom:6 }}>Unlock StreamX Premium</div>
            <div style={{ fontSize:13, color:"rgba(255,255,255,0.75)", maxWidth:480 }}>4K · HDR · Dolby Atmos · 4 screens · Offline downloads · No ads</div>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:28, fontWeight:900 }}>₹499<span style={{ fontSize:14, fontWeight:400 }}>/mo</span></div>
              <div style={{ fontSize:11, opacity:0.7 }}>or ₹999/year</div>
            </div>
            <button onClick={onUpgrade} style={{ background:"#fff", color:"#e50914", border:"none", borderRadius:8, padding:"12px 24px", fontWeight:800, fontSize:14, cursor:"pointer", whiteSpace:"nowrap" }}>Subscribe Now</button>
          </div>
        </div>
      )}

      <div style={{ textAlign:"center", padding:"24px 0 40px", color:"#2a2a36", fontSize:12 }}>
        © 2026 StreamX · All rights reserved
      </div>

      <NowPlayingBar item={nowPlaying} onClose={()=>setNowPlaying(null)} />
    </div>
  );
}
