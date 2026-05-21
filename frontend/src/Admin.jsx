import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════════
   StreamX Admin Panel — Complete Production Dashboard
   ─────────────────────────────────────────────────────────────
   Pages:
   1. Overview        — KPIs, live charts, activity feed
   2. Content         — Library CRUD, upload, bulk actions
   3. Users           — Table, detail drawer, suspend/reset
   4. Subscriptions   — Revenue charts, plan analytics, txns
   5. Ads Manager     — Campaigns CRUD, CTR analytics
   6. Live Streams    — Schedule, go-live, health monitor
   7. Analytics       — Deep-dive charts, funnels, retention
   8. Notifications   — Broadcast to users
   9. Settings        — Platform config, API keys, roles
═══════════════════════════════════════════════════════════════ */

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;}
body{background:#07070c;color:#e2e2ee;font-family:'Inter',sans-serif;overflow:hidden;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:transparent;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:translateY(0);}}
@keyframes slideRight{from{opacity:0;transform:translateX(24px);}to{opacity:1;transform:translateX(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@keyframes spin{to{transform:rotate(360deg);}}
.page{animation:fadeIn .25s ease both;}
.card{background:#0e0e18;border:1px solid #191926;border-radius:12px;}
.tbl-row{border-bottom:1px solid #13131f;transition:background .14s;}
.tbl-row:hover{background:rgba(255,255,255,.025);}
.tbl-row:last-child{border-bottom:none;}
.chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.3px;}
.btn{border:none;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;padding:7px 14px;transition:all .15s;display:inline-flex;align-items:center;gap:6px;}
.btn-p{background:#e50914;color:#fff;}.btn-p:hover{background:#c8060f;}
.btn-s{background:rgba(255,255,255,.07);color:#aaa;border:1px solid rgba(255,255,255,.08);}.btn-s:hover{background:rgba(255,255,255,.12);color:#fff;}
.btn-d{background:rgba(248,113,113,.1);color:#f87171;border:1px solid rgba(248,113,113,.2);}.btn-d:hover{background:rgba(248,113,113,.2);}
.btn-g{background:rgba(0,200,83,.1);color:#00c853;border:1px solid rgba(0,200,83,.2);}.btn-g:hover{background:rgba(0,200,83,.2);}
.inp{width:100%;background:#0a0a14;border:1px solid #1a1a2c;border-radius:7px;color:#e2e2ee;font-family:'Inter',sans-serif;font-size:13px;padding:8px 12px;outline:none;transition:border-color .18s;}
.inp:focus{border-color:#e50914;}
.nav-link{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:500;color:#4a4a6a;transition:all .16s;white-space:nowrap;user-select:none;}
.nav-link:hover{background:rgba(255,255,255,.04);color:#8888aa;}
.nav-link.on{background:rgba(229,9,20,.1);color:#e50914;font-weight:700;}
.toggle-wrap{width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;transition:background .22s;flex-shrink:0;}
.toggle-knob{width:16px;height:16px;border-radius:50%;background:#fff;position:absolute;top:3px;transition:left .22s;box-shadow:0 1px 4px rgba(0,0,0,.5);}
.search-wrap{background:#0a0a14;border:1px solid #1a1a2c;border-radius:8px;display:flex;align-items:center;gap:8px;padding:0 12px;}
.search-wrap input{background:none;border:none;color:#e2e2ee;font-family:'Inter',sans-serif;font-size:13px;outline:none;padding:8px 0;width:190px;}
`;

const C = { r:"#e50914", bg:"#07070c", s:"#0e0e18", b:"#191926", m:"#444460" };

/* ══════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════ */
const DAILY = [
  {d:"May 12",views:88000, rev:36000,subs:188,dau:9800},
  {d:"May 13",views:104000,rev:43000,subs:264,dau:11200},
  {d:"May 14",views:96000, rev:40000,subs:220,dau:10600},
  {d:"May 15",views:118000,rev:49000,subs:310,dau:12400},
  {d:"May 16",views:136000,rev:57000,subs:390,dau:14100},
  {d:"May 17",views:154000,rev:66000,subs:460,dau:15800},
  {d:"May 18",views:172000,rev:74000,subs:524,dau:17200},
];

const CONTENT_DATA = [
  {id:"c1", title:"Apex Protocol",        emoji:"🔥",type:"Movie", genre:"Action",   status:"active",  premium:true, views:4200000,score:9.1,dur:"2h 4m",  lang:"EN/HI/TA",added:"2026-05-01",streams:12400,likes:380000},
  {id:"c2", title:"Dark Meridian",        emoji:"🌌",type:"Series",genre:"Sci-Fi",   status:"active",  premium:true, views:3100000,score:8.8,dur:"S1·8ep", lang:"EN/HI",   added:"2026-04-15",streams:9800, likes:290000},
  {id:"c3", title:"Bombay Central",       emoji:"🏙️",type:"Movie", genre:"Drama",    status:"active",  premium:false,views:5600000,score:8.5,dur:"2h 15m", lang:"HI/EN",   added:"2025-12-10",streams:18200,likes:520000},
  {id:"c4", title:"IPL 2026 Finals",      emoji:"🏏",type:"Live",  genre:"Cricket",  status:"live",    premium:false,views:12400000,score:0, dur:"Live",   lang:"HI/EN/TA",added:"2026-05-18",streams:42000,likes:0},
  {id:"c5", title:"Steel Horizon",        emoji:"🤖",type:"Series",genre:"Action",   status:"active",  premium:true, views:2800000,score:8.6,dur:"S2·10ep",lang:"EN/HI",   added:"2026-03-22",streams:8400, likes:241000},
  {id:"c6", title:"Quantum Cascade",      emoji:"⚡",type:"Movie", genre:"Thriller", status:"inactive",premium:true, views:2100000,score:8.3,dur:"1h 55m", lang:"EN",       added:"2026-02-14",streams:0,    likes:178000},
  {id:"c7", title:"Rang De Basanti 2",    emoji:"🎭",type:"Movie", genre:"Drama",    status:"active",  premium:false,views:7200000,score:9.0,dur:"2h 35m", lang:"HI/EN",   added:"2025-11-20",streams:22000,likes:680000},
  {id:"c8", title:"Deep Margin",          emoji:"🌊",type:"Doc",   genre:"Nature",   status:"active",  premium:false,views:1400000,score:4.9,dur:"1h 58m", lang:"EN/HI",   added:"2025-10-05",streams:3200, likes:128000},
  {id:"c9", title:"Neon Karma",           emoji:"💫",type:"Movie", genre:"Romance",  status:"active",  premium:false,views:1900000,score:7.9,dur:"1h 52m", lang:"HI",       added:"2026-01-18",streams:5400, likes:162000},
  {id:"c10",title:"Chhota Bheem Returns", emoji:"🦸",type:"Series",genre:"Kids",     status:"active",  premium:false,views:8900000,score:8.0,dur:"S3·26ep",lang:"HI/EN/TA",added:"2026-03-05",streams:28000,likes:740000},
];

const USERS_DATA = [
  {id:"u1",name:"Rahul Sharma",    email:"rahul.sharma@gmail.com",  plan:"Premium",status:"active",   joined:"2025-08-12",lastSeen:"Now",     city:"Mumbai",   spend:5988, profiles:3,devices:2},
  {id:"u2",name:"Priya Patel",     email:"priya.p@outlook.com",     plan:"Basic",  status:"active",   joined:"2025-11-03",lastSeen:"2h ago",  city:"Delhi",    spend:1794, profiles:2,devices:2},
  {id:"u3",name:"Arjun Nair",      email:"arjun.nair@yahoo.com",    plan:"Mobile", status:"active",   joined:"2026-01-14",lastSeen:"1d ago",  city:"Kochi",    spend:447,  profiles:1,devices:1},
  {id:"u4",name:"Sneha Iyer",      email:"sneha.iyer@gmail.com",    plan:"Premium",status:"active",   joined:"2025-09-28",lastSeen:"5h ago",  city:"Chennai",  spend:2994, profiles:4,devices:3},
  {id:"u5",name:"Vikram Singh",    email:"v.singh@hotmail.com",     plan:"Free",   status:"active",   joined:"2026-03-01",lastSeen:"3d ago",  city:"Pune",     spend:0,    profiles:1,devices:1},
  {id:"u6",name:"Meera Menon",     email:"meera.m@gmail.com",       plan:"Annual", status:"suspended",joined:"2025-07-09",lastSeen:"14d ago", city:"Bangalore",spend:999,  profiles:2,devices:2},
  {id:"u7",name:"Karan Mehta",     email:"karan.m@streamx.in",      plan:"Premium",status:"active",   joined:"2025-06-15",lastSeen:"1h ago",  city:"Mumbai",   spend:8982, profiles:3,devices:4},
  {id:"u8",name:"Deepa Krishnan",  email:"deepa.k@gmail.com",       plan:"Basic",  status:"active",   joined:"2026-02-28",lastSeen:"30m ago", city:"Hyderabad",spend:897,  profiles:2,devices:2},
];

const ADS_DATA = [
  {id:"a1",brand:"JioFiber Ultra",    tagline:"1 Gbps. No buffering.",   cta:"Get Now",    type:"Pre-roll",status:"active",impr:84210,clicks:3204,ctr:3.8,rev:42105,dur:15,skip:5,budget:100000,spent:42105},
  {id:"a2",brand:"Zomato Pro",        tagline:"Free delivery on 1000+.", cta:"Order",      type:"Pre-roll",status:"active",impr:71400,clicks:5320,ctr:7.5,rev:35700,dur:10,skip:5,budget:80000, spent:35700},
  {id:"a3",brand:"Tata Nexon EV",     tagline:"Drive Electric.",         cta:"Test Drive", type:"Mid-roll",status:"active",impr:38900,clicks:1120,ctr:2.9,rev:38900,dur:20,skip:5,budget:120000,spent:38900},
  {id:"a4",brand:"HDFC SmartPay",     tagline:"Zero-fee payments.",      cta:"Apply",      type:"Banner",  status:"paused",impr:22100,clicks:440, ctr:2.0,rev:8840, dur:0, skip:0,budget:40000, spent:8840},
  {id:"a5",brand:"Swiggy Instamart",  tagline:"Groceries in 10 min.",    cta:"Shop Now",   type:"Pre-roll",status:"draft", impr:0,    clicks:0,   ctr:0,  rev:0,    dur:12,skip:5,budget:60000, spent:0},
  {id:"a6",brand:"Ola Electric",      tagline:"Ride the future.",        cta:"Book Ride",  type:"Mid-roll",status:"active",impr:29400,clicks:882, ctr:3.0,rev:29400,dur:15,skip:5,budget:70000, spent:29400},
];

const LIVE_DATA = [
  {id:"l1",title:"IPL 2026 Finals",        cat:"Cricket", status:"live",      viewers:12400000,startedAt:"14:30",  bitrate:"8 Mbps",  health:98, cdn:"Mumbai"},
  {id:"l2",title:"Formula X — Monaco GP",  cat:"Racing",  status:"live",      viewers:3200000, startedAt:"15:10",  bitrate:"12 Mbps", health:100,cdn:"Singapore"},
  {id:"l3",title:"Premier League",         cat:"Football",status:"scheduled", viewers:0,       scheduledAt:"May 20 · 21:30",          health:null,cdn:"Mumbai"},
  {id:"l4",title:"Pro Kabaddi League",     cat:"Kabaddi", status:"scheduled", viewers:0,       scheduledAt:"Today · 20:00",            health:null,cdn:"Mumbai"},
  {id:"l5",title:"WWE RAW",                cat:"Wrestling",status:"ended",    viewers:980000,  endedAt:"Yesterday",                    health:null,cdn:""},
];

const TXNS = [
  {id:"TXN001",user:"Rahul S.",  plan:"Premium",amount:499,method:"UPI",         status:"success", date:"May 18"},
  {id:"TXN002",user:"Priya P.",  plan:"Basic",  amount:299,method:"Credit Card", status:"success", date:"May 17"},
  {id:"TXN003",user:"Arjun N.",  plan:"Annual", amount:999,method:"Net Banking", status:"success", date:"May 17"},
  {id:"TXN004",user:"Sneha I.",  plan:"Premium",amount:499,method:"UPI",         status:"success", date:"May 16"},
  {id:"TXN005",user:"Meera M.",  plan:"Mobile", amount:149,method:"UPI",         status:"failed",  date:"May 15"},
  {id:"TXN006",user:"Karan M.",  plan:"Premium",amount:499,method:"Google Pay",  status:"success", date:"May 15"},
  {id:"TXN007",user:"Deepa K.",  plan:"Basic",  amount:299,method:"Credit Card", status:"refunded",date:"May 14"},
];

const NOTIFS = [
  {id:"n1",title:"Apex Protocol — Watch Now in 4K!",   type:"release",target:"all",     sent:248431,opened:89234,ctr:"35.9%",at:"May 18 · 14:00"},
  {id:"n2",title:"IPL Final Starting NOW — Watch Live", type:"live",   target:"sports",  sent:182000,opened:124000,ctr:"68.1%",at:"May 18 · 14:25"},
  {id:"n3",title:"Your subscription expires in 3 days", type:"billing",target:"expiring",sent:4210, opened:3190, ctr:"75.8%",at:"May 17 · 10:00"},
  {id:"n4",title:"Dark Meridian S2 is here. Binge now.",type:"release",target:"premium", sent:62109,opened:28440,ctr:"45.8%",at:"May 15 · 12:00"},
];

/* ── UTILS ──────────────────────────────────────────────── */
const fN = n => n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n);
const fR = n => "₹"+(n>=1e5?(n/1e5).toFixed(1)+"L":n>=1e3?Math.round(n/1e3)+"K":n);
const pct = (a,b) => b===0?0:Math.round(a/b*100);

/* ── TINY COMPONENTS ────────────────────────────────────── */
function Toggle({on,onChange,col=C.r}){
  return <div className="toggle-wrap" style={{background:on?col:"#1e1e30"}} onClick={()=>onChange(!on)}><div className="toggle-knob" style={{left:on?21:3}}/></div>;
}

function Chip({label,color="#888",bg}){
  return <span className="chip" style={{background:bg||color+"22",color}}>{label}</span>;
}

function SChip({s}){
  const MAP={active:["#00c853","ACTIVE"],live:[C.r,"● LIVE"],inactive:["#444","INACTIVE"],suspended:["#f59e0b","SUSPENDED"],paused:["#f59e0b","PAUSED"],draft:["#555","DRAFT"],scheduled:["#1d9bf0","SCHED"],ended:["#333","ENDED"],success:["#00c853","✓ OK"],failed:["#f87171","FAILED"],refunded:["#f59e0b","REFUNDED"]};
  const [c,l]=MAP[s]||["#555",s.toUpperCase()];
  return <Chip label={l} color={c}/>;
}

/* ── SPARKLINE ──────────────────────────────────────────── */
function Spark({data,col,h=36}){
  const max=Math.max(...data), min=Math.min(...data), rng=max-min||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*100},${h-((v-min)/rng)*(h-4)-2}`).join(" ");
  return(
    <svg width="100%" height={h} viewBox={`0 0 100 ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
      <polygon fill={col+"18"} points={`0,${h} ${pts} 100,${h}`}/>
      <polyline fill="none" stroke={col} strokeWidth="1.8" points={pts} vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

/* ── BAR CHART ──────────────────────────────────────────── */
function BarChart({data,xKey,yKey,col,h=160}){
  const max=Math.max(...data.map(d=>d[yKey]));
  const [hov,setHov]=useState(null);
  return(
    <div style={{height:h+24,display:"flex",flexDirection:"column"}}>
      <div style={{flex:1,display:"flex",alignItems:"flex-end",gap:5}}>
        {data.map((d,i)=>(
          <div key={i} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
            style={{flex:1,height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:3,cursor:"pointer"}}>
            {hov===i&&<div style={{fontSize:9,color:"#fff",background:"#1a1a2c",padding:"2px 5px",borderRadius:4,whiteSpace:"nowrap"}}>{fN(d[yKey])}</div>}
            <div style={{width:"100%",background:hov===i?col:col+"77",borderRadius:"3px 3px 0 0",height:`${(d[yKey]/max)*90}%`,transition:"all .2s",minHeight:2}}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:5,marginTop:5}}>
        {data.map((d,i)=><div key={i} style={{flex:1,textAlign:"center",fontSize:9,color:hov===i?"#fff":"#444"}}>{d[xKey]}</div>)}
      </div>
    </div>
  );
}

/* ── LINE CHART ─────────────────────────────────────────── */
function LineChart({data,lines,h=180}){
  const maxV=Math.max(...data.flatMap(d=>lines.map(l=>d[l.k])));
  const W=100, H=h-24;
  const pts=key=>data.map((d,i)=>`${(i/(data.length-1))*W},${H-(d[key]/maxV)*H}`).join(" ");
  return(
    <div>
      <svg width="100%" height={h-16} viewBox={`0 -4 ${W} ${h-12}`} preserveAspectRatio="none" style={{display:"block"}}>
        {lines.map(l=>(
          <g key={l.k}>
            <polygon fill={l.col+"14"} points={`0,${H} ${pts(l.k)} ${W},${H}`}/>
            <polyline fill="none" stroke={l.col} strokeWidth="1.8" points={pts(l.k)} vectorEffect="non-scaling-stroke"/>
          </g>
        ))}
      </svg>
      <div style={{display:"flex",gap:14,marginTop:8}}>
        {lines.map(l=><span key={l.k} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#777"}}><span style={{width:10,height:3,borderRadius:2,background:l.col,display:"inline-block"}}/>{l.label}</span>)}
      </div>
    </div>
  );
}

/* ── DONUT CHART ────────────────────────────────────────── */
function Donut({segs,sz=110}){
  let cum=0;
  const r=38,cx=50,cy=50;
  const arc=p=>{
    const a=(p/100)*2*Math.PI-0.01;
    return `M${cx},${cy-r} A${r},${r},0,${p>50?1:0},1,${cx+r*Math.sin(a)},${cy-r*Math.cos(a)} L${cx},${cy}`;
  };
  return(
    <svg width={sz} height={sz} viewBox="0 0 100 100">
      {segs.map((s,i)=>{const st=cum;cum+=s.p;return <path key={i} d={arc(s.p)} fill={s.c} transform={`rotate(${st/100*360},50,50)`} opacity={.88}/>;} )}
      <circle cx="50" cy="50" r="24" fill={C.s}/>
    </svg>
  );
}

/* ── KPI CARD ───────────────────────────────────────────── */
function KPI({icon,label,value,sub,delta,col=C.r,chart}){
  const up=delta&&delta[0]==="+";
  return(
    <div className="card" style={{padding:"17px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:col,borderRadius:"2px 0 0 2px"}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}>
        <span style={{fontSize:11,color:C.m,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>{label}</span>
        <span style={{fontSize:18}}>{icon}</span>
      </div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#fff",letterSpacing:.5,lineHeight:1}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:C.m,marginTop:4}}>{sub}</div>}
      {delta&&<div style={{fontSize:11,fontWeight:600,color:up?"#00c853":"#f87171",marginTop:4}}>{delta} vs yesterday</div>}
      {chart&&<div style={{marginTop:10}}>{chart}</div>}
    </div>
  );
}

/* ── TABLE ──────────────────────────────────────────────── */
function Tbl({cols,rows,actions,selectable,onSel}){
  const [sel,setSel]=useState([]);
  const tog=id=>{const n=sel.includes(id)?sel.filter(x=>x!==id):[...sel,id];setSel(n);onSel?.(n);};
  const allSel=rows.length>0&&rows.every(r=>sel.includes(r.id));
  const togAll=()=>{const n=allSel?[]:rows.map(r=>r.id);setSel(n);onSel?.(n);};
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead>
          <tr style={{borderBottom:`1px solid ${C.b}`}}>
            {selectable&&<th style={{width:36,padding:"9px 12px"}}><input type="checkbox" checked={allSel} onChange={togAll}/></th>}
            {cols.map(c=><th key={c.k} style={{padding:"9px 10px",textAlign:c.r?"right":"left",fontSize:10.5,color:C.m,fontWeight:700,textTransform:"uppercase",letterSpacing:.5,whiteSpace:"nowrap"}}>{c.l}</th>)}
            {actions&&<th style={{padding:"9px 10px",textAlign:"right",fontSize:10.5,color:C.m,fontWeight:700,textTransform:"uppercase"}}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(row=>(
            <tr key={row.id} className="tbl-row" style={{background:sel.includes(row.id)?"rgba(229,9,20,.04)":"transparent"}}>
              {selectable&&<td style={{padding:"9px 12px"}}><input type="checkbox" checked={sel.includes(row.id)} onChange={()=>tog(row.id)}/></td>}
              {cols.map(c=><td key={c.k} style={{padding:"9px 10px",fontSize:12.5,textAlign:c.r?"right":"left",whiteSpace:"nowrap"}}>{c.fn?c.fn(row[c.k],row):row[c.k]}</td>)}
              {actions&&<td style={{padding:"9px 10px",textAlign:"right"}}><div style={{display:"flex",gap:5,justifyContent:"flex-end"}}>{actions(row).map((a,i)=><button key={i} onClick={a.fn} className={`btn ${a.cls||"btn-s"}`} style={{padding:"4px 9px",fontSize:11}}>{a.l}</button>)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length===0&&<div style={{textAlign:"center",padding:40,color:C.m,fontSize:13}}>No results found</div>}
    </div>
  );
}

/* ── MODAL ──────────────────────────────────────────────── */
function Modal({title,onClose,width=480,children}){
  return(
    <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,.82)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{background:"#101020",border:`1px solid ${C.b}`,borderRadius:14,width:"100%",maxWidth:width,maxHeight:"92vh",overflowY:"auto",animation:"fadeUp .22s ease"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"17px 22px",borderBottom:`1px solid ${C.b}`}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1}}>{title}</div>
          <button onClick={onClose} className="btn btn-s" style={{padding:"3px 9px",fontSize:15}}>✕</button>
        </div>
        <div style={{padding:"20px 22px"}}>{children}</div>
      </div>
    </div>
  );
}

/* ── DRAWER ─────────────────────────────────────────────── */
function Drawer({open,onClose,title,width=380,children}){
  return(
    <>
      {open&&<div style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,.5)"}} onClick={onClose}/>}
      <div style={{position:"fixed",top:0,right:0,bottom:0,width,zIndex:801,background:C.s,borderLeft:`1px solid ${C.b}`,transform:open?"translateX(0)":"translateX(100%)",transition:"transform .25s ease",display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.b}`,flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1}}>{title}</div>
          <button onClick={onClose} className="btn btn-s" style={{padding:"3px 9px"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:20}}>{children}</div>
      </div>
    </>
  );
}

/* ── FIELD ──────────────────────────────────────────────── */
function F({label,half,children}){
  return(
    <div style={{marginBottom:14,flex:half?"0 0 calc(50% - 6px)":"1 0 100%"}}>
      <label style={{display:"block",fontSize:10,color:C.m,fontWeight:700,letterSpacing:.6,textTransform:"uppercase",marginBottom:5}}>{label}</label>
      {children}
    </div>
  );
}

/* ── TOAST ──────────────────────────────────────────────── */
function Toast({msg,type,onDone}){
  useEffect(()=>{const t=setTimeout(onDone,2600);return()=>clearTimeout(t);},[]);
  const col=type==="err"?"#f87171":type==="warn"?"#f59e0b":"#00c853";
  return(
    <div style={{position:"fixed",bottom:24,right:24,zIndex:1000,background:"#101020",border:`1px solid ${col}44`,borderLeft:`3px solid ${col}`,borderRadius:8,padding:"11px 18px",display:"flex",alignItems:"center",gap:10,animation:"slideRight .22s ease",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>
      <span>{type==="err"?"❌":type==="warn"?"⚠️":"✅"}</span>
      <span style={{fontSize:13,fontWeight:500}}>{msg}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 1 — OVERVIEW
══════════════════════════════════════════════════════════════ */
function PageOverview(){
  const [metric,setMet]=useState("views");
  const metCfg={views:{col:"#a855f7",label:"Views"},rev:{col:"#00c853",label:"Revenue"},subs:{col:C.r,label:"New Subs"},dau:{col:"#1d9bf0",label:"DAU"}};
  return(
    <div className="page">
      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <KPI icon="👥" label="Total Users"   value={fN(248431)} sub="14,822 active today"   delta="+1.2%" col="#1d9bf0" chart={<Spark data={[80,95,88,112,128,141,162]} col="#1d9bf0"/>}/>
        <KPI icon="👑" label="Premium Subs"  value={fN(62109)}  sub="25% conversion rate"   delta="+3.4%" col={C.r}    chart={<Spark data={[55,58,57,62,65,68,72]} col={C.r}/>}/>
        <KPI icon="💰" label="Revenue Today" value={fR(74000)}  sub="₹3.1L this month"      delta="+8.1%" col="#00c853" chart={<Spark data={[36,43,40,49,57,66,74]} col="#00c853"/>}/>
        <KPI icon="👁️" label="Views Today"   value={fN(172000)} sub="18.4M total all-time"  delta="+5.7%" col="#a855f7" chart={<Spark data={[88,104,96,118,136,154,172]} col="#a855f7"/>}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <KPI icon="🔴" label="Live Now"      value="2"          sub="15.6M+ watching"        col={C.r}/>
        <KPI icon="📢" label="Ad Impressions"value={fN(84210)}  sub="₹42K ad revenue today"  delta="+12%" col="#f59e0b"/>
        <KPI icon="📉" label="Churn Rate"    value="2.3%"       sub="−0.4% improvement"      delta="-0.4%" col="#00c853"/>
        <KPI icon="📱" label="Mobile Subs"   value={fN(89440)}  sub="36% of paid users"      col="#6b7280"/>
      </div>

      {/* Charts */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:18}}>
        <div className="card" style={{padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>Platform Performance</div>
              <div style={{fontSize:11,color:C.m,marginTop:2}}>Last 7 days</div>
            </div>
            <div style={{display:"flex",gap:5}}>
              {Object.entries(metCfg).map(([k,v])=>(
                <button key={k} onClick={()=>setMet(k)} className="btn" style={{padding:"3px 10px",fontSize:11,background:metric===k?v.col:"rgba(255,255,255,.05)",color:metric===k?"#fff":"#555",border:"none"}}>{v.label}</button>
              ))}
            </div>
          </div>
          <BarChart data={DAILY} xKey="d" yKey={metric} col={metCfg[metric].col} h={170}/>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Plan Distribution</div>
          <div style={{fontSize:11,color:C.m,marginBottom:14}}>226K paid subscribers</div>
          <div style={{display:"flex",justifyContent:"center",marginBottom:14}}>
            <Donut segs={[{p:27,c:C.r},{p:11,c:"#f59e0b"},{p:22,c:"#1d9bf0"},{p:31,c:"#555"},{p:9,c:"#222"}]}/>
          </div>
          {[["Premium",27,C.r,62109],["Annual",11,"#f59e0b",24843],["Basic",22,"#1d9bf0",49686],["Mobile",31,"#555",89440],["Free",9,"#222",22353]].map(([l,p,c,n])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <div style={{width:8,height:8,borderRadius:2,background:c,flexShrink:0}}/>
              <span style={{flex:1,fontSize:11,color:"#aaa"}}>{l}</span>
              <span style={{fontSize:11,color:C.m}}>{fN(n)}</span>
              <div style={{width:52,height:4,background:"#1a1a28",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${p*3.3}%`,background:c}}/></div>
              <span style={{fontSize:10,color:c,fontWeight:700,width:24}}>{p}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16}}>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🔥 Top Content</div>
          {CONTENT_DATA.sort((a,b)=>b.views-a.views).slice(0,6).map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<5?`1px solid ${C.b}22`:"none"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:i===0?C.r:C.m,width:20}}>{i+1}</div>
              <span style={{fontSize:16}}>{c.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                <div style={{fontSize:10,color:C.m}}>{c.type}</div>
              </div>
              <span style={{fontSize:11,color:"#1d9bf0",fontWeight:600}}>{fN(c.views)}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🔴 Live Events</div>
          {LIVE_DATA.map((l,i)=>(
            <div key={l.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0",borderBottom:i<LIVE_DATA.length-1?`1px solid ${C.b}22`:"none"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:l.status==="live"?C.r:l.status==="scheduled"?"#1d9bf0":"#333",marginTop:4,flexShrink:0,animation:l.status==="live"?"pulse 1.5s infinite":undefined}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600}}>{l.title}</div>
                <div style={{fontSize:10,color:C.m}}>{l.cat} · {l.status==="live"?`${fN(l.viewers)} watching`:l.scheduledAt||l.endedAt}</div>
                {l.health&&<div style={{height:3,background:"#1a1a28",borderRadius:2,marginTop:5,overflow:"hidden"}}><div style={{height:"100%",width:`${l.health}%`,background:"#00c853"}}/></div>}
              </div>
              <SChip s={l.status}/>
            </div>
          ))}
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>📈 Hourly Traffic</div>
          <Spark data={Array.from({length:24},(_,h)=>3000+Math.sin(h/3)*2500+Math.random()*800)} col="#a855f7" h={130}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:10,color:C.m}}><span>00:00</span><span style={{color:"#a855f7",fontWeight:600}}>Peak: 16:00</span><span>23:00</span></div>
          <div style={{marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["Avg Session","28 min"],["Bounce","14.2%"],["Completion","68%"],["Return Users","44%"]].map(([k,v])=>(
              <div key={k} style={{background:"#111120",borderRadius:7,padding:"8px 10px"}}>
                <div style={{fontSize:10,color:C.m}}>{k}</div>
                <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 2 — CONTENT
══════════════════════════════════════════════════════════════ */
function PageContent({toast}){
  const [data,setData]=useState(CONTENT_DATA);
  const [filter,setFil]=useState("all");
  const [q,setQ]=useState("");
  const [modal,setModal]=useState(null);
  const [drawer,setDrawer]=useState(null);
  const [sel,setSel]=useState([]);

  const rows=data.filter(c=>(filter==="all"||c.type.toLowerCase()===filter)&&
    (c.title.toLowerCase().includes(q.toLowerCase())||c.genre.toLowerCase().includes(q.toLowerCase())));

  const togStatus=row=>{setData(d=>d.map(c=>c.id===row.id?{...c,status:c.status==="active"?"inactive":"active"}:c));toast(`${row.title} ${row.status==="active"?"disabled":"enabled"}`);};
  const del=row=>{setData(d=>d.filter(c=>c.id!==row.id));toast(`Deleted: ${row.title}`,"warn");};

  return(
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>Content Library</div>
          <div style={{fontSize:12,color:C.m,marginTop:2}}>{data.length} titles · {data.filter(c=>c.status==="active").length} active · {data.filter(c=>c.premium).length} premium</div>
        </div>
        <div style={{display:"flex",gap:8}}>
          {sel.length>0&&<button className="btn btn-d" onClick={()=>{setData(d=>d.filter(c=>!sel.includes(c.id)));setSel([]);toast(`${sel.length} deleted`,"warn");}}>🗑 Delete {sel.length}</button>}
          <button className="btn btn-p" onClick={()=>setModal({})}>+ Add Content</button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[["Total Views",fN(data.reduce((s,c)=>s+c.views,0)),"#1d9bf0"],["Active",data.filter(c=>c.status==="active").length,C.r],["Live",data.filter(c=>c.status==="live").length,"#00c853"],["Premium",data.filter(c=>c.premium).length,"#f59e0b"]].map(([l,v,c])=>(
          <div key={l} className="card" style={{padding:"11px 16px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:11,color:C.m}}>{l}</span>
            <span style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:c}}>{v}</span>
          </div>
        ))}
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
        <div className="search-wrap"><span style={{color:C.m}}>🔍</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search title or genre…"/></div>
        <div style={{display:"flex",border:`1px solid ${C.b}`,borderRadius:8,overflow:"hidden"}}>
          {["all","movie","series","live","doc"].map(f=>(
            <button key={f} onClick={()=>setFil(f)} style={{background:filter===f?C.r:"transparent",color:filter===f?"#fff":"#555",border:"none",padding:"7px 12px",fontSize:11.5,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif",transition:"all .15s"}}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>
          ))}
        </div>
        <span style={{fontSize:12,color:C.m,marginLeft:"auto"}}>{rows.length} results</span>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <Tbl selectable onSel={setSel}
          cols={[
            {k:"emoji", l:"",     fn:v=><span style={{fontSize:20}}>{v}</span>},
            {k:"title", l:"Title",fn:(v,r)=><div><div style={{fontWeight:600,fontSize:13}}>{v}</div><div style={{fontSize:10,color:C.m}}>{r.lang}</div></div>},
            {k:"type",  l:"Type", fn:v=><Chip label={v} color="#1d9bf0"/>},
            {k:"genre", l:"Genre",fn:v=><span style={{fontSize:12,color:"#888"}}>{v}</span>},
            {k:"status",l:"Status",fn:v=><SChip s={v}/>},
            {k:"premium",l:"Tier",fn:v=>v?<Chip label="PRO" color={C.r}/>:<Chip label="FREE" color="#00c853"/>},
            {k:"views", l:"Views",fn:v=><span style={{color:"#1d9bf0",fontWeight:600,fontSize:12}}>{fN(v)}</span>},
            {k:"streams",l:"Streams",fn:v=><span style={{color:"#a855f7",fontSize:12}}>{fN(v)}</span>},
            {k:"score", l:"Score",fn:v=>v?<span style={{color:"#f59e0b",fontWeight:700,fontSize:12}}>★ {v}</span>:<span style={{color:C.m,fontSize:11}}>Live</span>},
            {k:"added", l:"Added",fn:v=><span style={{fontSize:11,color:C.m}}>{v}</span>},
          ]}
          rows={rows}
          actions={row=>[
            {l:"View",fn:()=>setDrawer(row)},
            {l:"Edit",fn:()=>setModal(row)},
            {l:row.status==="active"?"Disable":"Enable",cls:row.status==="active"?"btn-d":"btn-g",fn:()=>togStatus(row)},
          ]}
        />
      </div>

      {modal!=null&&(
        <Modal title={modal.id?"Edit Content":"Add New Content"} onClose={()=>setModal(null)} width={560}>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <F label="Title"><input className="inp" defaultValue={modal.title||""} placeholder="Content title"/></F>
            <F label="Type" half><select className="inp">{["Movie","Series","Live","Documentary"].map(t=><option key={t}>{t}</option>)}</select></F>
            <F label="Genre" half><select className="inp">{["Action","Drama","Sci-Fi","Thriller","Comedy","Romance","Documentary","Kids","Sports","News"].map(g=><option key={g}>{g}</option>)}</select></F>
            <F label="Description"><textarea className="inp" rows={3} style={{resize:"vertical"}} defaultValue={modal.description||""} placeholder="Synopsis…"/></F>
            <F label="Stream URL (HLS .m3u8)"><input className="inp" placeholder="https://cdn.streamx.in/content/…/master.m3u8"/></F>
            <F label="Trailer URL" half><input className="inp" placeholder="https://…"/></F>
            <F label="Thumbnail URL" half><input className="inp" placeholder="https://…"/></F>
            <F label="Rating" half><select className="inp"><option>U</option><option>U/A</option><option>U/A 13+</option><option>U/A 16+</option><option>A</option></select></F>
            <F label="Languages" half><input className="inp" placeholder="en, hi, ta" defaultValue={modal.lang||""}/></F>
            <F label="Cast"><input className="inp" placeholder="Actor 1, Actor 2…"/></F>
            <F label="Director" half><input className="inp"/></F>
            <F label="Studio" half><input className="inp"/></F>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",margin:"4px 0",borderTop:`1px solid ${C.b}`,borderBottom:`1px solid ${C.b}`}}>
            <div><div style={{fontSize:13,fontWeight:600}}>Premium Content</div><div style={{fontSize:11,color:C.m}}>Requires active subscription</div></div>
            <Toggle on={modal.premium||false} onChange={()=>{}}/>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button className="btn btn-s" onClick={()=>setModal(null)} style={{flex:1}}>Cancel</button>
            <button className="btn btn-p" onClick={()=>{setModal(null);toast(modal.id?"Content updated!":"Content added!");}} style={{flex:2}}>{modal.id?"Save Changes":"Add Content"}</button>
          </div>
        </Modal>
      )}

      <Drawer open={!!drawer} onClose={()=>setDrawer(null)} title={drawer?.title||""}>
        {drawer&&(
          <div>
            <div style={{textAlign:"center",fontSize:64,margin:"0 0 14px"}}>{drawer.emoji}</div>
            <div style={{display:"flex",gap:6,justifyContent:"center",flexWrap:"wrap",marginBottom:18}}><SChip s={drawer.status}/>{drawer.premium?<Chip label="PREMIUM" color={C.r}/>:<Chip label="FREE" color="#00c853"/>}<Chip label={drawer.type} color="#1d9bf0"/></div>
            {[["Genre",drawer.genre],["Duration",drawer.dur],["Languages",drawer.lang],["Score",drawer.score?"★ "+drawer.score:"N/A"],["Added",drawer.added],["Views",fN(drawer.views)],["Streams",fN(drawer.streams)],["Likes",fN(drawer.likes)]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.b}22`,fontSize:12}}>
                <span style={{color:C.m}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:18,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
              <button className="btn btn-p" style={{justifyContent:"center"}} onClick={()=>{setDrawer(null);setModal(drawer);}}>✏️ Edit</button>
              <button className="btn btn-d" style={{justifyContent:"center"}} onClick={()=>{del(drawer);setDrawer(null);}}>🗑 Delete</button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 3 — USERS
══════════════════════════════════════════════════════════════ */
function PageUsers({toast}){
  const [data,setData]=useState(USERS_DATA);
  const [q,setQ]=useState("");
  const [planF,setPF]=useState("all");
  const [stF,setSF]=useState("all");
  const [drawer,setDrawer]=useState(null);
  const PC={Premium:C.r,Annual:"#f59e0b",Basic:"#1d9bf0",Mobile:"#6b7280",Free:"#333"};

  const rows=data.filter(u=>(planF==="all"||u.plan.toLowerCase()===planF)&&(stF==="all"||u.status===stF)&&
    (u.name.toLowerCase().includes(q.toLowerCase())||u.email.toLowerCase().includes(q.toLowerCase())));

  const suspend=u=>{setData(d=>d.map(x=>x.id===u.id?{...x,status:x.status==="active"?"suspended":"active"}:x));toast(u.status==="active"?"User suspended":"User reinstated","warn");};

  return(
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>User Management</div>
          <div style={{fontSize:12,color:C.m,marginTop:2}}>{data.length} users · {data.filter(u=>u.status==="active").length} active · {data.filter(u=>u.plan!=="Free").length} paid</div>
        </div>
        <button className="btn btn-s" onClick={()=>toast("CSV exported!")}>⬇ Export CSV</button>
      </div>

      <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <div className="search-wrap"><span style={{color:C.m}}>🔍</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Name or email…"/></div>
        <select className="inp" style={{width:"auto",padding:"7px 12px"}} value={planF} onChange={e=>setPF(e.target.value)}>
          <option value="all">All Plans</option>
          {["premium","annual","basic","mobile","free"].map(p=><option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
        </select>
        <select className="inp" style={{width:"auto",padding:"7px 12px"}} value={stF} onChange={e=>setSF(e.target.value)}>
          <option value="all">All Status</option><option value="active">Active</option><option value="suspended">Suspended</option>
        </select>
        <span style={{fontSize:12,color:C.m,marginLeft:"auto"}}>{rows.length} users</span>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <Tbl
          cols={[
            {k:"name",   l:"User",     fn:(v,r)=><div><div style={{fontWeight:600,fontSize:13}}>{v}</div><div style={{fontSize:10,color:C.m}}>{r.email}</div></div>},
            {k:"plan",   l:"Plan",     fn:v=><Chip label={v.toUpperCase()} color={PC[v]||"#555"}/>},
            {k:"status", l:"Status",   fn:v=><SChip s={v}/>},
            {k:"city",   l:"City",     fn:v=><span style={{fontSize:11,color:C.m}}>{v}</span>},
            {k:"profiles",l:"Profiles",fn:v=><span style={{fontSize:12}}>{v}</span>},
            {k:"devices",l:"Devices",  fn:v=><span style={{fontSize:12}}>{v}</span>},
            {k:"lastSeen",l:"Last Seen",fn:v=><span style={{fontSize:11,color:C.m}}>{v}</span>},
            {k:"spend",  l:"Revenue",  fn:v=><span style={{color:"#00c853",fontWeight:700,fontSize:12}}>{fR(v)}</span>},
            {k:"joined", l:"Joined",   fn:v=><span style={{fontSize:11,color:C.m}}>{v}</span>},
          ]}
          rows={rows}
          actions={row=>[
            {l:"View",fn:()=>setDrawer(row)},
            {l:row.status==="active"?"Suspend":"Reinstate",cls:row.status==="active"?"btn-d":"btn-g",fn:()=>suspend(row)},
          ]}
        />
      </div>

      <Drawer open={!!drawer} onClose={()=>setDrawer(null)} title="User Detail" width={400}>
        {drawer&&(
          <div>
            <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:18,paddingBottom:18,borderBottom:`1px solid ${C.b}`}}>
              <div style={{width:52,height:52,borderRadius:"50%",background:`${PC[drawer.plan]||"#333"}22`,border:`2px solid ${PC[drawer.plan]||"#333"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>👤</div>
              <div>
                <div style={{fontWeight:700,fontSize:15}}>{drawer.name}</div>
                <div style={{fontSize:11,color:C.m,marginTop:2}}>{drawer.email}</div>
                <div style={{marginTop:6,display:"flex",gap:5}}><SChip s={drawer.status}/><Chip label={drawer.plan.toUpperCase()} color={PC[drawer.plan]||"#555"}/></div>
              </div>
            </div>
            {[["City",drawer.city],["Joined",drawer.joined],["Last Seen",drawer.lastSeen],["Profiles",drawer.profiles],["Devices",drawer.devices],["Total Spend",fR(drawer.spend)]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.b}22`,fontSize:12}}>
                <span style={{color:C.m}}>{k}</span><span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
            <div style={{marginTop:18,display:"flex",flexDirection:"column",gap:8}}>
              <button className="btn btn-s" style={{justifyContent:"center"}} onClick={()=>toast("Password reset sent!")}>🔑 Reset Password</button>
              <button className="btn btn-s" style={{justifyContent:"center"}} onClick={()=>toast("Plan changed!")}>👑 Change Plan</button>
              <button className="btn btn-s" style={{justifyContent:"center"}} onClick={()=>toast("Email sent!")}>📧 Send Email</button>
              <button className="btn btn-d" style={{justifyContent:"center"}} onClick={()=>{suspend(drawer);setDrawer(null);}}>🚫 {drawer.status==="active"?"Suspend Account":"Reinstate Account"}</button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 4 — SUBSCRIPTIONS
══════════════════════════════════════════════════════════════ */
function PageSubs(){
  return(
    <div className="page">
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:18}}>Subscription Analytics</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <KPI icon="👑" label="Paid Subscribers" value={fN(226078)} sub="of 248K total users"      delta="+4.2%" col={C.r}/>
        <KPI icon="💰" label="MRR"              value={fR(3104500)} sub="Monthly Recurring Revenue" delta="+8.1%" col="#00c853"/>
        <KPI icon="📉" label="Churn Rate"       value="2.3%"        sub="−0.4% improvement"        delta="-0.4%" col="#1d9bf0"/>
        <KPI icon="🔄" label="ARPU"             value="₹137"        sub="Avg Revenue Per User"      delta="+2.1%" col="#a855f7"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:16,marginBottom:16}}>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Revenue + New Subscribers — Last 7 Days</div>
          <LineChart data={DAILY} lines={[{k:"rev",col:"#00c853",label:"Revenue (₹)"},{k:"subs",col:C.r,label:"New Subs"}]} h={210}/>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Plan Revenue Split</div>
          {[{p:"Premium",rev:31032381,subs:62109,c:C.r},{p:"Annual",rev:24798657,subs:24843,c:"#f59e0b"},{p:"Basic",rev:14886714,subs:49686,c:"#1d9bf0"},{p:"Mobile",rev:13336960,subs:89440,c:"#6b7280"}].map(({p,rev,subs,c})=>(
            <div key={p} style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:"#ccc",fontWeight:600}}>{p}</span>
                <span style={{color:"#00c853",fontWeight:700}}>{fR(rev)}</span>
              </div>
              <div style={{height:5,background:"#1a1a28",borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${(rev/31032381)*100}%`,background:c,borderRadius:3}}/>
              </div>
              <div style={{fontSize:10,color:C.m,marginTop:3}}>{fN(subs)} subscribers</div>
            </div>
          ))}
        </div>
      </div>
      <div className="card" style={{padding:20}}>
        <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Recent Transactions</div>
        <Tbl
          cols={[
            {k:"id",    l:"Txn ID",  fn:v=><span style={{fontFamily:"monospace",fontSize:10.5,color:C.m}}>{v}</span>},
            {k:"user",  l:"User",    fn:v=><span style={{fontWeight:600}}>{v}</span>},
            {k:"plan",  l:"Plan"},
            {k:"amount",l:"Amount",  fn:v=><span style={{color:"#00c853",fontWeight:700}}>₹{v}</span>},
            {k:"method",l:"Method",  fn:v=><span style={{fontSize:11,color:"#888"}}>{v}</span>},
            {k:"status",l:"Status",  fn:v=><SChip s={v}/>},
            {k:"date",  l:"Date",    fn:v=><span style={{fontSize:11,color:C.m}}>{v}</span>},
          ]}
          rows={TXNS}
          actions={()=>[{l:"Receipt",fn:()=>{}}]}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 5 — ADS
══════════════════════════════════════════════════════════════ */
function PageAds({toast}){
  const [data,setData]=useState(ADS_DATA);
  const [modal,setModal]=useState(null);
  const tot={impr:data.reduce((s,a)=>s+a.impr,0),clicks:data.reduce((s,a)=>s+a.clicks,0),rev:data.reduce((s,a)=>s+a.rev,0)};

  return(
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>Ad Manager</div>
          <div style={{fontSize:12,color:C.m,marginTop:2}}>{data.filter(a=>a.status==="active").length} running · {data.filter(a=>a.status==="draft").length} drafts</div>
        </div>
        <button className="btn btn-p" onClick={()=>setModal({})}>+ New Campaign</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <KPI icon="👁️" label="Impressions"  value={fN(tot.impr)}  col="#1d9bf0" delta="+12%"/>
        <KPI icon="🖱️" label="Clicks"       value={fN(tot.clicks)} col="#a855f7"/>
        <KPI icon="📊" label="Avg CTR"      value={((tot.clicks/tot.impr)*100).toFixed(1)+"%"} col="#f59e0b"/>
        <KPI icon="💰" label="Ad Revenue"   value={fR(tot.rev)}   col="#00c853" delta="+8%"/>
      </div>

      {/* CTR visual */}
      <div className="card" style={{padding:20,marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:14}}>Campaign CTR Comparison</div>
        <div style={{display:"flex",alignItems:"flex-end",gap:12,height:90}}>
          {data.filter(a=>a.impr>0).map((a,i)=>(
            <div key={a.id} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,height:"100%",justifyContent:"flex-end"}}>
              <div style={{fontSize:10,color:"#f59e0b",fontWeight:700}}>{a.ctr}%</div>
              <div style={{width:"100%",background:`${C.r}88`,borderRadius:"3px 3px 0 0",height:`${(a.ctr/10)*100}%`,minHeight:4}}/>
              <div style={{fontSize:9,color:C.m,textAlign:"center"}}>{a.brand.split(" ")[0]}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <Tbl
          cols={[
            {k:"brand",  l:"Brand",    fn:(v,r)=><div><div style={{fontWeight:700,fontSize:13}}>{v}</div><div style={{fontSize:10,color:C.m}}>{r.tagline}</div></div>},
            {k:"type",   l:"Type",     fn:v=><Chip label={v} color="#1d9bf0"/>},
            {k:"status", l:"Status",   fn:v=><SChip s={v}/>},
            {k:"dur",    l:"Dur",      fn:v=><span style={{fontSize:12}}>{v?v+"s":"—"}</span>},
            {k:"skip",   l:"Skip",     fn:v=><span style={{fontSize:12}}>{v?v+"s":"—"}</span>},
            {k:"impr",   l:"Impr",     fn:v=><span style={{color:"#1d9bf0",fontWeight:600}}>{fN(v)}</span>},
            {k:"clicks", l:"Clicks",   fn:v=><span style={{color:"#a855f7",fontWeight:600}}>{fN(v)}</span>},
            {k:"ctr",    l:"CTR",      fn:v=><span style={{color:"#f59e0b",fontWeight:700}}>{v}%</span>},
            {k:"spent",  l:"Spent/Budget",fn:(v,r)=>(
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:44,height:4,background:"#1a1a28",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct(v,r.budget)}%`,background:"#00c853"}}/></div>
                <span style={{color:"#00c853",fontWeight:600,fontSize:11}}>{fR(v)}</span>
              </div>
            )},
          ]}
          rows={data}
          actions={row=>[
            {l:"Edit",fn:()=>setModal(row)},
            {l:row.status==="active"?"Pause":"Resume",cls:row.status==="active"?"btn-d":"btn-g",fn:()=>{setData(d=>d.map(a=>a.id===row.id?{...a,status:a.status==="active"?"paused":"active"}:a));toast(row.status==="active"?"Paused":"Resumed");}},
          ]}
        />
      </div>

      {modal!=null&&(
        <Modal title={modal.id?"Edit Campaign":"New Ad Campaign"} onClose={()=>setModal(null)} width={500}>
          <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
            <F label="Brand Name"><input className="inp" defaultValue={modal.brand||""} placeholder="e.g. JioFiber Ultra"/></F>
            <F label="Tagline"><input className="inp" defaultValue={modal.tagline||""} placeholder="Short punchy message"/></F>
            <F label="CTA Text" half><input className="inp" defaultValue={modal.cta||""} placeholder="Get Now"/></F>
            <F label="Ad Type" half><select className="inp"><option>Pre-roll</option><option>Mid-roll</option><option>Banner</option></select></F>
            <F label="Duration (s)" half><input className="inp" type="number" defaultValue={modal.dur||15}/></F>
            <F label="Skip After (s)" half><input className="inp" type="number" defaultValue={modal.skip||5}/></F>
            <F label="Budget (₹)"><input className="inp" type="number" defaultValue={modal.budget||50000}/></F>
            <F label="Ad Video URL"><input className="inp" placeholder="https://cdn.streamx.in/ads/…"/></F>
            <F label="Target Plans">
              <div style={{display:"flex",gap:10,marginTop:6}}>
                {["Free","Mobile"].map(p=><label key={p} style={{display:"flex",alignItems:"center",gap:6,fontSize:13,cursor:"pointer",color:"#aaa"}}><input type="checkbox" defaultChecked/> {p}</label>)}
              </div>
            </F>
          </div>
          <div style={{display:"flex",gap:10,marginTop:16}}>
            <button className="btn btn-s" onClick={()=>setModal(null)} style={{flex:1}}>Cancel</button>
            <button className="btn btn-p" onClick={()=>{setModal(null);toast(modal.id?"Updated!":"Campaign created!");}} style={{flex:2}}>{modal.id?"Save Changes":"Create Campaign"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 6 — LIVE STREAMS
══════════════════════════════════════════════════════════════ */
function PageLive({toast}){
  const [data,setData]=useState(LIVE_DATA);
  const [modal,setModal]=useState(null);
  const goLive=id=>{setData(d=>d.map(l=>l.id===id?{...l,status:"live",viewers:Math.floor(Math.random()*800000+100000),startedAt:new Date().toLocaleTimeString("en",{hour:"2-digit",minute:"2-digit"}),health:98}:l));toast("▶ Stream started!");};
  const end=id=>{setData(d=>d.map(l=>l.id===id?{...l,status:"ended",viewers:0}:l));toast("Stream ended","warn");};
  return(
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>Live Stream Manager</div>
          <div style={{fontSize:12,color:C.m,marginTop:2}}>{data.filter(l=>l.status==="live").length} live now · {data.filter(l=>l.status==="scheduled").length} scheduled</div>
        </div>
        <button className="btn btn-p" onClick={()=>setModal({})}>+ Schedule Stream</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <KPI icon="🔴" label="Live Now"    value={data.filter(l=>l.status==="live").length} col={C.r}/>
        <KPI icon="👁️" label="Total Viewers" value={fN(data.filter(l=>l.status==="live").reduce((s,l)=>s+l.viewers,0))} col="#a855f7"/>
        <KPI icon="📅" label="Scheduled"   value={data.filter(l=>l.status==="scheduled").length} col="#1d9bf0"/>
        <KPI icon="✅" label="Completed"   value={data.filter(l=>l.status==="ended").length} col="#00c853"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
        {data.map(l=>(
          <div key={l.id} className="card" style={{padding:20,borderColor:l.status==="live"?C.r+"55":C.b,boxShadow:l.status==="live"?`0 0 20px ${C.r}18`:"none",transition:"all .2s"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <SChip s={l.status}/>
              {l.health!=null&&<span style={{fontSize:12,color:"#00c853",fontWeight:700}}>⚡ {l.health}%</span>}
            </div>
            <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{l.title}</div>
            <div style={{fontSize:12,color:C.m,marginBottom:12}}>{l.cat} · {l.status==="live"?`Started ${l.startedAt}`:l.status==="scheduled"?l.scheduledAt:l.endedAt||"Ended"}</div>
            {l.viewers>0&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:C.r,animation:"pulse 1.5s infinite",display:"inline-block"}}/>
                <span style={{fontSize:14,fontWeight:700,color:C.r}}>{fN(l.viewers)} watching</span>
              </div>
            )}
            {l.health&&(
              <div style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.m,marginBottom:4}}><span>Stream Health</span><span>{l.bitrate}</span></div>
                <div style={{height:4,background:"#1a1a28",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${l.health}%`,background:"#00c853"}}/></div>
              </div>
            )}
            {l.cdn&&<div style={{fontSize:11,color:C.m,marginBottom:12}}>CDN: {l.cdn}</div>}
            <div style={{display:"flex",gap:8}}>
              {l.status==="scheduled"&&<button className="btn btn-p" style={{flex:1,justifyContent:"center"}} onClick={()=>goLive(l.id)}>▶ Go Live</button>}
              {l.status==="live"&&<button className="btn btn-d" style={{flex:1,justifyContent:"center"}} onClick={()=>end(l.id)}>■ End</button>}
              {l.status!=="ended"&&<button className="btn btn-s" style={{justifyContent:"center"}} onClick={()=>setModal(l)}>Edit</button>}
              {l.status==="live"&&<button className="btn btn-s" style={{justifyContent:"center"}} onClick={()=>toast("Analytics opened")}>📊</button>}
            </div>
          </div>
        ))}
      </div>

      {modal!=null&&(
        <Modal title={modal.id?"Edit Stream":"Schedule New Stream"} onClose={()=>setModal(null)}>
          <F label="Title"><input className="inp" defaultValue={modal.title||""} placeholder="Stream title…"/></F>
          <div style={{display:"flex",gap:12}}>
            <F label="Category" half><select className="inp"><option>Cricket</option><option>Football</option><option>Racing</option><option>Kabaddi</option><option>Wrestling</option><option>News</option></select></F>
            <F label="CDN Region" half><select className="inp"><option>Mumbai</option><option>Delhi</option><option>Singapore</option><option>London</option></select></F>
          </div>
          <F label="Scheduled Date & Time"><input className="inp" type="datetime-local"/></F>
          <F label="Stream URL (HLS)"><input className="inp" placeholder="https://cdn.streamx.in/live/…"/></F>
          <F label="Expected Duration"><input className="inp" placeholder="e.g. 3 hours"/></F>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderTop:`1px solid ${C.b}`,borderBottom:`1px solid ${C.b}`,margin:"4px 0 16px"}}>
            <span style={{fontSize:13}}>Free for all users</span><Toggle on={true} onChange={()=>{}} col="#00c853"/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button className="btn btn-s" onClick={()=>setModal(null)} style={{flex:1}}>Cancel</button>
            <button className="btn btn-p" onClick={()=>{setModal(null);toast("Stream scheduled!");}} style={{flex:2}}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 7 — ANALYTICS
══════════════════════════════════════════════════════════════ */
function PageAnalytics(){
  const [range,setRange]=useState("7d");
  return(
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>Deep Analytics</div>
        <div style={{display:"flex",border:`1px solid ${C.b}`,borderRadius:8,overflow:"hidden"}}>
          {["7d","30d","90d","1y"].map(r=><button key={r} onClick={()=>setRange(r)} style={{background:range===r?C.r:"transparent",color:range===r?"#fff":"#555",border:"none",padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>{r}</button>)}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Views & DAU Trend</div>
          <div style={{fontSize:11,color:C.m,marginBottom:14}}>Daily Active Users vs Total Views</div>
          <LineChart data={DAILY} lines={[{k:"views",col:"#a855f7",label:"Views"},{k:"dau",col:"#1d9bf0",label:"DAU"}]} h={200}/>
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>Revenue vs New Subscribers</div>
          <div style={{fontSize:11,color:C.m,marginBottom:14}}>Subscription growth correlation</div>
          <LineChart data={DAILY} lines={[{k:"rev",col:"#00c853",label:"Revenue"},{k:"subs",col:"#f59e0b",label:"New Subs"}]} h={200}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:16,marginBottom:16}}>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Conversion Funnel</div>
          {[["Visits",248431,100,"#1d9bf0"],["Registered",186323,75,"#a855f7"],["Free Users",82753,33,"#f59e0b"],["Paid",62109,25,C.r]].map(([l,n,p,c])=>(
            <div key={l} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                <span style={{color:"#aaa"}}>{l}</span>
                <span style={{color:c,fontWeight:700}}>{fN(n)} <span style={{color:C.m,fontWeight:400}}>({p}%)</span></span>
              </div>
              <div style={{height:6,background:"#1a1a28",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:c,borderRadius:3}}/></div>
            </div>
          ))}
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Device Breakdown</div>
          {[["Mobile",54,"📱","#1d9bf0"],["Smart TV",22,"📺",C.r],["Web",16,"💻","#00c853"],["Tablet",8,"📟","#f59e0b"]].map(([l,p,icon,c])=>(
            <div key={l} style={{display:"flex",alignItems:"center",gap:10,marginBottom:13}}>
              <span style={{fontSize:16}}>{icon}</span>
              <div style={{flex:1}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                  <span style={{color:"#aaa"}}>{l}</span><span style={{color:c,fontWeight:700}}>{p}%</span>
                </div>
                <div style={{height:4,background:"#1a1a28",borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",width:`${p}%`,background:c}}/></div>
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>Genre Performance</div>
          <BarChart data={[{g:"Action",v:7000000},{g:"Drama",v:12800000},{g:"Sci-Fi",v:5900000},{g:"Kids",v:8900000},{g:"Sports",v:15600000},{g:"Thriller",v:4000000}]} xKey="g" yKey="v" col="#a855f7" h={150}/>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {[["Avg Session","28 min","⏱️","#1d9bf0"],["Completion","68%","✅","#00c853"],["Return Users","44%","🔄","#f59e0b"],["NPS Score","72","⭐","#a855f7"]].map(([l,v,i,c])=>(
          <div key={l} className="card" style={{padding:20,textAlign:"center"}}>
            <div style={{fontSize:28,marginBottom:8}}>{i}</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,color:c}}>{v}</div>
            <div style={{fontSize:11,color:C.m,marginTop:4}}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 8 — NOTIFICATIONS
══════════════════════════════════════════════════════════════ */
function PageNotifs({toast}){
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState({title:"",message:"",type:"release",target:"all"});
  const NC={release:"#1d9bf0",live:C.r,billing:"#f59e0b",promo:"#a855f7"};
  return(
    <div className="page">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>Push Notifications</div>
          <div style={{fontSize:12,color:C.m,marginTop:2}}>Broadcast to {fN(248431)} users</div>
        </div>
        <button className="btn btn-p" onClick={()=>setModal(true)}>📢 Broadcast</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
        <KPI icon="📬" label="Sent This Week" value={fN(496562)} col="#1d9bf0"/>
        <KPI icon="📖" label="Avg Open Rate"  value="45.3%"      col="#00c853" delta="+2.1%"/>
        <KPI icon="🖱️" label="Avg CTR"        value="6.8%"       col="#f59e0b"/>
        <KPI icon="🚫" label="Unsubscribed"   value="1.2%"       col="#f87171"/>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:`1px solid ${C.b}`,fontWeight:700,fontSize:14}}>Recent Broadcasts</div>
        <Tbl
          cols={[
            {k:"title", l:"Title",  fn:(v,r)=><div><div style={{fontWeight:600}}>{v}</div></div>},
            {k:"type",  l:"Type",   fn:v=><Chip label={v.toUpperCase()} color={NC[v]||"#555"}/>},
            {k:"target",l:"Target", fn:v=><Chip label={v.toUpperCase()} color="#6b7280"/>},
            {k:"sent",  l:"Sent",   fn:v=><span style={{color:"#1d9bf0",fontWeight:600}}>{fN(v)}</span>},
            {k:"opened",l:"Opened", fn:v=><span style={{color:"#00c853",fontWeight:600}}>{fN(v)}</span>},
            {k:"ctr",   l:"CTR",    fn:v=><span style={{color:"#f59e0b",fontWeight:700}}>{v}</span>},
            {k:"at",    l:"Sent At",fn:v=><span style={{fontSize:11,color:C.m}}>{v}</span>},
          ]}
          rows={NOTIFS}
          actions={()=>[{l:"Details",fn:()=>{}}]}
        />
      </div>
      {modal&&(
        <Modal title="Broadcast Notification" onClose={()=>setModal(false)}>
          <F label="Title"><input className="inp" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. New Release: Apex Protocol"/></F>
          <F label="Message"><textarea className="inp" rows={3} style={{resize:"vertical"}} value={form.message} onChange={e=>setForm(f=>({...f,message:e.target.value}))} placeholder="Notification body…"/></F>
          <div style={{display:"flex",gap:12}}>
            <F label="Type" half><select className="inp" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option value="release">New Release</option><option value="live">Live Event</option><option value="billing">Billing</option><option value="promo">Promotion</option></select></F>
            <F label="Target" half><select className="inp" value={form.target} onChange={e=>setForm(f=>({...f,target:e.target.value}))}><option value="all">All Users</option><option value="premium">Premium</option><option value="free">Free Users</option><option value="sports">Sports Fans</option><option value="expiring">Expiring Subs</option></select></F>
          </div>
          <div style={{background:"#0a0a14",borderRadius:8,padding:14,marginBottom:14,border:`1px solid ${C.b}`}}>
            <div style={{fontSize:10,color:C.m,marginBottom:5,textTransform:"uppercase",letterSpacing:.5}}>Preview</div>
            <div style={{fontWeight:700,fontSize:13}}>{form.title||"Notification Title"}</div>
            <div style={{fontSize:12,color:"#aaa",marginTop:3}}>{form.message||"Message body…"}</div>
          </div>
          <div style={{fontSize:12,color:C.m,marginBottom:14}}>📬 Reaches ~{form.target==="all"?fN(248431):form.target==="premium"?fN(62109):fN(22353)} users</div>
          <div style={{display:"flex",gap:10}}>
            <button className="btn btn-s" onClick={()=>setModal(false)} style={{flex:1}}>Cancel</button>
            <button className="btn btn-p" onClick={()=>{setModal(false);toast("Notification sent! 🚀");}} style={{flex:2}}>Send Now</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PAGE 9 — SETTINGS
══════════════════════════════════════════════════════════════ */
function PageSettings({toast}){
  const [cfg,setCfg]=useState({maintenance:false,registration:true,forceAdFree:false,debug:false,emailAlerts:true,smsAlerts:false,autoBackup:true,analytics:true,twoFactor:true,contentReview:true});
  const set=(k,v)=>setCfg(p=>({...p,[k]:v}));
  const [showKeys,setShowKeys]=useState(false);
  return(
    <div className="page" style={{maxWidth:720}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:18}}>Admin Settings</div>
      {[
        {title:"🖥️  Platform",rows:[
          {k:"maintenance",  l:"Maintenance Mode",      s:"Take platform offline for all users",           col:"#f87171"},
          {k:"registration", l:"Open Registration",     s:"Allow new users to sign up",                    col:"#00c853"},
          {k:"forceAdFree",  l:"Force Ad-Free Mode",    s:"Disable ads for all users (testing)"},
          {k:"contentReview",l:"Content Review Queue",  s:"Require admin approval before publishing"},
          {k:"debug",        l:"Debug Logging",         s:"Verbose server logs (dev only)"},
        ]},
        {title:"🔔  Notifications",rows:[
          {k:"emailAlerts",  l:"Admin Email Alerts",    s:"System events sent to admin inbox"},
          {k:"smsAlerts",    l:"SMS Billing Alerts",    s:"Failed payments trigger SMS"},
          {k:"autoBackup",   l:"Daily Auto Backup",     s:"Snapshot DB at 03:00 IST",                      col:"#00c853"},
        ]},
        {title:"🛡️  Security",rows:[
          {k:"analytics",    l:"Usage Analytics",       s:"Track user behaviour for improvements"},
          {k:"twoFactor",    l:"Force 2FA for Admins",  s:"All admin accounts require 2FA",                 col:"#f59e0b"},
        ]},
      ].map(sec=>(
        <div key={sec.title} className="card" style={{padding:20,marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:"#777",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.b}`}}>{sec.title}</div>
          {sec.rows.map((row,i)=>(
            <div key={row.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:i<sec.rows.length-1?`1px solid ${C.b}22`:"none"}}>
              <div><div style={{fontSize:13,fontWeight:600}}>{row.l}</div><div style={{fontSize:11,color:C.m,marginTop:2}}>{row.s}</div></div>
              <Toggle on={cfg[row.k]} onChange={v=>set(row.k,v)} col={row.col||C.r}/>
            </div>
          ))}
        </div>
      ))}

      {/* API Keys */}
      <div className="card" style={{padding:20,marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#777",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.b}`}}>🔑  API Keys</div>
        {[["Live API Key","sk_live_••••••••••••4f2a"],["Test API Key","sk_test_••••••••••••9c1b"],["CDN Secret","cdn_••••••••••••••7d3e"],["Webhook Secret","whsec_•••••••••••••2f8a"]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`1px solid ${C.b}22`}}>
            <div><div style={{fontSize:12,fontWeight:600}}>{l}</div><div style={{fontFamily:"monospace",fontSize:11,color:"#7dd3fc",marginTop:3}}>{showKeys?v.replace(/•+/,"x4f2a"):v}</div></div>
            <div style={{display:"flex",gap:6}}>
              <button className="btn btn-s" style={{padding:"4px 9px",fontSize:11}} onClick={()=>setShowKeys(o=>!o)}>{showKeys?"Hide":"Show"}</button>
              <button className="btn btn-s" style={{padding:"4px 9px",fontSize:11}} onClick={()=>toast("Copied!")}>Copy</button>
            </div>
          </div>
        ))}
        <button className="btn btn-d" style={{marginTop:14,justifyContent:"center"}} onClick={()=>toast("Keys rotated!","warn")}>🔄 Rotate All Keys</button>
      </div>

      {/* System Info */}
      <div className="card" style={{padding:20}}>
        <div style={{fontSize:12,fontWeight:700,color:"#777",marginBottom:12,paddingBottom:10,borderBottom:`1px solid ${C.b}`}}>⚙️  System Info</div>
        {[["API Version","v2.4.1"],["Node.js","v22.22.2"],["Database","SQLite (In-Memory)"],["CDN","cdn.streamx.in"],["Uptime","14d 6h 22m"],["Storage","3.8 GB / 500 GB"],["Last Backup","Today 03:00 IST"],["Environment","Development"]].map(([k,v])=>(
          <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.b}22`,fontSize:12}}>
            <span style={{color:C.m}}>{k}</span>
            <span style={{fontFamily:"monospace",color:"#7dd3fc"}}>{v}</span>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button className="btn btn-s" style={{flex:1,justifyContent:"center"}} onClick={()=>toast("Backup started!")}>💾 Backup Now</button>
          <button className="btn btn-d" style={{flex:1,justifyContent:"center"}} onClick={()=>toast("Restarting…","warn")}>🔄 Restart Server</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   APP SHELL
══════════════════════════════════════════════════════════════ */
const NAV=[
  {id:"overview",     label:"Overview",       icon:"📊"},
  {id:"content",      label:"Content",        icon:"🎬"},
  {id:"users",        label:"Users",          icon:"👥"},
  {id:"subs",         label:"Subscriptions",  icon:"👑"},
  {id:"ads",          label:"Ads",            icon:"📢"},
  {id:"live",         label:"Live",           icon:"🔴",dot:true},
  {id:"analytics",    label:"Analytics",      icon:"📈"},
  {id:"notifs",       label:"Notifications",  icon:"🔔"},
  {id:"settings",     label:"Settings",       icon:"⚙️"},
];

export default function App(){
  const [page,setPage]=useState("overview");
  const [col,setCol]=useState(false);
  const [toastData,setToastData]=useState(null);

  const showToast=(msg,type="info")=>setToastData({msg,type,id:Date.now()});
  const props={toast:showToast};

  const PAGES={
    overview:  <PageOverview/>,
    content:   <PageContent   {...props}/>,
    users:     <PageUsers     {...props}/>,
    subs:      <PageSubs/>,
    ads:       <PageAds       {...props}/>,
    live:      <PageLive      {...props}/>,
    analytics: <PageAnalytics/>,
    notifs:    <PageNotifs    {...props}/>,
    settings:  <PageSettings  {...props}/>,
  };

  return(
    <div style={{display:"flex",height:"100vh",background:C.bg,overflow:"hidden"}}>
      <style>{GS}</style>

      {/* SIDEBAR */}
      <div style={{width:col?50:196,flexShrink:0,background:C.s,borderRight:`1px solid ${C.b}`,display:"flex",flexDirection:"column",transition:"width .22s ease",overflow:"hidden"}}>
        <div style={{padding:col?"13px 10px":"13px 14px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",gap:10,flexShrink:0,cursor:"pointer"}} onClick={()=>setCol(o=>!o)}>
          <div style={{width:26,height:26,borderRadius:7,background:"rgba(229,9,20,.14)",border:`1px solid ${C.r}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>⚡</div>
          {!col&&<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,whiteSpace:"nowrap"}}><span style={{color:C.r}}>STREAM</span><span>X</span><span style={{fontSize:9,color:C.m,marginLeft:4}}>ADMIN</span></div>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 5px"}}>
          {NAV.map(n=>(
            <div key={n.id} className={`nav-link${page===n.id?" on":""}`} onClick={()=>setPage(n.id)} style={{justifyContent:col?"center":"flex-start",padding:col?"8px":"8px 11px"}} title={col?n.label:undefined}>
              <span style={{fontSize:14,flexShrink:0}}>{n.icon}</span>
              {!col&&<span style={{flex:1}}>{n.label}</span>}
              {!col&&n.dot&&<span style={{width:6,height:6,borderRadius:"50%",background:C.r,animation:"pulse 1.5s infinite",flexShrink:0}}/>}
            </div>
          ))}
        </div>
        <div style={{padding:"8px 5px",borderTop:`1px solid ${C.b}`}}>
          <div className="nav-link" onClick={()=>setCol(o=>!o)} style={{justifyContent:col?"center":"flex-start"}}>
            <span style={{fontSize:12}}>{col?"▶":"◀"}</span>
            {!col&&<span style={{fontSize:12}}>Collapse</span>}
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:50,background:C.s,borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",padding:"0 20px",gap:14,flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:"#555"}}>
            {NAV.find(n=>n.id===page)?.icon}  {NAV.find(n=>n.id===page)?.label}
          </div>
          <div style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.r,fontWeight:700}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:C.r,animation:"pulse 1.5s infinite",display:"inline-block"}}/>
            2 streams live
          </div>
          <div style={{width:1,height:16,background:C.b}}/>
          <span style={{fontSize:11,color:C.m}}>Mon May 18, 2026 · 15:42 IST</span>
          <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(229,9,20,.1)",border:`1px solid ${C.r}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,cursor:"pointer"}}>👤</div>
        </div>

        {/* Page content */}
        <div style={{flex:1,overflowY:"auto",padding:20}} key={page}>
          {PAGES[page]}
        </div>
      </div>

      {/* Toast */}
      {toastData&&<Toast key={toastData.id} msg={toastData.msg} type={toastData.type} onDone={()=>setToastData(null)}/>}
    </div>
  );
}
