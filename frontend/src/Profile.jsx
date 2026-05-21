import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════
   StreamX · Profile & Settings — Jio Hotstar Style
═══════════════════════════════════════════════════════ */

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#0a0a0f;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;overflow-x:hidden;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-track{background:#0e0e14;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes slideRight{from{opacity:0;transform:translateX(-18px);}to{opacity:1;transform:translateX(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.5;}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes popIn{from{opacity:0;transform:scale(.92);}to{opacity:1;transform:scale(1);}}
.section-anim{animation:fadeUp .4s ease both;}
.row-hover{transition:background .18s,border-color .18s;}
.row-hover:hover{background:rgba(255,255,255,0.04)!important;border-color:rgba(255,255,255,0.1)!important;}
.tab-btn{background:none;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;color:#555;padding:10px 16px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:color .2s,border-color .2s;}
.tab-btn.active{color:#fff;font-weight:700;border-bottom-color:#e50914;}
.toggle-track{width:46px;height:26px;border-radius:13px;position:relative;cursor:pointer;transition:background .25s;flex-shrink:0;}
.toggle-thumb{width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:3px;transition:left .25s;box-shadow:0 2px 6px rgba(0,0,0,.4);}
.avatar-ring{border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s,box-shadow .2s;position:relative;}
.avatar-ring:hover{transform:scale(1.07);}
`;

/* ── COLOURS & CONSTANTS ─────────────────── */
const RED = "#e50914";
const BG = "#0a0a0f";
const SURFACE = "#0f0f16";
const BORDER = "#1a1a26";
const MUTED = "#555";

/* ── DATA ───────────────────────────────── */
const PROFILES = [
  { id:1, name:"Rahul",    emoji:"😎", color:"#e50914", pin:false, kids:false, lang:"Hindi" },
  { id:2, name:"Priya",    emoji:"🌸", color:"#ec4899", pin:false, kids:false, lang:"English" },
  { id:3, name:"Kids",     emoji:"🧸", color:"#84cc16", pin:false, kids:true,  lang:"Hindi" },
  { id:4, name:"Dad",      emoji:"👴", color:"#f59e0b", pin:true,  kids:false, lang:"Tamil" },
];

const PLAN = {
  name:"Premium",
  price:"₹499/month",
  nextBilling:"June 18, 2026",
  color:"#e50914",
  features:["4K + HDR","Dolby Atmos","4 screens","Downloads","No Ads"],
};

const DEVICES = [
  { id:1, name:"Samsung Galaxy S25",  type:"mobile",  icon:"📱", location:"Mumbai, IN",  active:true,  lastSeen:"Now" },
  { id:2, name:"MacBook Pro 16\"",    type:"laptop",  icon:"💻", location:"Mumbai, IN",  active:false, lastSeen:"2h ago" },
  { id:3, name:"Samsung Smart TV",    type:"tv",      icon:"📺", location:"Home TV",     active:false, lastSeen:"Yesterday" },
  { id:4, name:"iPad Air",            type:"tablet",  icon:"🖥️", location:"Delhi, IN",   active:false, lastSeen:"3 days ago" },
];

const LANGUAGES = ["Hindi","English","Tamil","Telugu","Bengali","Kannada","Malayalam","Punjabi","Marathi"];
const QUALITIES  = ["Auto","4K Ultra HD","1080p Full HD","720p HD","480p SD","360p Low Data"];
const SUBTITLES  = ["Off","Auto","English","Hindi","Tamil","Telugu"];

const WATCHLIST = [
  {id:1,title:"Dark Meridian",emoji:"🌌",progress:62,genre:"Sci-Fi",accent:"#1d9bf0"},
  {id:2,title:"Apex Protocol",emoji:"🔥",progress:0, genre:"Action",accent:"#e50914"},
  {id:3,title:"Bombay Central",emoji:"🏙️",progress:18,genre:"Drama",accent:"#f59e0b"},
  {id:4,title:"Steel Horizon",emoji:"🤖",progress:38,genre:"Action",accent:"#64748b"},
  {id:5,title:"Quantum Cascade",emoji:"⚡",progress:0,genre:"Thriller",accent:"#a855f7"},
];

/* ── HELPERS ─────────────────────────────── */
function Toggle({ on, onChange, color=RED }) {
  return (
    <div className="toggle-track" style={{ background: on ? color : "#1f1f2e" }} onClick={()=>onChange(!on)}>
      <div className="toggle-thumb" style={{ left: on ? 23 : 3 }}/>
    </div>
  );
}

function SettingRow({ icon, label, sub, right, onClick, danger, noBorder }) {
  return (
    <div className="row-hover" onClick={onClick} style={{
      display:"flex", alignItems:"center", gap:14,
      padding:"14px 0",
      borderBottom: noBorder ? "none" : `1px solid ${BORDER}`,
      cursor: onClick ? "pointer" : "default",
    }}>
      {icon && <div style={{ width:36, height:36, borderRadius:10, background:"rgba(255,255,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{icon}</div>}
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:14, fontWeight:600, color: danger ? "#f87171" : "#e8e8f0" }}>{label}</div>
        {sub && <div style={{ fontSize:12, color:MUTED, marginTop:2 }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink:0 }}>{right}</div>}
      {onClick && !right && <div style={{ color:"#333", fontSize:18 }}>›</div>}
    </div>
  );
}

function SectionCard({ title, titleRight, children, style={} }) {
  return (
    <div className="section-anim" style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:16, padding:"20px 20px 4px", marginBottom:16, ...style }}>
      {(title||titleRight) && (
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4, paddingBottom:12, borderBottom:`1px solid ${BORDER}` }}>
          {title && <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:16, letterSpacing:1, color:"#ccc" }}>{title}</div>}
          {titleRight}
        </div>
      )}
      {children}
    </div>
  );
}

function Badge({ label, color }) {
  return <span style={{ background:`${color}22`, color, fontSize:11, fontWeight:700, padding:"3px 9px", borderRadius:20, letterSpacing:.5 }}>{label}</span>;
}

function ChipSelect({ options, value, onChange }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginTop:8 }}>
      {options.map(o=>(
        <button key={o} onClick={()=>onChange(o)} style={{
          background: value===o ? RED : "rgba(255,255,255,0.05)",
          border: `1px solid ${value===o ? RED : BORDER}`,
          color: value===o ? "#fff" : MUTED,
          borderRadius:20, padding:"5px 14px", fontSize:12, fontWeight:600, cursor:"pointer", transition:"all .18s",
        }}>{o}</button>
      ))}
    </div>
  );
}

/* ── PROFILE AVATAR ─────────────────────── */
function Avatar({ p, size=64, active, onClick, showAdd }) {
  if (showAdd) return (
    <div onClick={onClick} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer" }}>
      <div style={{ width:size, height:size, borderRadius:"50%", background:"rgba(255,255,255,0.05)", border:`2px dashed ${BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.35, transition:"all .2s" }} className="avatar-ring">
        <span style={{ color:MUTED, fontSize:size*0.35 }}>+</span>
      </div>
      <span style={{ fontSize:12, color:MUTED }}>Add Profile</span>
    </div>
  );
  return (
    <div onClick={onClick} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:8, cursor:"pointer" }}>
      <div className="avatar-ring" style={{
        width:size, height:size,
        background:`linear-gradient(135deg,${p.color}44,${p.color}22)`,
        border:`2px solid ${active ? p.color : BORDER}`,
        boxShadow: active ? `0 0 0 3px ${p.color}44` : "none",
        fontSize:size*0.4,
        transition:"all .2s",
      }}>
        {p.emoji}
        {p.kids && <div style={{ position:"absolute", bottom:-2, right:-2, background:"#84cc16", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, border:`2px solid ${BG}` }}>🧸</div>}
        {p.pin && <div style={{ position:"absolute", top:-2, right:-2, background:"#f59e0b", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, border:`2px solid ${BG}` }}>🔒</div>}
      </div>
      <span style={{ fontSize:12, fontWeight:600, color: active?"#fff":MUTED }}>{p.name}</span>
    </div>
  );
}

