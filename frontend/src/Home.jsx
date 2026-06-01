import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";
import VideoPlayer from "./VideoPlayer.jsx";
import Search from "./Search.jsx";

/* ─── Global styles ─────────────────────── */
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html{scroll-behavior:smooth;}
body{background:#0a0a0f;color:#fff;font-family:'Manrope',sans-serif;overflow-x:hidden;}
::-webkit-scrollbar{height:2px;width:3px;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
.row-scroll{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;scroll-behavior:smooth;}
.row-scroll::-webkit-scrollbar{height:0;}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes shimmer{0%{opacity:.3;}50%{opacity:.7;}100%{opacity:.3;}}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
.card-hover{transition:transform .22s,box-shadow .22s,border-color .22s;cursor:pointer;}
.card-hover:hover{transform:scale(1.06) translateY(-4px);}
@media(max-width:600px){.card-hover:hover{transform:none;}}
.pill{background:none;border:none;font-family:'Manrope',sans-serif;font-size:13px;font-weight:600;color:#666;padding:7px 14px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:color .18s,border-color .18s;}
.pill.on{color:#fff;font-weight:700;border-bottom-color:#e50914;}
/* Responsive grid */
@media(max-width:480px){
  .hero-title{font-size:32px!important;}
  .hero-desc{display:none!important;}
  .nav-lang{display:none!important;}
}
@media(min-width:1200px){
  .row-scroll{gap:16px;}
}
`;

/* ─── Constants ──────────────────────────── */
const CATS = ["For You","Live","Movies","Series","Sports","Kids","Premium","News"];

const LANG_OPTIONS = [
  { code:"all",   label:"All",      flag:"🌐" },
  { code:"hi",    label:"Hindi",    flag:"🇮🇳" },
  { code:"en",    label:"English",  flag:"🇬🇧" },
  { code:"kn",    label:"Kannada",  flag:"🇮🇳" },
  { code:"ta",    label:"Tamil",    flag:"🇮🇳" },
  { code:"te",    label:"Telugu",   flag:"🇮🇳" },
  { code:"bn",    label:"Bengali",  flag:"🇮🇳" },
  { code:"ml",    label:"Malayalam",flag:"🇮🇳" },
  { code:"pa",    label:"Punjabi",  flag:"🇮🇳" },
  { code:"mr",    label:"Marathi",  flag:"🇮🇳" },
];

const LANG_MAP = {
  Hindi:"hi", English:"en", Kannada:"kn", Tamil:"ta",
  Telugu:"te", Bengali:"bn", Malayalam:"ml", Punjabi:"pa", Marathi:"mr",
};

const GENRE_COLOR = {
  Action:"#e50914", Drama:"#f59e0b", "Sci-Fi":"#1d9bf0",
  Thriller:"#a855f7", Horror:"#f87171", Romance:"#ec4899",
  Comedy:"#84cc16", Kids:"#84cc16", Cricket:"#00c853",
  Racing:"#e50914", Football:"#38bdf8", News:"#f97316",
  Sports:"#00c853", Documentary:"#38bdf8", Nature:"#22c55e",
  Kabaddi:"#a855f7", Wrestling:"#ef4444", default:"#64748b",
};

const GENRE_EMOJI = {
  Action:"💥", Drama:"🎭", "Sci-Fi":"🌌", Thriller:"🔪",
  Horror:"👻", Romance:"💕", Comedy:"😄", Kids:"🧸",
  Cricket:"🏏", Racing:"🏎️", Football:"⚽", News:"📺",
  Sports:"🏆", Documentary:"🎥", Nature:"🌊", default:"🎬",
};

function getColor(item) { return GENRE_COLOR[item?.genre] || GENRE_COLOR.default; }
function getEmoji(item) { return GENRE_EMOJI[item?.genre] || GENRE_EMOJI.default; }

/* ─── Universal Player ───────────────────── */
function UniversalPlayer({ content, user, onClose }) {
  if (!content) return null;
  const url = content.embed_url || content.stream_url || "";
  const isYT = url.includes("youtube.com") || url.includes("youtu.be");
  const useIframe = !!(content.embed_url || isYT);

  function toEmbed(u) {
    if (!u) return "";
    try {
      if (u.includes("youtube.com/watch?v=")) {
        const id = new URL(u).searchParams.get("v");
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
      }
      if (u.includes("youtu.be/")) {
        const id = u.split("youtu.be/")[1]?.split("?")[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      }
      if (u.includes("youtube.com/embed/")) return u.includes("autoplay") ? u : u+"?autoplay=1";
    } catch(e) {}
    return u;
  }

  if (useIframe) {
    return (
      <div style={{position:"fixed",inset:0,zIndex:700,background:"#000",display:"flex",flexDirection:"column",fontFamily:"'Manrope',sans-serif"}}>
        <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}`}</style>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"clamp(10px,2vw,14px) clamp(14px,4vw,20px)",background:"rgba(0,0,0,.96)",borderBottom:"1px solid #1a1a26",flexShrink:0}}>
          <button onClick={onClose} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.12)",color:"#fff",fontSize:18,cursor:"pointer",borderRadius:8,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>←</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:700,fontSize:"clamp(13px,2.5vw,16px)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{content.title}</div>
            <div style={{fontSize:11,color:"#555"}}>{content.type} · {content.genre}{content.language?` · ${content.language}`:""}</div>
          </div>
          {(content.is_live||content.type==="Live") && (
            <div style={{background:"#e50914",color:"#fff",fontSize:10,fontWeight:800,padding:"4px 14px",borderRadius:20,letterSpacing:2,animation:"pulse 1.5s infinite",flexShrink:0}}>● LIVE</div>
          )}
          <button onClick={onClose} style={{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.1)",color:"#aaa",borderRadius:8,padding:"6px 14px",fontSize:12,cursor:"pointer",flexShrink:0}}>✕ Close</button>
        </div>
        <div style={{flex:1,position:"relative",background:"#000"}}>
          <iframe src={toEmbed(content.embed_url||url)} style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen title={content.title}/>
        </div>
      </div>
    );
  }
  return <VideoPlayer content={content} user={user} onClose={onClose} onNext={()=>{}} />;
}

