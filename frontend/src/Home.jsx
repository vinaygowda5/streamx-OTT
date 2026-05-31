import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";
import VideoPlayer from "./VideoPlayer.jsx";
import Search from "./Search.jsx";

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Manrope:wght@400;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#0a0a0f;color:#fff;font-family:'Manrope',sans-serif;overflow-x:hidden;}
::-webkit-scrollbar{height:2px;width:3px;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
.row-scroll{display:flex;gap:12px;overflow-x:auto;padding-bottom:4px;}
.row-scroll::-webkit-scrollbar{height:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes shimmer{0%{opacity:.3;}50%{opacity:.7;}100%{opacity:.3;}}
.card-hover{transition:transform .2s,box-shadow .2s,border-color .2s;}
.card-hover:hover{transform:scale(1.06) translateY(-4px);}
.pill{background:none;border:none;font-family:'Manrope',sans-serif;font-size:13px;font-weight:600;color:#666;padding:7px 14px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:color .2s,border-color .2s;}
.pill.on{color:#fff;font-weight:700;border-bottom-color:#e50914;}
`;

const CATS = ["For You","Live","Movies","Series","Sports","Kids","Premium"];

const GENRE_EMOJI = {
  Action:"💥",Drama:"🎭","Sci-Fi":"🌌",Thriller:"🔪",Horror:"👻",
  Romance:"💕",Comedy:"😄",Kids:"🧸",Sports:"🏆",Cricket:"🏏",
  Racing:"🏎️",Football:"⚽",News:"📺",Documentary:"🎥",
  Kabaddi:"🤸",Wrestling:"🥊",Nature:"🌊",default:"🎬"
};

const GENRE_COLOR = {
  Action:"#e50914",Drama:"#f59e0b","Sci-Fi":"#1d9bf0",Thriller:"#a855f7",
  Horror:"#f87171",Romance:"#ec4899",Comedy:"#84cc16",Kids:"#84cc16",
  Cricket:"#00c853",Racing:"#e50914",Football:"#38bdf8",News:"#f97316",
  Sports:"#00c853",Documentary:"#38bdf8",default:"#64748b"
};

function getEmoji(item) {
  return GENRE_EMOJI[item.genre] || GENRE_EMOJI.default;
}
function getColor(item) {
  return GENRE_COLOR[item.genre] || GENRE_COLOR.default;
}

// ── Universal Video Player Component ─────
function UniversalPlayer({ content, user, onClose }) {
  const isYoutube = content?.stream_url?.includes("youtube.com") || content?.stream_url?.includes("youtu.be");
  const isEmbed   = content?.embed_url || isYoutube;

  function getEmbedUrl(url) {
    if (!url) return "";
    if (url.includes("youtube.com/watch?v=")) {
      return url.replace("watch?v=", "embed/") + "?autoplay=1";
    }
    if (url.includes("youtu.be/")) {
      const id = url.split("youtu.be/")[1];
      return `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    return url;
  }

  if (isEmbed || content?.embed_url) {
    return (
      <div style={{position:"fixed",inset:0,zIndex:700,background:"#000",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,padding:"12px 20px",background:"rgba(0,0,0,.9)",borderBottom:"1px solid #1a1a26"}}>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#fff",fontSize:22,cursor:"pointer"}}>←</button>
          <div>
            <div style={{fontWeight:700,fontSize:15}}>{content.title}</div>
            <div style={{fontSize:11,color:"#666"}}>{content.type} · {content.genre}</div>
          </div>
          {content.is_live && (
            <div style={{marginLeft:"auto",background:"#e50914",color:"#fff",fontSize:11,fontWeight:800,padding:"3px 12px",borderRadius:4,letterSpacing:2,animation:"pulse 1.5s infinite"}}>
              ● LIVE
            </div>
          )}
        </div>
        <iframe
          src={getEmbedUrl(content.embed_url || content.stream_url)}
          style={{flex:1,width:"100%",border:"none"}}
          allow="autoplay; fullscreen; encrypted-media"
          allowFullScreen
        />
      </div>
    );
  }

  // HLS or direct video — use VideoPlayer
  return <VideoPlayer content={content} user={user} onClose={onClose} onNext={()=>{}}/>;
}

// ── Content Card ──────────────────────────
function ContentCard({ item, onPlay }) {
  const [hov, setHov] = useState(false);
  const color  = getColor(item);
  const emoji  = getEmoji(item);
  const isLive = item.is_live || item.type === "Live";

  return (
    <div
      className="card-hover"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onPlay(item)}
      style={{
        flex:"0 0 160px", borderRadius:10, overflow:"hidden", cursor:"pointer",
        border:`1.5px solid ${hov ? color+"88" : "#1c1c24"}`,
        background:"#0f0f16",
        boxShadow: hov ? `0 10px 32px ${color}33` : "none",
      }}
    >
      {/* Thumbnail */}
      <div style={{
        height:105, position:"relative",
        background: item.thumbnail
          ? `url(${item.thumbnail}) center/cover`
          : `linear-gradient(135deg,${color}22,#0a0a0f)`,
        display:"flex", alignItems:"center", justifyContent:"center",
      }}>
        {!item.thumbnail && <span style={{fontSize:44}}>{emoji}</span>}
        {isLive && (
          <div style={{position:"absolute",top:6,left:6,background:"#e50914",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:3,letterSpacing:2,animation:"pulse 1.5s infinite"}}>
            ● LIVE
          </div>
        )}
        {item.is_premium && !isLive && (
          <div style={{position:"absolute",top:6,right:6,background:"rgba(229,9,20,.9)",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3}}>
            PRO
          </div>
        )}
        {item.tags?.includes("NEW") && (
          <div style={{position:"absolute",top:6,right:6,background:"#00c853",color:"#fff",fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:3}}>
            NEW
          </div>
        )}
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
          {item.score > 0 && <span style={{fontSize:10,color:"#f59e0b"}}>★ {item.score}</span>}
        </div>
      </div>
    </div>
  );
}

// ── Content Row ───────────────────────────
function ContentRow({ label, items, onPlay }) {
  const ref = useRef(null);
  if (!items || items.length === 0) return null;
  return (
    <div style={{marginBottom:32}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,padding:"0 4vw"}}>
        <div style={{fontWeight:800,fontSize:16}}>{label}</div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>ref.current?.scrollBy({left:-300,behavior:"smooth"})} style={{width:26,height:26,borderRadius:"50%",background:"#1a1a24",border:"none",color:"#aaa",cursor:"pointer",fontSize:14}}>‹</button>
          <button onClick={()=>ref.current?.scrollBy({left:300,behavior:"smooth"})}  style={{width:26,height:26,borderRadius:"50%",background:"#1a1a24",border:"none",color:"#aaa",cursor:"pointer",fontSize:14}}>›</button>
        </div>
      </div>
      <div ref={ref} className="row-scroll" style={{padding:"0 4vw 6px"}}>
        {items.map(item => <ContentCard key={item.id} item={item} onPlay={onPlay}/>)}
      </div>
    </div>
  );
}

