import { useState, useEffect } from "react";
import { supabase, db } from "./supabase.js";
import FaceAuth from "./FaceAuth.jsx";

const R = "#e50914";
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#07070c;color:#e2e2ee;font-family:'Inter',sans-serif;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes spin{to{transform:rotate(360deg);}}
.tbl tr{border-bottom:1px solid #13131f;transition:background .14s;}
.tbl tr:hover{background:rgba(255,255,255,.025);}
.tbl th{padding:9px 12px;text-align:left;font-size:10.5px;color:#555;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #191926;}
.tbl td{padding:9px 12px;font-size:13px;}
.inp{width:100%;background:#0a0a14;border:1px solid #1a1a2c;border-radius:7px;color:#e2e2ee;font-family:'Inter',sans-serif;font-size:13px;padding:9px 12px;outline:none;transition:border-color .2s;}
.inp:focus{border-color:#e50914;}
.nav{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;font-size:12.5px;font-weight:600;color:#4a4a6a;transition:all .16s;}
.nav:hover{background:rgba(255,255,255,.04);color:#aaa;}
.nav.on{background:rgba(229,9,20,.1);color:#e50914;}
`;

const PAGES = [
  {id:"overview", icon:"📊", label:"Overview"},
  {id:"content",  icon:"🎬", label:"Content"},
  {id:"live",     icon:"🔴", label:"Live Channels"},
  {id:"users",    icon:"👥", label:"Users"},
  {id:"ads",      icon:"📢", label:"Ads"},
  {id:"subs",     icon:"👑", label:"Revenue"},
];

const TYPES = ["Movie","Series","Live","Documentary"];
const GENRES = ["Action","Drama","Sci-Fi","Thriller","Comedy","Romance","Kids","Cricket","Football","Racing","Kabaddi","News","Documentary","Nature","Horror","Sports"];
const LANGS  = ["Hindi","English","Tamil","Telugu","Kannada","Bengali","Malayalam"];
const RATINGS = ["U","U/A","U/A 7+","U/A 13+","U/A 16+","A"];

function Chip({label,color="#888"}) {
  return <span style={{background:`${color}22`,color,fontSize:11,fontWeight:700,padding:"2px 9px",borderRadius:20}}>{label}</span>;
}

function Btn({children,onClick,color=R,outline,danger,small}) {
  return (
    <button onClick={onClick} style={{
      background: outline||danger ? `${danger?"rgba(248,113,113,.1)":color}${outline||danger?"22":""}` : color,
      border: `1px solid ${danger?"rgba(248,113,113,.3)":outline?color+"44":"transparent"}`,
      color: outline||danger ? (danger?"#f87171":color) : "#fff",
      borderRadius:7, padding:small?"4px 10px":"8px 16px",
      fontSize:small?11:13, fontWeight:600, cursor:"pointer",
      fontFamily:"'Inter',sans-serif", transition:"all .15s",
      whiteSpace:"nowrap",
    }}>{children}</button>
  );
}

function Modal({title,onClose,children,wide}) {
  return (
    <div style={{position:"fixed",inset:0,zIndex:900,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div style={{background:"#111120",border:"1px solid #191926",borderRadius:14,width:"100%",maxWidth:wide?640:500,maxHeight:"90vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid #191926"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,letterSpacing:1}}>{title}</div>
          <Btn onClick={onClose} outline small>✕</Btn>
        </div>
        <div style={{padding:"16px 20px"}}>{children}</div>
      </div>
    </div>
  );
}

function KPI({icon,label,value,color=R}) {
  return (
    <div style={{background:"#0e0e18",border:"1px solid #191926",borderRadius:12,padding:"16px 18px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:color}}/>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
        <span style={{fontSize:11,color:"#444",fontWeight:700,textTransform:"uppercase",letterSpacing:.5}}>{label}</span>
        <span style={{fontSize:18}}>{icon}</span>
      </div>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:28,color:"#fff"}}>{value}</div>
    </div>
  );
}

function Field({label,children}) {
  return (
    <div>
      <label style={{fontSize:10,color:"#555",fontWeight:700,letterSpacing:.5,textTransform:"uppercase",display:"block",marginBottom:5}}>{label}</label>
      {children}
    </div>
  );
}

// ── CONTENT FORM ───────────────────────────
const EMPTY_FORM = {
  title:"", description:"", type:"Movie", genre:"Action", language:"Hindi",
  is_premium:false, is_featured:false, is_active:true, is_live:false,
  stream_url:"", embed_url:"", thumbnail:"", poster:"",
  release_year:2026, rating:"U/A", director:"", studio:"",
  score:0, tags:[],
};

function ContentForm({initial, onSave, onCancel, saving}) {
  const [form, setForm] = useState({...EMPTY_FORM,...initial});
  const [tagInput, setTagInput] = useState("");
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  function addTag(e) {
    if (e.key==="Enter"&&tagInput.trim()) {
      set("tags",[...(form.tags||[]),tagInput.trim().toUpperCase()]);
      setTagInput("");
    }
  }

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Title + Type row */}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:12}}>
        <Field label="Title *">
          <input className="inp" value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Content title"/>
        </Field>
        <Field label="Type">
          <select className="inp" value={form.type} onChange={e=>{set("type",e.target.value);if(e.target.value==="Live")set("is_live",true);}}>
            {TYPES.map(t=><option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      {/* Description */}
      <Field label="Description">
        <textarea className="inp" rows={3} value={form.description} onChange={e=>set("description",e.target.value)} placeholder="Short description..." style={{resize:"vertical"}}/>
      </Field>

      {/* Video URL — MOST IMPORTANT */}
      <div style={{background:"rgba(229,9,20,.06)",border:"1px solid rgba(229,9,20,.2)",borderRadius:10,padding:14}}>
        <div style={{fontSize:12,color:R,fontWeight:700,marginBottom:10}}>🎬 Video Source (Required)</div>
        <Field label="Stream URL (HLS .m3u8 or direct video)">
          <input className="inp" value={form.stream_url} onChange={e=>set("stream_url",e.target.value)} placeholder="https://example.com/stream.m3u8"/>
        </Field>
        <div style={{fontSize:11,color:"#555",marginTop:6,marginBottom:10}}>
          Supports: HLS (.m3u8), MP4, DASH (.mpd)
        </div>
        <Field label="YouTube / Embed URL (optional — overrides stream URL)">
          <input className="inp" value={form.embed_url} onChange={e=>set("embed_url",e.target.value)} placeholder="https://youtube.com/watch?v=xxxxx or iframe src"/>
        </Field>
        <div style={{fontSize:11,color:"#555",marginTop:6}}>
          Paste YouTube URL or any embed URL. YouTube links auto-converted.
        </div>
      </div>

      {/* Thumbnail */}
      <Field label="Thumbnail URL">
        <input className="inp" value={form.thumbnail} onChange={e=>set("thumbnail",e.target.value)} placeholder="https://example.com/thumbnail.jpg"/>
      </Field>
      {form.thumbnail && (
        <img src={form.thumbnail} alt="preview" style={{width:160,height:90,objectFit:"cover",borderRadius:8,border:"1px solid #1a1a26"}} onError={e=>e.target.style.display="none"}/>
      )}

      {/* Genre + Language row */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <Field label="Genre">
          <select className="inp" value={form.genre} onChange={e=>set("genre",e.target.value)}>
            {GENRES.map(g=><option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Language">
          <select className="inp" value={form.language} onChange={e=>set("language",e.target.value)}>
            {LANGS.map(l=><option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Rating">
          <select className="inp" value={form.rating} onChange={e=>set("rating",e.target.value)}>
            {RATINGS.map(r=><option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      {/* Score + Year */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
        <Field label="IMDb Score">
          <input className="inp" type="number" min="0" max="10" step="0.1" value={form.score||0} onChange={e=>set("score",+e.target.value)}/>
        </Field>
        <Field label="Release Year">
          <input className="inp" type="number" value={form.release_year||2026} onChange={e=>set("release_year",+e.target.value)}/>
        </Field>
        <Field label="Director">
          <input className="inp" value={form.director||""} onChange={e=>set("director",e.target.value)}/>
        </Field>
      </div>

      {/* Tags */}
      <Field label="Tags (press Enter to add)">
        <input className="inp" value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={addTag} placeholder="4K, HDR, LIVE, NEW..."/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6}}>
          {(form.tags||[]).map(t=>(
            <span key={t} style={{background:"rgba(229,9,20,.15)",color:R,fontSize:11,padding:"2px 8px",borderRadius:4,cursor:"pointer"}} onClick={()=>set("tags",(form.tags||[]).filter(x=>x!==t))}>
              {t} ×
            </span>
          ))}
        </div>
      </Field>

      {/* Toggles */}
      <div style={{display:"flex",gap:20,flexWrap:"wrap",padding:"10px 0",borderTop:"1px solid #191926"}}>
        {[
          ["is_active",    "✅ Active"],
          ["is_featured",  "⭐ Featured on Home"],
          ["is_premium",   "👑 Premium Only"],
          ["is_live",      "🔴 Live Channel"],
        ].map(([k,l])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#aaa"}}>
            <input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)}/>{l}
          </label>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{display:"flex",gap:10,marginTop:4}}>
        <Btn onClick={onCancel} outline style={{flex:1}}>Cancel</Btn>
        <button onClick={()=>onSave(form)} disabled={saving||!form.title||(!form.stream_url&&!form.embed_url)} style={{flex:2,background:saving||(!form.title||(!form.stream_url&&!form.embed_url))?"#1a1a26":R,color:"#fff",border:"none",borderRadius:7,padding:"10px",fontSize:13,fontWeight:700,cursor:saving?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif"}}>
          {saving?"Saving...":"Save Content"}
        </button>
      </div>
    </div>
  );
}

// ── OVERVIEW ──────────────────────────────
function Overview({stats,content,users}) {
  const fN = n => n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(1)+"K":String(n||0);
  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:20}}>
        <KPI icon="👥" label="Users"    value={fN(stats.totalUsers)}   color="#1d9bf0"/>
        <KPI icon="👑" label="Paid"     value={fN(stats.activeSubs)}   color={R}/>
        <KPI icon="💰" label="Revenue"  value={"₹"+fN(stats.totalRevenue)} color="#00c853"/>
        <KPI icon="🎬" label="Content"  value={stats.totalContent}     color="#a855f7"/>
        <KPI icon="👁️" label="Views"    value={fN(stats.totalViews)}   color="#06b6d4"/>
        <KPI icon="📢" label="Active Ads" value={stats.activeAds||0}   color="#f59e0b"/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        <div style={{background:"#0e0e18",border:"1px solid #191926",borderRadius:12,padding:20}}>
          <div style={{fontWeight:700,marginBottom:14}}>🔥 Top Content</div>
          {[...(content||[])].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5).map((c,i)=>(
            <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<4?"1px solid #13131f":"none"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:18,color:i===0?R:"#444",width:20,flexShrink:0}}>{i+1}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                <div style={{fontSize:10,color:"#555"}}>{c.type} · {c.genre}</div>
              </div>
              <div style={{fontSize:11,color:"#1d9bf0",fontWeight:600}}>{fN(c.views||0)}</div>
            </div>
          ))}
        </div>
        <div style={{background:"#0e0e18",border:"1px solid #191926",borderRadius:12,padding:20}}>
          <div style={{fontWeight:700,marginBottom:14}}>👥 Recent Users</div>
          {[...(users||[])].slice(0,5).map((u,i)=>(
            <div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<4?"1px solid #13131f":"none"}}>
              <div style={{width:30,height:30,borderRadius:"50%",background:"rgba(229,9,20,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,flexShrink:0}}>
                {u.name?.[0]?.toUpperCase()||"?"}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:12,fontWeight:600}}>{u.name||"Unknown"}</div>
                <div style={{fontSize:10,color:"#555"}}>{u.phone||u.email||"—"}</div>
              </div>
              <Chip label={(u.plan||"free").toUpperCase()} color={u.plan?.includes("premium")?R:"#555"}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── CONTENT LIST ──────────────────────────
function ContentList({content,type,onRefresh,showToast}) {
  const [modal,  setModal]  = useState(null);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const items = (content||[]).filter(c=>{
    const matchType = type==="live" ? (c.is_live||c.type==="Live") : type==="all" ? true : c.type===type;
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  async function handleSave(form) {
    setSaving(true);
    try {
      const data = {...form};
      // Convert YouTube URL
      if (data.embed_url?.includes("youtube.com/watch?v=")) {
        data.embed_url = data.embed_url.replace("watch?v=","embed/")+"?autoplay=1";
      }
      if (data.embed_url?.includes("youtu.be/")) {
        const id = data.embed_url.split("youtu.be/")[1].split("?")[0];
        data.embed_url = `https://www.youtube.com/embed/${id}?autoplay=1`;
      }
      if (modal?.id) {
        await db.updateContent(modal.id, data);
        showToast("✅ Content updated!");
      } else {
        await db.addContent(data);
        showToast("✅ Content added! Showing on home page now.");
      }
      setModal(null); onRefresh();
    } catch(e) { showToast("❌ Error: "+e.message); }
    setSaving(false);
  }

  async function toggleActive(c) {
    await db.updateContent(c.id,{is_active:!c.is_active});
    showToast(c.is_active?"Disabled":"Enabled"); onRefresh();
  }
  async function toggleFeatured(c) {
    await db.updateContent(c.id,{is_featured:!c.is_featured});
    showToast(c.is_featured?"Removed from featured":"Added to featured!"); onRefresh();
  }
  async function handleDelete(c) {
    if (!confirm(`Delete "${c.title}"?`)) return;
    await db.deleteContent(c.id);
    showToast("Deleted"); onRefresh();
  }

  const label = type==="live"?"Live Channels":type==="Movie"?"Movies":type==="Series"?"Series":"All Content";

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1}}>{label}</div>
          <div style={{fontSize:12,color:"#555",marginTop:2}}>{items.length} items</div>
        </div>
        <Btn onClick={()=>setModal({})}>+ Add {label}</Btn>
      </div>

      <div style={{marginBottom:14}}>
        <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder={`Search ${label.toLowerCase()}...`} style={{maxWidth:300}}/>
      </div>

      <div style={{background:"#0e0e18",border:"1px solid #191926",borderRadius:12,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead>
            <tr>
              {["Title","Type","Genre","Status","Featured","Live","Views","Actions"].map(h=>(
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length===0 ? (
              <tr><td colSpan={8} style={{padding:"32px",textAlign:"center",color:"#444",fontSize:13}}>No content yet. Click "Add" to add your first item!</td></tr>
            ) : items.map(c=>(
              <tr key={c.id}>
                <td>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    {c.thumbnail && <img src={c.thumbnail} alt="" style={{width:44,height:28,objectFit:"cover",borderRadius:4}} onError={e=>e.target.style.display="none"}/>}
                    <div>
                      <div style={{fontWeight:600,fontSize:13}}>{c.title}</div>
                      <div style={{fontSize:10,color:"#555",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.stream_url||c.embed_url||"No URL"}</div>
                    </div>
                  </div>
                </td>
                <td><Chip label={c.type} color="#1d9bf0"/></td>
                <td style={{color:"#888",fontSize:12}}>{c.genre}</td>
                <td><Chip label={c.is_active?"ON":"OFF"} color={c.is_active?"#00c853":"#555"}/></td>
                <td><Chip label={c.is_featured?"⭐ YES":"NO"} color={c.is_featured?"#f59e0b":"#555"}/></td>
                <td><Chip label={c.is_live?"🔴 LIVE":"NO"} color={c.is_live?R:"#555"}/></td>
                <td style={{color:"#1d9bf0",fontSize:12,fontWeight:600}}>{(c.views||0).toLocaleString()}</td>
                <td>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    <Btn onClick={()=>setModal(c)} outline small>Edit</Btn>
                    <Btn onClick={()=>toggleFeatured(c)} outline small color="#f59e0b">{c.is_featured?"★":"☆"}</Btn>
                    <Btn onClick={()=>toggleActive(c)} outline small color={c.is_active?R:"#00c853"}>{c.is_active?"Hide":"Show"}</Btn>
                    <Btn onClick={()=>handleDelete(c)} danger small>Del</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal!==null && (
        <Modal title={modal.id?"Edit Content":"Add New Content"} onClose={()=>setModal(null)} wide>
          <ContentForm initial={modal} onSave={handleSave} onCancel={()=>setModal(null)} saving={saving}/>
        </Modal>
      )}
    </div>
  );
}

// ── USERS PAGE ────────────────────────────
function UsersPage({users,onRefresh,showToast}) {
  const [search, setSearch] = useState("");
  const filtered = (users||[]).filter(u=>
    u.name?.toLowerCase().includes(search.toLowerCase())||
    u.phone?.includes(search)||u.email?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,marginBottom:14}}>User Management</div>
      <div style={{marginBottom:14}}>
        <input className="inp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search users..." style={{maxWidth:300}}/>
      </div>
      <div style={{background:"#0e0e18",border:"1px solid #191926",borderRadius:12,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["User","Contact","Plan","Role","Status","Joined","Action"].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map(u=>(
              <tr key={u.id}>
                <td><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:30,height:30,borderRadius:"50%",background:"rgba(229,9,20,.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{u.name?.[0]?.toUpperCase()||"?"}</div><span style={{fontWeight:600}}>{u.name||"Unknown"}</span></div></td>
                <td style={{color:"#666",fontSize:12}}>{u.phone||u.email||"—"}</td>
                <td><Chip label={(u.plan||"free").toUpperCase()} color={u.plan?.includes("premium")?R:u.plan?.includes("basic")?"#3b82f6":"#555"}/></td>
                <td><Chip label={(u.role||"user").toUpperCase()} color={u.role==="admin"?"#f59e0b":"#555"}/></td>
                <td><Chip label={u.is_active?"ACTIVE":"SUSPENDED"} color={u.is_active?"#00c853":"#f87171"}/></td>
                <td style={{color:"#666",fontSize:11}}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                <td>
                  {u.is_active
                    ? <Btn onClick={async()=>{await db.suspendUser(u.id);showToast("User suspended");onRefresh();}} danger small>Suspend</Btn>
                    : <Btn onClick={async()=>{await db.activateUser(u.id);showToast("User activated");onRefresh();}} outline small color="#00c853">Activate</Btn>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ADS PAGE ──────────────────────────────
function AdsPage({ads,onRefresh,showToast}) {
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({brand:"",tagline:"",cta_text:"Learn More",type:"pre_roll",duration:15,skip_after:5,is_active:true,priority:1});
  const [saving,setSaving]= useState(false);

  async function saveAd() {
    setSaving(true);
    try {
      if (modal?.id) { await db.updateAd(modal.id,form); showToast("Ad updated!"); }
      else { await db.addAd(form); showToast("Ad created!"); }
      setModal(null); onRefresh();
    } catch(e) { showToast("Error: "+e.message); }
    setSaving(false);
  }

  return (
    <div style={{animation:"fadeIn .3s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1}}>Ad Manager</div>
        <Btn onClick={()=>{setForm({brand:"",tagline:"",cta_text:"Learn More",type:"pre_roll",duration:15,skip_after:5,is_active:true,priority:1});setModal({});}}>+ New Ad</Btn>
      </div>
      <div style={{background:"#0e0e18",border:"1px solid #191926",borderRadius:12,overflow:"hidden"}}>
        <table className="tbl" style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Brand","Type","Duration","Skip","Status","Actions"].map(h=><th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {(ads||[]).map(a=>(
              <tr key={a.id}>
                <td><div style={{fontWeight:600}}>{a.brand}</div><div style={{fontSize:10,color:"#555"}}>{a.tagline}</div></td>
                <td><Chip label={a.type?.replace("_"," ").toUpperCase()} color="#1d9bf0"/></td>
                <td>{a.duration||0}s</td>
                <td>{a.skip_after||0}s</td>
                <td><Chip label={a.is_active?"ACTIVE":"PAUSED"} color={a.is_active?"#00c853":"#f59e0b"}/></td>
                <td>
                  <div style={{display:"flex",gap:4}}>
                    <Btn onClick={()=>{setForm({...a});setModal(a);}} outline small>Edit</Btn>
                    <Btn onClick={async()=>{await db.updateAd(a.id,{is_active:!a.is_active});showToast(a.is_active?"Paused":"Activated");onRefresh();}} outline small color={a.is_active?R:"#00c853"}>{a.is_active?"Pause":"Resume"}</Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal!==null&&(
        <Modal title={modal.id?"Edit Ad":"New Ad"} onClose={()=>setModal(null)}>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            {[["Brand Name","brand"],["Tagline","tagline"],["CTA Text","cta_text"],["Video URL","video_url"]].map(([l,k])=>(
              <Field key={k} label={l}><input className="inp" value={form[k]||""} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))}/></Field>
            ))}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
              <Field label="Type"><select className="inp" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}><option value="pre_roll">Pre-roll</option><option value="mid_roll">Mid-roll</option><option value="banner">Banner</option><option value="rewarded">Rewarded</option></select></Field>
              <Field label="Duration (s)"><input className="inp" type="number" value={form.duration||15} onChange={e=>setForm(f=>({...f,duration:+e.target.value}))}/></Field>
              <Field label="Skip After (s)"><input className="inp" type="number" value={form.skip_after||5} onChange={e=>setForm(f=>({...f,skip_after:+e.target.value}))}/></Field>
            </div>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,cursor:"pointer",color:"#aaa"}}><input type="checkbox" checked={!!form.is_active} onChange={e=>setForm(f=>({...f,is_active:e.target.checked}))}/>Active</label>
            <div style={{display:"flex",gap:10}}>
              <Btn onClick={()=>setModal(null)} outline>Cancel</Btn>
              <button onClick={saveAd} disabled={saving} style={{flex:1,background:saving?"#333":R,color:"#fff",border:"none",borderRadius:7,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>{saving?"Saving...":"Save Ad"}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── MAIN ADMIN ────────────────────────────
export default function Admin({ onNavigate, user }) {
  const [page,         setPage]         = useState("overview");
  const [faceVerified, setFaceVerified] = useState(false);
  const [showFace,     setShowFace]     = useState(true);
  const [stats,        setStats]        = useState({});
  const [content,      setContent]      = useState([]);
  const [users,        setUsers]        = useState([]);
  const [ads,          setAds]          = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [toast,        setToast]        = useState(null);
  const [collapsed,    setCollapsed]    = useState(false);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(null),3000); };

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [s,c,u,a] = await Promise.all([
        db.getAdminStats().catch(()=>({})),
        supabase.from("content").select("*").order("created_at",{ascending:false}).then(r=>r.data||[]),
        db.getAllUsers().catch(()=>[]),
        db.getAllAds().catch(()=>[]),
      ]);
      setStats(s); setContent(c); setUsers(u); setAds(a);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  if (showFace && !faceVerified) {
    return <FaceAuth user={user} onSuccess={()=>{setFaceVerified(true);setShowFace(false);}} onSkip={()=>{setFaceVerified(true);setShowFace(false);}}/>;
  }

  if (loading) return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",gap:14,fontFamily:"Inter,sans-serif"}}>
      <div style={{width:36,height:36,border:`3px solid #191926`,borderTop:`3px solid ${R}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <div style={{color:"#444",fontSize:13}}>Loading admin...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:"#07070c",overflow:"hidden",fontFamily:"'Inter',sans-serif"}}>
      <style>{GS}</style>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:20,right:20,zIndex:1000,background:"#111120",border:"1px solid #00c85344",borderLeft:`3px solid #00c853`,borderRadius:8,padding:"10px 18px",fontSize:13,fontWeight:500,animation:"fadeIn .2s",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>
          {toast}
        </div>
      )}

      {/* Sidebar */}
      <div style={{width:collapsed?50:188,flexShrink:0,background:"#0a0a14",borderRight:"1px solid #191926",display:"flex",flexDirection:"column",transition:"width .22s",overflow:"hidden"}}>
        <div style={{padding:collapsed?"10px":"10px 12px",borderBottom:"1px solid #191926",display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setCollapsed(o=>!o)}>
          <div style={{width:26,height:26,borderRadius:7,background:"rgba(229,9,20,.15)",border:"1px solid rgba(229,9,20,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>⚡</div>
          {!collapsed&&<div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,whiteSpace:"nowrap"}}><span style={{color:R}}>STREAM</span>X <span style={{fontSize:9,color:"#444"}}>ADMIN</span></div>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"6px 4px"}}>
          {PAGES.map(p=>(
            <div key={p.id} className={`nav${page===p.id?" on":""}`} onClick={()=>setPage(p.id)} style={{justifyContent:collapsed?"center":"flex-start"}} title={collapsed?p.label:undefined}>
              <span style={{fontSize:14,flexShrink:0}}>{p.icon}</span>
              {!collapsed&&<span>{p.label}</span>}
            </div>
          ))}
        </div>
        <div style={{padding:"6px 4px",borderTop:"1px solid #191926"}}>
          <div className="nav" onClick={()=>onNavigate("home")} style={{color:"#f87171",justifyContent:collapsed?"center":"flex-start"}}>
            <span style={{fontSize:14}}>🏠</span>
            {!collapsed&&<span style={{fontSize:12}}>Back to Home</span>}
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        {/* Top bar */}
        <div style={{height:48,background:"#0a0a14",borderBottom:"1px solid #191926",display:"flex",alignItems:"center",padding:"0 20px",gap:12,flexShrink:0}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,color:"#555"}}>
            {PAGES.find(p=>p.id===page)?.icon} {PAGES.find(p=>p.id===page)?.label}
          </div>
          <div style={{flex:1}}/>
          <span style={{fontSize:11,color:"#444"}}>👑 {user?.name||"Admin"}</span>
          <Btn onClick={loadData} outline small>↻ Refresh</Btn>
        </div>

        {/* Page content */}
        <div style={{flex:1,overflowY:"auto",padding:20}}>
          {page==="overview" && <Overview stats={stats} content={content} users={users}/>}
          {page==="content"  && <ContentList content={content} type="all" onRefresh={loadData} showToast={showToast}/>}
          {page==="live"     && <ContentList content={content} type="live" onRefresh={loadData} showToast={showToast}/>}
          {page==="users"    && <UsersPage users={users} onRefresh={loadData} showToast={showToast}/>}
          {page==="ads"      && <AdsPage ads={ads} onRefresh={loadData} showToast={showToast}/>}
          {page==="subs"     && (
            <div style={{animation:"fadeIn .3s ease"}}>
              <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,marginBottom:16}}>Revenue & Subscriptions</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12}}>
                <KPI icon="👑" label="Active Subs" value={stats.activeSubs||0} color={R}/>
                <KPI icon="💰" label="Total Revenue" value={"₹"+(stats.totalRevenue||0).toLocaleString()} color="#00c853"/>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}