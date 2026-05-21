import { useState, useEffect } from "react";
import Login   from "./Login.jsx";
import Home    from "./Home.jsx";
import Profile from "./Profile.jsx";
import Admin   from "./Admin.jsx";

// ── Admin emails - only these can see admin panel ──
const ADMIN_EMAILS = [
  "admin@streamx.in",
  "vinaygowda12096909@email.com"  // your email
];

export default function App() {
  const [user, setUser]   = useState(null);
  const [page, setPage]   = useState("home");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("streamx_user");
    if (saved) setUser(JSON.parse(saved));
    setReady(true);
  }, []);

  // Check if current user is admin
  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  function handleLogin(userData) {
    setUser(userData);
    setPage("home");
  }

  function handleLogout() {
    localStorage.removeItem("streamx_token");
    localStorage.removeItem("streamx_user");
    setUser(null);
    setPage("home");
  }

  if (!ready) return (
    <div style={{
      minHeight: "100vh", background: "#07070c",
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ color: "#e50914", fontSize: 32, fontWeight: 900 }}>
        STREAM<span style={{ color: "#fff" }}>X</span>
      </div>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} />;

  // Block non-admin from admin page
  if (page === "admin" && !isAdmin) {
    return (
      <div style={{
        minHeight: "100vh", background: "#07070c",
        display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 20
      }}>
        <div style={{ fontSize: 64 }}>🚫</div>
        <div style={{ color: "#e50914", fontSize: 24, fontWeight: 900 }}>
          Access Denied
        </div>
        <div style={{ color: "#666", fontSize: 14 }}>
          You don't have admin permissions.
        </div>
        <button onClick={() => setPage("home")} style={{
          background: "#e50914", color: "#fff", border: "none",
          borderRadius: 8, padding: "12px 28px",
          fontWeight: 700, fontSize: 14, cursor: "pointer"
        }}>Go Back Home</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070c" }}>

      {page === "home"    && <Home    onNavigate={setPage} user={user} />}
      {page === "profile" && <Profile onNavigate={setPage} user={user} onLogout={handleLogout} />}
      {page === "admin"   && <Admin   onNavigate={setPage} />}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(10,10,15,0.97)",
        borderTop: "1px solid #1a1a26",
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 14px", zIndex: 9999,
        backdropFilter: "blur(12px)"
      }}>
        {[
          { id:"home",    icon:"🏠", label:"Home"    },
          { id:"profile", icon:"👤", label:"Profile" },
          // Only show Admin button to admins
          ...(isAdmin ? [{ id:"admin", icon:"⚡", label:"Admin" }] : []),
        ].map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            background: "none", border: "none", cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: 4,
            color: page === n.id ? "#e50914" : "#444"
          }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: page === n.id ? 700 : 400 }}>
              {n.label}
            </span>
          </button>
        ))}
      </div>

    </div>
  );
}