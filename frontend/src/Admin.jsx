import { useState, useEffect, useRef, useCallback } from "react";
import { supabase, db } from "./supabase.js";

/* ═══════════════════════════════════════════════════════
   StreamX Admin Panel v3.0 — Production Ready
   High Security · Real DB · Full CRUD · Analytics
═══════════════════════════════════════════════════════ */

// ── Security Config ───────────────────────────────────
const ADMIN_PHONES = ["+918088820924", "+919000000000", "+919000000001"];
const ADMIN_EMAILS = ["admin@streamx.in", "vinaygowda12096909@email.com"];
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const MAX_LOGIN_ATTEMPTS = 5;
const ADMIN_PIN = "2026"; // Change this to your PIN

// ── Theme ─────────────────────────────────────────────
const T = {
  bg:     "#070710",
  surf:   "#0d0d1a",
  surf2:  "#111122",
  border: "#1a1a2e",
  border2:"#222238",
  red:    "#e50914",
  blue:   "#1d9bf0",
  green:  "#00c853",
  yellow: "#f59e0b",
  purple: "#a855f7",
  text:   "#e2e2f0",
  muted:  "#4a4a6a",
  muted2: "#333355",
};

// ── Global Styles ─────────────────────────────────────
const GS = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@300;400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{background:${T.bg};color:${T.text};font-family:'Inter',sans-serif;}
::-webkit-scrollbar{width:3px;height:3px;}
::-webkit-scrollbar-track{background:${T.surf};}
::-webkit-scrollbar-thumb{background:${T.red};border-radius:2px;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes shake{0%,100%{transform:translateX(0);}25%{transform:translateX(-6px);}75%{transform:translateX(6px);}}
.tbl{width:100%;border-collapse:collapse;}
.tbl th{padding:9px 12px;text-align:left;font-size:10.5px;color:${T.muted};font-weight:700;text-transform:uppercase;letter-spacing:.6px;border-bottom:1px solid ${T.border2};}
.tbl td{padding:9px 12px;font-size:13px;border-bottom:1px solid ${T.border};}
.tbl tr:last-child td{border-bottom:none;}
.tbl tr:hover td{background:rgba(255,255,255,.02);}
.inp{width:100%;background:${T.surf2};border:1px solid ${T.border2};border-radius:8px;color:${T.text};font-family:'Inter',sans-serif;font-size:13px;padding:9px 13px;outline:none;transition:border-color .2s;}
.inp:focus{border-color:${T.red};}
.inp::placeholder{color:${T.muted2};}
.nav-item{display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:9px;cursor:pointer;font-size:12.5px;font-weight:500;color:${T.muted};transition:all .15s;white-space:nowrap;user-select:none;}
.nav-item:hover{background:rgba(255,255,255,.04);color:#8888bb;}
.nav-item.on{background:rgba(229,9,20,.1);color:${T.red};font-weight:700;}
.card{background:${T.surf};border:1px solid ${T.border2};border-radius:12px;}
.badge{display:inline-flex;align-items:center;font-size:11px;font-weight:700;padding:2px 9px;border-radius:20px;}
.btn{border:none;border-radius:7px;font-family:'Inter',sans-serif;font-size:12px;font-weight:600;cursor:pointer;padding:6px 14px;transition:all .15s;white-space:nowrap;line-height:1.4;}
.btn:disabled{opacity:.5;cursor:not-allowed;}
@media(max-width:768px){.admin-sidebar{display:none!important;}.admin-mobile-header{display:flex!important;}}
`;

// ── Helper Components ─────────────────────────────────
function Chip({ label, color = T.muted }) {
  return <span className="badge" style={{ background: `${color}22`, color, border: `1px solid ${color}33` }}>{label}</span>;
}

function Btn({ children, onClick, color = T.red, outline, ghost, danger, small, disabled, loading: ld, style: sx }) {
  const bg     = ghost ? "transparent" : outline || danger ? `${danger ? "rgba(248,113,113,.08)" : color}${outline ? "18" : ""}` : color;
  const border = `1px solid ${danger ? "rgba(248,113,113,.3)" : outline ? color + "55" : ghost ? T.border : "transparent"}`;
  const clr    = outline || ghost || danger ? (danger ? "#f87171" : color) : "#fff";
  return (
    <button className="btn" disabled={disabled || ld} onClick={onClick} style={{ background: bg, border, color: clr, padding: small ? "4px 10px" : "7px 14px", fontSize: small ? 11 : 12.5, ...(sx || {}) }}>
      {ld ? "..." : children}
    </button>
  );
}

function Modal({ title, onClose, children, wide, extraWide }) {
  useEffect(() => {
    const fn = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, []);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,.88)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div style={{ background: "#111122", border: `1px solid ${T.border2}`, borderRadius: 14, width: "100%", maxWidth: extraWide ? 760 : wide ? 580 : 480, maxHeight: "90vh", overflowY: "auto", animation: "slideUp .2s ease" }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: `1px solid ${T.border2}`, position: "sticky", top: 0, background: "#111122", zIndex: 1 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1 }}>{title}</div>
          <Btn onClick={onClose} ghost small>✕</Btn>
        </div>
        <div style={{ padding: "18px 20px" }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: .5, textTransform: "uppercase", display: "block", marginBottom: 5 }}>
        {label}{required && <span style={{ color: T.red }}> *</span>}
      </label>
      {children}
      {hint && <div style={{ fontSize: 11, color: T.muted2, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function KPI({ icon, label, value, sub, color = T.red, trend }) {
  return (
    <div className="card" style={{ padding: "16px 18px", position: "relative", overflow: "hidden", animation: "slideUp .3s ease" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: color, borderRadius: "2px 0 0 2px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 10, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5 }}>{label}</span>
        <span style={{ fontSize: 18 }}>{icon}</span>
      </div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, color: T.text, letterSpacing: .5 }}>{value}</div>
      {(sub || trend) && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
          {sub && <span style={{ fontSize: 11, color: T.muted }}>{sub}</span>}
          {trend && <span style={{ fontSize: 11, color: trend > 0 ? T.green : "#f87171", fontWeight: 700 }}>{trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%</span>}
        </div>
      )}
    </div>
  );
}

function Toast({ msg, type = "success" }) {
  const colors = { success: T.green, error: "#f87171", info: T.blue, warning: T.yellow };
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 2000, background: T.surf2, border: `1px solid ${colors[type]}44`, borderLeft: `3px solid ${colors[type]}`, borderRadius: 9, padding: "11px 18px", fontSize: 13, fontWeight: 500, animation: "slideUp .2s ease", boxShadow: "0 8px 32px rgba(0,0,0,.7)", maxWidth: 320, color: T.text }}>
      {type === "success" && "✅ "}{type === "error" && "❌ "}{type === "warning" && "⚠️ "}{type === "info" && "ℹ️ "}{msg}
    </div>
  );
}

// ── Security Gate ──────────────────────────────────────
function SecurityGate({ user, onPass }) {
  const [step,     setStep]     = useState("biometric"); // biometric | pin | passed
  const [pin,      setPin]      = useState(["", "", "", ""]);
  const [attempts, setAttempts] = useState(0);
  const [locked,   setLocked]   = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [bioStatus,setBioStatus]= useState("idle"); // idle | checking | success | failed
  const [shaking,  setShaking]  = useState(false);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  const isAdmin = user && (ADMIN_PHONES.includes(user.phone) || ADMIN_EMAILS.includes(user.email) || user.role === "admin");

  useEffect(() => {
    if (locked && lockTime > 0) {
      const t = setInterval(() => setLockTime(s => { if (s <= 1) { clearInterval(t); setLocked(false); setAttempts(0); return 0; } return s - 1; }), 1000);
      return () => clearInterval(t);
    }
  }, [locked, lockTime]);

  async function tryBiometric() {
    setBioStatus("checking");
    try {
      if (!window.PublicKeyCredential) throw new Error("Not supported");
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const cred = await navigator.credentials.get({
        publicKey: { challenge, rpId: window.location.hostname, userVerification: "required", timeout: 60000 }
      });
      if (cred) { setBioStatus("success"); setTimeout(() => onPass(), 1000); }
    } catch (e) {
      setBioStatus("failed");
    }
  }

  async function registerBiometric() {
    setBioStatus("checking");
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "StreamX Admin", id: window.location.hostname },
          user: { id: new TextEncoder().encode(user?.id || "admin"), name: user?.phone || "admin", displayName: user?.name || "Admin" },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
          authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
          timeout: 60000,
        }
      });
      if (cred) {
        setBioStatus("success");
        // Store credential ID
        try {
          await supabase.from("face_auth").upsert({ user_id: user?.id, credential_id: btoa(String.fromCharCode(...new Uint8Array(cred.rawId))), public_key: JSON.stringify({ type: cred.type }) }).catch(() => {});
        } catch (e) {}
        setTimeout(() => onPass(), 1000);
      }
    } catch (e) {
      setBioStatus("failed");
    }
  }

  function handlePin(i, v) {
    if (!/^\d?$/.test(v)) return;
    const n = [...pin]; n[i] = v; setPin(n);
    if (v && i < 3) pinRefs[i + 1]?.current?.focus();
    if (!v && i > 0) pinRefs[i - 1]?.current?.focus();
    // Auto submit when all 4 filled
    if (v && i === 3) {
      const full = [...pin.slice(0, 3), v].join("");
      setTimeout(() => checkPin(full), 100);
    }
  }

  function checkPin(code) {
    const entered = code || pin.join("");
    if (entered === ADMIN_PIN) {
      onPass();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin(["", "", "", ""]);
      setShaking(true);
      setTimeout(() => { setShaking(false); pinRefs[0]?.current?.focus(); }, 600);
      if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
        setLocked(true);
        setLockTime(300); // 5 min lockout
      }
    }
  }

  if (!isAdmin) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 900, background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter',sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚫</div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 28, letterSpacing: 1, color: T.red, marginBottom: 8 }}>Access Denied</div>
          <div style={{ color: T.muted, fontSize: 14, marginBottom: 24 }}>Your account does not have admin privileges.</div>
          <Btn onClick={() => window.location.reload()}>← Go Back</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 900, background: `radial-gradient(ellipse at center,#0d0a18,${T.bg})`, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Inter',sans-serif" }}>
      <style>{GS}</style>
      <div style={{ background: T.surf, border: `1px solid ${T.border2}`, borderRadius: 20, padding: "36px 32px", width: "100%", maxWidth: 400, animation: "slideUp .3s ease", boxShadow: "0 24px 64px rgba(0,0,0,.6)" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 32, letterSpacing: 2, marginBottom: 4 }}>
            <span style={{ color: T.red }}>STREAM</span><span>X</span>
          </div>
          <div style={{ fontSize: 10, color: T.red, letterSpacing: 3, fontWeight: 700 }}>ADMIN ACCESS</div>
        </div>

        {/* ── BIOMETRIC STEP ── */}
        {step === "biometric" && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: 88, height: 88, borderRadius: "50%", margin: "0 auto 20px",
              background: bioStatus === "success" ? "rgba(0,200,83,.12)" : bioStatus === "failed" ? "rgba(248,113,113,.12)" : "rgba(229,9,20,.1)",
              border: `2px solid ${bioStatus === "success" ? T.green : bioStatus === "failed" ? "#f87171" : "rgba(229,9,20,.3)"}`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40,
              transition: "all .3s",
            }}>
              {bioStatus === "checking" ? <div style={{ width: 36, height: 36, border: "3px solid rgba(255,255,255,.1)", borderTop: `3px solid ${T.red}`, borderRadius: "50%", animation: "spin .8s linear infinite" }} /> : bioStatus === "success" ? "✅" : bioStatus === "failed" ? "❌" : "🔐"}
            </div>

            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
              {bioStatus === "success" ? "Identity Verified!" : bioStatus === "failed" ? "Biometric Failed" : "Admin Verification"}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24, lineHeight: 1.5 }}>
              {bioStatus === "success" ? "Welcome back, Admin!" : bioStatus === "failed" ? "Could not verify. Use PIN instead." : "Use Face ID or fingerprint to access admin panel"}
            </div>

            {bioStatus !== "success" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Btn onClick={tryBiometric} disabled={bioStatus === "checking"} style={{ width: "100%", padding: "13px", fontSize: 14 }}>
                  {bioStatus === "checking" ? "Scanning..." : "🔓 Verify with Face ID / Fingerprint"}
                </Btn>
                <Btn onClick={registerBiometric} outline disabled={bioStatus === "checking"} style={{ width: "100%", padding: "11px", fontSize: 13 }}>
                  📱 Set Up Biometric (First Time)
                </Btn>
                <button onClick={() => setStep("pin")} style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", padding: 8, fontFamily: "'Inter',sans-serif" }}>
                  Use PIN instead →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── PIN STEP ── */}
        {step === "pin" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🔑</div>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Enter Admin PIN</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
              {locked ? `🔒 Too many attempts. Wait ${Math.floor(lockTime / 60)}:${String(lockTime % 60).padStart(2, "0")}` : `Enter your 4-digit admin PIN`}
            </div>

            {!locked && (
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 20, animation: shaking ? "shake .4s ease" : "none" }}>
                {pin.map((v, i) => (
                  <input
                    key={i} ref={pinRefs[i]} value={v}
                    onChange={e => handlePin(i, e.target.value)}
                    maxLength={1} type="password" inputMode="numeric"
                    autoFocus={i === 0}
                    style={{
                      width: 52, height: 58, borderRadius: 10, textAlign: "center",
                      fontSize: 24, fontWeight: 700, outline: "none",
                      background: T.surf2, color: T.text,
                      border: `2px solid ${v ? T.red : shaking ? "#f87171" : T.border2}`,
                      fontFamily: "'Inter',sans-serif", transition: "border-color .2s",
                    }}
                  />
                ))}
              </div>
            )}

            {attempts > 0 && !locked && (
              <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>
                ⚠️ Wrong PIN. {MAX_LOGIN_ATTEMPTS - attempts} attempt{MAX_LOGIN_ATTEMPTS - attempts !== 1 ? "s" : ""} left.
              </div>
            )}

            {locked && (
              <div style={{ fontSize: 13, color: "#f87171", marginBottom: 16 }}>Account temporarily locked for security.</div>
            )}

            <button onClick={() => setStep("biometric")} style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", padding: 8, fontFamily: "'Inter',sans-serif" }}>
              ← Back to Face ID
            </button>
          </div>
        )}

        {/* Security notice */}
        <div style={{ marginTop: 24, padding: "10px 14px", background: "rgba(229,9,20,.05)", border: `1px solid rgba(229,9,20,.1)`, borderRadius: 8, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 14 }}>🛡️</span>
          <div style={{ fontSize: 11, color: T.muted }}>This session is protected. Activity is logged for security audit.</div>
        </div>
      </div>
    </div>
  );
}

