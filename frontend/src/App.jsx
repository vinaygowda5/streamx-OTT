import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";
import VideoPlayer from "./VideoPlayer.jsx";
import Search from "./Search.jsx";

const RED = "#e50914";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#07070c;color:#e2e2f0;font-family:'Manrope',sans-serif;overscroll-behavior:none;}
::-webkit-scrollbar{width:0;height:0;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes spin{to{transform:rotate(360deg)}}
.pt{background:none;border:none;font-family:'Manrope',sans-serif;font-size:13px;font-weight:600;color:#555;padding:10px 14px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:color .18s,border-color .18s;}
.pt.on{color:#fff;border-bottom:2px solid #e50914;}
.pt:hover{color:#aaa;}
.card{border-radius:10px;overflow:hidden;background:#111118;position:relative;cursor:pointer;transition:transform .18s;}
.card:hover{transform:scale(1.03);}
.card:active{transform:scale(.97);}
.lbtn{background:none;border:none;color:rgba(255,255,255,.5);cursor:pointer;padding:6px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:all .15s;}
.lbtn:hover{background:rgba(255,255,255,.1);color:#fff;}
`;

const TABS = [
  {id:"foryou",  label:"For You"},
  {id:"live",    label:"Live"},
  {id:"movies",  label:"Movies"},
  {id:"series",  label:"Series"},
  {id:"sports",  label:"Sports"},
  {id:"kids",    label:"Kids"},
  {id:"premium", label:"Premium"},
  {id:"news",    label:"News"},
];

function UniversalPlayer({content, user, onClose, onNext}){
  return(
    <VideoPlayer
      content={content}
      user={user}
      onClose={onClose}
      onNext={onNext}
    />
  );
}

export default function Home({onNavigate, user, onUpgrade}){
  const[tab,       setTab]      =useState("foryou");
  const[content,   setContent]  =useState([]);
  const[featured,  setFeatured] =useState(null);
  const[loading,   setLoading]  =useState(true);
  const[playItem,  setPlayItem] =useState(null);
  const[showSearch,setShowSearch]=useState(false);
  const[trendIdx,  setTrendIdx] =useState(0);
  const trendRef=useRef(null);

  useEffect(()=>{loadContent();},[tab]);

  async function loadContent(){
    setLoading(true);
    try{
      let q=supabase.from("content").select("*").eq("is_active",true);
      if(tab==="live")    q=q.or("is_live.eq.true,type.eq.Live");
      else if(tab==="movies")  q=q.eq("type","Movie");
      else if(tab==="series")  q=q.eq("type","Web Series");
      else if(tab==="sports")  q=q.eq("genre","Sports");
      else if(tab==="kids")    q=q.eq("genre","Kids");
      else if(tab==="premium") q=q.eq("is_premium",true);
      else if(tab==="news")    q=q.eq("genre","News");
      q=q.order("views",{ascending:false}).limit(40);
      const{data}=await q;
      setContent(data||[]);
      const feat=(data||[]).find(c=>c.is_featured)||(data||[])[0];
      setFeatured(feat||null);
    }catch(e){}
    setLoading(false);
  }

  const trending=[...(content||[])].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,10);
  const sections=[
    {title:"🔥 Trending Now",  items:trending},
    {title:"🎬 All Content",   items:content},
    {title:"⭐ Featured",      items:content.filter(c=>c.is_featured)},
    {title:"🆕 New Releases",  items:[...content].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,10)},
  ].filter(s=>s.items.length>0);

  function ContentCard({item}){
    const isLive=item.is_live||item.type==="Live";
    const isPremium=item.is_premium&&!["plan_premium","plan_annual","premium"].includes(user?.plan);
    return(
      <div className="card" style={{flexShrink:0,width:"clamp(120px,30vw,160px)"}} onClick={()=>setPlayItem(item)}>
        <div style={{paddingTop:"150%",position:"relative",background:"#0a0a14"}}>
          {item.thumbnail
            ?<img src={item.thumbnail} alt={item.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
            :<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,opacity:.2}}>🎬</div>
          }
          <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(0,0,0,.9) 0%,transparent 60%)"}}/>
          {isLive&&<div style={{position:"absolute",top:6,left:6,background:RED,color:"#fff",fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:3,letterSpacing:1.5,animation:"pulse 1.5s infinite"}}>● LIVE</div>}
          {isPremium&&<div style={{position:"absolute",top:6,right:6,background:"#f59e0b",color:"#000",fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:3}}>👑</div>}
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"8px"}}>
            <div style={{fontSize:11,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.title}</div>
            {item.genre&&<div style={{fontSize:10,color:RED,fontWeight:600,marginTop:2}}>{item.genre}</div>}
          </div>
        </div>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:"#07070c",paddingBottom:80}}>
      <style>{CSS}</style>

      {/* Search overlay */}
      {showSearch&&(
        <Search
          user={user}
          onClose={()=>setShowSearch(false)}
          onNavigate={onNavigate}
          onPlay={item=>{setShowSearch(false);setPlayItem(item);}}
        />
      )}

      {/* Video player */}
      {playItem&&(
        <UniversalPlayer
          content={playItem}
          user={user}
          onClose={()=>setPlayItem(null)}
          onNext={(nextItem)=>{
            if(nextItem&&nextItem.id) setPlayItem(nextItem);
          }}
        />
      )}

      {/* ── TOP NAV ── */}
      <div style={{position:"sticky",top:0,zIndex:200,background:"rgba(7,7,12,.95)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px clamp(12px,3vw,20px)"}}>
          {/* Logo */}
          <div style={{fontFamily:"'Manrope',sans-serif",fontWeight:900,fontSize:22,letterSpacing:1,flexShrink:0,cursor:"pointer"}} onClick={()=>onNavigate("home")}>
            <span style={{color:RED}}>STREAM</span><span style={{color:"#fff"}}>X</span>
          </div>

          {/* Search bar */}
          <div onClick={()=>setShowSearch(true)} style={{flex:1,background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.1)",borderRadius:22,display:"flex",alignItems:"center",gap:8,padding:"8px 14px",cursor:"pointer",maxWidth:280}}>
            <span style={{fontSize:14}}>🔍</span>
            <span style={{fontSize:13,color:"#555",fontWeight:500}}>Search movies, series, live...</span>
          </div>

          {/* Premium button */}
          <button onClick={onUpgrade} style={{background:"linear-gradient(135deg,#b45309,#d97706)",border:"none",color:"#fff",borderRadius:20,padding:"7px 13px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"'Manrope',sans-serif",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:5}}>
            👑 <span style={{display:"clamp(0px,10vw,auto)"}}>Premium</span>
          </button>

          {/* Avatar */}
          <div onClick={()=>onNavigate("profile")} style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${RED},#c00)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:800,cursor:"pointer",flexShrink:0}}>
            {user?.name?.[0]?.toUpperCase()||"N"}
          </div>
        </div>

        {/* Category tabs — NO border line above */}
        <div style={{display:"flex",overflowX:"auto",padding:"0 clamp(12px,3vw,20px)"}}>
          {TABS.map(t=>(
            <button key={t.id} className={`pt${tab===t.id?" on":""}`} onClick={()=>setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FEATURED BANNER ── */}
      {featured&&!loading&&(
        <div onClick={()=>setPlayItem(featured)} style={{position:"relative",cursor:"pointer",marginBottom:24}}>
          <div style={{paddingTop:"56.25%",position:"relative",background:"#0a0a14"}}>
            {featured.thumbnail
              ?<img src={featured.thumbnail} alt={featured.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover"}} onError={e=>e.target.style.display="none"}/>
              :<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:64,opacity:.15}}>🎬</div>
            }
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to top,rgba(7,7,12,1) 0%,rgba(7,7,12,.4) 40%,transparent 70%)"}}/>
            {/* Badge */}
            {trending[0]?.id===featured.id&&(
              <div style={{position:"absolute",top:12,left:12,background:RED,color:"#fff",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:4,letterSpacing:1}}>#1 TRENDING</div>
            )}
            {featured.is_live&&(
              <div style={{position:"absolute",top:12,right:12,background:RED,color:"#fff",fontSize:9,fontWeight:800,padding:"3px 9px",borderRadius:3,letterSpacing:2,animation:"pulse 1.5s infinite"}}>● LIVE</div>
            )}
            {/* Info */}
            <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"clamp(14px,4vw,24px)"}}>
              <div style={{fontWeight:900,fontSize:"clamp(18px,5vw,28px)",marginBottom:6,textShadow:"0 2px 12px rgba(0,0,0,.8)"}}>{featured.title}</div>
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                {featured.type&&<span style={{fontSize:12,color:"rgba(255,255,255,.7)"}}>{featured.type}</span>}
                {featured.genre&&<span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>· {featured.genre}</span>}
                {featured.release_year&&<span style={{fontSize:12,color:"rgba(255,255,255,.5)"}}>· {featured.release_year}</span>}
                {featured.score>0&&<span style={{fontSize:12,color:"#f59e0b",fontWeight:700}}>· ⭐ {featured.score}</span>}
              </div>
              <div style={{display:"flex",gap:10}}>
                <button onClick={e=>{e.stopPropagation();setPlayItem(featured);}} style={{background:RED,color:"#fff",border:"none",borderRadius:8,padding:"10px 22px",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"'Manrope',sans-serif",display:"flex",alignItems:"center",gap:7}}>
                  ▶ Play Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LOADING ── */}
      {loading&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"60px 0",flexDirection:"column",gap:14}}>
          <div style={{width:36,height:36,border:"3px solid #1a1a26",borderTop:`3px solid ${RED}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          <div style={{fontSize:13,color:"#444"}}>Loading content...</div>
        </div>
      )}

      {/* ── SECTIONS ── */}
      {!loading&&sections.map((s,si)=>(
        <div key={si} style={{marginBottom:28,animation:"fadeIn .4s ease"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 clamp(12px,3vw,20px)",marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:16}}>{s.title}</div>
            {s.items.length>5&&(
              <div style={{display:"flex",gap:6}}>
                <button className="lbtn" onClick={()=>{trendRef.current?.scrollBy({left:-200,behavior:"smooth"})}} style={{fontSize:16}}>‹</button>
                <button className="lbtn" onClick={()=>{trendRef.current?.scrollBy({left:200,behavior:"smooth"})}}  style={{fontSize:16}}>›</button>
              </div>
            )}
          </div>
          <div ref={si===0?trendRef:null} style={{display:"flex",gap:10,overflowX:"auto",padding:"0 clamp(12px,3vw,20px)"}}>
            {s.items.map(item=><ContentCard key={item.id} item={item}/>)}
          </div>
        </div>
      ))}

      {/* ── EMPTY ── */}
      {!loading&&content.length===0&&(
        <div style={{textAlign:"center",padding:"60px 24px",color:"#333"}}>
          <div style={{fontSize:48,marginBottom:14,opacity:.3}}>🎬</div>
          <div style={{fontSize:15,marginBottom:8,color:"#555"}}>No content yet</div>
          <div style={{fontSize:13,color:"#333"}}>Add movies and series from the Admin panel</div>
        </div>
      )}

      {/* ── PREMIUM BANNER ── */}
      {user?.plan==="free"&&!loading&&content.length>0&&(
        <div onClick={onUpgrade} style={{margin:"0 clamp(12px,3vw,20px) 24px",background:"linear-gradient(135deg,#b45309,#d97706,#e50914)",borderRadius:14,padding:"clamp(16px,4vw,24px)",cursor:"pointer"}}>
          <div style={{fontWeight:900,fontSize:"clamp(14px,3.5vw,18px)",textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Upgrade to StreamX Premium</div>
          <div style={{fontSize:13,opacity:.85,marginBottom:14}}>4K · HDR · No Ads · 4 Screens · Downloads</div>
          <button onClick={e=>{e.stopPropagation();onUpgrade();}} style={{background:"rgba(255,255,255,.15)",color:"#fff",border:"1.5px solid rgba(255,255,255,.4)",borderRadius:8,padding:"9px 20px",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:"'Manrope',sans-serif"}}>
            Subscribe ₹499/mo
          </button>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:300,background:"rgba(7,7,12,.98)",borderTop:"1px solid rgba(255,255,255,.08)",display:"flex",padding:"8px 0 calc(8px + env(safe-area-inset-bottom))"}}>
        {[
          {id:"home",    icon:"/icons/home.svg", label:"Home"},
          {id:"search",  icon:"/icons/search.svg", label:"Search"},
          {id:"profile", icon:"/icons/profile.svg", label:"Profile"},
          ...(user?.role==="admin"?[{id:"admin",icon:"/icons/admin.svg",label:"Admin"}]:[]),
        ].map(n=>{
          const isActive=(n.id==="home"&&!showSearch)||(n.id==="search"&&showSearch);
          return(
            <button key={n.id} onClick={()=>{
              if(n.id==="search"){setShowSearch(true);}
              else if(n.id==="home"){setShowSearch(false);setPlayItem(null);}
              else onNavigate(n.id);
            }} style={{flex:1,background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"6px 0"}}>
              <img
                src={n.icon}
                alt={n.label}
                style={{ width: 24, height: 24 }}
              />
              <span style={{fontSize:10,fontWeight:600,color:isActive||(!showSearch&&n.id==="home"&&!playItem)?RED:"#555",fontFamily:"'Manrope',sans-serif"}}>{n.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}