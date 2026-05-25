import { useState } from "react";

const GS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
.px-body { font-family: 'Plus Jakarta Sans', sans-serif; }
@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
@keyframes popIn  { from { opacity:0; transform:scale(.93); }       to { opacity:1; transform:scale(1); } }
.panim { animation: fadeUp .35s ease both; }
.prow  { transition: background .15s; border-bottom: 1px solid #16161f; }
.prow:hover { background: rgba(255,255,255,.03); }
.prow:last-child { border-bottom: none; }
.ptoggle-wrap  { width:42px; height:24px; border-radius:12px; position:relative; cursor:pointer; transition:background .22s; flex-shrink:0; }
.ptoggle-knob  { width:18px; height:18px; border-radius:50%; background:#fff; position:absolute; top:3px; transition:left .22s; box-shadow:0 1px 5px rgba(0,0,0,.4); }
.pinp { width:100%; background:#0a0a14; border:1px solid #1a1a2c; border-radius:8px; color:#e2e2ee; font-family:inherit; font-size:13px; padding:9px 12px; outline:none; transition:border-color .18s; }
.pinp:focus { border-color:#e50914; }
.pavatar { border-radius:50%; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:transform .2s, box-shadow .2s; position:relative; }
.pavatar:hover { transform:scale(1.07); }
`;

const RED = "#e50914";
const SURF = "#0e0e18";
const BORDER = "#1a1a26";
const MUTED = "#555";

const PLANS = [
  { id:"mobile",  label:"Mobile",   price:"₹149", period:"/month", color:"#6b7280", features:["720p","1 screen","Mobile only","Ads supported"] },
  { id:"basic",   label:"Basic",    price:"₹299", period:"/month", color:"#3b82f6", features:["1080p","1 screen","All devices","No Ads"] },
  { id:"premium", label:"Premium",  price:"₹499", period:"/month", color:RED,       features:["4K + HDR","4 screens","Downloads","Dolby Atmos","No Ads"] },
  { id:"annual",  label:"Annual",   price:"₹999", period:"/year",  color:"#f59e0b", features:["4K + HDR","4 screens","Unlimited downloads","Priority support","Save 80%"] },
];

const INIT_PROFILES = [
  { id:"p1", name:"Rahul",  emoji:"😎", color:RED,       isKids:false, hasPin:false, lang:"Hindi"   },
  { id:"p2", name:"Priya",  emoji:"🌸", color:"#ec4899", isKids:false, hasPin:false, lang:"English" },
  { id:"p3", name:"Kids",   emoji:"🧸", color:"#84cc16", isKids:true,  hasPin:false, lang:"Hindi"   },
];

const WATCHLIST = [
  { id:"w1", title:"Dark Meridian",   emoji:"🌌", progress:62, genre:"Sci-Fi",   accent:"#1d9bf0" },
  { id:"w2", title:"Apex Protocol",   emoji:"🔥", progress:0,  genre:"Action",   accent:RED },
  { id:"w3", title:"Bombay Central",  emoji:"🏙️", progress:18, genre:"Drama",    accent:"#f59e0b" },
  { id:"w4", title:"Steel Horizon",   emoji:"🤖", progress:38, genre:"Action",   accent:"#64748b" },
];

/* ── helpers ── */
function Toggle({ on, onChange, color = RED }) {
  return (
    <div className="ptoggle-wrap" style={{ background: on ? color : "#1e1e30" }}
      onClick={() => onChange(!on)}>
      <div className="ptoggle-knob" style={{ left: on ? 21 : 3 }} />
    </div>
  );
}

function SectionCard({ title, titleRight, children }) {
  return (
    <div className="panim" style={{
      background: SURF, border: `1px solid ${BORDER}`,
      borderRadius: 14, padding: "18px 18px 4px", marginBottom: 14
    }}>
      {(title || titleRight) && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          paddingBottom: 12, marginBottom: 4, borderBottom: `1px solid ${BORDER}`
        }}>
          {title && <div style={{ fontSize: 11, fontWeight: 700, color: "#777", textTransform: "uppercase", letterSpacing: 1 }}>{title}</div>}
          {titleRight}
        </div>
      )}
      {children}
    </div>
  );
}

function SettingRow({ icon, label, sub, right, onClick, danger, noBorder }) {
  return (
    <div className="prow" onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 0",
      borderBottom: noBorder ? "none" : `1px solid ${BORDER}`,
      cursor: onClick ? "pointer" : "default"
    }}>
      {icon && (
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: "rgba(255,255,255,.05)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, flexShrink: 0
        }}>{icon}</div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: danger ? "#f87171" : "#e2e2ee" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
      </div>
      {right && <div style={{ flexShrink: 0 }}>{right}</div>}
      {onClick && !right && <div style={{ color: "#333", fontSize: 18 }}>›</div>}
    </div>
  );
}

function ChipSelect({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
      {options.map(o => (
        <button key={o} onClick={() => onChange(o)} style={{
          background: value === o ? RED : "rgba(255,255,255,.05)",
          border: `1px solid ${value === o ? RED : BORDER}`,
          color: value === o ? "#fff" : MUTED,
          borderRadius: 20, padding: "5px 14px",
          fontSize: 12, fontWeight: 600, cursor: "pointer",
          fontFamily: "inherit", transition: "all .18s"
        }}>{o}</button>
      ))}
    </div>
  );
}

/* ── Edit Profile Modal ── */
function EditProfileModal({ profile, onClose, onSave }) {
  const [name,  setName]  = useState(profile?.name  || "");
  const [emoji, setEmoji] = useState(profile?.emoji || "😊");
  const [kids,  setKids]  = useState(profile?.isKids || false);
  const [lang,  setLang]  = useState(profile?.lang  || "Hindi");
  const EMOJIS = ["😎","🌸","🧸","👴","🦁","🎭","🚀","🎵","🌊","⚡","🔥","🎮","🌙","🌈","🦋"];
  const LANGS  = ["Hindi","English","Tamil","Telugu","Bengali","Kannada","Malayalam"];
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 600,
      background: "rgba(0,0,0,.85)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20
    }} onClick={onClose}>
      <div style={{
        background: "#111120", border: `1px solid ${BORDER}`,
        borderRadius: 18, padding: 26, width: "100%", maxWidth: 420,
        animation: "popIn .22s ease"
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 18 }}>
          {profile?.id ? "Edit Profile" : "New Profile"}
        </div>

        {/* Avatar preview */}
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: `linear-gradient(135deg,${RED}44,${RED}22)`,
            border: `2px solid ${RED}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 32, margin: "0 auto 12px"
          }}>{emoji}</div>
          <div style={{ display: "flex", gap: 7, justifyContent: "center", flexWrap: "wrap" }}>
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)} style={{
                background: emoji === e ? `${RED}33` : "rgba(255,255,255,.05)",
                border: `1px solid ${emoji === e ? RED : BORDER}`,
                borderRadius: 8, width: 36, height: 36, fontSize: 17, cursor: "pointer"
              }}>{e}</button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: .6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Name</label>
          <input className="pinp" value={name} onChange={e => setName(e.target.value)} placeholder="Profile name" />
        </div>

        {/* Language */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: .6, textTransform: "uppercase", display: "block", marginBottom: 5 }}>Language</label>
          <select className="pinp" value={lang} onChange={e => setLang(e.target.value)}>
            {LANGS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Kids toggle */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "11px 0", borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, marginBottom: 18
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Kids Profile</div>
            <div style={{ fontSize: 11, color: MUTED }}>Only show age-appropriate content</div>
          </div>
          <Toggle on={kids} onChange={setKids} color="#84cc16" />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onClose} style={{
            flex: 1, background: "rgba(255,255,255,.06)", border: `1px solid ${BORDER}`,
            color: "#aaa", borderRadius: 8, padding: "11px 0",
            fontFamily: "inherit", fontSize: 13, fontWeight: 600, cursor: "pointer"
          }}>Cancel</button>
          <button onClick={() => onSave({ ...profile, name, emoji, isKids: kids, lang, id: profile?.id || Date.now().toString() })} style={{
            flex: 2, background: RED, border: "none", color: "#fff",
            borderRadius: 8, padding: "11px 0",
            fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer"
          }}>Save Profile</button>
        </div>
      </div>
    </div>
  );
}