// ── Hero Banner ───────────────────────────
function Hero({ items, onPlay }) {
  const [idx, setIdx] = useState(0);
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!items.length) return;
    const t = setInterval(() => { setIdx(i => (i+1) % items.length); setKey(k => k+1); }, 6000);
    return () => clearInterval(t);
  }, [items.length]);

  if (!items.length) return <div style={{height:"60vh",background:"#0a0a0f"}}/>;

  const h = items[idx];
  const color = getColor(h);

  return (
    <div style={{position:"relative",height:"65vh",minHeight:420,maxHeight:680,overflow:"hidden",background:`radial-gradient(ellipse at 70% 50%,${color}28,#0a0a0f 65%)`}}>
      {/* BG Emoji */}
      <div style={{position:"absolute",right:"-2%",top:"50%",transform:"translateY(-52%)",fontSize:"clamp(200px,30vw,420px)",opacity:.06,userSelect:"none",filter:"blur(1px)"}}>
        {getEmoji(h)}
      </div>
      {/* Thumbnail bg */}
      {h.thumbnail && (
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:"55%",background:`url(${h.thumbnail}) center/cover`,maskImage:"linear-gradient(to left,rgba(0,0,0,.6),transparent)"}}/>
      )}
      {/* Gradients */}
      <div style={{position:"absolute",inset:0,background:`linear-gradient(100deg,#0a0a0f 40%,transparent 70%)`}}/>
      <div style={{position:"absolute",bottom:0,left:0,right:0,height:"55%",background:"linear-gradient(to top,#0a0a0f,transparent)"}}/>

      {/* Content */}
      <div key={key} style={{position:"absolute",bottom:60,left:0,right:0,padding:"0 5vw",animation:"fadeUp .5s ease"}}>
        {h.is_live && (
          <div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#e50914",color:"#fff",padding:"3px 12px",borderRadius:4,fontSize:10,fontWeight:800,marginBottom:12,letterSpacing:2,animation:"pulse 1.5s infinite"}}>
            ● LIVE NOW
          </div>
        )}
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(36px,6vw,72px)",lineHeight:.95,marginBottom:10,maxWidth:560}}>{h.title}</div>
        <div style={{fontSize:13,color:"rgba(255,255,255,.55)",maxWidth:440,lineHeight:1.6,marginBottom:18}}>{h.description}</div>
        <div style={{display:"flex",gap:12}}>
          <button onClick={()=>onPlay(h)} style={{background:h.is_live?"#e50914":"#fff",color:h.is_live?"#fff":"#111",border:"none",borderRadius:8,padding:"12px 28px",fontWeight:800,fontSize:14,cursor:"pointer"}}>
            ▶ {h.is_live?"Watch Live":"Play Now"}
          </button>
          <button style={{background:"rgba(255,255,255,.1)",color:"#fff",border:"1px solid rgba(255,255,255,.2)",borderRadius:8,padding:"12px 20px",fontSize:14,cursor:"pointer"}}>
            + My List
          </button>
        </div>
      </div>

      {/* Dots */}
      <div style={{position:"absolute",bottom:20,left:"50%",transform:"translateX(-50%)",display:"flex",gap:6}}>
        {items.slice(0,5).map((_,i)=>(
          <div key={i} onClick={()=>{setIdx(i);setKey(k=>k+1);}} style={{height:4,borderRadius:2,cursor:"pointer",transition:"all .3s",width:i===idx?24:6,background:i===idx?color:"rgba(255,255,255,.2)"}}/>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton Loader ───────────────────────
function Skeleton() {
  return (
    <div style={{padding:"0 4vw",paddingTop:100}}>
      {[1,2,3].map(i=>(
        <div key={i} style={{marginBottom:36}}>
          <div style={{height:18,width:160,background:"#1a1a26",borderRadius:6,marginBottom:14,animation:"shimmer 1.5s infinite"}}/>
          <div style={{display:"flex",gap:12}}>
            {[1,2,3,4,5].map(j=>(
              <div key={j} style={{width:160,height:125,background:"#1a1a26",borderRadius:10,flexShrink:0,animation:"shimmer 1.5s infinite",animationDelay:`${j*0.1}s`}}/>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main Home ─────────────────────────────
export default function Home({ onNavigate, user, onUpgrade, onSearch }) {
  const [cat,         setCat]         = useState("For You");
  const [content,     setContent]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [playItem,    setPlayItem]    = useState(null);
  const [showSearch,  setShowSearch]  = useState(false);
  const [scrolled,    setScrolled]    = useState(false);

  useEffect(() => {
    loadContent();
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  // Realtime subscription — content updates reflect instantly!
  useEffect(() => {
    const channel = supabase
      .channel("content-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "content" }, () => {
        loadContent();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function loadContent() {
    setLoading(true);
    try {
      const data = await db.getAllContent();
      setContent(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Filter content by category
  const filtered = {
    live:      content.filter(c => c.is_live || c.type === "Live"),
    movies:    content.filter(c => c.type === "Movie"),
    series:    content.filter(c => c.type === "Series"),
    sports:    content.filter(c => ["Cricket","Football","Racing","Kabaddi","Wrestling","Sports"].includes(c.genre)),
    kids:      content.filter(c => c.genre === "Kids"),
    premium:   content.filter(c => c.is_premium),
    featured:  content.filter(c => c.is_featured),
    trending:  [...content].sort((a,b)=>(b.views||0)-(a.views||0)),
    news:      content.filter(c => c.genre === "News"),
  };

  const heroItems = [...filtered.featured, ...filtered.live].slice(0, 5);

  function getRows() {
    switch(cat) {
      case "Live":    return [{label:"🔴 Live Channels & Events", items:filtered.live}];
      case "Movies":  return [{label:"🎬 All Movies", items:filtered.movies}];
      case "Series":  return [{label:"📺 All Series", items:filtered.series}];
      case "Sports":  return [{label:"🏆 Sports & Live", items:filtered.sports},{label:"🔴 Live Sports", items:filtered.live.filter(c=>["Cricket","Football","Racing"].includes(c.genre))}];
      case "Kids":    return [{label:"🧸 Kids Zone", items:filtered.kids}];
      case "Premium": return [{label:"👑 Premium Content", items:filtered.premium}];
      default: return [
        {label:"🔴 Live Now",           items: filtered.live},
        {label:"🔥 Trending",           items: filtered.trending.slice(0,10)},
        {label:"🎬 Movies",             items: filtered.movies},
        {label:"📺 Series",             items: filtered.series},
        {label:"🏆 Sports",             items: filtered.sports},
        {label:"🧸 Kids",               items: filtered.kids},
        {label:"👑 StreamX Originals",  items: filtered.premium},
        {label:"📰 News",               items: filtered.news},
      ];
    }
  }

  return (
    <div style={{minHeight:"100vh",background:"#0a0a0f",paddingBottom:80}}>
      <style>{GS}</style>

      {/* Search overlay */}
      {showSearch && (
        <Search
          onPlay={item=>{setPlayItem(item);setShowSearch(false);}}
          onClose={()=>setShowSearch(false)}
          content={content}
        />
      )}

      {/* Video Player */}
      {playItem && (
        <UniversalPlayer
          content={playItem}
          user={user}
          onClose={()=>setPlayItem(null)}
        />
      )}

      {/* Navbar */}
      <nav style={{
        position:"fixed",top:0,left:0,right:0,zIndex:200,
        background:scrolled?"rgba(10,10,15,.97)":"transparent",
        backdropFilter:scrolled?"blur(16px)":"none",
        borderBottom:scrolled?"1px solid rgba(255,255,255,.05)":"none",
        transition:"all .3s",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:16,padding:"0 4vw",height:56}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:2,cursor:"pointer",lineHeight:1}} onClick={()=>setCat("For You")}>
            <span style={{color:"#e50914"}}>STREAM</span><span>X</span>
          </div>
          <div style={{flex:1}}/>
          {/* Search */}
          <button onClick={()=>setShowSearch(true)} style={{display:"flex",alignItems:"center",gap:8,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.08)",borderRadius:8,padding:"7px 14px",color:"#aaa",fontSize:13,cursor:"pointer"}}>
            🔍 Search
          </button>
          {/* Upgrade */}
          <button onClick={onUpgrade} style={{background:"rgba(229,9,20,.12)",border:"1px solid rgba(229,9,20,.3)",color:"#e50914",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            👑 Premium
          </button>
          {/* Avatar */}
          <div onClick={()=>onNavigate("profile")} style={{width:34,height:34,borderRadius:"50%",background:"linear-gradient(135deg,#e50914,#ff4444)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,cursor:"pointer",fontWeight:700}}>
            {user?.name?.[0]?.toUpperCase()||"👤"}
          </div>
        </div>
        {/* Category tabs */}
        <div style={{display:"flex",overflowX:"auto",padding:"0 4vw",borderTop:"1px solid rgba(255,255,255,.04)"}}>
          {CATS.map(c=>(
            <button key={c} className={`pill${cat===c?" on":""}`} onClick={()=>setCat(c)}>{c}</button>
          ))}
        </div>
      </nav>

      {/* Hero */}
      {cat==="For You" && !loading && <Hero items={heroItems} onPlay={setPlayItem}/>}
      {cat!=="For You" && <div style={{height:100}}/>}

      {/* Content */}
      {loading ? <Skeleton/> : (
        <div style={{paddingTop:cat==="For You"?28:8}}>
          {getRows().map((row,i) => (
            <ContentRow key={i} label={row.label} items={row.items} onPlay={setPlayItem}/>
          ))}
          {/* Promo */}
          {cat==="For You" && (
            <div style={{margin:"8px 4vw 40px",borderRadius:14,background:"linear-gradient(120deg,#e50914,#ff6b35)",padding:"24px 28px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:14}}>
              <div>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:4}}>Upgrade to StreamX Premium</div>
                <div style={{fontSize:13,color:"rgba(255,255,255,.8)"}}>4K · HDR · No Ads · 4 Screens · Downloads</div>
              </div>
              <button onClick={onUpgrade} style={{background:"#fff",color:"#e50914",border:"none",borderRadius:8,padding:"11px 24px",fontWeight:800,fontSize:14,cursor:"pointer",whiteSpace:"nowrap"}}>
                Get Premium ₹499/mo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}