/* ── EDIT PROFILE MODAL ─────────────────── */
function EditProfileModal({ profile, onClose, onSave }) {
  const [name, setName] = useState(profile?.name||"");
  const [emoji, setEmoji] = useState(profile?.emoji||"😊");
  const [kids, setKids] = useState(profile?.kids||false);
  const [pin, setPin]   = useState(profile?.pin||false);
  const [lang, setLang] = useState(profile?.lang||"Hindi");
  const EMOJIS = ["😎","🌸","🧸","👴","🦁","🎭","🚀","🎵","🌊","⚡","🔥","🎮","🌙","🌈","🦋"];
  return (
    <div style={{ position:"fixed", inset:0, zIndex:500, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", padding:20 }} onClick={onClose}>
      <div style={{ background:"#12121a", border:`1px solid ${BORDER}`, borderRadius:20, padding:28, width:"100%", maxWidth:440, animation:"popIn .25s ease" }} onClick={e=>e.stopPropagation()}>
        <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1, marginBottom:20 }}>{profile?.id?"Edit Profile":"New Profile"}</div>
        {/* Avatar preview */}
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:`linear-gradient(135deg,#e5091444,#e5091422)`, border:`2px solid ${RED}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:36, margin:"0 auto 10px" }}>{emoji}</div>
          <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            {EMOJIS.map(e=>(
              <button key={e} onClick={()=>setEmoji(e)} style={{ background:emoji===e?"rgba(229,9,20,.25)":"rgba(255,255,255,.05)", border:`1px solid ${emoji===e?RED:BORDER}`, borderRadius:8, width:38, height:38, fontSize:18, cursor:"pointer" }}>{e}</button>
            ))}
          </div>
        </div>
        {/* Name */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:MUTED, fontWeight:600, marginBottom:6, display:"block" }}>PROFILE NAME</label>
          <input value={name} onChange={e=>setName(e.target.value)} style={{ width:"100%", background:"rgba(255,255,255,.05)", border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"'Plus Jakarta Sans',sans-serif" }}/>
        </div>
        {/* Language */}
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12, color:MUTED, fontWeight:600, marginBottom:6, display:"block" }}>PREFERRED LANGUAGE</label>
          <select value={lang} onChange={e=>setLang(e.target.value)} style={{ width:"100%", background:"#1a1a26", border:`1px solid ${BORDER}`, borderRadius:8, padding:"10px 14px", color:"#fff", fontSize:14, outline:"none", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
            {LANGUAGES.map(l=><option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        {/* Toggles */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderTop:`1px solid ${BORDER}`, borderBottom:`1px solid ${BORDER}`, marginBottom:14 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600 }}>Kids Profile</div>
            <div style={{ fontSize:12, color:MUTED }}>Only show age-appropriate content</div>
          </div>
          <Toggle on={kids} onChange={setKids} color="#84cc16"/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", marginBottom:20 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:600 }}>Lock with PIN</div>
            <div style={{ fontSize:12, color:MUTED }}>Require PIN to switch to this profile</div>
          </div>
          <Toggle on={pin} onChange={setPin} color="#f59e0b"/>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, background:"rgba(255,255,255,.06)", border:`1px solid ${BORDER}`, color:"#aaa", borderRadius:8, padding:"11px 0", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, fontWeight:600, cursor:"pointer" }}>Cancel</button>
          <button onClick={()=>onSave({...profile,name,emoji,kids,pin,lang})} style={{ flex:2, background:RED, border:"none", color:"#fff", borderRadius:8, padding:"11px 0", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer" }}>Save Profile</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   SETTINGS SECTIONS
══════════════════════════════════════════ */

/* — ACCOUNT — */
function AccountSection({ profiles, activeProfile, setActiveProfile, onEditProfile, onAddProfile }) {
  return (
    <div>
      {/* Profile switcher */}
      <SectionCard title="MY PROFILES">
        <div style={{ display:"flex", gap:20, flexWrap:"wrap", padding:"16px 0 12px" }}>
          {profiles.map(p=>(
            <Avatar key={p.id} p={p} size={68} active={activeProfile===p.id} onClick={()=>onEditProfile(p)}/>
          ))}
          <Avatar showAdd size={68} onClick={onAddProfile}/>
        </div>
        <div style={{ fontSize:12, color:MUTED, paddingBottom:12 }}>Tap a profile to edit · Active profile: <span style={{ color:"#fff" }}>{profiles.find(p=>p.id===activeProfile)?.name}</span></div>
      </SectionCard>

      {/* Account info */}
      <SectionCard title="ACCOUNT">
        <SettingRow icon="📧" label="Email" sub="rahul.sharma@gmail.com" right={<Badge label="Verified" color="#00c853"/>}/>
        <SettingRow icon="📱" label="Mobile Number" sub="+91 98765 43210" right={<span style={{ fontSize:12, color:RED, fontWeight:600, cursor:"pointer" }}>Change</span>}/>
        <SettingRow icon="🔒" label="Password" sub="Last changed 3 months ago" onClick={()=>{}}/>
        <SettingRow icon="🛡️" label="Two-Factor Authentication" sub="Add extra security to your account" onClick={()=>{}} noBorder/>
      </SectionCard>

      {/* Subscription */}
      <SectionCard>
        <div style={{ background:"linear-gradient(120deg,#e5091422,#ff6b3511)", border:`1px solid ${RED}33`, borderRadius:12, padding:20, marginBottom:0 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
            <div>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:22, letterSpacing:1, color:RED }}>StreamX Premium</div>
              <div style={{ fontSize:13, color:MUTED, marginTop:2 }}>Next billing: {PLAN.nextBilling}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:22, fontWeight:800 }}>{PLAN.price}</div>
              <Badge label="ACTIVE" color="#00c853"/>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
            {PLAN.features.map(f=>(
              <span key={f} style={{ background:"rgba(255,255,255,.07)", color:"#ccc", fontSize:11, padding:"3px 10px", borderRadius:20, fontWeight:500 }}>✓ {f}</span>
            ))}
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button style={{ flex:1, background:RED, border:"none", color:"#fff", borderRadius:8, padding:"10px 0", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer" }}>Manage Plan</button>
            <button style={{ flex:1, background:"transparent", border:`1px solid ${BORDER}`, color:MUTED, borderRadius:8, padding:"10px 0", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, cursor:"pointer" }}>View Benefits</button>
          </div>
        </div>
      </SectionCard>

      {/* Billing history */}
      <SectionCard title="BILLING HISTORY">
        {[
          { date:"May 18, 2026",  amount:"₹499", status:"Paid" },
          { date:"Apr 18, 2026",  amount:"₹499", status:"Paid" },
          { date:"Mar 18, 2026",  amount:"₹499", status:"Paid" },
        ].map((b,i)=>(
          <SettingRow key={i} icon="🧾" label={b.date} sub={`Premium Plan · ${b.amount}`} right={<Badge label={b.status} color="#00c853"/>} noBorder={i===2}/>
        ))}
      </SectionCard>
    </div>
  );
}

/* — PLAYBACK — */
function PlaybackSection() {
  const [quality, setQuality]   = useState("Auto");
  const [sub, setSub]           = useState("Auto");
  const [autoplay, setAutoplay] = useState(true);
  const [skipIntro, setSkipIntro] = useState(true);
  const [skipRecap, setSkipRecap] = useState(false);
  const [autoNext,  setAutoNext]  = useState(true);
  const [pip,       setPip]       = useState(false);
  const [dataSaver, setDataSaver] = useState(false);
  const [dwnQual,   setDwnQual]   = useState("1080p Full HD");

  return (
    <div>
      <SectionCard title="STREAM QUALITY">
        <div style={{ padding:"8px 0 4px" }}>
          <div style={{ fontSize:13, color:MUTED, marginBottom:8 }}>Streaming quality</div>
          <ChipSelect options={QUALITIES} value={quality} onChange={setQuality}/>
        </div>
        <SettingRow icon="💾" label="Data Saver" sub="Reduces quality on mobile data" right={<Toggle on={dataSaver} onChange={setDataSaver}/>} noBorder/>
      </SectionCard>

      <SectionCard title="SUBTITLES & AUDIO">
        <div style={{ padding:"8px 0 12px", borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ fontSize:13, color:MUTED, marginBottom:8 }}>Default subtitle language</div>
          <ChipSelect options={SUBTITLES} value={sub} onChange={setSub}/>
        </div>
        <SettingRow icon="🎙️" label="Audio Language" sub="Default: Matching content language" onClick={()=>{}} noBorder/>
      </SectionCard>

      <SectionCard title="PLAYBACK BEHAVIOUR">
        <SettingRow icon="▶️" label="Autoplay" sub="Automatically play the next video" right={<Toggle on={autoplay} onChange={setAutoplay}/>}/>
        <SettingRow icon="⏭️" label="Skip Intro" sub="Automatically skip title sequences" right={<Toggle on={skipIntro} onChange={setSkipIntro}/>}/>
        <SettingRow icon="⏩" label="Skip Recap" sub="Skip 'Previously on…' segments" right={<Toggle on={skipRecap} onChange={setSkipRecap}/>}/>
        <SettingRow icon="🔜" label="Auto-Play Next Episode" sub="Start next episode after credits" right={<Toggle on={autoNext} onChange={setAutoNext}/>}/>
        <SettingRow icon="⬛" label="Picture-in-Picture" sub="Float player while browsing" right={<Toggle on={pip} onChange={setPip}/>} noBorder/>
      </SectionCard>

      <SectionCard title="DOWNLOADS">
        <div style={{ padding:"8px 0 12px", borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ fontSize:13, color:MUTED, marginBottom:8 }}>Download quality</div>
          <ChipSelect options={["4K Ultra HD","1080p Full HD","720p HD","480p SD"]} value={dwnQual} onChange={setDwnQual}/>
        </div>
        <SettingRow icon="📥" label="Download over Wi-Fi only" right={<Toggle on={true} onChange={()=>{}}/>}/>
        <SettingRow icon="🗑️" label="Delete all downloads" sub="Free up 2.4 GB of storage" onClick={()=>{}} danger noBorder/>
      </SectionCard>
    </div>
  );
}

/* — DEVICES — */
function DevicesSection() {
  const [devices, setDevices] = useState(DEVICES);
  const removeDevice = (id) => setDevices(d=>d.filter(x=>x.id!==id));

  return (
    <div>
      <SectionCard title="ACTIVE DEVICES" titleRight={<span style={{ fontSize:12, color:RED, fontWeight:600 }}>{devices.length}/4 used</span>}>
        {/* usage bar */}
        <div style={{ display:"flex", gap:4, margin:"8px 0 16px" }}>
          {[0,1,2,3].map(i=>(
            <div key={i} style={{ flex:1, height:5, borderRadius:3, background: i<devices.length ? RED : "#1a1a26" }}/>
          ))}
        </div>
        {devices.map((d,idx)=>(
          <div key={d.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom: idx<devices.length-1?`1px solid ${BORDER}`:"none" }}>
            <div style={{ width:44, height:44, borderRadius:12, background: d.active?"rgba(229,9,20,.15)":"rgba(255,255,255,.04)", border:`1px solid ${d.active?RED:BORDER}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0, position:"relative" }}>
              {d.icon}
              {d.active && <div style={{ position:"absolute", top:-3, right:-3, width:10, height:10, borderRadius:"50%", background:"#00c853", border:`2px solid ${BG}` }}/>}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:14 }}>{d.name}</div>
              <div style={{ fontSize:12, color:MUTED, marginTop:2 }}>{d.location} · {d.lastSeen}</div>
            </div>
            {d.active ? <Badge label="THIS DEVICE" color="#00c853"/> : (
              <button onClick={()=>removeDevice(d.id)} style={{ background:"rgba(248,113,113,.1)", border:`1px solid rgba(248,113,113,.3)`, color:"#f87171", borderRadius:6, padding:"5px 12px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Remove</button>
            )}
          </div>
        ))}
      </SectionCard>

      <SectionCard title="DOWNLOADS ON DEVICE">
        <SettingRow icon="📥" label="Downloaded Titles" sub="14 titles · 3.8 GB used" onClick={()=>{}}/>
        <SettingRow icon="💾" label="Storage Used" sub="3.8 GB of 32 GB" right={
          <div style={{ width:80, height:6, background:"#1a1a26", borderRadius:3, overflow:"hidden" }}>
            <div style={{ width:"12%", height:"100%", background:RED, borderRadius:3 }}/>
          </div>
        } noBorder/>
      </SectionCard>

      <SectionCard>
        <SettingRow icon="🔗" label="Connect to TV" sub="Pair your Smart TV or Chromecast" onClick={()=>{}}/>
        <SettingRow icon="📡" label="Cast Settings" sub="Manage casting preferences" onClick={()=>{}} noBorder/>
      </SectionCard>
    </div>
  );
}