/* ── TABS ── */
const TABS = [
  { id:"account",       label:"Account",        icon:"👤" },
  { id:"watchlist",     label:"Watchlist",       icon:"♥"  },
  { id:"playback",      label:"Playback",        icon:"▶️" },
  { id:"devices",       label:"Devices",         icon:"📱" },
  { id:"parental",      label:"Parental",        icon:"🔒" },
  { id:"notifications", label:"Notifications",   icon:"🔔" },
  { id:"privacy",       label:"Privacy",         icon:"🛡️" },
  { id:"help",          label:"Help",            icon:"💬" },
];

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */
export default function Profile({ onNavigate }) {
  const [tab,       setTab]       = useState("account");
  const [profiles,  setProfiles]  = useState(INIT_PROFILES);
  const [activeP,   setActiveP]   = useState("p1");
  const [editModal, setEditModal] = useState(null);
  const [plan,      setPlan]      = useState("premium");
  const [toast,     setToast]     = useState(null);
  const [watchlist, setWatchlist] = useState(WATCHLIST);

  /* playback */
  const [quality,   setQuality]   = useState("Auto");
  const [subLang,   setSubLang]   = useState("Auto");
  const [autoplay,  setAutoplay]  = useState(true);
  const [skipIntro, setSkipIntro] = useState(true);
  const [skipRecap, setSkipRecap] = useState(false);
  const [autoNext,  setAutoNext]  = useState(true);
  const [pip,       setPip]       = useState(false);
  const [dataSaver, setDataSaver] = useState(false);

  /* notifications */
  const [nPush,  setNPush]  = useState(true);
  const [nLive,  setNLive]  = useState(true);
  const [nNew,   setNNew]   = useState(true);
  const [nEmail, setNEmail] = useState(false);
  const [nSms,   setNSms]   = useState(false);

  /* privacy */
  const [pHistory, setPHistory] = useState(true);
  const [pRec,     setPRec]     = useState(true);
  const [pAds,     setPAds]     = useState(false);

  /* parental */
  const [maturity,    setMaturity]    = useState("U/A 13+");
  const [kidsMode,    setKidsMode]    = useState(false);
  const [pinEnabled,  setPinEnabled]  = useState(true);
  const [pin,         setPin]         = useState(["","","",""]);

  const curProfile = profiles.find(p => p.id === activeP);
  const curPlan    = PLANS.find(p => p.id === plan);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  function saveProfile(p) {
    if (profiles.find(x => x.id === p.id)) {
      setProfiles(prev => prev.map(x => x.id === p.id ? p : x));
    } else {
      setProfiles(prev => [...prev, { ...p, color: RED }]);
    }
    setEditModal(null);
    showToast("Profile saved!");
  }

  function handlePinChange(i, v) {
    if (!/^\d?$/.test(v)) return;
    const next = [...pin]; next[i] = v; setPin(next);
  }

  /* ── render ── */
  return (
    <div className="px-body" style={{ minHeight: "100vh", background: "#07070c", paddingBottom: 80 }}>
      <style>{GS}</style>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: "#1a1a26", color: "#fff", padding: "10px 22px",
          borderRadius: 40, fontSize: 13, fontWeight: 600, zIndex: 700,
          border: `1px solid ${BORDER}`, boxShadow: "0 8px 32px rgba(0,0,0,.7)"
        }}>{toast}</div>
      )}

      {/* Edit Modal */}
      {editModal && (
        <EditProfileModal
          profile={editModal === "new" ? null : editModal}
          onClose={() => setEditModal(null)}
          onSave={saveProfile}
        />
      )}

      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(160deg,${curProfile?.color}22 0%,#07070c 55%)`,
        borderBottom: `1px solid ${BORDER}`
      }}>
        {/* top nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px" }}>
          <button onClick={() => onNavigate("home")} style={{
            background: "none", border: "none", color: "#aaa",
            fontSize: 18, cursor: "pointer"
          }}>←</button>
          <div style={{ fontWeight: 900, fontSize: 20, color: RED, letterSpacing: 1 }}>
            STREAM<span style={{ color: "#fff" }}>X</span>
          </div>
        </div>

        {/* Profile hero */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, padding: "0 20px 0", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%",
              background: `linear-gradient(135deg,${curProfile?.color}55,${curProfile?.color}22)`,
              border: `3px solid ${curProfile?.color}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40
            }}>{curProfile?.emoji}</div>
            <button onClick={() => setEditModal(curProfile)} style={{
              position: "absolute", bottom: 0, right: 0, width: 28, height: 28,
              borderRadius: "50%", background: "#1a1a26", border: `2px solid #07070c`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, cursor: "pointer"
            }}>✏️</button>
          </div>

          <div style={{ flex: 1, paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
              <div style={{ fontWeight: 900, fontSize: 26 }}>{curProfile?.name}</div>
              <span style={{
                background: `${curPlan?.color}22`, color: curPlan?.color,
                fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20
              }}>{curPlan?.label?.toUpperCase()}</span>
              {curProfile?.isKids && <span style={{ background: "#84cc1622", color: "#84cc16", fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 20 }}>KIDS</span>}
            </div>
            <div style={{ fontSize: 12, color: MUTED }}>rahul.sharma@gmail.com · {curProfile?.lang}</div>
            {/* stats */}
            <div style={{ display: "flex", gap: 22, marginTop: 12 }}>
              {[["247","hrs"],["14","downloads"],["4","watchlist"],["3","profiles"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontWeight: 900, fontSize: 20, color: RED }}>{n}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile switcher */}
          <div style={{ display: "flex", gap: 12, paddingBottom: 16, alignItems: "center" }}>
            {profiles.map(p => (
              <div key={p.id} onClick={() => { setActiveP(p.id); setTab("account"); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <div style={{
                  width: 46, height: 46, borderRadius: "50%",
                  background: `linear-gradient(135deg,${p.color}44,${p.color}22)`,
                  border: `2px solid ${activeP === p.id ? p.color : BORDER}`,
                  boxShadow: activeP === p.id ? `0 0 0 2px ${p.color}44` : "none",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                  transition: "all .2s"
                }}>{p.emoji}</div>
                <span style={{ fontSize: 10, color: activeP === p.id ? "#fff" : MUTED }}>{p.name}</span>
              </div>
            ))}
            <div onClick={() => setEditModal("new")}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
              <div style={{
                width: 46, height: 46, borderRadius: "50%",
                background: "rgba(255,255,255,.04)", border: `2px dashed ${BORDER}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, color: MUTED
              }}>+</div>
              <span style={{ fontSize: 10, color: MUTED }}>Add</span>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", overflowX: "auto", borderTop: `1px solid ${BORDER}`, padding: "0 8px" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: "none", border: "none", color: tab === t.id ? "#fff" : MUTED,
              fontFamily: "inherit", fontSize: 12.5, fontWeight: tab === t.id ? 700 : 500,
              padding: "11px 14px", cursor: "pointer", whiteSpace: "nowrap",
              borderBottom: `2px solid ${tab === t.id ? RED : "transparent"}`,
              transition: "all .18s"
            }}>
              <span style={{ marginRight: 5 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "22px 16px" }}>

        {/* ACCOUNT */}
        {tab === "account" && (
          <div>
            {/* Subscription card */}
            <div className="panim" style={{
              background: `linear-gradient(120deg,${RED}18,#ff6b3511)`,
              border: `1px solid ${RED}33`, borderRadius: 14, padding: 20, marginBottom: 14
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 900, fontSize: 18, color: RED }}>StreamX {curPlan?.label}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>Next billing: June 18, 2026</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 22 }}>{curPlan?.price}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{curPlan?.period}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {curPlan?.features.map(f => (
                  <span key={f} style={{ background: "rgba(255,255,255,.07)", color: "#ccc", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>✓ {f}</span>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => {
                  const idx = PLANS.findIndex(p => p.id === plan);
                  const next = PLANS[(idx + 1) % PLANS.length];
                  setPlan(next.id);
                  showToast(`Switched to ${next.label}!`);
                }} style={{
                  flex: 1, background: RED, border: "none", color: "#fff",
                  borderRadius: 8, padding: "10px 0", fontFamily: "inherit",
                  fontSize: 13, fontWeight: 700, cursor: "pointer"
                }}>Change Plan</button>
                <button style={{
                  flex: 1, background: "transparent", border: `1px solid ${BORDER}`,
                  color: MUTED, borderRadius: 8, padding: "10px 0",
                  fontFamily: "inherit", fontSize: 13, cursor: "pointer"
                }}>View Benefits</button>
              </div>
            </div>

            {/* Plan selector */}
            <SectionCard title="Choose Plan">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: "10px 0 8px" }}>
                {PLANS.map(p => (
                  <div key={p.id} onClick={() => { setPlan(p.id); showToast(`${p.label} plan selected!`); }}
                    style={{
                      border: `1.5px solid ${plan === p.id ? p.color : BORDER}`,
                      background: plan === p.id ? `${p.color}11` : "transparent",
                      borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                      transition: "all .18s"
                    }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: p.color }}>{p.label}</div>
                    <div style={{ fontWeight: 900, fontSize: 18, color: "#fff", marginTop: 2 }}>{p.price}<span style={{ fontSize: 11, fontWeight: 400, color: MUTED }}>{p.period}</span></div>
                    {plan === p.id && <div style={{ fontSize: 10, color: p.color, marginTop: 4, fontWeight: 700 }}>● ACTIVE</div>}
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* Account info */}
            <SectionCard title="Account Info">
              <SettingRow icon="📧" label="Email" sub="rahul.sharma@gmail.com" right={<span style={{ fontSize: 11, color: "#00c853", fontWeight: 700 }}>✓ Verified</span>} />
              <SettingRow icon="📱" label="Mobile" sub="+91 98765 43210" right={<span style={{ fontSize: 12, color: RED, fontWeight: 600, cursor: "pointer" }}>Change</span>} />
              <SettingRow icon="🔒" label="Password" sub="Last changed 3 months ago" onClick={() => showToast("Password reset email sent!")} />
              <SettingRow icon="🛡️" label="Two-Factor Auth" sub="Add extra security" onClick={() => showToast("2FA setup coming soon")} noBorder />
            </SectionCard>

            {/* Billing */}
            <SectionCard title="Billing History">
              {[["May 18, 2026","₹499"],["Apr 18, 2026","₹499"],["Mar 18, 2026","₹499"]].map(([d, a], i, arr) => (
                <SettingRow key={d} icon="🧾" label={d} sub={`Premium Plan · ${a}`}
                  right={<span style={{ background: "#00c85322", color: "#00c853", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Paid</span>}
                  noBorder={i === arr.length - 1} />
              ))}
            </SectionCard>
          </div>
        )}

        {/* WATCHLIST */}
        {tab === "watchlist" && (
          <SectionCard title="My List" titleRight={<span style={{ fontSize: 12, color: MUTED }}>{watchlist.length} titles</span>}>
            {watchlist.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: MUTED }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>♥</div>
                <div style={{ fontSize: 14 }}>Nothing saved yet</div>
              </div>
            ) : watchlist.map((item, i) => (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 0",
                borderBottom: i < watchlist.length - 1 ? `1px solid ${BORDER}` : "none"
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 10,
                  background: `linear-gradient(135deg,${item.accent}22,#0a0a0f)`,
                  border: `1px solid ${item.accent}44`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0, position: "relative"
                }}>
                  {item.emoji}
                  {item.progress > 0 && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: "#1a1a26", borderRadius: "0 0 10px 10px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${item.progress}%`, background: item.accent }} />
                    </div>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                  <div style={{ fontSize: 11, color: item.accent, marginTop: 2 }}>{item.genre}{item.progress > 0 ? ` · ${item.progress}% watched` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={{
                    background: `${item.accent}22`, border: `1px solid ${item.accent}44`,
                    color: item.accent, borderRadius: 6, padding: "6px 14px",
                    fontSize: 12, fontWeight: 700, cursor: "pointer"
                  }}>▶ {item.progress > 0 ? "Resume" : "Play"}</button>
                  <button onClick={() => setWatchlist(w => w.filter(x => x.id !== item.id))} style={{
                    background: "rgba(255,255,255,.04)", border: `1px solid ${BORDER}`,
                    color: MUTED, borderRadius: 6, padding: "6px 10px",
                    fontSize: 12, cursor: "pointer"
                  }}>✕</button>
                </div>
              </div>
            ))}
          </SectionCard>
        )}

        {/* PLAYBACK */}
        {tab === "playback" && (
          <div>
            <SectionCard title="Stream Quality">
              <div style={{ padding: "8px 0 10px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Streaming quality</div>
                <ChipSelect options={["Auto","4K","1080p","720p","480p"]} value={quality} onChange={setQuality} />
              </div>
              <SettingRow icon="💾" label="Data Saver" sub="Reduces quality on mobile data" right={<Toggle on={dataSaver} onChange={setDataSaver} />} noBorder />
            </SectionCard>
            <SectionCard title="Subtitles & Audio">
              <div style={{ padding: "8px 0 12px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Subtitle language</div>
                <ChipSelect options={["Off","Auto","English","Hindi","Tamil"]} value={subLang} onChange={setSubLang} />
              </div>
              <SettingRow icon="🎙️" label="Audio Language" sub="Default: match content language" onClick={() => {}} noBorder />
            </SectionCard>
            <SectionCard title="Playback Behaviour">
              <SettingRow icon="▶️" label="Autoplay"            sub="Auto-play next video"          right={<Toggle on={autoplay}  onChange={setAutoplay}  />} />
              <SettingRow icon="⏭️" label="Skip Intro"          sub="Auto-skip title sequences"     right={<Toggle on={skipIntro} onChange={setSkipIntro} />} />
              <SettingRow icon="⏩" label="Skip Recap"          sub="Skip 'Previously on…'"         right={<Toggle on={skipRecap} onChange={setSkipRecap} />} />
              <SettingRow icon="🔜" label="Auto-Play Next Ep"   sub="Start next episode after credits" right={<Toggle on={autoNext}  onChange={setAutoNext}  />} />
              <SettingRow icon="⬛" label="Picture-in-Picture"  sub="Float player while browsing"   right={<Toggle on={pip}       onChange={setPip}       />} noBorder />
            </SectionCard>
          </div>
        )}

        {/* DEVICES */}
        {tab === "devices" && (
          <div>
            <SectionCard title="Active Devices" titleRight={<span style={{ fontSize: 12, color: RED, fontWeight: 600 }}>3/4 used</span>}>
              <div style={{ display: "flex", gap: 4, margin: "8px 0 14px" }}>
                {[0,1,2,3].map(i => <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < 3 ? RED : "#1a1a26" }} />)}
              </div>
              {[
                { icon:"📱", name:"Samsung Galaxy S25", loc:"Mumbai · Now",    active:true  },
                { icon:"💻", name:'MacBook Pro 16"',    loc:"Mumbai · 2h ago", active:false },
                { icon:"📺", name:"Samsung Smart TV",   loc:"Home · Yesterday",active:false },
              ].map((d, i, arr) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 10,
                    background: d.active ? `${RED}18` : "rgba(255,255,255,.04)",
                    border: `1px solid ${d.active ? RED : BORDER}`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0, position: "relative"
                  }}>
                    {d.icon}
                    {d.active && <div style={{ position: "absolute", top: -2, right: -2, width: 9, height: 9, borderRadius: "50%", background: "#00c853", border: "2px solid #07070c" }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{d.loc}</div>
                  </div>
                  {d.active
                    ? <span style={{ background: "#00c85322", color: "#00c853", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>THIS DEVICE</span>
                    : <button onClick={() => showToast("Device removed")} style={{ background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)", color: "#f87171", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Remove</button>
                  }
                </div>
              ))}
            </SectionCard>
          </div>
        )}

        {/* PARENTAL */}
        {tab === "parental" && (
          <div>
            <SectionCard title="Content Rating">
              <div style={{ padding: "8px 0 12px", borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Maximum rating allowed</div>
                <ChipSelect options={["U (All Ages)","U/A 7+","U/A 13+","U/A 16+","A (Adults)"]} value={maturity} onChange={setMaturity} />
              </div>
              <SettingRow icon="🧸" label="Kids Mode" sub="Show only U-rated content" right={<Toggle on={kidsMode} onChange={setKidsMode} color="#84cc16" />} noBorder />
            </SectionCard>
            <SectionCard title="Profile PIN">
              <SettingRow icon="🔒" label="Enable PIN" sub="Require PIN to access locked profiles" right={<Toggle on={pinEnabled} onChange={setPinEnabled} />} />
              {pinEnabled && (
                <div style={{ padding: "14px 0 10px" }}>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>Enter 4-digit PIN</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {pin.map((v, i) => (
                      <input key={i} value={v} maxLength={1} type="password"
                        onChange={e => handlePinChange(i, e.target.value)}
                        style={{
                          width: 50, height: 50, borderRadius: 10, textAlign: "center",
                          background: "rgba(255,255,255,.06)", border: `1.5px solid ${v ? RED : BORDER}`,
                          color: "#fff", fontSize: 22, outline: "none", fontFamily: "inherit"
                        }} />
                    ))}
                  </div>
                </div>
              )}
              <SettingRow icon="🔑" label="Forgot PIN?" sub="Reset via registered email" onClick={() => showToast("Reset link sent!")} noBorder />
            </SectionCard>
          </div>
        )}

        {/* NOTIFICATIONS */}
        {tab === "notifications" && (
          <div>
            <SectionCard title="Push Notifications">
              <SettingRow icon="🔔" label="All Notifications"    right={<Toggle on={nPush}  onChange={setNPush}  />} />
              <SettingRow icon="🎬" label="New Releases"         sub="When a title you'll love drops" right={<Toggle on={nNew}   onChange={setNNew}   />} />
              <SettingRow icon="🔴" label="Live Event Alerts"    sub="IPL, F1, WWE go live"           right={<Toggle on={nLive}  onChange={setNLive}  />} noBorder />
            </SectionCard>
            <SectionCard title="Email & SMS">
              <SettingRow icon="📧" label="Email Newsletter"     sub="Highlights & exclusive offers"  right={<Toggle on={nEmail} onChange={setNEmail} />} />
              <SettingRow icon="📱" label="SMS Alerts"           sub="Billing & account alerts"       right={<Toggle on={nSms}   onChange={setNSms}   />} noBorder />
            </SectionCard>
          </div>
        )}

        {/* PRIVACY */}
        {tab === "privacy" && (
          <div>
            <SectionCard title="Watch History">
              <SettingRow icon="📋" label="Save Watch History"   right={<Toggle on={pHistory} onChange={setPHistory} />} />
              <SettingRow icon="🎯" label="Personalised Picks"   right={<Toggle on={pRec}     onChange={setPRec}     />} />
              <SettingRow icon="🗑️" label="Clear Watch History"  sub="Cannot be undone" onClick={() => showToast("History cleared!")} danger noBorder />
            </SectionCard>
            <SectionCard title="Data & Privacy">
              <SettingRow icon="🎯" label="Personalised Ads"     right={<Toggle on={pAds} onChange={setPAds} />} />
              <SettingRow icon="📦" label="Download My Data"     onClick={() => showToast("Data export requested!")} />
              <SettingRow icon="👁️" label="Privacy Policy"       onClick={() => {}} />
              <SettingRow icon="🚫" label="Delete Account"       sub="Permanently remove your account" onClick={() => showToast("Contact support to delete account")} danger noBorder />
            </SectionCard>
          </div>
        )}

        {/* HELP */}
        {tab === "help" && (
          <div>
            <SectionCard title="Support">
              <SettingRow icon="💬" label="Live Chat"     sub="Talk to our team now"        right={<span style={{ background: "#00c85322", color: "#00c853", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20 }}>Online</span>} onClick={() => showToast("Opening chat...")} />
              <SettingRow icon="📞" label="Call Support"  sub="1800-123-4567 (Toll Free)"   onClick={() => {}} />
              <SettingRow icon="📧" label="Email Support" sub="support@streamx.in"          onClick={() => {}} />
              <SettingRow icon="❓" label="FAQs"                                             onClick={() => {}} />
              <SettingRow icon="🐛" label="Report a Bug"                                    onClick={() => showToast("Bug reported! Thanks.")} noBorder />
            </SectionCard>
            <SectionCard title="App Info">
              <SettingRow icon="ℹ️" label="App Version" sub="StreamX v4.2.1" right={<span style={{ fontSize: 12, color: "#00c853", fontWeight: 600 }}>Up to date</span>} />
              <SettingRow icon="⭐" label="Rate StreamX" sub="Love the app? Leave a review!" onClick={() => showToast("Thanks for rating! ⭐")} noBorder />
            </SectionCard>
          </div>
        )}

        {/* Sign out */}
        <button onClick={() => { showToast("Signed out!"); setTimeout(() => onNavigate("home"), 1000); }} style={{
          width: "100%", background: "rgba(248,113,113,.08)",
          border: "1px solid rgba(248,113,113,.25)", color: "#f87171",
          borderRadius: 12, padding: "14px 0", fontFamily: "inherit",
          fontSize: 14, fontWeight: 700, cursor: "pointer", marginTop: 8
        }}>Sign Out of All Devices</button>

      </div>
    </div>
  );
}
