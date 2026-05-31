import { useState, useEffect } from "react";
import { supabase, db } from "./supabase.js";

const RED = "#e50914";
const BG = "#0a0a0f";
const SURF = "#0f0f16";
const BORDER = "#1a1a26";
const MUTED = "#555";

export default function Profile({ onNavigate, user, onLogout, onUpgrade }) {
  const [tab,       setTab]       = useState("profile");
  const [userData,  setUserData]  = useState(user || {});
  const [watchlist, setWatchlist] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [notifs,    setNotifs]    = useState([]);
  const [sub,       setSub]       = useState(null);
  const [editName,  setEditName]  = useState(false);
  const [newName,   setNewName]   = useState(user?.name || "");
  const [toast,     setToast]     = useState(null);
  const [prefs,     setPrefs]     = useState({
    autoplay: true, skipIntro: true,
    notifications: true, emailAlerts: false
  });

  const showToast = msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  // Load data in background — page shows immediately
  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  async function loadData() {
    try {
      const [w, h, n, s] = await Promise.all([
        db.getWatchlist(user.id).catch(() => []),
        db.getHistory(user.id).catch(() => []),
        db.getNotifications(user.id).catch(() => []),
        db.getSubscription(user.id).catch(() => null),
      ]);
      setWatchlist(w || []);
      setHistory(h || []);
      setNotifs(n || []);
      setSub(s || null);
    } catch (e) {
      console.log("Profile load:", e.message);
    }
  }

  async function saveName() {
    if (!newName.trim() || !user?.id) return;
    try {
      const updated = await db.updateUser(user.id, { name: newName.trim() });
      setUserData(updated || { ...userData, name: newName.trim() });
      localStorage.setItem("streamx_user", JSON.stringify(updated || userData));
      showToast("Name updated! ✅");
      setEditName(false);
    } catch (e) {
      showToast("Failed to update");
    }
  }

  const plan = userData?.plan || "free";
  const planInfo = {
    free:         { name: "Free",    color: "#666",    price: "₹0" },
    plan_mobile:  { name: "Mobile",  color: "#3b82f6", price: "₹149/mo" },
    plan_basic:   { name: "Basic",   color: "#8b5cf6", price: "₹299/mo" },
    plan_premium: { name: "Premium", color: RED,       price: "₹499/mo" },
    plan_annual:  { name: "Annual",  color: "#f59e0b", price: "₹999/yr" },
    premium:      { name: "Premium", color: RED,       price: "₹499/mo" },
  }[plan] || { name: "Free", color: "#666", price: "₹0" };

  const unread = notifs.filter(n => !n.is_read).length;

  const TABS = [
    { id: "profile",       label: "Profile",        icon: "👤" },
    { id: "watchlist",     label: "Watchlist",       icon: "♥" },
    { id: "history",       label: "History",         icon: "🕐" },
    { id: "notifications", label: `Alerts${unread > 0 ? ` (${unread})` : ""}`, icon: "🔔" },
    { id: "settings",      label: "Settings",        icon: "⚙️" },
  ];

  const S = {
    card: { background: SURF, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 },
    row:  { display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: `1px solid ${BORDER}` },
    label: { fontSize: 13, fontWeight: 600, color: "#e8e8f0" },
    sub:  { fontSize: 12, color: MUTED, marginTop: 2 },
    inp:  { background: "#0a0a14", border: `1px solid ${BORDER}`, borderRadius: 8, color: "#fff", padding: "10px 14px", fontSize: 14, outline: "none", fontFamily: "Inter,sans-serif", width: "100%" },
  };

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "Inter,sans-serif", paddingBottom: 80 }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, background: "#1a1a26", color: "#fff", padding: "10px 24px", borderRadius: 40, fontSize: 13, fontWeight: 600, border: `1px solid ${BORDER}`, whiteSpace: "nowrap" }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ background: `linear-gradient(160deg,${planInfo.color}22,${BG} 55%)`, borderBottom: `1px solid ${BORDER}` }}>
        {/* Navbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px 0" }}>
          <div style={{ fontFamily: "serif", fontWeight: 900, fontSize: 22, letterSpacing: 1, cursor: "pointer" }} onClick={() => onNavigate("home")}>
            <span style={{ color: RED }}>STREAM</span><span style={{ color: "#fff" }}>X</span>
          </div>
          <div style={{ flex: 1 }} />
          <button onClick={() => onNavigate("home")} style={{ background: "rgba(255,255,255,.06)", border: `1px solid ${BORDER}`, color: "#aaa", borderRadius: 8, padding: "7px 14px", fontSize: 12, cursor: "pointer" }}>
            ← Home
          </button>
        </div>

        {/* Profile hero */}
        <div style={{ padding: "20px 20px 0", display: "flex", gap: 18, alignItems: "flex-end", flexWrap: "wrap" }}>
          {/* Avatar */}
          <div style={{ width: 80, height: 80, borderRadius: "50%", background: `linear-gradient(135deg,${planInfo.color}55,${planInfo.color}22)`, border: `3px solid ${planInfo.color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700, flexShrink: 0 }}>
            {userData?.name?.[0]?.toUpperCase() || "👤"}
          </div>

          {/* Info */}
          <div style={{ flex: 1, paddingBottom: 16 }}>
            {editName ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  style={{ ...S.inp, flex: 1, borderColor: RED }}
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditName(false); }}
                />
                <button onClick={saveName} style={{ background: RED, border: "none", color: "#fff", borderRadius: 7, padding: "8px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Save</button>
                <button onClick={() => setEditName(false)} style={{ background: "rgba(255,255,255,.06)", border: `1px solid ${BORDER}`, color: "#aaa", borderRadius: 7, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>✕</button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{userData?.name || "User"}</div>
                <button onClick={() => setEditName(true)} style={{ background: "none", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: "2px 8px", fontSize: 11, cursor: "pointer" }}>✏️</button>
              </div>
            )}
            <div style={{ fontSize: 12, color: MUTED }}>
              {userData?.phone || userData?.email || "No contact"} ·
              <span style={{ color: planInfo.color, fontWeight: 700, marginLeft: 6 }}>{planInfo.name}</span>
            </div>
            {/* Stats */}
            <div style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}>
              {[[watchlist.length, "Watchlist"], [history.length, "Watched"], [unread, "Alerts"]].map(([n, l]) => (
                <div key={l}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: RED, fontFamily: "serif" }}>{n}</div>
                  <div style={{ fontSize: 10, color: MUTED }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", overflowX: "auto", padding: "0 20px", borderTop: `1px solid ${BORDER}`, marginTop: 16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background: "none", border: "none", color: tab === t.id ? "#fff" : MUTED, fontWeight: tab === t.id ? 700 : 500, padding: "10px 14px", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap", borderBottom: `2px solid ${tab === t.id ? RED : "transparent"}`, fontFamily: "Inter,sans-serif" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px 16px 40px" }}>

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div>
            {/* Plan card */}
            <div style={{ background: `linear-gradient(120deg,${planInfo.color}18,${planInfo.color}06)`, border: `1px solid ${planInfo.color}33`, borderRadius: 14, padding: 18, marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: planInfo.color }}>{planInfo.name} Plan</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                    {sub ? `Active · Expires ${new Date(sub.end_date).toLocaleDateString("en-IN")}` : "No active subscription"}
                  </div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 900 }}>{planInfo.price}</div>
              </div>
              <button onClick={onUpgrade} style={{ width: "100%", background: planInfo.color, border: "none", color: "#fff", borderRadius: 8, padding: "11px", fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
                {plan === "plan_premium" || plan === "premium" ? "Manage Plan" : "Upgrade to Premium 👑"}
              </button>
            </div>

            {/* Personal info */}
            <div style={S.card}>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Personal Info</div>
              <div style={S.row}>
                <div style={{ flex: 1 }}>
                  <div style={S.label}>Full Name</div>
                  <div style={S.sub}>{userData?.name || "Not set"}</div>
                </div>
                <button onClick={() => setEditName(true)} style={{ background: "none", border: "none", color: RED, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
              </div>
              <div style={S.row}>
                <div style={{ flex: 1 }}>
                  <div style={S.label}>Mobile Number</div>
                  <div style={S.sub}>{userData?.phone || "Not set"}</div>
                </div>
              </div>
              <div style={{ ...S.row, borderBottom: "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={S.label}>Account Role</div>
                  <div style={S.sub}>{userData?.role === "admin" ? "Administrator ⚡" : "Member"}</div>
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div style={S.card}>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Preferences</div>
              {[
                ["▶️ Autoplay",       "autoplay",       "Auto-play next video"],
                ["⏭️ Skip Intro",     "skipIntro",      "Automatically skip intros"],
                ["🔔 Notifications",  "notifications",  "Push alerts"],
                ["📧 Email Alerts",   "emailAlerts",    "Weekly newsletter"],
              ].map(([label, key, sub]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
                  <div>
                    <div style={S.label}>{label}</div>
                    <div style={S.sub}>{sub}</div>
                  </div>
                  <div
                    onClick={() => setPrefs(p => ({ ...p, [key]: !p[key] }))}
                    style={{ width: 44, height: 24, borderRadius: 12, background: prefs[key] ? RED : "#1f1f2e", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: prefs[key] ? 23 : 3, transition: "left .2s" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WATCHLIST TAB ── */}
        {tab === "watchlist" && (
          <div style={S.card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>My Watchlist ({watchlist.length})</div>
            {watchlist.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: MUTED }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>♥</div>
                <div>Nothing saved yet</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>Add content while watching</div>
              </div>
            ) : watchlist.map((item, i) => {
              const c = item.content || {};
              return (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderBottom: i < watchlist.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                  <div style={{ width: 52, height: 36, borderRadius: 6, background: `linear-gradient(135deg,${RED}22,#0a0a0f)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>🎬</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || "Unknown"}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{c.genre} · {c.type}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button style={{ background: `${RED}22`, border: `1px solid ${RED}44`, color: RED, borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>▶ Play</button>
                    <button onClick={async () => {
                      await db.removeFromWatchlist(user.id, item.content_id).catch(() => {});
                      setWatchlist(w => w.filter(x => x.id !== item.id));
                      showToast("Removed");
                    }} style={{ background: "rgba(255,255,255,.04)", border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 6, padding: "5px 9px", fontSize: 11, cursor: "pointer" }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── HISTORY TAB ── */}
        {tab === "history" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Watch History ({history.length})</div>
              {history.length > 0 && (
                <button onClick={async () => {
                  await db.clearHistory(user.id).catch(() => {});
                  setHistory([]);
                  showToast("History cleared");
                }} style={{ background: "none", border: "none", color: "#f87171", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Clear All</button>
              )}
            </div>
            <div style={S.card}>
              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: MUTED }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🕐</div>
                  <div>No history yet</div>
                </div>
              ) : history.map((item, i) => {
                const c = item.content || {};
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < history.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                    <div style={{ width: 48, height: 32, borderRadius: 6, background: "linear-gradient(135deg,#1d9bf022,#0a0a0f)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, position: "relative" }}>
                      🎬
                      {(item.progress_pct || 0) > 0 && (
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: "#1a1a26", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${item.progress_pct}%`, background: "#1d9bf0" }} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || "Unknown"}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{item.progress_pct || 0}% watched</div>
                    </div>
                    <div style={{ fontSize: 11, color: MUTED }}>{new Date(item.watched_at).toLocaleDateString("en-IN")}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS TAB ── */}
        {tab === "notifications" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Notifications</div>
              {unread > 0 && (
                <button onClick={async () => {
                  await db.markAllNotifsRead(user.id).catch(() => {});
                  setNotifs(n => n.map(x => ({ ...x, is_read: true })));
                }} style={{ background: "none", border: "none", color: RED, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Mark all read</button>
              )}
            </div>
            <div style={S.card}>
              {notifs.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: MUTED }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🔔</div>
                  <div>No notifications</div>
                </div>
              ) : notifs.map((n, i) => (
                <div key={n.id} onClick={() => db.markNotifRead(n.id).then(() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x))).catch(() => {})}
                  style={{ display: "flex", gap: 12, padding: "11px 0", borderBottom: i < notifs.length - 1 ? `1px solid ${BORDER}` : "none", cursor: "pointer", opacity: n.is_read ? .5 : 1 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: n.is_read ? "rgba(255,255,255,.04)" : `${RED}18`, border: `1px solid ${n.is_read ? BORDER : RED + "44"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>
                    {n.type === "welcome" ? "🎉" : "🔔"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: n.is_read ? 400 : 700, fontSize: 13 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{n.message}</div>
                  </div>
                  {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: "50%", background: RED, marginTop: 4, flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === "settings" && (
          <div>
            <div style={S.card}>
              <div style={{ fontSize: 11, color: MUTED, fontWeight: 700, textTransform: "uppercase", letterSpacing: .5, marginBottom: 10 }}>Account</div>
              {[
                ["👑", "Subscription", planInfo.name + " · " + planInfo.price, onUpgrade],
                ["🔔", "Notifications", "Manage alerts", () => setTab("notifications")],
                ["🛡️", "Privacy", "Data & security", () => showToast("Coming soon!")],
                ["🌐", "Language", "Hindi / English / Tamil", () => showToast("Coming soon!")],
              ].map(([icon, label, sub, onClick]) => (
                <div key={label} onClick={onClick} style={{ ...S.row, cursor: "pointer" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={S.label}>{label}</div>
                    <div style={S.sub}>{sub}</div>
                  </div>
                  <div style={{ color: "#333", fontSize: 18 }}>›</div>
                </div>
              ))}
              <div style={{ ...S.row, borderBottom: "none", cursor: "pointer" }} onClick={() => showToast("Contact support to delete account")}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(248,113,113,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>🚫</div>
                <div style={{ flex: 1 }}>
                  <div style={{ ...S.label, color: "#f87171" }}>Delete Account</div>
                  <div style={S.sub}>Permanently remove account</div>
                </div>
              </div>
            </div>
            <button onClick={onLogout} style={{ width: "100%", background: "rgba(248,113,113,.08)", border: "1px solid rgba(248,113,113,.25)", color: "#f87171", borderRadius: 12, padding: "14px", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}