/* — PARENTAL CONTROLS — */
function ParentalSection() {
  const [pinEnabled, setPinEnabled] = useState(true);
  const [maturity, setMaturity]     = useState("U/A 13+");
  const [kidsMode, setKidsMode]     = useState(false);
  const [pinInput, setPinInput]     = useState(["","","",""]); // 4-digit PIN UI
  const pinRefs = [useRef(),useRef(),useRef(),useRef()];

  const handlePinChange = (i, v) => {
    if(!/^\d?$/.test(v)) return;
    const newPin = [...pinInput]; newPin[i]=v; setPinInput(newPin);
    if(v && i<3) pinRefs[i+1].current.focus();
  };

  const RATINGS = ["U (All Ages)","U/A 7+","U/A 13+","U/A 16+","A (Adults)"];

  return (
    <div>
      <SectionCard title="CONTENT RATING">
        <div style={{ padding:"8px 0 16px", borderBottom:`1px solid ${BORDER}` }}>
          <div style={{ fontSize:13, color:MUTED, marginBottom:10 }}>Maximum content rating allowed</div>
          <ChipSelect options={RATINGS} value={maturity} onChange={setMaturity}/>
        </div>
        <SettingRow icon="🧸" label="Kids Mode" sub="Show only U-rated content for all profiles" right={<Toggle on={kidsMode} onChange={setKidsMode} color="#84cc16"/>} noBorder/>
      </SectionCard>

      <SectionCard title="PROFILE PIN">
        <SettingRow icon="🔒" label="Enable Profile PIN" sub="Require PIN to access locked profiles" right={<Toggle on={pinEnabled} onChange={setPinEnabled}/>}/>
        {pinEnabled && (
          <div style={{ padding:"16px 0 12px" }}>
            <div style={{ fontSize:13, color:MUTED, marginBottom:12 }}>Enter your 4-digit PIN</div>
            <div style={{ display:"flex", gap:12 }}>
              {pinInput.map((v,i)=>(
                <input key={i} ref={pinRefs[i]} value={v} onChange={e=>handlePinChange(i,e.target.value)} maxLength={1} type="password"
                  style={{ width:52, height:52, borderRadius:10, background:"rgba(255,255,255,.06)", border:`1.5px solid ${v?RED:BORDER}`, color:"#fff", fontSize:22, textAlign:"center", outline:"none", fontFamily:"'Plus Jakarta Sans',sans-serif", transition:"border-color .2s" }}
                />
              ))}
            </div>
          </div>
        )}
        <SettingRow icon="🔑" label="Forgot PIN?" sub="Reset via registered email" onClick={()=>{}} noBorder/>
      </SectionCard>

      <SectionCard title="PURCHASE CONTROLS">
        <SettingRow icon="💳" label="Require PIN for purchases" right={<Toggle on={true} onChange={()=>{}}/>}/>
        <SettingRow icon="🎬" label="Require PIN for rented content" right={<Toggle on={false} onChange={()=>{}}/>} noBorder/>
      </SectionCard>
    </div>
  );
}