/* ─── Content Card ───────────────────────── */
function ContentCard({ item, onPlay }) {
  const [hov, setHov] = useState(false);
  const color  = getColor(item);
  const emoji  = getEmoji(item);
  const isLive = item.is_live || item.type === "Live";

  return (
    <div
      className="card-hover"
      onMouseEnter={()=>setHov(true)}
      onMouseLeave={()=>setHov(false)}
      onTouchStart={()=>setHov(true)}
      onTouchEnd={()=>setHov(false)}
      onClick={()=>onPlay(item)}
      style={{
        flex:"0 0 clamp(140px,30vw,168px)",
        borderRadius:10,overflow:"hidden",
        border:`1.5px solid ${hov?color+"88":"#1c1c24"}`,
        background:"#0f0f16",
        boxShadow:hov?`0 10px 32px ${color}33`:"none",
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height:"clamp(88px,18vw,108px)",
        position:"relative",overflow:"hidden",
        background:item.thumbnail?`url(${item.thumbnail}) center/cover`:`linear-gradient(135deg,${color}22,#0a0a0f)`,
        display:"flex",alignItems:"center",justifyContent:"center",
      }}>
        {!item.thumbnail && <span style={{fontSize:"clamp(32px,8vw,44px)"}}>{emoji}</span>}
        {/* Live badge */}
        {isLive && (
          <div style={{position:"absolute",top:6,left:6,background:"#e50914",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:3,letterSpacing:2,animation:"pulse 1.5s infinite",display:"flex",gap:3,alignItems:"center"}}>
            <span style={{width:5,height:5,background:"#fff",borderRadius:"50%",display:"inline-block"}}/>LIVE
          </div>
        )}
        {/* Premium badge */}
        {item.is_premium && !isLive && (
          <div style={{position:"absolute",top:6,right:6,background:"rgba(229,9,20,.9)",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3}}>PRO</div>
        )}
        {/* Play overlay */}
        {hov && (
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <div style={{width:40,height:40,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:900}}>▶</div>
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{padding:"8px 10px 10px"}}>
        <div style={{fontWeight:700,fontSize:12,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:10,color,fontWeight:600}}>{item.genre}</span>
          {item.score>0 && <span style={{fontSize:10,color:"#f59e0b"}}>★ {item.score}</span>}
        </div>
      </div>
    </div>
  );
}

/* ─── Content Row ────────────────────────── */
function ContentRow({ label, items, onPlay }) {
  const ref = useRef(null);
  if (!items?.length) return null;
  return (
    <div style={{marginBottom:"clamp(24px,4vw,36px)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,padding:"0 clamp(14px,4vw,24px)"}}>
        <div style={{fontWeight:800,fontSize:"clamp(14px,3vw,17px)"}}>{label}</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>ref.current?.scrollBy({left:-300,behavior:"smooth"})} style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,.08)",border:"none",color:"#aaa",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          <button onClick={()=>ref.current?.scrollBy({left:300,behavior:"smooth"})}  style={{width:26,height:26,borderRadius:"50%",background:"rgba(255,255,255,.08)",border:"none",color:"#aaa",cursor:"pointer",fontSize:14,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
      </div>
      <div ref={ref} className="row-scroll" style={{padding:`0 clamp(14px,4vw,24px) 6px`}}>
        {items.map(item=><ContentCard key={item.id} item={item} onPlay={onPlay}/>)}
      </div>
    </div>
  );
}

/* ─── Hero Banner ────────────────────────── */
function Hero({ items, onPlay }) {
  const [idx, setIdx] = useState(0);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(()=>{ setIdx(i=>(i+1)%items.length); setKey(k=>k+1); }, 6000);
    return ()=>clearInterval(t);
  }, [items.length]);

  if (!items.length) return <div style={{height:"55vh",background:"#0a0a0f"}}/>;
  const h = items[idx];
  const color = getColor(h);

  return (
    <div style={{
      position:"relative",
      height:"clamp(320px,60vh,700px)",
      overflow:"hidden",
      background:`radial-gradient(ellipse at 70% 50%,${color}28,#0a0a0f 65%)`,
    }}>
      {/* BG thumbnail */}
      {h.thumbnail && (
        <div style={{
          position:"absolute",right:0,top:0,bottom:0,
          width:"clamp(50%,60%,65%)",
          background:`url(${h.thumbnail}) center/cover`,
          maskImage:"linear-gradient(to left,rgba(0,0,0,.7),transparent)",
          WebkitMaskImage:"linear-gradient(to left,rgba(0,0,0,.7),transparent)",
        }}/>
      )}
      {/* BG emoji */}
      {!h.thumbnail && (
        <div style={{position:"absolute",right:"-2%",top:"50%",transform:"translateY(-52%)",fontSize:"clamp(180px,28vw,400px)",opacity:.06,userSelect:"none"}}>
          {getEmoji(h)}
        </div>
      )}
      {/* Gradients */}
      <div style={{position:"absolute",inset:0,background:`linear-gradient(100deg,#0a0a0f 38%,transparent 68%)`}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"55%",background:"linear-gradient(to top,#0a0a0f,transparent)"}}/>
      <div style={{position:"absolute",top:0,left:0,right:0,height:"30%",background:"linear-gradient(to bottom,rgba(10,10,15,.5),transparent)"}}/>

      {/* Content */}
      <div key={key} style={{position:"absolute",bottom:"clamp(50px,8vh,80px)",left:0,right:0,padding:"0 clamp(14px,5vw,40px)",animation:"fadeUp .5s ease"}}>
        {h.is_live && (
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#e50914",color:"#fff",padding:"3px 12px",borderRadius:4,fontSize:10,fontWeight:800,marginBottom:10,letterSpacing:2,animation:"pulse 1.5s infinite"}}>
            <span style={{width:6,height:6,background:"#fff",borderRadius:"50%"}}/>LIVE NOW
          </div>
        )}
        <div className="hero-title" style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(32px,7vw,72px)",lineHeight:.95,marginBottom:10,maxWidth:560,letterSpacing:1}}>
          {h.title}
        </div>
        <div className="hero-desc" style={{fontSize:"clamp(12px,1.8vw,14px)",color:"rgba(255,255,255,.55)",maxWidth:440,lineHeight:1.6,marginBottom:18}}>
          {h.description}
        </div>
        {/* Meta */}
        <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
          {h.rating && <span style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",fontSize:10,padding:"3px 8px",borderRadius:4,fontWeight:600}}>{h.rating}</span>}
          {h.language && <span style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.7)",fontSize:10,padding:"3px 8px",borderRadius:4}}>{h.language}</span>}
          {h.score>0 && <span style={{background:"rgba(245,158,11,.15)",color:"#f59e0b",fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:4}}>★ {h.score}</span>}
        </div>
        {/* Buttons */}
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>onPlay(h)} style={{background:h.is_live?"#e50914":"#fff",color:h.is_live?"#fff":"#111",border:"none",borderRadius:9,padding:"clamp(10px,2vw,13px) clamp(20px,4vw,28px)",fontWeight:800,fontSize:"clamp(13px,2vw,15px)",cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
            ▶ {h.is_live?"Watch Live":"Play Now"}
          </button>
          <button style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:9,padding:"clamp(10px,2vw,13px) clamp(16px,3vw,22px)",fontSize:"clamp(13px,2vw,15px)",cursor:"pointer"}}>
            + My List
          </button>
        </div>
      </div>

      {/* Dots */}
      <div style={{position:"absolute",bottom:"clamp(14px,3vh,20px)",left:"50%",transform:"translateX(-50%)",display:"flex",gap:6}}>
        {items.slice(0,5).map((_,i)=>(
          <div key={i} onClick={()=>{setIdx(i);setKey(k=>k+1);}} style={{height:4,borderRadius:2,cursor:"pointer",transition:"all .3s",width:i===idx?24:6,background:i===idx?color:"rgba(255,255,255,.2)"}}/>
        ))}
      </div>
    </div>
  );
}