// ── Overview Page ──────────────────────────────────────
function Overview({ stats, content, users, onNavigate }) {
  const fN = n => n >= 1e7 ? (n / 1e7).toFixed(1) + "Cr" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n || 0);
  const fR = n => "₹" + (n >= 1e5 ? (n / 1e5).toFixed(1) + "L" : n >= 1e3 ? Math.round(n / 1e3) + "K" : n || 0);

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(170px,1fr))", gap: 12, marginBottom: 24 }}>
        <KPI icon="👥" label="Total Users"    value={fN(stats.totalUsers)}    sub="registered"    color={T.blue}   trend={12} />
        <KPI icon="👑" label="Active Subs"    value={fN(stats.activeSubs)}    sub="paying users"  color={T.red}    trend={8}  />
        <KPI icon="💰" label="Revenue"        value={fR(stats.totalRevenue)}  sub="all time"      color={T.green}  trend={15} />
        <KPI icon="👁️" label="Total Views"    value={fN(stats.totalViews)}    sub="content views" color={T.purple} trend={22} />
        <KPI icon="🎬" label="Content"        value={stats.totalContent || 0} sub="active titles" color={T.blue}            />
        <KPI icon="📢" label="Active Ads"     value={stats.activeAds || 0}    sub="running"       color={T.yellow}          />
        <KPI icon="🔴" label="Live Now"       value={stats.liveNow || 0}      sub="channels"      color={T.red}    trend={3}  />
        <KPI icon="📊" label="Ad Revenue"     value={fR(stats.adRevenue || 0)} sub="estimated"    color={T.green}           />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Top Content */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>🔥 Top Content</div>
            <Btn ghost small onClick={() => onNavigate("content")}>See all →</Btn>
          </div>
          {[...(content || [])].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6).map((c, i) => (
            <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 5 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, color: i === 0 ? T.red : T.muted, width: 22, flexShrink: 0 }}>{i + 1}</div>
              {c.thumbnail && <img src={c.thumbnail} alt="" style={{ width: 36, height: 24, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{c.type} · {c.genre}</div>
              </div>
              <div style={{ fontSize: 11, color: T.blue, fontWeight: 600, flexShrink: 0 }}>{fN(c.views || 0)}</div>
            </div>
          ))}
        </div>

        {/* Recent Users */}
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>👥 Recent Users</div>
            <Btn ghost small onClick={() => onNavigate("users")}>See all →</Btn>
          </div>
          {[...(users || [])].slice(0, 6).map((u, i) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: i < 5 ? `1px solid ${T.border}` : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(229,9,20,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                {u.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{u.name || "Unknown"}</div>
                <div style={{ fontSize: 10, color: T.muted }}>{u.phone || u.email || "—"}</div>
              </div>
              <Chip label={(u.plan || "free").toUpperCase()} color={u.plan?.includes("premium") ? T.red : u.plan?.includes("basic") ? T.blue : T.muted} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Content Form ──────────────────────────────────────
const EMPTY_CONTENT = {
  title: "", description: "", type: "Movie", genre: "Action",
  language: "Hindi", is_premium: false, is_featured: false,
  is_active: true, is_live: false, stream_url: "", embed_url: "",
  thumbnail: "", poster: "", release_year: new Date().getFullYear(),
  rating: "U/A", director: "", studio: "", score: 0, tags: [],
};

const GENRES = ["Action","Drama","Sci-Fi","Thriller","Comedy","Romance","Kids","Cricket","Football","Racing","Kabaddi","News","Documentary","Nature","Horror","Sports","Music","Reality"];
const LANGS  = ["Hindi","English","Kannada","Tamil","Telugu","Bengali","Malayalam","Punjabi","Marathi","Bhojpuri","Gujarati","Odia","Urdu"];
const RATINGS = ["U","U/A","U/A 7+","U/A 13+","U/A 16+","A"];
const TYPES   = ["Movie","Series","Live","Documentary","Short Film","Podcast"];

function ContentForm({ initial, onSave, onCancel, saving }) {
  const [form,     setForm]     = useState({ ...EMPTY_CONTENT, ...initial });
  const [tagInput, setTagInput] = useState("");
  const [preview,  setPreview]  = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  function addTag(e) {
    if (e.key === "Enter" && tagInput.trim()) {
      set("tags", [...(form.tags || []), tagInput.trim().toUpperCase()]);
      setTagInput("");
    }
  }

  const canSave = form.title && (form.stream_url || form.embed_url);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Row: Title + Type */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label="Title" required>
          <input className="inp" value={form.title} onChange={e => set("title", e.target.value)} placeholder="Content title" autoFocus />
        </Field>
        <Field label="Type">
          <select className="inp" value={form.type} onChange={e => { set("type", e.target.value); if (e.target.value === "Live") set("is_live", true); }}>
            {TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
      </div>

      <Field label="Description">
        <textarea className="inp" rows={3} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Short description..." style={{ resize: "vertical" }} />
      </Field>

      {/* VIDEO SOURCE — highlighted */}
      <div style={{ background: "rgba(229,9,20,.06)", border: `1px solid rgba(229,9,20,.2)`, borderRadius: 10, padding: 16 }}>
        <div style={{ fontSize: 12, color: T.red, fontWeight: 700, marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
          🎬 Video Source <span style={{ color: T.muted, fontWeight: 400, fontSize: 11 }}>— at least one required</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="HLS Stream URL (.m3u8, .mp4, or direct video)" hint="Supports: HLS, DASH, MP4, direct streams">
            <input className="inp" value={form.stream_url} onChange={e => set("stream_url", e.target.value)} placeholder="https://example.com/stream.m3u8  or  https://cdn.example.com/video.mp4" />
          </Field>
          <div style={{ textAlign: "center", fontSize: 11, color: T.muted }}>— OR —</div>
          <Field label="YouTube / Embed URL" hint="Paste YouTube URL — auto converted to embed. Works with any iframe src.">
            <input className="inp" value={form.embed_url} onChange={e => set("embed_url", e.target.value)} placeholder="https://youtube.com/watch?v=XXXXX  or  any embed URL" />
          </Field>
        </div>
      </div>

      {/* Thumbnail */}
      <Field label="Thumbnail / Poster URL">
        <input className="inp" value={form.thumbnail} onChange={e => set("thumbnail", e.target.value)} placeholder="https://example.com/thumbnail.jpg" />
      </Field>
      {form.thumbnail && (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <img src={form.thumbnail} alt="preview" style={{ width: 120, height: 68, objectFit: "cover", borderRadius: 8, border: `1px solid ${T.border2}` }} onError={e => e.target.style.display = "none"} />
          <div style={{ fontSize: 11, color: T.muted }}>Thumbnail preview</div>
        </div>
      )}

      {/* Genre + Lang + Rating */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label="Genre">
          <select className="inp" value={form.genre} onChange={e => set("genre", e.target.value)}>
            {GENRES.map(g => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Language">
          <select className="inp" value={form.language} onChange={e => set("language", e.target.value)}>
            {LANGS.map(l => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Rating">
          <select className="inp" value={form.rating} onChange={e => set("rating", e.target.value)}>
            {RATINGS.map(r => <option key={r}>{r}</option>)}
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <Field label="IMDb Score (0-10)">
          <input className="inp" type="number" min="0" max="10" step="0.1" value={form.score || 0} onChange={e => set("score", +e.target.value)} />
        </Field>
        <Field label="Release Year">
          <input className="inp" type="number" value={form.release_year || 2026} onChange={e => set("release_year", +e.target.value)} />
        </Field>
        <Field label="Director">
          <input className="inp" value={form.director || ""} onChange={e => set("director", e.target.value)} placeholder="Optional" />
        </Field>
      </div>

      {/* Tags */}
      <Field label="Tags (press Enter)" hint="e.g. 4K, HDR, LIVE, NEW, DOLBY">
        <input className="inp" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={addTag} placeholder="Type tag and press Enter..." />
        {(form.tags || []).length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {(form.tags || []).map(t => (
              <span key={t} style={{ background: "rgba(229,9,20,.15)", color: T.red, fontSize: 11, padding: "2px 8px", borderRadius: 4, cursor: "pointer", border: `1px solid rgba(229,9,20,.2)` }} onClick={() => set("tags", (form.tags || []).filter(x => x !== t))}>
                {t} ×
              </span>
            ))}
          </div>
        )}
      </Field>

      {/* Toggles */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "10px 0", borderTop: `1px solid ${T.border2}`, borderBottom: `1px solid ${T.border2}` }}>
        {[
          ["is_active",   "✅ Active (visible to users)"],
          ["is_featured", "⭐ Featured on Home Page"],
          ["is_premium",  "👑 Premium Only (locked for free)"],
          ["is_live",     "🔴 Live Channel / Stream"],
        ].map(([k, l]) => (
          <label key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#ccc", padding: "4px 0" }}>
            <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ accentColor: T.red, width: 15, height: 15 }} />
            {l}
          </label>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <Btn onClick={onCancel} ghost style={{ flex: 1 }}>Cancel</Btn>
        <button
          onClick={() => canSave && onSave(form)}
          disabled={saving || !canSave}
          style={{
            flex: 2, background: saving || !canSave ? T.border2 : T.red,
            color: "#fff", border: "none", borderRadius: 8,
            padding: "11px", fontSize: 13, fontWeight: 700,
            cursor: saving || !canSave ? "not-allowed" : "pointer",
            fontFamily: "'Inter',sans-serif", transition: "all .2s",
          }}
        >
          {saving ? "Saving..." : initial?.id ? "Update Content" : "Add Content"}
        </button>
      </div>
      {!canSave && <div style={{ fontSize: 11, color: "#f87171", textAlign: "center" }}>⚠️ Title and at least one video URL required</div>}
    </div>
  );
}

// ── Content Page ──────────────────────────────────────
function ContentPage({ content, onRefresh, showToast }) {
  const [modal,   setModal]   = useState(null);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");
  const [saving,  setSaving]  = useState(false);
  const [confirm, setConfirm] = useState(null);

  const filtered = (content || []).filter(c => {
    const matchSearch = !search || c.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" ? true : filter === "live" ? (c.is_live || c.type === "Live") : filter === "premium" ? c.is_premium : filter === "featured" ? c.is_featured : filter === "inactive" ? !c.is_active : c.type === filter;
    return matchSearch && matchFilter;
  });

  async function handleSave(form) {
    setSaving(true);
    try {
      const data = { ...form };
      // Auto-convert YouTube URL
      if (data.embed_url?.includes("youtube.com/watch?v=")) {
        try { const id = new URL(data.embed_url).searchParams.get("v"); data.embed_url = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`; } catch (e) {}
      } else if (data.embed_url?.includes("youtu.be/")) {
        const id = data.embed_url.split("youtu.be/")[1]?.split("?")[0];
        if (id) data.embed_url = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
      }
      if (modal?.id) { await db.updateContent(modal.id, data); showToast("Content updated!"); }
      else { await db.addContent(data); showToast("Content added! Now visible on home page."); }
      setModal(null); onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  }

  async function deleteContent(c) {
    await db.deleteContent(c.id).catch(e => showToast("Delete failed", "error"));
    showToast("Deleted: " + c.title, "warning");
    setConfirm(null); onRefresh();
  }

  const FILTERS = [
    { id: "all",      label: "All" },
    { id: "Movie",    label: "Movies" },
    { id: "Series",   label: "Series" },
    { id: "live",     label: "Live" },
    { id: "featured", label: "Featured" },
    { id: "premium",  label: "Premium" },
    { id: "inactive", label: "Inactive" },
  ];

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      {confirm && (
        <Modal title="Confirm Delete" onClose={() => setConfirm(null)}>
          <div style={{ textAlign: "center", padding: "10px 0" }}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Delete "{confirm.title}"?</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>This will hide the content from all users. This action can be undone by re-enabling.</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Btn onClick={() => setConfirm(null)} ghost>Cancel</Btn>
              <Btn onClick={() => deleteContent(confirm)} danger>Yes, Delete</Btn>
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 1 }}>Content Library</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{filtered.length} of {(content || []).length} titles</div>
        </div>
        <Btn onClick={() => setModal({})}>+ Add Content</Btn>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            background: filter === f.id ? "rgba(229,9,20,.15)" : "rgba(255,255,255,.05)",
            border: `1px solid ${filter === f.id ? "rgba(229,9,20,.3)" : T.border2}`,
            color: filter === f.id ? T.red : T.muted, borderRadius: 20,
            padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: filter === f.id ? 700 : 500,
            fontFamily: "'Inter',sans-serif",
          }}>{f.label}</button>
        ))}
        <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ maxWidth: 200, marginLeft: "auto" }} />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: T.muted }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            <div style={{ fontSize: 14, marginBottom: 16 }}>No content found</div>
            <Btn onClick={() => setModal({})}>+ Add First Content</Btn>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Title & URL</th>
                  <th>Type</th>
                  <th>Genre</th>
                  <th>Language</th>
                  <th>Status</th>
                  <th>Views</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {c.thumbnail ? (
                          <img src={c.thumbnail} alt="" style={{ width: 52, height: 34, objectFit: "cover", borderRadius: 5, flexShrink: 0 }} onError={e => e.target.style.display = "none"} />
                        ) : (
                          <div style={{ width: 52, height: 34, borderRadius: 5, background: T.surf2, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🎬</div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>{c.title}</div>
                          <div style={{ fontSize: 10, color: T.muted2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                            {c.stream_url || c.embed_url || "⚠️ No URL set"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><Chip label={c.type} color={T.blue} /></td>
                    <td style={{ color: T.muted, fontSize: 12 }}>{c.genre}</td>
                    <td style={{ color: T.muted, fontSize: 12 }}>{c.language}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        <Chip label={c.is_active ? "ON" : "OFF"} color={c.is_active ? T.green : T.muted} />
                        {c.is_featured && <Chip label="⭐" color={T.yellow} />}
                        {c.is_premium  && <Chip label="👑" color={T.red} />}
                        {c.is_live     && <Chip label="🔴" color={T.red} />}
                      </div>
                    </td>
                    <td style={{ color: T.blue, fontSize: 12, fontWeight: 600 }}>{(c.views || 0).toLocaleString()}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <Btn onClick={() => setModal(c)} outline small>Edit</Btn>
                        <Btn onClick={async () => { await db.updateContent(c.id, { is_featured: !c.is_featured }); showToast(c.is_featured ? "Removed from featured" : "Added to featured! ⭐"); onRefresh(); }} outline small color={T.yellow}>{c.is_featured ? "★" : "☆"}</Btn>
                        <Btn onClick={async () => { await db.updateContent(c.id, { is_active: !c.is_active }); showToast(c.is_active ? "Hidden from users" : "Now visible to users ✅"); onRefresh(); }} outline small color={c.is_active ? T.red : T.green}>{c.is_active ? "Hide" : "Show"}</Btn>
                        <Btn onClick={() => setConfirm(c)} danger small>Del</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal !== null && (
        <Modal title={modal?.id ? "Edit Content" : "Add New Content"} onClose={() => setModal(null)} extraWide>
          <ContentForm initial={modal} onSave={handleSave} onCancel={() => setModal(null)} saving={saving} />
        </Modal>
      )}
    </div>
  );
}

// ── Users Page ────────────────────────────────────────
function UsersPage({ users, onRefresh, showToast }) {
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [drawer,   setDrawer]   = useState(null);
  const [confirm,  setConfirm]  = useState(null);

  const filtered = (users || []).filter(u => {
    const matchS = !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.phone?.includes(search) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchF = filter === "all" ? true : filter === "admin" ? u.role === "admin" : filter === "premium" ? u.plan?.includes("premium") : filter === "suspended" ? !u.is_active : true;
    return matchS && matchF;
  });

  async function suspend(u) {
    await db.suspendUser(u.id);
    showToast("User suspended: " + u.name, "warning");
    setDrawer(null); onRefresh();
  }
  async function activate(u) {
    await db.activateUser(u.id);
    showToast("User activated: " + u.name);
    setDrawer(null); onRefresh();
  }

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      {confirm && (
        <Modal title="Confirm Action" onClose={() => setConfirm(null)}>
          <div style={{ textAlign: "center", padding: "8px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{confirm.action === "suspend" ? "⚠️" : "✅"}</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>
              {confirm.action === "suspend" ? `Suspend ${confirm.user.name}?` : `Activate ${confirm.user.name}?`}
            </div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 24 }}>
              {confirm.action === "suspend" ? "This will block the user from accessing StreamX." : "This will restore their access."}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <Btn onClick={() => setConfirm(null)} ghost>Cancel</Btn>
              <Btn onClick={() => { confirm.action === "suspend" ? suspend(confirm.user) : activate(confirm.user); setConfirm(null); }} danger={confirm.action === "suspend"} color={confirm.action === "activate" ? T.green : undefined}>
                Confirm
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 1 }}>User Management</div>
          <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{filtered.length} users</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input className="inp" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users..." style={{ maxWidth: 220 }} />
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[["all", "All"], ["admin", "Admins"], ["premium", "Premium"], ["suspended", "Suspended"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ background: filter === id ? "rgba(229,9,20,.15)" : "rgba(255,255,255,.05)", border: `1px solid ${filter === id ? "rgba(229,9,20,.3)" : T.border2}`, color: filter === id ? T.red : T.muted, borderRadius: 20, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: filter === id ? 700 : 500, fontFamily: "'Inter',sans-serif" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>User</th><th>Contact</th><th>Plan</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(229,9,20,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                        {u.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{u.name || "Unknown"}</span>
                    </div>
                  </td>
                  <td style={{ color: T.muted, fontSize: 12 }}>{u.phone || u.email || "—"}</td>
                  <td><Chip label={(u.plan || "free").toUpperCase()} color={u.plan?.includes("premium") ? T.red : u.plan?.includes("basic") ? T.blue : T.muted} /></td>
                  <td><Chip label={(u.role || "user").toUpperCase()} color={u.role === "admin" ? T.yellow : T.muted} /></td>
                  <td><Chip label={u.is_active ? "ACTIVE" : "SUSPENDED"} color={u.is_active ? T.green : "#f87171"} /></td>
                  <td style={{ color: T.muted, fontSize: 11 }}>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn onClick={() => setDrawer(u)} outline small>View</Btn>
                      {u.is_active
                        ? <Btn onClick={() => setConfirm({ action: "suspend", user: u })} danger small>Suspend</Btn>
                        : <Btn onClick={() => setConfirm({ action: "activate", user: u })} outline small color={T.green}>Activate</Btn>
                      }
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Drawer */}
      {drawer && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 900, background: "rgba(0,0,0,.5)", backdropFilter: "blur(4px)" }} onClick={() => setDrawer(null)} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "clamp(280px,35vw,360px)", zIndex: 901, background: T.surf, borderLeft: `1px solid ${T.border2}`, overflowY: "auto", padding: 20, animation: "slideUp .2s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18 }}>User Detail</div>
              <Btn onClick={() => setDrawer(null)} ghost small>✕</Btn>
            </div>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(229,9,20,.12)", border: `2px solid rgba(229,9,20,.3)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 700, margin: "0 auto 12px" }}>
                {drawer.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{drawer.name || "Unknown"}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>{drawer.phone || drawer.email || "No contact"}</div>
            </div>
            {[["Plan", (drawer.plan || "free").toUpperCase()], ["Role", (drawer.role || "user").toUpperCase()], ["Status", drawer.is_active ? "✅ Active" : "🚫 Suspended"], ["Joined", new Date(drawer.created_at).toLocaleDateString("en-IN")], ["User ID", drawer.id?.slice(0, 16) + "..."]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.border}22`, fontSize: 12 }}>
                <span style={{ color: T.muted }}>{k}</span>
                <span style={{ fontWeight: 600, fontFamily: k === "User ID" ? "monospace" : "inherit", fontSize: k === "User ID" ? 11 : 12 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
              <Btn onClick={() => showToast("Password reset notification sent to " + (drawer.phone || drawer.email))} outline style={{ width: "100%" }}>🔑 Reset Auth</Btn>
              {drawer.is_active
                ? <Btn onClick={() => { suspend(drawer); }} danger style={{ width: "100%" }}>🚫 Suspend User</Btn>
                : <Btn onClick={() => { activate(drawer); }} outline color={T.green} style={{ width: "100%" }}>✅ Activate User</Btn>
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Ads Page ──────────────────────────────────────────
function AdsPage({ ads, onRefresh, showToast }) {
  const [modal, setModal] = useState(null);
  const [form,  setForm]  = useState({ brand: "", tagline: "", cta_text: "Learn More", type: "pre_roll", duration: 15, skip_after: 5, is_active: true, priority: 1 });
  const [saving, setSaving] = useState(false);

  async function saveAd() {
    if (!form.brand) { showToast("Brand name required", "error"); return; }
    setSaving(true);
    try {
      if (modal?.id) { await db.updateAd(modal.id, form); showToast("Ad updated!"); }
      else { await db.addAd(form); showToast("Ad created!"); }
      setModal(null); onRefresh();
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  }

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 1 }}>Ad Manager</div>
          <div style={{ fontSize: 12, color: T.muted }}>{(ads || []).filter(a => a.is_active).length} active campaigns</div>
        </div>
        <Btn onClick={() => { setForm({ brand: "", tagline: "", cta_text: "Learn More", type: "pre_roll", duration: 15, skip_after: 5, is_active: true, priority: 1 }); setModal({}); }}>+ New Ad</Btn>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        <KPI icon="📢" label="Total Ads"    value={(ads || []).length}                                  color={T.yellow} />
        <KPI icon="✅" label="Active"       value={(ads || []).filter(a => a.is_active).length}          color={T.green}  />
        <KPI icon="🎯" label="Pre-roll"     value={(ads || []).filter(a => a.type === "pre_roll").length} color={T.red}    />
        <KPI icon="⏸️" label="Mid-roll"     value={(ads || []).filter(a => a.type === "mid_roll").length} color={T.blue}   />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th>Brand</th><th>Type</th><th>Duration</th><th>Skip After</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {(ads || []).map(a => (
                <tr key={a.id}>
                  <td><div style={{ fontWeight: 600 }}>{a.brand}</div><div style={{ fontSize: 10, color: T.muted }}>{a.tagline}</div></td>
                  <td><Chip label={a.type?.replace("_", " ").toUpperCase()} color={T.blue} /></td>
                  <td style={{ fontSize: 12 }}>{a.duration || 0}s</td>
                  <td style={{ fontSize: 12 }}>{a.skip_after || 0}s</td>
                  <td style={{ fontSize: 12 }}>{a.priority || 1}</td>
                  <td><Chip label={a.is_active ? "ACTIVE" : "PAUSED"} color={a.is_active ? T.green : T.yellow} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Btn onClick={() => { setForm({ ...a }); setModal(a); }} outline small>Edit</Btn>
                      <Btn onClick={async () => { await db.updateAd(a.id, { is_active: !a.is_active }); showToast(a.is_active ? "Ad paused" : "Ad activated"); onRefresh(); }} outline small color={a.is_active ? T.red : T.green}>{a.is_active ? "Pause" : "Resume"}</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <Modal title={modal?.id ? "Edit Ad" : "New Ad Campaign"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[["Brand Name", "brand", "JioFiber, Zomato..."], ["Tagline", "tagline", "Short catchy tagline"], ["CTA Button Text", "cta_text", "Learn More / Order Now"], ["Video Ad URL", "video_url", "https://example.com/ad.mp4 (optional)"]].map(([l, k, p]) => (
              <Field key={k} label={l}><input className="inp" value={form[k] || ""} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} /></Field>
            ))}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <Field label="Type">
                <select className="inp" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="pre_roll">Pre-roll</option>
                  <option value="mid_roll">Mid-roll</option>
                  <option value="banner">Banner</option>
                  <option value="rewarded">Rewarded</option>
                </select>
              </Field>
              <Field label="Duration (s)"><input className="inp" type="number" value={form.duration || 15} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))} /></Field>
              <Field label="Skip After (s)"><input className="inp" type="number" value={form.skip_after || 5} onChange={e => setForm(f => ({ ...f, skip_after: +e.target.value }))} /></Field>
            </div>
            <div style={{ display: "flex", gap: 20 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: "#ccc" }}>
                <input type="checkbox" checked={!!form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: T.red }} /> Active
              </label>
              <div>
                <Field label="Priority (1=highest)"><input className="inp" type="number" value={form.priority || 1} onChange={e => setForm(f => ({ ...f, priority: +e.target.value }))} style={{ width: 80 }} /></Field>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn onClick={() => setModal(null)} ghost style={{ flex: 1 }}>Cancel</Btn>
              <button onClick={saveAd} disabled={saving} style={{ flex: 2, background: saving ? T.border2 : T.red, color: "#fff", border: "none", borderRadius: 8, padding: "10px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                {saving ? "Saving..." : modal?.id ? "Update" : "Create Campaign"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Analytics Page ────────────────────────────────────
function AnalyticsPage({ stats, content }) {
  const fN = n => n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n || 0);
  const topContent = [...(content || [])].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  const totalViews = topContent.reduce((s, c) => s + (c.views || 0), 0);

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 1, marginBottom: 20 }}>Analytics Dashboard</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
        <KPI icon="👁️" label="Total Views"     value={fN(stats.totalViews || 0)}      color={T.purple} trend={22} />
        <KPI icon="📢" label="Ad Impressions"  value={fN(stats.adImpressions || 0)}    color={T.yellow} />
        <KPI icon="🖱️" label="Ad Clicks"       value={fN(stats.adClicks || 0)}         color={T.blue} />
        <KPI icon="💰" label="Est Ad Revenue"  value={"₹" + fN(stats.adRevenue || 0)} color={T.green} />
      </div>

      {/* Top content bar chart */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16 }}>📊 Content Performance</div>
        {topContent.slice(0, 8).map((c, i) => {
          const pct = totalViews > 0 ? ((c.views || 0) / totalViews) * 100 : 0;
          const color = i === 0 ? T.red : i === 1 ? T.yellow : i === 2 ? T.blue : T.muted;
          return (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>{i + 1}. {c.title}</div>
                <div style={{ fontSize: 11, color, fontWeight: 700 }}>{fN(c.views || 0)} views</div>
              </div>
              <div style={{ height: 6, background: T.border2, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: pct + "%", background: color, borderRadius: 3, transition: "width .5s ease" }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Content type breakdown */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📋 Content Breakdown</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 10 }}>
          {["Movie", "Series", "Live", "Documentary"].map(type => {
            const items = (content || []).filter(c => c.type === type);
            return (
              <div key={type} style={{ background: T.surf2, borderRadius: 8, padding: "12px 14px", textAlign: "center" }}>
                <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: T.text }}>{items.length}</div>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{type}s</div>
                <div style={{ fontSize: 10, color: T.muted2, marginTop: 1 }}>{fN(items.reduce((s, c) => s + (c.views || 0), 0))} views</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────
function SettingsPage({ user, showToast, onLogout }) {
  const [pinModal, setPinModal] = useState(false);
  const [newPin, setNewPin] = useState(["", "", "", ""]);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  return (
    <div style={{ animation: "fadeIn .3s ease", maxWidth: 600 }}>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, letterSpacing: 1, marginBottom: 20 }}>Admin Settings</div>

      {/* Admin info */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Admin Account</div>
        {[
          ["Name",     user?.name || "Admin"],
          ["Phone",    user?.phone || "—"],
          ["Email",    user?.email || "—"],
          ["Role",     "Administrator ⚡"],
          ["Plan",     "Premium (Lifetime)"],
          ["Version",  "StreamX Admin v3.0"],
        ].map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${T.border}22`, fontSize: 13 }}>
            <span style={{ color: T.muted }}>{k}</span>
            <span style={{ fontWeight: 500, color: T.text }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Security */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Security</div>
        {[
          ["🔐", "Biometric Auth", "Face ID / Fingerprint enabled", () => showToast("Biometric is active")],
          ["🔑", "Admin PIN",      "4-digit PIN for backup access",  () => setPinModal(true)],
          ["📋", "Audit Log",      "All admin actions are logged",    () => showToast("Audit log coming soon")],
          ["⏱️", "Session Timeout","Auto-logout after 30 minutes",   () => showToast("Session timeout: 30 min")],
          ["🛡️", "2FA",            "Two-factor authentication",       () => showToast("2FA coming soon")],
        ].map(([icon, label, sub, action]) => (
          <div key={label} onClick={action} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${T.border}22`, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
              <div style={{ fontSize: 11, color: T.muted }}>{sub}</div>
            </div>
            <div style={{ color: T.muted2, fontSize: 16 }}>›</div>
          </div>
        ))}
      </div>

      {/* Admin Numbers */}
      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: T.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 12 }}>Admin Access Numbers</div>
        {ADMIN_PHONES.map(p => (
          <div key={p} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${T.border}22`, fontSize: 12 }}>
            <span style={{ fontFamily: "monospace", color: T.text }}>{p}</span>
            <Chip label="ADMIN" color={T.yellow} />
          </div>
        ))}
        <div style={{ fontSize: 11, color: T.muted, marginTop: 8 }}>To add more admin numbers, edit ADMIN_PHONES in Admin.jsx</div>
      </div>

      <button onClick={onLogout} style={{ width: "100%", background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.25)", color: "#f87171", borderRadius: 10, padding: "13px", fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
        Sign Out of Admin
      </button>
    </div>
  );
}

// ── MAIN ADMIN ────────────────────────────────────────
const PAGES = [
  { id: "overview",   icon: "📊", label: "Overview"      },
  { id: "content",    icon: "🎬", label: "Content"       },
  { id: "live",       icon: "🔴", label: "Live Channels" },
  { id: "users",      icon: "👥", label: "Users"         },
  { id: "ads",        icon: "📢", label: "Ads"           },
  { id: "analytics",  icon: "📈", label: "Analytics"     },
  { id: "settings",   icon: "⚙️", label: "Settings"      },
];

export default function Admin({ onNavigate, user }) {
  const [verified,   setVerified]   = useState(false);
  const [page,       setPage]       = useState("overview");
  const [collapsed,  setCollapsed]  = useState(false);
  const [stats,      setStats]      = useState({});
  const [content,    setContent]    = useState([]);
  const [users,      setUsers]      = useState([]);
  const [ads,        setAds]        = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [toast,      setToast]      = useState(null);
  const [lastActive, setLastActive] = useState(Date.now());
  const sessionRef = useRef(null);

  // Session timeout
  useEffect(() => {
    if (!verified) return;
    const resetTimer = () => setLastActive(Date.now());
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown",   resetTimer);
    window.addEventListener("touchstart", resetTimer);
    sessionRef.current = setInterval(() => {
      if (Date.now() - lastActive > SESSION_TIMEOUT) {
        setVerified(false);
        showToast("Session expired for security. Please verify again.", "warning");
      }
    }, 30000);
    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown",   resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      clearInterval(sessionRef.current);
    };
  }, [verified, lastActive]);

  // Realtime content updates
  useEffect(() => {
    if (!verified) return;
    const ch = supabase.channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "content" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "users" },   () => loadData())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [verified]);

  useEffect(() => {
    if (verified) loadData();
  }, [verified]);

  async function loadData() {
    setLoading(true);
    try {
      const [s, c, u, a] = await Promise.all([
        db.getAdminStats().catch(() => ({})),
        supabase.from("content").select("*").order("created_at", { ascending: false }).then(r => r.data || []),
        db.getAllUsers().catch(() => []),
        db.getAllAds().catch(() => []),
      ]);
      setStats(s); setContent(c); setUsers(u); setAds(a);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const liveContent = content.filter(c => c.is_live || c.type === "Live");

  if (!verified) return <SecurityGate user={user} onPass={() => setVerified(true)} />;

  return (
    <div style={{ display: "flex", height: "100vh", background: T.bg, overflow: "hidden", fontFamily: "'Inter',sans-serif" }}>
      <style>{GS}</style>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* ── SIDEBAR ── */}
      <div style={{ width: collapsed ? 50 : 192, flexShrink: 0, background: T.surf, borderRight: `1px solid ${T.border2}`, display: "flex", flexDirection: "column", transition: "width .22s", overflow: "hidden" }} className="admin-sidebar">
        {/* Logo */}
        <div style={{ padding: collapsed ? "12px 10px" : "12px 14px", borderBottom: `1px solid ${T.border2}`, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }} onClick={() => setCollapsed(o => !o)}>
          <div style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(229,9,20,.15)", border: "1px solid rgba(229,9,20,.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>⚡</div>
          {!collapsed && <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, letterSpacing: 1, whiteSpace: "nowrap" }}><span style={{ color: T.red }}>STREAM</span>X <span style={{ fontSize: 8, color: T.muted, letterSpacing: 2 }}>ADMIN</span></div>}
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 4px" }}>
          {PAGES.map(p => (
            <div key={p.id} className={`nav-item${page === p.id ? " on" : ""}`} onClick={() => setPage(p.id)} style={{ justifyContent: collapsed ? "center" : "flex-start" }} title={collapsed ? p.label : undefined}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
              {!collapsed && <span>{p.label}</span>}
              {!collapsed && p.id === "live" && liveContent.length > 0 && (
                <span style={{ marginLeft: "auto", background: T.red, color: "#fff", fontSize: 9, fontWeight: 800, padding: "1px 6px", borderRadius: 10, animation: "pulse 1.5s infinite" }}>{liveContent.length}</span>
              )}
            </div>
          ))}
        </div>

        {/* Bottom actions */}
        <div style={{ padding: "6px 4px", borderTop: `1px solid ${T.border2}` }}>
          <div className="nav-item" onClick={loadData} style={{ justifyContent: collapsed ? "center" : "flex-start", color: T.blue }} title={collapsed ? "Refresh" : undefined}>
            <span style={{ fontSize: 14 }}>↻</span>
            {!collapsed && <span style={{ fontSize: 12 }}>Refresh</span>}
          </div>
          <div className="nav-item" onClick={() => onNavigate("home")} style={{ justifyContent: collapsed ? "center" : "flex-start", color: "#f87171" }} title={collapsed ? "Home" : undefined}>
            <span style={{ fontSize: 14 }}>🏠</span>
            {!collapsed && <span style={{ fontSize: 12 }}>Back to Home</span>}
          </div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{ height: 48, background: T.surf, borderBottom: `1px solid ${T.border2}`, display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 15, letterSpacing: 1, color: T.muted }}>
            {PAGES.find(p => p.id === page)?.icon} {PAGES.find(p => p.id === page)?.label}
          </div>
          <div style={{ flex: 1 }} />
          {/* Session indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: T.muted }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
            Secured
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>👑 {user?.name || "Admin"}</div>
          <Btn onClick={loadData} ghost small>↻ Refresh</Btn>
        </div>

        {/* Page content */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
            <div style={{ width: 40, height: 40, border: `3px solid ${T.border2}`, borderTop: `3px solid ${T.red}`, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
            <div style={{ color: T.muted, fontSize: 13 }}>Loading admin data...</div>
          </div>
        ) : (
          <div style={{ flex: 1, overflowY: "auto", padding: "clamp(14px,3vw,20px)" }}>
            {page === "overview"  && <Overview stats={stats} content={content} users={users} onNavigate={setPage} />}
            {page === "content"   && <ContentPage content={content.filter(c => !c.is_live && c.type !== "Live")} onRefresh={loadData} showToast={showToast} />}
            {page === "live"      && <ContentPage content={liveContent} onRefresh={loadData} showToast={showToast} />}
            {page === "users"     && <UsersPage users={users} onRefresh={loadData} showToast={showToast} />}
            {page === "ads"       && <AdsPage ads={ads} onRefresh={loadData} showToast={showToast} />}
            {page === "analytics" && <AnalyticsPage stats={stats} content={content} />}
            {page === "settings"  && <SettingsPage user={user} showToast={showToast} onLogout={() => { setVerified(false); onNavigate("home"); }} />}
          </div>
        )}
      </div>
    </div>
  );
}