/* — NOTIFICATIONS — */
function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    newReleases:true, liveAlerts:true, continueWatching:false,
    sportsScores:true, recommendations:true, accountAlerts:true,
    emailNews:false, smsAlerts:false, pushAll:true,
  });
  const set = (k,v) => setPrefs(p=>({...p,[k]:v}));

  return (
    <div>
      <SectionCard title="PUSH NOTIFICATIONS">
        <SettingRow icon="🔔" label="All Notifications" sub="Master switch for push alerts" right={<Toggle on={prefs.pushAll} onChange={v=>set("pushAll",v)}/>}/>
        <SettingRow icon="🎬" label="New Releases" sub="When a title you'll love drops" right={<Toggle on={prefs.newReleases} onChange={v=>set("newReleases",v)}/>}/>
        <SettingRow icon="🔴" label="Live Event Alerts" sub="IPL, F1, WWE & more go live" right={<Toggle on={prefs.liveAlerts} onChange={v=>set("liveAlerts",v)}/>}/>
        <SettingRow icon="⏯️" label="Continue Watching" sub="Reminders to finish what you started" right={<Toggle on={prefs.continueWatching} onChange={v=>set("continueWatching",v)}/>}/>
        <SettingRow icon="🏆" label="Sports Scores" sub="Live score updates during matches" right={<Toggle on={prefs.sportsScores} onChange={v=>set("sportsScores",v)}/>}/>
        <SettingRow icon="✨" label="Personalised Picks" sub="Weekly recommendations just for you" right={<Toggle on={prefs.recommendations} onChange={v=>set("recommendations",v)}/>} noBorder/>
      </SectionCard>

      <SectionCard title="EMAIL & SMS">
        <SettingRow icon="📧" label="Email Newsletter" sub="Highlights, tips & exclusive offers" right={<Toggle on={prefs.emailNews} onChange={v=>set("emailNews",v)}/>}/>
        <SettingRow icon="📱" label="SMS Alerts" sub="Billing & account notifications" right={<Toggle on={prefs.smsAlerts} onChange={v=>set("smsAlerts",v)}/>}/>
        <SettingRow icon="🛡️" label="Account Security Alerts" sub="Login from new devices, password changes" right={<Toggle on={prefs.accountAlerts} onChange={v=>set("accountAlerts",v)}/>} noBorder/>
      </SectionCard>
    </div>
  );
}