/* ─── Skeleton Loader ────────────────────── */
function Skeleton() {
  return (
    <div style={{padding:"clamp(14px,4vw,24px)",paddingTop:110}}>
      {[1,2,3].map(i=>(
        <div key={i} style={{marginBottom:32}}>
          <div style={{height:18,width:160,background:"#1a1a26",borderRadius:6,marginBottom:14,animation:"shimmer 1.5s infinite"}}/>
          <div style={{display:"flex",gap:12}}>
            {[1,2,3,4].map(j=>(
              <div key={j} style={{width:"clamp(140px,30vw,168px)",height:"clamp(110px,22vw,130px)",background:"#1a1a26",borderRadius:10,flexShrink:0,animation:"shimmer 1.5s infinite",animationDelay:`${j*0.1}s`}}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Language Selector ──────────────────── */
function LangSelector({ selected, onChange, show, onToggle }) {
  if (!show) return null;
  return (
    <div style={{position:"absolute",top:"100%",right:0,marginTop:8,background:"#111120",border:"1px solid #1a1a2c",borderRadius:12,padding:8,minWidth:160,zIndex:300,boxShadow:"0 8px 32px rgba(0,0,0,.7)",animation:"fadeIn .18s ease"}}>
      {LANG_OPTIONS.map(l=>(
        <button key={l.code} onClick={()=>{onChange(l.code);onToggle();}} style={{
          display:"flex",alignItems:"center",gap:10,width:"100%",
          background:selected===l.code?"rgba(229,9,20,.15)":"none",
          border:"none",color:selected===l.code?"#e50914":"#aaa",
          padding:"8px 12px",fontSize:13,cursor:"pointer",borderRadius:8,
          fontFamily:"'Manrope',sans-serif",fontWeight:selected===l.code?700:400,
          textAlign:"left",
        }}>
          <span>{l.flag}</span><span>{l.label}</span>
          {selected===l.code&&<span style={{marginLeft:"auto"}}>✓</span>}
        </button>
      ))}
    </div>
  );
}

/* ─── Main Home ──────────────────────────── */
export default function Home({ onNavigate, user, onUpgrade, onSearch }) {
  const [cat,        setCat]        = useState("For You");
  const [content,    setContent]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [playItem,   setPlayItem]   = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const [lang,       setLang]       = useState("all");
  const [showLang,   setShowLang]   = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const langRef = useRef(null);

  useEffect(() => {
    loadContent();
    const fn = ()=>setScrolled(window.scrollY>10);
    window.addEventListener("scroll",fn);
    // Close lang dropdown on outside click
    const close = e => { if(langRef.current && !langRef.current.contains(e.target)) setShowLang(false); };
    document.addEventListener("mousedown",close);
    return ()=>{ window.removeEventListener("scroll",fn); document.removeEventListener("mousedown",close); };
  }, []);

  // Realtime updates from Supabase
  useEffect(() => {
    const ch = supabase.channel("content-live")
      .on("postgres_changes",{event:"*",schema:"public",table:"content"},()=>loadContent())
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  }, []);

  async function loadContent() {
    setLoading(true);
    try {
      const data = await db.getAllContent();
      setContent(data || []);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  // Filter by language
  const filtered = lang==="all" ? content : content.filter(c=>{
    const cl = (c.language||"").toLowerCase();
    const code = lang;
    const name = LANG_OPTIONS.find(l=>l.code===code)?.label?.toLowerCase() || "";
    return cl.includes(code) || cl.includes(name);
  });

  // Group content
  const g = {
    live:     filtered.filter(c=>c.is_live||c.type==="Live"),
    movies:   filtered.filter(c=>c.type==="Movie"),
    series:   filtered.filter(c=>c.type==="Series"),
    sports:   filtered.filter(c=>["Cricket","Football","Racing","Kabaddi","Wrestling","Sports"].includes(c.genre)),
    kids:     filtered.filter(c=>c.genre==="Kids"),
    premium:  filtered.filter(c=>c.is_premium),
    news:     filtered.filter(c=>c.genre==="News"),
    trending: [...filtered].sort((a,b)=>(b.views||0)-(a.views||0)),
    featured: filtered.filter(c=>c.is_featured),
  };

  const heroItems = [...g.featured, ...g.live].slice(0,5);

  function getRows() {
    switch(cat) {
      case "Live":    return [[`🔴 Live Channels (${g.live.length})`, g.live]];
      case "Movies":  return [["🎬 All Movies", g.movies]];
      case "Series":  return [["📺 All Series", g.series]];
      case "Sports":  return [["🏆 Sports & Live", g.sports],["🔴 Live Sports", g.live.filter(c=>["Cricket","Football","Racing"].includes(c.genre))]];
      case "Kids":    return [["🧸 Kids Zone", g.kids]];
      case "Premium": return [["👑 Premium Content", g.premium]];
      case "News":    return [["📰 News Channels", g.news]];
      default: return [
        ["🔴 Live Now",          g.live],
        ["🔥 Trending",          g.trending.slice(0,12)],
        ["🎬 Movies",            g.movies],
        ["📺 Series",            g.series],
        ["🏆 Sports",            g.sports],
        ["🧸 Kids",              g.kids],
        ["👑 Originals",         g.premium],
        ["📰 News",              g.news],
      ];
    }
  }

  const selLang = LANG_OPTIONS.find(l=>l.code===lang);

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",paddingBottom:"clamp(70px,12vw,90px)"}}>
      <style>{GS}</style>

      {/* Search */}
      {showSearch && (
        <Search onPlay={item=>{setPlayItem(item);setShowSearch(false);}} onClose={()=>setShowSearch(false)} content={content}/>
      )}

      {/* Player */}
      {playItem && (
        <UniversalPlayer content={playItem} user={user} onClose={()=>setPlayItem(null)}/>
      )}

      {/* ── NAVBAR ── */}
      <nav style={{
        position:"fixed",top:0,left:0,right:0,zIndex:200,
        background:scrolled?"rgba(10,10,15,.97)":"transparent",
        backdropFilter:scrolled?"blur(16px)":"none",
        borderBottom:scrolled?"1px solid rgba(255,255,255,.05)":"none",
        transition:"all .3s",
      }}>
        {/* Top row */}
        <div style={{display:"flex",alignItems:"center",gap:"clamp(8px,2vw,20px)",padding:"0 clamp(14px,4vw,24px)",height:"clamp(50px,8vw,58px)"}}>
          {/* Logo */}
          <div
            style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,28px)",letterSpacing:2,cursor:"pointer",lineHeight:1,flexShrink:0}}
            onClick={()=>setCat("For You")}
          >
            <span style={{color:"#e50914"}}>STREAM</span><span>X</span>
          </div>

          <div style={{flex:1}}/>

          {/* Search */}
          <button
            onClick={()=>setShowSearch(true)}
            style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:"7px clamp(10px,2vw,14px)",color:"#aaa",fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}
          >
            🔍 <span style={{display:"clamp(none,block,block)"}}>Search</span>
          </button>

          {/* Language Selector */}
          <div ref={langRef} style={{position:"relative"}} className="nav-lang">
            <button
              onClick={()=>setShowLang(s=>!s)}
              style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:"7px 12px",color:"#aaa",fontSize:13,cursor:"pointer",whiteSpace:"nowrap"}}
            >
              {selLang?.flag} {selLang?.label} ▾
            </button>
            <LangSelector selected={lang} onChange={setLang} show={showLang} onToggle={()=>setShowLang(false)}/>
          </div>

          {/* Premium */}
          <button
            onClick={onUpgrade}
            style={{background:"rgba(229,9,20,.12)",border:"1px solid rgba(229,9,20,.3)",color:"#e50914",borderRadius:8,padding:"7px clamp(10px,2vw,14px)",fontSize:12,fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}
          >
            👑 <span style={{display:"inline"}}>Premium</span>
          </button>

          {/* Avatar */}
          <div
            onClick={()=>onNavigate("profile")}
            style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#e50914,#ff4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,cursor:"pointer",fontWeight:700,flexShrink:0}}
          >
            {user?.name?.[0]?.toUpperCase()||"👤"}
          </div>
        </div>

        {/* Category tabs */}
        <div style={{display:"flex",overflowX:"auto",padding:"0 clamp(14px,4vw,24px)",borderTop:"1px solid rgba(255,255,255,.04)"}}>
          {CATS.map(c=>(
            <button key={c} className={`pill${cat===c?" on":""}`} onClick={()=>setCat(c)}>{c}</button>
          ))}
        </div>
      </nav>

      {/* Hero */}
      {cat==="For You" && !loading && <Hero items={heroItems} onPlay={setPlayItem}/>}
      {cat!=="For You" && <div style={{height:"clamp(100px,14vw,110px)"}}/>}

      {/* Content */}
      {loading ? <Skeleton/> : (
        <div style={{paddingTop:cat==="For You"?24:12}}>
          {/* Language indicator */}
          {lang!=="all" && (
            <div style={{padding:`0 clamp(14px,4vw,24px)`,marginBottom:8}}>
              <span style={{background:"rgba(229,9,20,.12)",border:"1px solid rgba(229,9,20,.25)",color:"#e50914",fontSize:12,fontWeight:600,padding:"4px 14px",borderRadius:20}}>
                {selLang?.flag} {selLang?.label} content
                <button onClick={()=>setLang("all")} style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",marginLeft:8,fontSize:14,lineHeight:1}}>×</button>
              </span>
            </div>
          )}

          {getRows().map(([label, items],i)=>(
            <ContentRow key={i} label={label} items={items} onPlay={setPlayItem}/>
          ))}

          {/* Promo banner */}
          {cat==="For You" && (
            <div style={{
              margin:`8px clamp(14px,4vw,24px) 40px`,
              borderRadius:14,overflow:"hidden",
              background:"linear-gradient(120deg,#e50914 0%,#ff6b35 50%,#e50914 100%)",
              padding:"clamp(20px,4vw,28px) clamp(20px,5vw,36px)",
              display:"flex",justifyContent:"space-between",alignItems:"center",
              flexWrap:"wrap",gap:14,
            }}>
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(22px,4vw,28px)",letterSpacing:1,marginBottom:4}}>Unlock StreamX Premium</div>
                <div style={{fontSize:"clamp(11px,2vw,13px)",color:"rgba(255,255,255,.8)"}}>4K · HDR · No Ads · 4 Screens · Downloads · All Languages</div>
              </div>
              <div style={{display:"flex",gap:12,alignItems:"center"}}>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:"clamp(22px,4vw,26px)",fontWeight:900}}>₹499<span style={{fontSize:13,fontWeight:400}}>/mo</span></div>
                  <div style={{fontSize:11,opacity:.7}}>or ₹999/year · Save 83%</div>
                </div>
                <button onClick={onUpgrade} style={{background:"#fff",color:"#e50914",border:"none",borderRadius:9,padding:"clamp(10px,2vw,12px) clamp(18px,3vw,24px)",fontWeight:800,fontSize:"clamp(13px,2vw,14px)",cursor:"pointer",whiteSpace:"nowrap"}}>
                  Subscribe Now
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
