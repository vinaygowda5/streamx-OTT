import { useState, useEffect } from "react";
import { db } from "./supabase.js";
import FaceAuth from "./FaceAuth.jsx";

const C = { r:"#e50914", bg:"#07070c", s:"#0e0e18", b:"#191926", m:"#444460" };

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#07070c;color:#e2e2ee;font-family:'Inter',sans-serif;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes spin{to{transform:rotate(360deg);}}
.card{background:#0e0e18;border:1px solid #191926;border-radius:12px;}
.tbl-row{border-bottom:1px solid #13131f;transition:background .14s;}
.tbl-row:hover{background:rgba(255,255,255,.025);}
.tbl-row:last-child{border-bottom:none;}
.btn{border:none;border-radius:7px;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:600;cursor:pointer;padding:7px 14px;transition:all .15s;}
.btn-p{background:#e50914;color:#fff;}
.btn-s{background:rgba(255,255,255,.07);color:#aaa;border:1px solid rgba(255,255,255,.08);}
.btn-d{background:rgba(248,113,113,.1);color:#f87171;border:1px solid rgba(248,113,113,.2);}
.btn-g{background:rgba(0,200,83,.1);color:#00c853;border:1px solid rgba(0,200,83,.2);}
.inp{width:100%;background:#0a0a14;border:1px solid #1a1a2c;border-radius:7px;color:#e2e2ee;font-family:'Inter',sans-serif;font-size:13px;padding:8px 12px;outline:none;}
.inp:focus{border-color:#e50914;}
.nav-link{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:500;color:#4a4a6a;transition:all .16s;white-space:nowrap;}
.nav-link:hover{background:rgba(255,255,255,.04);color:#8888aa;}
.nav-link.on{background:rgba(229,9,20,.1);color:#e50914;font-weight:700;}
`;

const PAGES = [
  {id:"overview",   label:"Overview",      icon:"📊"},
  {id:"content",    label:"Content",       icon:"🎬"},
  {id:"users",      label:"Users",         icon:"👥"},
  {id:"subs",       label:"Subscriptions", icon:"👑"},
  {id:"ads",        label:"Ads",           icon:"📢"},
  {id:"live",       label:"Live Events",   icon:"🔴"},
  {id:"analytics",  label:"Analytics",     icon:"📈"},
  {id:"settings",   label:"Settings",      icon:"⚙️"},
];

function KPI({icon,label,value,sub,color=C.r}) {
  return (
    <div className="card" style={{padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:color}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:11,color:C.m,fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>{label}</span>
        <span style={{fontSize:18}}>{icon}</span>
      </div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#fff",letterSpacing:.5}}>{value}</div>
      {sub&&<div style={{fontSize:11,color:C.m,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function Chip({label,color="#888"}) {
  return <span style={{background:`${color}22`,color,fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{label}</span>;
}

function Modal({title,onClose,children}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={onClose}>
      <div style={{background:"#111120",border:`1px solid ${C.b}`,borderRadius:14,width:"100%",maxWidth:520,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:`1px solid ${C.b}`}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1}}>{title}</div>
          <button onClick={onClose} className="btn btn-s" style={{padding:"3px 9px"}}>✕</button>
        </div>
        <div style={{padding:"18px 20px"}}>{children}</div>
      </div>
    </div>
  );
}

// ── OVERVIEW PAGE ─────────────────────────
function Overview({stats,content,users}) {
  const fN = n => n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n||0);
  const fR = n => "₹"+(n>=1e5?(n/1e5).toFixed(1)+"L":n>=1e3?Math.round(n/1e3)+"K":n||0);

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12,marginBottom:20}}>
        <KPI icon="👥" label="Total Users"    value={fN(stats.totalUsers)}   sub="registered accounts" color="#1d9bf0"/>
        <KPI icon="👑" label="Paid Subs"      value={fN(stats.activeSubs)}   sub="active subscriptions" color={C.r}/>
        <KPI icon="💰" label="Total Revenue"  value={fR(stats.totalRevenue)} sub="all time" color="#00c853"/>
        <KPI icon="👁️" label="Total Views"    value={fN(stats.totalViews)}   sub="content views" color="#a855f7"/>
        <KPI icon="🎬" label="Content"        value={stats.totalContent}     sub="active titles" color="#06b6d4"/>
        <KPI icon="📢" label="Active Ads"     value={stats.activeAds||0}     sub="running campaigns" color="#f59e0b"/>
        <KPI icon="📊" label="Ad Impressions" value={fN(stats.adImpressions||0)} sub="total served" color="#f59e0b"/>
        <KPI icon="🔴" label="Live Events"    value={stats.liveEvents||0}    sub="streaming now" color={C.r}/>
      </div>

      {/* Top content */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>🔥 Top Content</div>
          {[...(content||[])].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,6).map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<5?"1px solid #13131f":"none"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:i===0?C.r:C.m,width:20}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                <div style={{fontSize:10,color:C.m}}>{c.type} · {c.genre}</div>
              </div>
              <div style={{fontSize:11,color:"#1d9bf0",fontWeight:600}}>{fN(c.views||0)}</div>
            </div>
          ))}
        </div>
        <div className="card" style={{padding:20}}>
          <div style={{fontWeight:700,fontSize:14,marginBottom:14}}>👥 Recent Users</div>
          {[...(users||[])].slice(0,6).map((u,i)=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<5?"1px solid #13131f":"none"}}>
              <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(229,9,20,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>
                {u.name?.[0]?.toUpperCase()||"👤"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600}}>{u.name||"Unknown"}</div>
                <div style={{fontSize:10,color:C.m}}>{u.phone||u.email||"No contact"}</div>
              </div>
              <Chip label={u.plan?.toUpperCase()||"FREE"} color={u.plan?.includes("premium")?"#e50914":u.plan?.includes("basic")?"#3b82f6":"#555"}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CONTENT PAGE ──────────────────────────
function ContentPage({content,onRefresh,showToast}) {
  const [modal,   setModal]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [form,    setForm]    = useState({title:"",description:"",type:"Movie",genre:"Action",language:"Hindi",is_premium:false,is_featured:false,stream_url:"",release_year:2026,rating:"U/A"});

  const filtered = (content||[]).filter(c=>c.title?.toLowerCase().includes(search.toLowerCase()));

  async function saveContent() {
    try {
      if (modal?.id) {
        await db.updateContent(modal.id, form);
        showToast("Content updated!");
      } else {
        await db.addContent(form);
        showToast("Content added!");
      }
      setModal(null); onRefresh();
    } catch(e) { showToast("Error: "+e.message); }
  }

  async function toggleActive(c) {
    await db.updateContent(c.id,{is_active:!c.is_active});
    showToast(c.is_active?"Disabled":"Enabled");
    onRefresh();
  }

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>Content Library</div>
          <div style={{fontSize:12,color:C.m,marginTop:2}}>{(content||[]).length} titles</div>
        </div>
        <button className="btn btn-p" onClick={()=>{setForm({title:"",description:"",type:"Movie",genre:"Action",language:"Hindi",is_premium:false,is_featured:false,stream_url:"",release_year:2026,rating:"U/A"});setModal({});}}>+ Add Content</button>
      </div>

      <div style={{marginBottom:14}}>
        <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search titles..." style={{maxWidth:280}}/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${C.b}`}}>
              {["Title","Type","Genre","Status","Premium","Views","Actions"].map(h=>(
                <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:C.m,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c=>(
              <tr key={c.id} className="tbl-row">
                <td style={{padding:"9px 12px",fontSize:13,fontWeight:600}}>{c.title}</td>
                <td style={{padding:"9px 12px"}}><Chip label={c.type} color="#1d9bf0"/></td>
                <td style={{padding:"9px 12px",fontSize:12,color:C.m}}>{c.genre}</td>
                <td style={{padding:"9px 12px"}}><Chip label={c.is_active?"ACTIVE":"OFF"} color={c.is_active?"#00c853":"#555"}/></td>
                <td style={{padding:"9px 12px"}}><Chip label={c.is_premium?"PRO":"FREE"} color={c.is_premium?C.r:"#00c853"}/></td>
                <td style={{padding:"9px 12px",fontSize:12,color:"#1d9bf0",fontWeight:600}}>{(c.views||0).toLocaleString()}</td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button className="btn btn-s" style={{padding:"4px 9px",fontSize:11}} onClick={()=>{setForm({...c});setModal(c);}}>Edit</button>
                    <button className={`btn ${c.is_active?"btn-d":"btn-g"}`} style={{padding:"4px 9px",fontSize:11}} onClick={()=>toggleActive(c)}>{c.is_active?"Disable":"Enable"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal!==null && (
        <Modal title={modal.id?"Edit Content":"Add Content"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[["Title","title","text"],["Description","description","textarea"],["Stream URL","stream_url","text"],["Trailer URL","trailer_url","text"],["Director","director","text"],["Studio","studio","text"]].map(([l,k,t])=>(
              <div key={k}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>{l}</label>
                {t==="textarea"
                  ? <textarea className="inp" rows={3} value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} style={{resize:"vertical"}}/>
                  : <input className="inp" value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
                }
              </div>
            ))}
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>Type</label>
                <select className="inp" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  {["Movie","Series","Live","Documentary"].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>Genre</label>
                <select className="inp" value={form.genre} onChange={e=>setForm(f=>({...f,genre:e.target.value}))}>
                  {["Action","Drama","Sci-Fi","Thriller","Comedy","Romance","Kids","Sports","Documentary","News","Cricket","Horror"].map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>Language</label>
                <select className="inp" value={form.language} onChange={e=>setForm(f=>({...f,language:e.target.value}))}>
                  {["Hindi","English","Tamil","Telugu","Kannada","Bengali","Malayalam"].map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>Rating</label>
                <select className="inp" value={form.rating} onChange={e=>setForm(f=>({...f,rating:e.target.value}))}>
                  {["U","U/A","U/A 7+","U/A 13+","U/A 16+","A"].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:"flex",gap:20,padding:"8px 0",borderTop:`1px solid ${C.b}`}}>
              {[["Premium Content","is_premium"],["Featured on Home","is_featured"],["Active","is_active"]].map(([l,k])=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#aaa"}}>
                  <input type="checkbox" checked={!!form[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.checked}))}/> {l}
                </label>
              ))}
            </div>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button className="btn btn-s" onClick={()=>setModal(null)} style={{flex:1}}>Cancel</button>
              <button className="btn btn-p" onClick={saveContent} style={{flex:2}}>{modal.id?"Save Changes":"Add Content"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── USERS PAGE ────────────────────────────
function UsersPage({users,onRefresh,showToast}) {
  const [search, setSearch] = useState("");
  const [drawer, setDrawer] = useState(null);

  const filtered = (users||[]).filter(u=>
    u.name?.toLowerCase().includes(search.toLowerCase())||
    u.phone?.includes(search)||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function suspend(u) {
    await db.suspendUser(u.id);
    showToast("User suspended"); onRefresh();
  }
  async function activate(u) {
    await db.activateUser(u.id);
    showToast("User activated"); onRefresh();
  }

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>User Management</div>
          <div style={{fontSize:12,color:C.m,marginTop:2}}>{(users||[]).length} registered users</div>
        </div>
      </div>
      <div style={{marginBottom:14}}>
        <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, email..." style={{maxWidth:320}}/>
      </div>
      <div className="card" style={{overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${C.b}`}}>
              {["User","Contact","Plan","Role","Status","Joined","Actions"].map(h=>(
                <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:C.m,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u=>(
              <tr key={u.id} className="tbl-row">
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:"50%",background:"rgba(229,9,20,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0,fontWeight:700}}>
                      {u.name?.[0]?.toUpperCase()||"?"}
                    </div>
                    <div style={{fontWeight:600,fontSize:13}}>{u.name||"Unknown"}</div>
                  </div>
                </td>
                <td style={{padding:"9px 12px",fontSize:12,color:C.m}}>{u.phone||u.email||"—"}</td>
                <td style={{padding:"9px 12px"}}><Chip label={(u.plan||"free").toUpperCase()} color={u.plan?.includes("premium")?C.r:u.plan?.includes("basic")?"#3b82f6":"#555"}/></td>
                <td style={{padding:"9px 12px"}}><Chip label={(u.role||"user").toUpperCase()} color={u.role==="admin"?"#f59e0b":"#555"}/></td>
                <td style={{padding:"9px 12px"}}><Chip label={u.is_active?"ACTIVE":"SUSPENDED"} color={u.is_active?"#00c853":"#f87171"}/></td>
                <td style={{padding:"9px 12px",fontSize:11,color:C.m}}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button className="btn btn-s" style={{padding:"4px 9px",fontSize:11}} onClick={()=>setDrawer(u)}>View</button>
                    <button className={`btn ${u.is_active?"btn-d":"btn-g"}`} style={{padding:"4px 9px",fontSize:11}} onClick={()=>u.is_active?suspend(u):activate(u)}>
                      {u.is_active?"Suspend":"Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* User Detail Drawer */}
      {drawer && (
        <>
          <div style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,.5)"}} onClick={()=>setDrawer(null)}/>
          <div style={{position:"fixed",top:0,right:0,bottom:0,width:360,zIndex:801,background:C.s,borderLeft:`1px solid ${C.b}`,overflowY:"auto",padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18}}>User Detail</div>
              <button className="btn btn-s" onClick={()=>setDrawer(null)} style={{padding:"3px 9px"}}>✕</button>
            </div>
            <div style={{width:64,height:64,borderRadius:"50%",background:"rgba(229,9,20,.12)",border:"2px solid rgba(229,9,20,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,margin:"0 auto 16px",fontWeight:700}}>
              {drawer.name?.[0]?.toUpperCase()||"👤"}
            </div>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:16}}>{drawer.name||"Unknown"}</div>
              <div style={{fontSize:12,color:C.m,marginTop:4}}>{drawer.phone||drawer.email}</div>
            </div>
            {[["Plan",(drawer.plan||"free").toUpperCase()],["Role",(drawer.role||"user").toUpperCase()],["Status",drawer.is_active?"Active":"Suspended"],["Joined",new Date(drawer.created_at).toLocaleDateString("en-IN")],["ID",drawer.id.slice(0,16)+"..."]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:`1px solid ${C.b}22`,fontSize:12}}>
                <span style={{color:C.m}}>{k}</span>
                <span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:20}}>
              <button className="btn btn-s" style={{justifyContent:"center"}} onClick={()=>showToast("Password reset sent!")}>🔑 Reset Auth</button>
              <button className={`btn ${drawer.is_active?"btn-d":"btn-g"}`} style={{justifyContent:"center"}} onClick={()=>{drawer.is_active?suspend(drawer):activate(drawer);setDrawer(null);}}>
                {drawer.is_active?"🚫 Suspend":"✅ Activate"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── ADS PAGE ──────────────────────────────
function AdsPage({ads,onRefresh,showToast}) {
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({brand:"",tagline:"",cta_text:"Learn More",type:"pre_roll",duration:15,skip_after:5,is_active:true,priority:1});

  async function saveAd() {
    try {
      if (modal?.id) { await db.updateAd(modal.id,form); showToast("Ad updated!"); }
      else { await db.addAd(form); showToast("Ad created!"); }
      setModal(null); onRefresh();
    } catch(e) { showToast("Error: "+e.message); }
  }

  async function toggleAd(a) {
    await db.updateAd(a.id,{is_active:!a.is_active});
    showToast(a.is_active?"Ad paused":"Ad activated"); onRefresh();
  }

  const totalImpr = 0; // Would come from ad_impressions table
  const fN = n => n>=1e3?(n/1e3).toFixed(1)+"K":String(n||0);

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1}}>Ad Manager</div>
          <div style={{fontSize:12,color:C.m,marginTop:2}}>{(ads||[]).filter(a=>a.is_active).length} active campaigns</div>
        </div>
        <button className="btn btn-p" onClick={()=>{setForm({brand:"",tagline:"",cta_text:"Learn More",type:"pre_roll",duration:15,skip_after:5,is_active:true,priority:1});setModal({});}}>+ New Ad</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:20}}>
        <KPI icon="📢" label="Total Ads"    value={(ads||[]).length}                              color="#f59e0b"/>
        <KPI icon="✅" label="Active"       value={(ads||[]).filter(a=>a.is_active).length}        color="#00c853"/>
        <KPI icon="⏸️" label="Paused"       value={(ads||[]).filter(a=>!a.is_active).length}       color="#555"/>
        <KPI icon="🎯" label="Pre-roll"     value={(ads||[]).filter(a=>a.type==="pre_roll").length} color={C.r}/>
      </div>

      <div className="card" style={{overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${C.b}`}}>
              {["Brand","Type","Duration","Skip After","Status","Priority","Actions"].map(h=>(
                <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10.5,color:C.m,fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(ads||[]).map(a=>(
              <tr key={a.id} className="tbl-row">
                <td style={{padding:"9px 12px"}}>
                  <div style={{fontWeight:700,fontSize:13}}>{a.brand}</div>
                  <div style={{fontSize:10,color:C.m}}>{a.tagline}</div>
                </td>
                <td style={{padding:"9px 12px"}}><Chip label={a.type?.replace("_"," ").toUpperCase()} color="#1d9bf0"/></td>
                <td style={{padding:"9px 12px",fontSize:12}}>{a.duration||0}s</td>
                <td style={{padding:"9px 12px",fontSize:12}}>{a.skip_after||0}s</td>
                <td style={{padding:"9px 12px"}}><Chip label={a.is_active?"ACTIVE":"PAUSED"} color={a.is_active?"#00c853":"#f59e0b"}/></td>
                <td style={{padding:"9px 12px",fontSize:12}}>{a.priority||1}</td>
                <td style={{padding:"9px 12px"}}>
                  <div style={{display:"flex",gap:5}}>
                    <button className="btn btn-s" style={{padding:"4px 9px",fontSize:11}} onClick={()=>{setForm({...a});setModal(a);}}>Edit</button>
                    <button className={`btn ${a.is_active?"btn-d":"btn-g"}`} style={{padding:"4px 9px",fontSize:11}} onClick={()=>toggleAd(a)}>{a.is_active?"Pause":"Resume"}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal!==null && (
        <Modal title={modal.id?"Edit Ad":"New Ad Campaign"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[["Brand Name","brand"],["Tagline","tagline"],["CTA Button Text","cta_text"],["Video URL","video_url"],["Banner URL","banner_url"]].map(([l,k])=>(
              <div key={k}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>{l}</label>
                <input className="inp" value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/>
              </div>
            ))}
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>Type</label>
                <select className="inp" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  <option value="pre_roll">Pre-roll</option>
                  <option value="mid_roll">Mid-roll</option>
                  <option value="banner">Banner</option>
                  <option value="rewarded">Rewarded</option>
                </select>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>Duration (s)</label>
                <input className="inp" type="number" value={form.duration||15} onChange={e=>setForm(f=>({...f,duration:+e.target.value}))}/>
              </div>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>Skip After (s)</label>
                <input className="inp" type="number" value={form.skip_after||5} onChange={e=>setForm(f=>({...f,skip_after:+e.target.value}))}/>
              </div>
            </div>
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <label style={{fontSize:10,color:C.m,fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:4}}>Priority (1=highest)</label>
                <input className="inp" type="number" value={form.priority||1} onChange={e=>setForm(f=>({...f,priority:+e.target.value}))}/>
              </div>
              <div style={{flex:1,display:"flex",alignItems:"flex-end",paddingBottom:4}}>
                <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#aaa"}}>
                  <input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/> Active
                </label>
              </div>
            </div>
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button className="btn btn-s" onClick={()=>setModal(null)} style={{flex:1}}>Cancel</button>
              <button className="btn btn-p" onClick={saveAd} style={{flex:2}}>{modal.id?"Save":"Create Campaign"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MAIN ADMIN ────────────────────────────
export default function Admin({ onNavigate, user }) {
  const [page,        setPage]        = useState("overview");
  const [collapsed,   setCollapsed]   = useState(false);
  const [stats,       setStats]       = useState({});
  const [content,     setContent]     = useState([]);
  const [users,       setUsers]       = useState([]);
  const [ads,         setAds]         = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [faceVerified,setFaceVerified]= useState(false);
  const [showFace,    setShowFace]    = useState(true);

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),3000); }

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s,c,u,a] = await Promise.all([
        db.getAdminStats().catch(()=>({})),
        db.getAllContent().catch(()=>[]),
        db.getAllUsers().catch(()=>[]),
        db.getAllAds().catch(()=>[]),
      ]);
      setStats(s); setContent(c); setUsers(u); setAds(a);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  // Show face auth first
  if (showFace && !faceVerified) {
    return (
      <FaceAuth
        user={user}
        onSuccess={() => { setFaceVerified(true); setShowFace(false); showToast("Welcome, Admin! 👑"); }}
        onSkip={() => { setFaceVerified(true); setShowFace(false); }}
      />
    );
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'Inter',sans-serif"}}>
      <div style={{width:40,height:40,border:`3px solid ${C.b}`,borderTop:`3px solid ${C.r}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <div style={{color:C.m,fontSize:13}}>Loading admin dashboard...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,overflow:"hidden",fontFamily:"'Inter',sans-serif"}}>
      <style>{GS}</style>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:24,right:24,zIndex:1000,background:"#111120",border:`1px solid #00c85344`,borderLeft:`3px solid #00c853`,borderRadius:8,padding:"11px 18px",fontSize:13,fontWeight:500,animation:"fadeIn .2s ease",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>
          ✅ {toast}
        </div>
      )}

      {/* Sidebar */}
      <div style={{width:collapsed?50:196,flexShrink:0,background:C.s,borderRight:`1px solid ${C.b}`,display:"flex",flexDirection:"column",transition:"width .22s",overflow:"hidden"}}>
        <div style={{padding:collapsed?"12px 10px":"12px 14px",borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setCollapsed(o=>!o)}>
          <div style={{width:26,height:26,borderRadius:7,background:"rgba(229,9,20,.14)",border:`1px solid ${C.r}33`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>⚡</div>
          {!collapsed && <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,whiteSpace:"nowrap"}}><span style={{color:C.r}}>STREAM</span><span>X</span> <span style={{fontSize:9,color:C.m}}>ADMIN</span></div>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"8px 5px"}}>
          {PAGES.map(p=>(
            <div key={p.id} className={`nav-link${page===p.id?" on":""}`} onClick={()=>setPage(p.id)} style={{justifyContent:collapsed?"center":"flex-start",padding:collapsed?"8px":"8px 11px"}} title={collapsed?p.label:undefined}>
              <span style={{fontSize:14,flexShrink:0}}>{p.icon}</span>
              {!collapsed && <span>{p.label}</span>}
            </div>
          ))}
        </div>
        <div style={{padding:"8px 5px",borderTop:`1px solid ${C.b}`}}>
          <div className="nav-link" onClick={()=>onNavigate("home")} style={{justifyContent:collapsed?"center":"flex-start",color:"#f87171"}}>
            <span style={{fontSize:14}}>🏠</span>
            {!collapsed&&<span style={{fontSize:12}}>Back to Home</span>}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:50,background:C.s,borderBottom:`1px solid ${C.b}`,display:"flex",alignItems:"center",padding:"0 20px",gap:14,flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:16,letterSpacing:1,color:"#666"}}>
            {PAGES.find(p=>p.id===page)?.icon} {PAGES.find(p=>p.id===page)?.label}
          </div>
          <div style={{flex:1}}/>
          <span style={{fontSize:11,color:C.m}}>Welcome, {user?.name||"Admin"} 👑</span>
          <button className="btn btn-s" onClick={loadData} style={{padding:"5px 12px",fontSize:11}}>↻ Refresh</button>
        </div>

        {/* Content */}
        <div style={{flex:1,overflowY:"auto",padding:20}} key={page}>
          {page==="overview"  && <Overview stats={stats} content={content} users={users}/>}
          {page==="content"   && <ContentPage content={content} onRefresh={loadData} showToast={showToast}/>}
          {page==="users"     && <UsersPage users={users} onRefresh={loadData} showToast={showToast}/>}
          {page==="ads"       && <AdsPage ads={ads} onRefresh={loadData} showToast={showToast}/>}
          {page==="subs"      && (
            <div style={{animation:"fadeIn .3s ease"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:18}}>Subscriptions</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
                <KPI icon="👑" label="Active Subs"  value={stats.activeSubs||0}    color={C.r}/>
                <KPI icon="💰" label="Total Revenue" value={"₹"+(stats.totalRevenue||0)} color="#00c853"/>
              </div>
            </div>
          )}
          {page==="live"      && (
            <div style={{animation:"fadeIn .3s ease"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:18}}>Live Events</div>
              <div style={{color:C.m,fontSize:13}}>Live event management coming soon. Use Supabase directly to manage live_events table.</div>
            </div>
          )}
          {page==="analytics" && (
            <div style={{animation:"fadeIn .3s ease"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:18}}>Analytics</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:12}}>
                <KPI icon="👁️" label="Total Views"   value={stats.totalViews||0}      color="#a855f7"/>
                <KPI icon="📢" label="Ad Impressions" value={stats.adImpressions||0}   color="#f59e0b"/>
                <KPI icon="🖱️" label="Ad Clicks"      value={stats.adClicks||0}        color="#1d9bf0"/>
                <KPI icon="💰" label="Ad Revenue"     value={"₹"+(stats.adRevenue||0)} color="#00c853"/>
              </div>
            </div>
          )}
          {page==="settings"  && (
            <div style={{animation:"fadeIn .3s ease",maxWidth:600}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:26,letterSpacing:1,marginBottom:18}}>Settings</div>
              <div className="card" style={{padding:20}}>
                {[["Admin Phone","+918660570052"],["Admin Email","vinaygowda12096909@email.com"],["Database","Supabase PostgreSQL"],["Auth","Mobile OTP + Face ID"],["Version","StreamX v2.0"]].map(([k,v])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${C.b}22`,fontSize:13}}>
                    <span style={{color:C.m}}>{k}</span>
                    <span style={{fontFamily:"monospace",color:"#7dd3fc",fontSize:12}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}