/* — PRIVACY — */
function PrivacySection() {
  const [pref, setPref] = useState({ watchHistory:true, recommendations:true, analytics:false, ads:false, dataShare:false });
  const set=(k,v)=>setPref(p=>({...p,[k]:v}));

  return (
    <div>
      <SectionCard title="WATCH HISTORY">
        <SettingRow icon="📋" label="Save Watch History" sub="Used to improve recommendations" right={<Toggle on={pref.watchHistory} onChange={v=>set("watchHistory",v)}/>}/>
        <SettingRow icon="🎯" label="Personalised Recommendations" sub="Based on viewing habits" right={<Toggle on={pref.recommendations} onChange={v=>set("recommendations",v)}/>}/>
        <SettingRow icon="🗑️" label="Clear Watch History" sub="This cannot be undone" onClick={()=>{}} danger noBorder/>
      </SectionCard>

      <SectionCard title="DATA & PRIVACY">
        <SettingRow icon="📊" label="Share Usage Analytics" sub="Help us improve StreamX" right={<Toggle on={pref.analytics} onChange={v=>set("analytics",v)}/>}/>
        <SettingRow icon="🎯" label="Personalised Ads" sub="See ads relevant to you" right={<Toggle on={pref.ads} onChange={v=>set("ads",v)}/>}/>
        <SettingRow icon="🔗" label="Share Data with Partners" sub="Third-party analytics providers" right={<Toggle on={pref.dataShare} onChange={v=>set("dataShare",v)}/>} noBorder/>
      </SectionCard>

      <SectionCard title="YOUR DATA">
        <SettingRow icon="📦" label="Download My Data" sub="Request a copy of all your data" onClick={()=>{}}/>
        <SettingRow icon="👁️" label="Privacy Policy" onClick={()=>{}}/>
        <SettingRow icon="📜" label="Terms of Service" onClick={()=>{}} noBorder/>
      </SectionCard>

      <SectionCard>
        <SettingRow icon="🚫" label="Delete Account" sub="Permanently remove your account and data" onClick={()=>{}} danger noBorder/>
      </SectionCard>
    </div>
  );
}

