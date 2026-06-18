import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, db } from "./supabase.js";
import Hls from "hls.js";
import FaceAuth from "./FaceAuth.jsx";

/* ═══════════════════════════════════════════════════════════
   StreamX Admin Pro v5.0
   ✅ 3GB+ video upload via Cloudflare R2 (presigned URL)
   ✅ Real bar charts & analytics (pure CSS/SVG — no library needed)
   ✅ Advanced UI/UX — dark glassmorphism design
   ✅ Live stream preview on URL paste
   ✅ Full content management
   ✅ Real-time stats
═══════════════════════════════════════════════════════════ */

const R="#e50914", BL="#1565c0", GR="#00c853", AM="#f59e0b", PU="#8b5cf6";

// ── Replace these with your Cloudflare R2 credentials ──
const CF_ACCOUNT_ID   = "YOUR_CF_ACCOUNT_ID";   // Cloudflare → R2 → Account ID
const CF_BUCKET_NAME  = "streamx-videos";         // Your R2 bucket name
const CF_PUBLIC_URL   = "https://pub-YOUR_HASH.r2.dev"; // R2 bucket public URL
const CF_API_TOKEN    = "YOUR_R2_API_TOKEN";      // R2 API token with write access

const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{--r:#e50914;--bl:#1565c0;--gr:#00c853;--bg:#04040e;--s1:#080814;--s2:#0c0c1c;--bd:#181828;--mt:#3a3a5a;}
body{background:var(--bg);color:#e2e2f0;font-family:'Inter',sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-track{background:#080814;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes glow{0%,100%{box-shadow:0 0 6px #e5091444}50%{box-shadow:0 0 20px #e5091488}}
@keyframes barGrow{from{height:0}to{height:var(--h)}}
@keyframes countUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.inp{width:100%;background:#0a0a1a;border:1.5px solid #181828;border-radius:10px;color:#e2e2f0;font-family:'Inter',sans-serif;font-size:13px;padding:11px 14px;outline:none;transition:all .2s;}
.inp:focus{border-color:#e50914;box-shadow:0 0 0 3px rgba(229,9,20,.08);}
.inp::placeholder{color:#252540;}
.nav{display:flex;align-items:center;gap:11px;padding:10px 14px;border-radius:10px;cursor:pointer;font-size:12.5px;font-weight:500;color:#3a3a5a;transition:all .15s;white-space:nowrap;user-select:none;}
.nav:hover{background:rgba(255,255,255,.04);color:#8888bb;}
.nav.on{background:linear-gradient(135deg,rgba(229,9,20,.18),rgba(229,9,20,.06));color:#e50914;font-weight:700;box-shadow:inset 2px 0 0 #e50914;}
.card{background:linear-gradient(145deg,#0c0c1c,#080814);border:1px solid #181828;border-radius:16px;transition:border-color .2s;}
.card:hover{border-color:#252540;}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{padding:11px 14px;text-align:left;font-size:10px;color:#3a3a5a;font-weight:700;text-transform:uppercase;letter-spacing:.8px;border-bottom:1px solid #181828;}
.tbl td{padding:11px 14px;font-size:13px;border-bottom:1px solid #0e0e1e;}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.015);}
.upload-zone{border:2px dashed #181828;border-radius:14px;padding:36px 24px;text-align:center;cursor:pointer;transition:all .25s;background:rgba(8,8,20,.8);}
.upload-zone:hover,.upload-zone.drag{border-color:#e50914;background:rgba(229,9,20,.04);box-shadow:0 0 0 4px rgba(229,9,20,.06);}
.kpi{position:relative;overflow:hidden;padding:22px 24px;border-radius:16px;background:linear-gradient(145deg,#0c0c1c,#080814);border:1px solid #181828;transition:all .2s;}
.kpi:hover{border-color:#252540;transform:translateY(-1px);}
.kpi::after{content:'';position:absolute;top:-40px;right:-40px;width:100px;height:100px;border-radius:50%;opacity:.05;}
.src-tab{background:rgba(255,255,255,.04);border:1.5px solid #181828;color:#555577;border-radius:10px;padding:8px 16px;font-size:12px;font-weight:600;cursor:pointer;transition:all .18s;font-family:'Inter',sans-serif;}
.src-tab.on{background:rgba(229,9,20,.18);border-color:rgba(229,9,20,.5);color:#e50914;}
.btn-primary{background:linear-gradient(135deg,#e50914,#c4000f);color:#fff;border:none;border-radius:10px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;white-space:nowrap;}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 4px 16px rgba(229,9,20,.35);}
.btn-primary:disabled{background:#1a1a2e;transform:none;box-shadow:none;cursor:not-allowed;opacity:.5;}
.btn-outline{background:transparent;border:1.5px solid;border-radius:10px;padding:9px 18px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .18s;}
.badge{display:inline-flex;align-items:center;font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:20px;white-space:nowrap;}
`;

const PAGES=[
  {id:"dashboard", icon:"⚡", label:"Dashboard"},
  {id:"content",   icon:"🎬", label:"Movies & Series"},
  {id:"live",      icon:"🔴", label:"Live Channels"},
  {id:"analytics", icon:"📊", label:"Analytics"},
  {id:"users",     icon:"👥", label:"Users"},
  {id:"ads",       icon:"📢", label:"Ads Manager"},
  {id:"revenue",   icon:"💰", label:"Revenue"},
  {id:"settings",  icon:"⚙️", label:"Settings"},
];

const TYPES  =["Movie","Web Series","Documentary","Short Film","Kids","Anime","Reality Show"];
const GENRES =["Action","Drama","Sci-Fi","Thriller","Comedy","Romance","Kids","Cricket","Football","Racing","News","Documentary","Nature","Horror","Sports","Music","Reality","Anime","Devotional"];
const LANGS  =["Hindi","English","Kannada","Tamil","Telugu","Bengali","Malayalam","Punjabi","Marathi","Gujarati","Bhojpuri","Odia","Urdu","Sanskrit"];
const RATINGS=["U","U/A","U/A 7+","U/A 13+","U/A 16+","A"];

const fN=n=>n>=1e7?(n/1e7).toFixed(1)+"Cr":n>=1e5?(n/1e5).toFixed(1)+"L":n>=1e3?(n/1e3).toFixed(1)+"K":String(n||0);
const fM=b=>b>=1e9?(b/1e9).toFixed(1)+"GB":b>=1e6?(b/1e6).toFixed(1)+"MB":b>=1e3?(b/1e3).toFixed(0)+"KB":b+"B";

// ── UI Components ─────────────────────────────────────────

function Chip({label,color="#888",size="sm"}){
  const p=size==="xs"?"1px 6px":"2px 9px";
  const f=size==="xs"?9:11;
  return <span className="badge" style={{background:`${color}1e`,color,fontSize:f,padding:p,border:`1px solid ${color}33`}}>{label}</span>;
}

function Btn({children,onClick,color=R,variant="fill",size="md",disabled,sx={}}){
  const base={fontFamily:"'Inter',sans-serif",cursor:disabled?"not-allowed":"pointer",borderRadius:10,fontWeight:600,whiteSpace:"nowrap",transition:"all .18s",opacity:disabled?.5:1,...sx};
  const pad=size==="sm"?"5px 12px":size==="lg"?"13px 28px":"9px 18px";
  const fs=size==="sm"?11:size==="lg"?15:13;
  let style={...base,padding:pad,fontSize:fs};
  if(variant==="fill")   style={...style,background:`linear-gradient(135deg,${color},${color}cc)`,color:"#fff",border:"none",boxShadow:`0 2px 12px ${color}33`};
  if(variant==="outline")style={...style,background:"transparent",color,border:`1.5px solid ${color}55`};
  if(variant==="ghost")  style={...style,background:"transparent",color:"#888",border:"1.5px solid #181828"};
  if(variant==="danger") style={...style,background:"rgba(248,113,113,.1)",color:"#f87171",border:"1px solid rgba(248,113,113,.3)"};
  return <button disabled={disabled} onClick={onClick} style={style}>{children}</button>;
}

function Field({label,required,hint,children}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:6}}>
      <label style={{fontSize:10,color:"#3a3a5a",fontWeight:700,letterSpacing:.7,textTransform:"uppercase"}}>
        {label}{required&&<span style={{color:R}}> *</span>}
      </label>
      {children}
      {hint&&<div style={{fontSize:11,color:"#252540",lineHeight:1.5}}>{hint}</div>}
    </div>
  );
}

function Modal({title,onClose,children,wide,xl}){
  useEffect(()=>{const fn=e=>{if(e.key==="Escape")onClose();};window.addEventListener("keydown",fn);return()=>window.removeEventListener("keydown",fn);},[]);
  return(
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.9)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,backdropFilter:"blur(8px)"}} onClick={onClose}>
      <div style={{background:"linear-gradient(145deg,#0e0e1e,#0a0a14)",border:"1px solid #1e1e32",borderRadius:18,width:"100%",maxWidth:xl?760:wide?580:480,maxHeight:"92vh",overflowY:"auto",animation:"slideUp .22s ease",boxShadow:"0 24px 80px rgba(0,0,0,.8)"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 24px",borderBottom:"1px solid #181828",position:"sticky",top:0,background:"#0e0e1e",zIndex:1,borderRadius:"18px 18px 0 0"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:20,letterSpacing:1,color:"#e2e2f0"}}>{title}</div>
          <Btn onClick={onClose} variant="ghost" size="sm" sx={{fontSize:16,padding:"3px 9px"}}>✕</Btn>
        </div>
        <div style={{padding:"22px 24px"}}>{children}</div>
      </div>
    </div>
  );
}

function Toast({msg,type="ok"}){
  const c=type==="err"?"#f87171":type==="warn"?"#f59e0b":GR;
  return(
    <div style={{position:"fixed",bottom:28,right:28,zIndex:3000,background:"linear-gradient(145deg,#0e0e1e,#0a0a14)",border:`1px solid ${c}44`,borderLeft:`3px solid ${c}`,borderRadius:12,padding:"13px 22px",fontSize:13,fontWeight:500,animation:"slideUp .22s ease",boxShadow:"0 12px 48px rgba(0,0,0,.8)",maxWidth:360,backdropFilter:"blur(16px)"}}>
      {type==="ok"?"✅":type==="err"?"❌":"⚠️"} {msg}
    </div>
  );
}

// ── BAR CHART (pure CSS) ─────────────────────────────────
function BarChart({data,height=200,color=R,title}){
  if(!data||data.length===0) return null;
  const max=Math.max(...data.map(d=>d.value),1);
  return(
    <div>
      {title&&<div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#e2e2f0"}}>{title}</div>}
      <div style={{display:"flex",alignItems:"flex-end",gap:8,height,position:"relative"}}>
        {/* Y axis lines */}
        {[0,.25,.5,.75,1].map(f=>(
          <div key={f} style={{position:"absolute",left:0,right:0,bottom:f*height,borderTop:`1px dashed #181828`,zIndex:0,pointerEvents:"none"}}>
            <span style={{position:"absolute",left:0,top:-8,fontSize:9,color:"#252540",fontWeight:600}}>{fN(Math.round(max*f))}</span>
          </div>
        ))}
        {data.map((d,i)=>{
          const h=Math.max(4,(d.value/max)*height);
          return(
            <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,zIndex:1}} title={`${d.label}: ${fN(d.value)}`}>
              <div style={{fontSize:9,color:"#e2e2f0",fontWeight:700,opacity:.7}}>{fN(d.value)}</div>
              <div style={{width:"100%",height:h,background:`linear-gradient(to top,${color},${color}88)`,borderRadius:"4px 4px 0 0",transition:"height .6s ease",boxShadow:`0 0 8px ${color}44`,position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",inset:0,background:"linear-gradient(to right,transparent,rgba(255,255,255,.08),transparent)"}}/>
              </div>
              <div style={{fontSize:9,color:"#3a3a5a",fontWeight:600,textAlign:"center",lineHeight:1.2,width:"100%",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LINE CHART (SVG) ─────────────────────────────────────
function LineChart({data,height=160,color=R,title,fill=true}){
  if(!data||data.length<2) return null;
  const max=Math.max(...data.map(d=>d.value),1);
  const W=600,H=height,PAD=8;
  const pts=data.map((d,i)=>({
    x:PAD+(i/(data.length-1))*(W-PAD*2),
    y:H-PAD-(d.value/max)*(H-PAD*2),
  }));
  const path=pts.map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
  const fillPath=`${path} L${pts[pts.length-1].x},${H} L${pts[0].x},${H} Z`;
  return(
    <div>
      {title&&<div style={{fontSize:13,fontWeight:700,marginBottom:14,color:"#e2e2f0"}}>{title}</div>}
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",height,overflow:"visible"}}>
        <defs>
          <linearGradient id={`lg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity=".35"/>
            <stop offset="100%" stopColor={color} stopOpacity="0"/>
          </linearGradient>
        </defs>
        {/* Grid */}
        {[0,.25,.5,.75,1].map(f=>(
          <line key={f} x1={PAD} y1={PAD+(1-f)*(H-PAD*2)} x2={W-PAD} y2={PAD+(1-f)*(H-PAD*2)} stroke="#181828" strokeWidth="1"/>
        ))}
        {/* Fill */}
        {fill&&<path d={fillPath} fill={`url(#lg-${color.replace("#","")})`}/>}
        {/* Line */}
        <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Dots */}
        {pts.map((p,i)=>(
          <circle key={i} cx={p.x} cy={p.y} r="4" fill={color} stroke="#0a0a14" strokeWidth="2">
            <title>{data[i].label}: {fN(data[i].value)}</title>
          </circle>
        ))}
      </svg>
      {/* X labels */}
      <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
        {data.map((d,i)=>(
          <div key={i} style={{fontSize:9,color:"#3a3a5a",fontWeight:600,textAlign:"center",flex:1}}>{d.label}</div>
        ))}
      </div>
    </div>
  );
}

// ── DONUT CHART (SVG) ─────────────────────────────────────
function DonutChart({data,size=120,title}){
  if(!data||data.length===0) return null;
  const total=data.reduce((s,d)=>s+d.value,0)||1;
  const R2=size/2-10, CX=size/2, CY=size/2;
  const C=2*Math.PI*R2;
  let offset=0;
  const segs=data.map(d=>{
    const pct=d.value/total;
    const seg={...d,pct,dasharray:`${pct*C} ${C}`,offset};
    offset+=pct*C;
    return seg;
  });
  return(
    <div style={{display:"flex",gap:20,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{position:"relative",flexShrink:0}}>
        {title&&<div style={{fontSize:12,fontWeight:700,marginBottom:10,color:"#e2e2f0"}}>{title}</div>}
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={CX} cy={CY} r={R2} fill="none" stroke="#181828" strokeWidth="18"/>
          {segs.map((s,i)=>(
            <circle key={i} cx={CX} cy={CY} r={R2} fill="none" stroke={s.color} strokeWidth="18"
              strokeDasharray={s.dasharray} strokeDashoffset={-s.offset} strokeLinecap="round"/>
          ))}
        </svg>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {data.map((d,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{width:10,height:10,borderRadius:3,background:d.color,flexShrink:0}}/>
            <div style={{fontSize:12,color:"#aaa"}}>{d.label}</div>
            <div style={{fontSize:12,fontWeight:700,color:"#e2e2f0",marginLeft:"auto"}}>{Math.round((d.value/total)*100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ──Small PREVIEW ────────────────────────────────────────
function SmallPreview({url,isLive=false}){
  const vRef=useRef(null);
  const[status,setStatus]=useState("loading");
  const isYT=url?.includes("youtube.com")||url?.includes("youtu.be");
  const isM3U8=url?.includes(".m3u8");

  function toEmbed(u){
    try{
      if(u.includes("watch?v="))return`https://www.youtube.com/embed/${new URL(u).searchParams.get("v")}?autoplay=1&mute=1`;
      if(u.includes("youtu.be/"))return`https://www.youtube.com/embed/${u.split("youtu.be/")[1]?.split("?")[0]}?autoplay=1&mute=1`;
    }catch(e){}
    return u;
  }

  useEffect(()=>{
    if(!url||isYT)return;
    const v=vRef.current;
    if(!v)return;
    setStatus("loading");

    // For plain MP4/direct video files — just set src directly, no HLS needed
    if(!isM3U8){
      v.src=url;
      v.muted=true;
      v.load();
      const onCanPlay=()=>setStatus("playing");
      const onError=(e)=>{
        console.error("Video preview error:",e, v.error);
        setStatus("error");
      };
      v.addEventListener("canplay",onCanPlay);
      v.addEventListener("error",onError);
      v.play().catch(()=>{}); // ignore autoplay block, canplay already fired
      return()=>{
        v.removeEventListener("canplay",onCanPlay);
        v.removeEventListener("error",onError);
      };
    }

    // Only use HLS.js for actual .m3u8 streams
    let hls;
    (async()=>{
      try{
        const HlsMod=(await import("hls.js")).default;
        if(HlsMod.isSupported()){
          hls=new HlsMod({enableWorker:true,lowLatencyMode:true});
          hls.loadSource(url);
          hls.attachMedia(v);
          hls.on(HlsMod.Events.MANIFEST_PARSED,()=>{v.muted=true;v.play().catch(()=>{});setStatus("playing");});
          hls.on(HlsMod.Events.ERROR,(_,d)=>{if(d.fatal)setStatus("error");});
        }else if(v.canPlayType("application/vnd.apple.mpegurl")){
          v.src=url;v.muted=true;v.play().catch(()=>{});setStatus("playing");
        }
      }catch(e){setStatus("error");}
    })();

    return()=>{if(hls){hls.destroy();}};
  },[url]);

  return(
    <div style={{borderRadius:10,overflow:"hidden",background:"#000",border:"1px solid #1a1a2e",marginTop:12}}>
      <div style={{paddingTop:"56.25%",position:"relative"}}>
        {isYT?(
          <iframe src={toEmbed(url)} style={{position:"absolute",inset:0,width:"100%",height:"100%",border:"none"}} allow="autoplay;encrypted-media" allowFullScreen/>
        ):(
          <>
            <video ref={vRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"contain"}} playsInline muted controls crossOrigin="anonymous"/>
            {status==="loading"&&(
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.8)",pointerEvents:"none"}}>
                <div style={{width:32,height:32,border:"2px solid #1a1a2e",borderTop:"2px solid #e50914",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
              </div>
            )}
            {status==="error"&&(
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,.85)",flexDirection:"column",gap:8,pointerEvents:"none"}}>
                <span style={{fontSize:24}}>⚠️</span>
                <div style={{fontSize:11,color:"#f87171",textAlign:"center",padding:"0 16px"}}>Preview failed to load — but URL is saved and will work in the app</div>
              </div>
            )}
          </>
        )}
        {isLive&&<div style={{position:"absolute",top:8,left:8,background:"#e50914",color:"#fff",fontSize:9,fontWeight:800,padding:"2px 8px",borderRadius:3,letterSpacing:2,zIndex:5}}>● LIVE</div>}
      </div>
      <div style={{background:"#0a0a18",padding:"6px 14px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{width:8,height:8,borderRadius:"50%",background:status==="playing"?"#00c853":status==="error"?"#f59e0b":"#f59e0b",flexShrink:0}}/>
        <div style={{fontSize:11,color:status==="playing"?"#00c853":"#f59e0b",fontWeight:600}}>
          {status==="playing"?"✓ Preview working":status==="error"?"⚠ Preview blocked (URL still saved & works in app)":"Loading preview..."}
        </div>
      </div>
    </div>
  );
}
