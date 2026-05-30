import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

const RED = "#e50914";
const BG = "#0a0a0f";
const SURF = "#0f0f16";
const BORDER = "#1a1a26";
const MUTED = "#555";

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:#0a0a0f;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;}
::-webkit-scrollbar{width:4px;}
::-webkit-scrollbar-thumb{background:#e50914;border-radius:2px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{to{transform:rotate(360deg);}}
.tab-btn{background:none;border:none;font-family:'Plus Jakarta Sans',sans-serif;font-size:13px;font-weight:500;color:#555;padding:10px 16px;cursor:pointer;white-space:nowrap;border-bottom:2px solid transparent;transition:color .2s,border-color .2s;}
.tab-btn.active{color:#fff;font-weight:700;border-bottom-color:#e50914;}
.row-hover{transition:background .15s;}
.row-hover:hover{background:rgba(255,255,255,0.03)!important;}
.toggle-track{width:46px;height:26px;border-radius:13px;position:relative;cursor:pointer;transition:background .25s;flex-shrink:0;}
.toggle-thumb{width:20px;height:20px;border-radius:50%;background:#fff;position:absolute;top:3px;transition:left .25s;}
`;

const TABS = [
  {id:"profile",     label:"Profile",       icon:"👤"},
  {id:"watchlist",   label:"Watchlist",     icon:"♥"},
  {id:"history",     label:"History",       icon:"🕐"},
  {id:"account",     label:"Account",       icon:"⚙️"},
  {id:"devices",     label:"Devices",       icon:"📱"},
  {id:"notifications",label:"Notifications",icon:"🔔"},
  {id:"help",        label:"Help",          icon:"💬"},
];

const PLANS = {
  free:         {name:"Free",    color:"#6b7280", price:"₹0",    features:["480p","1 screen","Ads"]},
  plan_mobile:  {name:"Mobile",  color:"#3b82f6", price:"₹149/mo",features:["720p","1 screen","No Ads"]},
  plan_basic:   {name:"Basic",   color:"#8b5cf6", price:"₹299/mo",features:["1080p","2 screens","No Ads","Downloads"]},
  plan_premium: {name:"Premium", color:RED,       price:"₹499/mo",features:["4K HDR","4 screens","No Ads","Downloads","Dolby"]},
  plan_annual:  {name:"Annual",  color:"#f59e0b", price:"₹999/yr",features:["4K HDR","4 screens","No Ads","Unlimited Downloads","Save 80%"]},
  premium:      {name:"Premium", color:RED,       price:"₹499/mo",features:["4K HDR","4 screens","No Ads"]},
};

function Toggle({on, onChange, color=RED}) {
  return (
    <div className="toggle-track" style={{background:on?color:"#1f1f2e"}} onClick={()=>onChange(!on)}>
      <div className="toggle-thumb" style={{left:on?23:3}}/>
    </div>
  );
}

function Row({icon, label, sub, right, onClick, danger, noBorder}) {
  return (
    <div className="row-hover" onClick={onClick} style={{display:"flex",alignItems:"center",gap:14,padding:"13px 0",borderBottom:noBorder?"none":`1px solid ${BORDER}`,cursor:onClick?"pointer":"default"}}>
      {icon && <div style={{width:36,height:36,borderRadius:10,background:"rgba(255,255,255,.05)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icon}</div>}
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:600,color:danger?"#f87171":"#e8e8f0"}}>{label}</div>
        {sub && <div style={{fontSize:12,color:MUTED,marginTop:2}}>{sub}</div>}
      </div>
      {right && <div style={{flexShrink:0}}>{right}</div>}
      {onClick && !right && <div style={{color:"#333",fontSize:18}}>›</div>}
    </div>
  );
}

function Card({title, children, style={}}) {
  return (
    <div style={{background:SURF,border:`1px solid ${BORDER}`,borderRadius:16,padding:"18px 18px 4px",marginBottom:14,...style}}>
      {title && <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:15,letterSpacing:1,color:"#aaa",marginBottom:4,paddingBottom:10,borderBottom:`1px solid ${BORDER}`}}>{title}</div>}
      {children}
    </div>
  );
}

export default function Profile({ onNavigate, user, onLogout, onUpgrade }) {
  const [tab,          setTab]         = useState("profile");
  const [userData,     setUserData]    = useState(user);
  const [profiles,     setProfiles]    = useState([]);
  const [watchlist,    setWatchlist]   = useState([]);
  const [history,      setHistory]     = useState([]);
  const [notifications,setNotifs]      = useState([]);
  const [subscription, setSub]         = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [toast,        setToast]       = useState(null);
  const [editName,     setEditName]    = useState(false);
  const [newName,      setNewName]     = useState(user?.name || "");
  const [prefs,        setPrefs]       = useState({autoplay:true,skipIntro:true,notifications:true,emailAlerts:false});
  const tabRef = useRef();

  function showToast(msg) { setToast(msg); setTimeout(()=>setToast(null),2600); }

  // Load all real data from Supabase
  useEffect(() => {
    loadAllData();
  }, [user?.id]);

  async function loadAllData() {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [profilesRes, watchlistRes, historyRes, notifsRes, subRes] = await Promise.all([
        db.getProfiles(user.id).catch(() => []),
        db.getWatchlist(user.id).catch(() => []),
        db.getHistory(user.id).catch(() => []),
        db.getNotifications(user.id).catch(() => []),
        db.getSubscription(user.id).catch(() => null),
      ]);
      setProfiles(profilesRes);
      setWatchlist(watchlistRes);
      setHistory(historyRes);
      setNotifs(notifsRes);
      setSub(subRes);

      // Get fresh user data
      const fresh = await db.getUserById(user.id).catch(() => null);
      if (fresh) setUserData(fresh);
    } catch (e) {
      console.error("Load error:", e);
    }
    setLoading(false);
  }

  async function saveName() {
    if (!newName.trim()) return;
    try {
      const updated = await db.updateUser(user.id, { name: newName.trim() });
      setUserData(updated);
      localStorage.setItem("streamx_user", JSON.stringify(updated));
      showToast("Name updated! ✅");
      setEditName(false);
    } catch (e) {
      showToast("Failed to update name");
    }
  }

  async function removeFromWatchlist(contentId) {
    try {
      await db.removeFromWatchlist(user.id, contentId);
      setWatchlist(w => w.filter(item => item.content_id !== contentId));
      showToast("Removed from watchlist");
    } catch (e) {
      showToast("Error removing item");
    }
  }

  async function clearHistory() {
    try {
      await db.clearHistory(user.id);
      setHistory([]);
      showToast("History cleared");
    } catch (e) {
      showToast("Error clearing history");
    }
  }

  async function markAllRead() {
    try {
      await db.markAllNotifsRead(user.id);
      setNotifs(n => n.map(x => ({...x, is_read: true})));
      showToast("All marked as read");
    } catch (e) {}
  }

  const plan = PLANS[userData?.plan] || PLANS.free;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) return (
    <div style={{minHeight:"100vh",background:BG,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{width:40,height:40,border:`3px solid ${BORDER}`,borderTop:`3px solid ${RED}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <div style={{color:MUTED,fontSize:13}}>Loading your profile...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:BG,fontFamily:"'Plus Jakarta Sans',sans-serif",paddingBottom:80}}>
      <style>{GS}</style>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:"#1a1a26",color:"#fff",padding:"10px 24px",borderRadius:40,fontSize:13,fontWeight:600,border:`1px solid ${BORDER}`,boxShadow:"0 8px 32px rgba(0,0,0,.8)"}}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{background:`linear-gradient(160deg,${plan.color}22,${BG} 60%)`,borderBottom:`1px solid ${BORDER}`,paddingBottom:0}}>
        <div style={{display:"flex",alignItems:"center",gap:16,padding:"16px 20px 0"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:2,cursor:"pointer"}} onClick={()=>onNavigate("home")}>
            <span style={{color:RED}}>STREAM</span><span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{flex:1}}/>
          <button onClick={()=>onNavigate("home")} style={{background:"rgba(255,255,255,.06)",border:`1px solid ${BORDER}`,color:"#aaa",borderRadius:8,padding:"7px 14px",fontSize:12,cursor:"pointer"}}>← Home</button>
        </div>

        {/* Profile Hero */}
        <div style={{display:"flex",alignItems:"flex-end",gap:20,padding:"24px 20px 0",flexWrap:"wrap"}}>
          {/* Avatar */}
          <div style={{position:"relative"}}>
            <div style={{width:88,height:88,borderRadius:"50%",background:`linear-gradient(135deg,${plan.color}55,${plan.color}22)`,border:`3px solid ${plan.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>
              {userData?.name?.[0]?.toUpperCase() || "👤"}
            </div>
            <div style={{position:"absolute",bottom:0,right:0,width:26,height:26,borderRadius:"50%",background:plan.color,border:`2px solid ${BG}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:"#fff"}}>
              {plan.name[0]}
            </div>
          </div>

          {/* User Info */}
          <div style={{flex:1,paddingBottom:16}}>
            {editName ? (
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <input
                  value={newName}
                  onChange={e=>setNewName(e.target.value)}
                  style={{background:"#1a1a26",border:`1px solid ${RED}`,borderRadius:8,color:"#fff",padding:"6px 12px",fontSize:16,fontWeight:700,outline:"none",fontFamily:"'Plus Jakarta Sans',sans-serif",flex:1}}
                  autoFocus
                  onKeyDown={e=>{if(e.key==="Enter")saveName();if(e.key==="Escape")setEditName(false);}}
                />
                <button onClick={saveName} style={{background:RED,border:"none",color:"#fff",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Save</button>
                <button onClick={()=>{setEditName(false);setNewName(userData?.name||"");}} style={{background:"rgba(255,255,255,.06)",border:`1px solid ${BORDER}`,color:"#aaa",borderRadius:7,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>✕</button>
              </div>
            ) : (
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:32,letterSpacing:1}}>{userData?.name || "User"}</div>
                <button onClick={()=>setEditName(true)} style={{background:"rgba(255,255,255,.06)",border:`1px solid ${BORDER}`,color:"#888",borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer"}}>✏️ Edit</button>
              </div>
            )}
            <div style={{fontSize:12,color:MUTED,marginBottom:10}}>
              {userData?.phone || userData?.email || "No contact"} · 
              <span style={{color:plan.color,fontWeight:700,marginLeft:6}}>{plan.name}</span>
            </div>
            {/* Stats */}
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              {[
                [watchlist.length,   "Watchlist"],
                [history.length,     "Watched"],
                [profiles.length||1, "Profiles"],
                [unreadCount,        "Alerts"],
              ].map(([n,l])=>(
                <div key={l}>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:22,color:RED}}>{n}</div>
                  <div style={{fontSize:10,color:MUTED}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div ref={tabRef} style={{display:"flex",overflowX:"auto",padding:"0 20px",borderTop:`1px solid ${BORDER}`,marginTop:16}}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)} style={{position:"relative"}}>
              {t.icon} {t.label}
              {t.id==="notifications"&&unreadCount>0&&<span style={{position:"absolute",top:6,right:4,width:16,height:16,borderRadius:"50%",background:RED,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800}}>{unreadCount}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:680,margin:"0 auto",padding:"20px 16px 40px"}}>

        {/* ── PROFILE TAB ── */}
        {tab==="profile" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            {/* Subscription card */}
            <div style={{background:`linear-gradient(120deg,${plan.color}22,${plan.color}08)`,border:`1px solid ${plan.color}33`,borderRadius:16,padding:20,marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div>
                  <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:24,letterSpacing:1,color:plan.color}}>{plan.name} Plan</div>
                  <div style={{fontSize:12,color:MUTED,marginTop:2}}>
                    {sub ? `Active until ${new Date(sub.end_date).toLocaleDateString("en-IN")}` : "No active subscription"}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:22,fontWeight:900}}>{plan.price}</div>
                  <span style={{background:"#00c85322",color:"#00c853",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>
                    {sub ? "ACTIVE" : "FREE"}
                  </span>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                {plan.features.map(f=>(
                  <span key={f} style={{background:"rgba(255,255,255,.07)",color:"#ccc",fontSize:11,padding:"3px 10px",borderRadius:20}}>✓ {f}</span>
                ))}
              </div>
              <button onClick={onUpgrade} style={{width:"100%",background:plan.color,border:"none",color:"#fff",borderRadius:8,padding:"11px 0",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer"}}>
                {userData?.plan === "plan_premium" || userData?.plan === "premium" ? "Manage Plan" : "Upgrade Now 👑"}
              </button>
            </div>

            {/* Personal info */}
            <Card title="PERSONAL INFO">
              <Row icon="👤" label="Full Name" sub={userData?.name || "Not set"} right={<button onClick={()=>setEditName(true)} style={{background:"none",border:"none",color:RED,fontSize:12,fontWeight:600,cursor:"pointer"}}>Edit</button>}/>
              <Row icon="📱" label="Mobile Number" sub={userData?.phone || "Not set"}/>
              <Row icon="📧" label="Email" sub={userData?.email || "Not set"}/>
              <Row icon="🎭" label="Role" sub={userData?.role === "admin" ? "Administrator" : "Member"} noBorder/>
            </Card>

            {/* Preferences */}
            <Card title="PREFERENCES">
              <Row icon="▶️" label="Autoplay"       sub="Auto-play next video"        right={<Toggle on={prefs.autoplay}       onChange={v=>setPrefs(p=>({...p,autoplay:v}))}/>}/>
              <Row icon="⏭️" label="Skip Intro"     sub="Skip title sequences"        right={<Toggle on={prefs.skipIntro}      onChange={v=>setPrefs(p=>({...p,skipIntro:v}))}/>}/>
              <Row icon="🔔" label="Notifications"  sub="Push alerts for new content" right={<Toggle on={prefs.notifications}  onChange={v=>setPrefs(p=>({...p,notifications:v}))}/>}/>
              <Row icon="📧" label="Email Alerts"   sub="Weekly newsletter"           right={<Toggle on={prefs.emailAlerts}    onChange={v=>setPrefs(p=>({...p,emailAlerts:v}))}/>} noBorder/>
            </Card>

            {/* Profiles */}
            <Card title="MY PROFILES">
              <div style={{display:"flex",gap:14,flexWrap:"wrap",padding:"12px 0"}}>
                {/* Main profile */}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                  <div style={{width:60,height:60,borderRadius:"50%",background:`linear-gradient(135deg,${plan.color}55,${plan.color}22)`,border:`2px solid ${plan.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                    {userData?.name?.[0]?.toUpperCase() || "👤"}
                  </div>
                  <span style={{fontSize:11,fontWeight:600,color:"#fff"}}>{userData?.name?.split(" ")[0] || "You"}</span>
                </div>
                {/* DB profiles */}
                {profiles.map(p=>(
                  <div key={p.id} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
                    <div style={{width:60,height:60,borderRadius:"50%",background:`linear-gradient(135deg,${p.color}55,${p.color}22)`,border:`2px solid ${p.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>
                      {p.emoji}
                    </div>
                    <span style={{fontSize:11,fontWeight:600,color:"#aaa"}}>{p.name}</span>
                  </div>
                ))}
                {/* Add profile */}
                <div onClick={async()=>{
                  const name = prompt("Profile name:");
                  if(!name) return;
                  try {
                    const p = await db.createProfile(user.id,{name,emoji:"😊",color:"#a855f7"});
                    setProfiles(prev=>[...prev,p]);
                    showToast("Profile created!");
                  } catch(e){showToast("Error creating profile");}
                }} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer"}}>
                  <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(255,255,255,.04)",border:`2px dashed ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:MUTED}}>+</div>
                  <span style={{fontSize:11,color:MUTED}}>Add</span>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* ── WATCHLIST TAB ── */}
        {tab==="watchlist" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Card title={`MY WATCHLIST (${watchlist.length})`}>
              {watchlist.length === 0 ? (
                <div style={{textAlign:"center",padding:"32px 0",color:MUTED}}>
                  <div style={{fontSize:40,marginBottom:10}}>♥</div>
                  <div style={{fontSize:14}}>Nothing saved yet</div>
                  <div style={{fontSize:12,marginTop:6}}>Add content while browsing</div>
                </div>
              ) : watchlist.map((item,i)=>{
                const c = item.content;
                if (!c) return null;
                return (
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<watchlist.length-1?`1px solid ${BORDER}`:"none"}}>
                    <div style={{width:52,height:52,borderRadius:10,background:"linear-gradient(135deg,#e5091422,#0a0a0f)",border:`1px solid #e5091433`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                      🎬
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                      <div style={{fontSize:11,color:RED,fontWeight:500}}>{c.genre} · {c.type}</div>
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button style={{background:`#e5091422`,border:`1px solid #e5091444`,color:RED,borderRadius:6,padding:"5px 12px",fontSize:11,fontWeight:700,cursor:"pointer"}}>▶ Play</button>
                      <button onClick={()=>removeFromWatchlist(item.content_id)} style={{background:"rgba(255,255,255,.04)",border:`1px solid ${BORDER}`,color:MUTED,borderRadius:6,padding:"5px 9px",fontSize:11,cursor:"pointer"}}>✕</button>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab==="history" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15}}>Watch History ({history.length})</div>
              {history.length > 0 && <button onClick={clearHistory} style={{background:"none",border:"none",color:"#f87171",fontSize:12,fontWeight:600,cursor:"pointer"}}>Clear All</button>}
            </div>
            <Card>
              {history.length === 0 ? (
                <div style={{textAlign:"center",padding:"32px 0",color:MUTED}}>
                  <div style={{fontSize:40,marginBottom:10}}>🕐</div>
                  <div style={{fontSize:14}}>No watch history yet</div>
                </div>
              ) : history.map((item,i)=>{
                const c = item.content;
                if (!c) return null;
                return (
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<history.length-1?`1px solid ${BORDER}`:"none"}}>
                    <div style={{width:48,height:48,borderRadius:8,background:"linear-gradient(135deg,#1d9bf022,#0a0a0f)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,position:"relative"}}>
                      🎬
                      {item.progress_pct > 0 && (
                        <div style={{position:"absolute",bottom:0,left:0,right:0,height:3,background:"#1a1a26",borderRadius:"0 0 8px 8px",overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${item.progress_pct}%`,background:"#1d9bf0"}}/>
                        </div>
                      )}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.title}</div>
                      <div style={{fontSize:11,color:MUTED,marginTop:2}}>{c.genre} · {item.progress_pct}% watched</div>
                    </div>
                    <div style={{fontSize:11,color:MUTED}}>{new Date(item.watched_at).toLocaleDateString("en-IN")}</div>
                  </div>
                );
              })}
            </Card>
          </div>
        )}

        {/* ── ACCOUNT TAB ── */}
        {tab==="account" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Card title="ACCOUNT SETTINGS">
              <Row icon="✏️" label="Edit Name" sub="Change your display name" onClick={()=>{setEditName(true);setTab("profile");}}/>
              <Row icon="🔔" label="Notification Settings" sub="Manage your alerts" onClick={()=>setTab("notifications")}/>
              <Row icon="👑" label="Subscription & Billing" sub={`${plan.name} Plan · ${plan.price}`} onClick={onUpgrade}/>
              <Row icon="🛡️" label="Privacy & Security" sub="Manage your data" onClick={()=>showToast("Coming soon!")}/>
              <Row icon="🌐" label="Language" sub="Hindi / English / Tamil" onClick={()=>showToast("Coming soon!")} noBorder/>
            </Card>

            <Card title="BILLING HISTORY">
              {sub ? (
                <Row icon="🧾" label={`${plan.name} Plan`} sub={`Activated · ₹${sub.amount}`} right={<span style={{background:"#00c85322",color:"#00c853",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>ACTIVE</span>} noBorder/>
              ) : (
                <div style={{padding:"16px 0",textAlign:"center",color:MUTED,fontSize:13}}>No billing history</div>
              )}
            </Card>

            <Card>
              <Row icon="🚫" label="Delete Account" sub="Permanently remove your account" onClick={()=>{if(confirm("Are you sure?"))showToast("Contact support to delete account");}} danger noBorder/>
            </Card>

            <button onClick={onLogout} style={{width:"100%",background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.25)",color:"#f87171",borderRadius:12,padding:"14px 0",fontFamily:"'Plus Jakarta Sans',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",marginTop:4}}>
              Sign Out
            </button>
          </div>
        )}

        {/* ── DEVICES TAB ── */}
        {tab==="devices" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Card title="ACTIVE DEVICES">
              {[
                {icon:"📱",name:"This Device",loc:"Current session",active:true},
              ].map((d,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:`1px solid ${BORDER}`}}>
                  <div style={{width:42,height:42,borderRadius:10,background:"rgba(229,9,20,.12)",border:`1px solid ${RED}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,position:"relative"}}>
                    {d.icon}
                    {d.active&&<div style={{position:"absolute",top:-3,right:-3,width:10,height:10,borderRadius:"50%",background:"#00c853",border:`2px solid ${BG}`}}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:13}}>{d.name}</div>
                    <div style={{fontSize:11,color:MUTED}}>{d.loc}</div>
                  </div>
                  <span style={{background:"#00c85322",color:"#00c853",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>ACTIVE</span>
                </div>
              ))}
              <Row icon="📺" label="Connect to Smart TV" sub="Pair your TV with StreamX" onClick={()=>showToast("Coming soon!")}/>
              <Row icon="💻" label="Web Browser" sub="Stream on laptop/desktop" onClick={()=>showToast("Already connected!")} noBorder/>
            </Card>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {tab==="notifications" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:15}}>Notifications</div>
              {unreadCount > 0 && <button onClick={markAllRead} style={{background:"none",border:"none",color:RED,fontSize:12,fontWeight:600,cursor:"pointer"}}>Mark all read</button>}
            </div>
            <Card>
              {notifications.length === 0 ? (
                <div style={{textAlign:"center",padding:"32px 0",color:MUTED}}>
                  <div style={{fontSize:40,marginBottom:10}}>🔔</div>
                  <div style={{fontSize:14}}>No notifications yet</div>
                </div>
              ) : notifications.map((n,i)=>(
                <div key={n.id} onClick={()=>db.markNotifRead(n.id).then(()=>setNotifs(prev=>prev.map(x=>x.id===n.id?{...x,is_read:true}:x)))}
                  style={{display:"flex",gap:12,padding:"12px 0",borderBottom:i<notifications.length-1?`1px solid ${BORDER}`:"none",cursor:"pointer",opacity:n.is_read?.5:1}}>
                  <div style={{width:36,height:36,borderRadius:10,background:n.is_read?"rgba(255,255,255,.04)":"rgba(229,9,20,.12)",border:`1px solid ${n.is_read?BORDER:RED+"44"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                    {n.type==="welcome"?"🎉":n.type==="subscription"?"👑":n.type==="live"?"🔴":"🔔"}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:n.is_read?400:700,fontSize:13}}>{n.title}</div>
                    <div style={{fontSize:11,color:MUTED,marginTop:2}}>{n.message}</div>
                    <div style={{fontSize:10,color:"#333",marginTop:4}}>{new Date(n.created_at).toLocaleDateString("en-IN")}</div>
                  </div>
                  {!n.is_read && <div style={{width:8,height:8,borderRadius:"50%",background:RED,marginTop:4,flexShrink:0}}/>}
                </div>
              ))}
            </Card>
          </div>
        )}

        {/* ── HELP TAB ── */}
        {tab==="help" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <Card title="SUPPORT">
              <Row icon="💬" label="Live Chat" sub="Talk to our support team" right={<span style={{background:"#00c85322",color:"#00c853",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>Online</span>} onClick={()=>showToast("Opening chat...")}/>
              <Row icon="📞" label="Call Support" sub="1800-123-4567 (Toll Free)" onClick={()=>showToast("Calling...")}/>
              <Row icon="📧" label="Email Support" sub="support@streamx.in" onClick={()=>showToast("Opening email...")}/>
              <Row icon="❓" label="FAQs" onClick={()=>showToast("Opening FAQs...")}/>
              <Row icon="🐛" label="Report a Problem" onClick={()=>showToast("Report submitted!")} noBorder/>
            </Card>
            <Card title="APP INFO">
              <Row icon="ℹ️" label="App Version" sub="StreamX v2.0.0" right={<span style={{fontSize:12,color:"#00c853",fontWeight:600}}>Up to date</span>}/>
              <Row icon="⭐" label="Rate StreamX" sub="Love the app? Leave a review!" onClick={()=>showToast("Thanks for your rating! ⭐")} noBorder/>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}