/* — WATCHLIST — */
function WatchlistSection() {
  const [list, setList] = useState(WATCHLIST);
  const remove = id => setList(l=>l.filter(x=>x.id!==id));
  return (
    <div>
      <SectionCard title="MY LIST" titleRight={<span style={{ fontSize:12, color:MUTED }}>{list.length} titles</span>}>
        {list.length===0 && (
          <div style={{ textAlign:"center", padding:"32px 0", color:MUTED }}>
            <div style={{ fontSize:36, marginBottom:10 }}>♥</div>
            <div style={{ fontSize:14 }}>Nothing saved yet</div>
          </div>
        )}
        {list.map((item,i)=>(
          <div key={item.id} style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 0", borderBottom:i<list.length-1?`1px solid ${BORDER}`:"none" }}>
            <div style={{ width:50, height:50, borderRadius:10, background:`linear-gradient(135deg,${item.accent}22,#0a0a0f)`, border:`1px solid ${item.accent}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0, position:"relative" }}>
              {item.emoji}
              {item.progress>0 && (
                <div style={{ position:"absolute", bottom:0, left:0, right:0, height:3, background:"#1a1a26", borderRadius:"0 0 10px 10px", overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${item.progress}%`, background:item.accent }}/>
                </div>
              )}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:600, fontSize:14, marginBottom:2 }}>{item.title}</div>
              <div style={{ fontSize:11, color:item.accent, fontWeight:500 }}>{item.genre}{item.progress>0?` · ${item.progress}% watched`:""}</div>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button style={{ background:`${item.accent}22`, border:`1px solid ${item.accent}44`, color:item.accent, borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>▶ {item.progress>0?"Resume":"Play"}</button>
              <button onClick={()=>remove(item.id)} style={{ background:"rgba(255,255,255,.04)", border:`1px solid ${BORDER}`, color:MUTED, borderRadius:6, padding:"6px 10px", fontSize:12, cursor:"pointer" }}>✕</button>
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

/* — HELP — */
function HelpSection() {
  return (
    <div>
      <SectionCard title="SUPPORT">
        <SettingRow icon="💬" label="Live Chat" sub="Talk to our support team now" right={<Badge label="Online" color="#00c853"/>} onClick={()=>{}}/>
        <SettingRow icon="📞" label="Call Support" sub="1800-123-4567 (Toll Free)" onClick={()=>{}}/>
        <SettingRow icon="📧" label="Email Support" sub="support@streamx.in" onClick={()=>{}}/>
        <SettingRow icon="❓" label="FAQs" onClick={()=>{}}/>
        <SettingRow icon="🐛" label="Report a Problem" onClick={()=>{}} noBorder/>
      </SectionCard>
      <SectionCard title="APP INFO">
        <SettingRow icon="ℹ️" label="App Version" sub="StreamX v4.2.1 (Build 2026.05)" right={<span style={{ fontSize:12, color:"#00c853", fontWeight:600 }}>Up to date</span>}/>
        <SettingRow icon="⭐" label="Rate StreamX" sub="Love the app? Leave a review!" onClick={()=>{}} noBorder/>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════ */
const TABS = [
  { id:"account",     label:"Account",         icon:"👤" },
  { id:"watchlist",   label:"Watchlist",        icon:"♥" },
  { id:"playback",    label:"Playback",         icon:"▶️" },
  { id:"devices",     label:"Devices",          icon:"📱" },
  { id:"parental",    label:"Parental",         icon:"🔒" },
  { id:"notifications",label:"Notifications",  icon:"🔔" },
  { id:"privacy",     label:"Privacy",          icon:"🛡️" },
  { id:"help",        label:"Help",             icon:"💬" },
];

export default function StreamXProfile() {
  const [tab, setTab]               = useState("account");
  const [profiles, setProfiles]     = useState(PROFILES);
  const [activeProfile, setActiveP] = useState(1);
  const [editModal, setEditModal]   = useState(null); // null | profile obj | "new"
  const [toast, setToast]           = useState(null);
  const tabBarRef                   = useRef();

  const curProfile = profiles.find(p=>p.id===activeProfile);

  function showToast(msg){ setToast(msg); setTimeout(()=>setToast(null),2600); }

  function saveProfile(p) {
    if (!p.id) {
      const newP = { ...p, id: Date.now(), color:"#a855f7" };
      setProfiles(prev=>[...prev,newP]);
      showToast("Profile created!");
    } else {
      setProfiles(prev=>prev.map(x=>x.id===p.id?p:x));
      showToast("Profile updated!");
    }
    setEditModal(null);
  }

  // scroll active tab into view
  useEffect(()=>{
    const el = tabBarRef.current?.querySelector(".active");
    el?.scrollIntoView({ behavior:"smooth", inline:"center", block:"nearest" });
  },[tab]);

  return (
    <div style={{ minHeight:"100vh", background:BG, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <style>{GS}</style>

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", top:20, left:"50%", transform:"translateX(-50%)", background:"#1a1a26", color:"#fff", padding:"10px 24px", borderRadius:40, fontSize:13, fontWeight:600, zIndex:600, border:`1px solid ${BORDER}`, boxShadow:"0 8px 32px rgba(0,0,0,.7)", animation:"fadeIn .2s ease", zIndex:700 }}>
          {toast}
        </div>
      )}

      {/* Edit Profile Modal */}
      {editModal && (
        <EditProfileModal
          profile={editModal==="new" ? null : editModal}
          onClose={()=>setEditModal(null)}
          onSave={saveProfile}
        />
      )}

      {/* ── HEADER ── */}
      <div style={{ position:"relative", background:`linear-gradient(160deg,${curProfile?.color}22 0%,${BG} 55%)`, borderBottom:`1px solid ${BORDER}`, paddingTop:0 }}>
        {/* Navbar */}
        <div style={{ display:"flex", alignItems:"center", gap:16, padding:"16px 5vw 0" }}>
          <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:26, letterSpacing:2, cursor:"pointer" }}>
            <span style={{ color:RED }}>STREAM</span><span style={{ color:"#fff" }}>X</span>
          </div>
          <div style={{ flex:1 }}/>
          <button style={{ background:"rgba(255,255,255,.06)", border:`1px solid ${BORDER}`, color:"#aaa", borderRadius:8, padding:"7px 16px", fontSize:13, cursor:"pointer" }}>← Back to Home</button>
        </div>

        {/* Profile hero */}
        <div style={{ display:"flex", alignItems:"flex-end", gap:24, padding:"28px 5vw 0", flexWrap:"wrap" }}>
          {/* Big avatar */}
          <div style={{ position:"relative" }}>
            <div style={{ width:96, height:96, borderRadius:"50%", background:`linear-gradient(135deg,${curProfile?.color}55,${curProfile?.color}22)`, border:`3px solid ${curProfile?.color}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44 }}>
              {curProfile?.emoji}
            </div>
            <button onClick={()=>setEditModal(curProfile)} style={{ position:"absolute", bottom:0, right:0, width:30, height:30, borderRadius:"50%", background:"#1a1a26", border:`2px solid ${BG}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, cursor:"pointer" }}>✏️</button>
          </div>
          {/* Info */}
          <div style={{ flex:1, paddingBottom:20 }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:36, letterSpacing:1 }}>{curProfile?.name}</div>
              <Badge label={PLAN.name.toUpperCase()} color={RED}/>
              {curProfile?.kids && <Badge label="KIDS" color="#84cc16"/>}
              {curProfile?.pin && <Badge label="PIN LOCKED" color="#f59e0b"/>}
            </div>
            <div style={{ fontSize:13, color:MUTED, marginTop:4 }}>rahul.sharma@gmail.com · {curProfile?.lang}</div>
            {/* Quick stats */}
            <div style={{ display:"flex", gap:24, marginTop:14, flexWrap:"wrap" }}>
              {[["247","hrs watched"],["14","downloads"],["5","watchlist"],["4","profiles"]].map(([n,l])=>(
                <div key={l}>
                  <div style={{ fontFamily:"'Bebas Neue',sans-serif", fontSize:24, color:RED }}>{n}</div>
                  <div style={{ fontSize:11, color:MUTED }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Profile switcher strip */}
          <div style={{ display:"flex", gap:14, paddingBottom:20, alignItems:"center" }}>
            {profiles.map(p=>(
              <Avatar key={p.id} p={p} size={48} active={activeProfile===p.id} onClick={()=>{ setActiveP(p.id); setTab("account"); }}/>
            ))}
          </div>
        </div>

        {/* Tab bar */}
        <div ref={tabBarRef} style={{ display:"flex", overflowX:"auto", padding:"0 5vw", gap:0, borderTop:`1px solid ${BORDER}` }}>
          {TABS.map(t=>(
            <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>
              <span style={{ marginRight:6 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"28px 5vw 80px" }}>
        {tab==="account"       && <AccountSection profiles={profiles} activeProfile={activeProfile} setActiveProfile={setActiveP} onEditProfile={setEditModal} onAddProfile={()=>setEditModal("new")}/>}
        {tab==="watchlist"     && <WatchlistSection/>}
        {tab==="playback"      && <PlaybackSection/>}
        {tab==="devices"       && <DevicesSection/>}
        {tab==="parental"      && <ParentalSection/>}
        {tab==="notifications" && <NotificationsSection/>}
        {tab==="privacy"       && <PrivacySection/>}
        {tab==="help"          && <HelpSection/>}
      </div>

      {/* Sign out */}
      <div style={{ maxWidth:720, margin:"0 auto", padding:"0 5vw 48px" }}>
        <button style={{ width:"100%", background:"rgba(248,113,113,.08)", border:`1px solid rgba(248,113,113,.25)`, color:"#f87171", borderRadius:12, padding:"14px 0", fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:14, fontWeight:700, cursor:"pointer" }}>
          Sign Out of all Devices
        </button>
      </div>
    </div>
  );
}
