import { useState, useEffect } from "react";
import Login   from "./Login.jsx";
import Home    from "./Home.jsx";
import Profile from "./Profile.jsx";
import Admin   from "./Admin.jsx";
import Payment from "./Payment.jsx";

const ADMIN_EMAILS = [
  "admin@streamx.in",
  "vinaygowda12096909@email.com",
];

export default function App() {
  const [user,         setUser]         = useState(null);
  const [page,         setPage]         = useState("home");
  const [ready,        setReady]        = useState(false);
  const [showPayment,  setShowPayment]  = useState(false);
  const [currentPlan,  setCurrentPlan]  = useState("free");
  const [toast,        setToast]        = useState(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("streamx_user");
    const savedPlan = localStorage.getItem("streamx_plan");
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedPlan) setCurrentPlan(savedPlan);
    setReady(true);
  }, []);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleLogin(userData) {
    setUser(userData);
    setPage("home");
  }

  function handleLogout() {
    localStorage.removeItem("streamx_token");
    localStorage.removeItem("streamx_user");
    localStorage.removeItem("streamx_plan");
    setUser(null);
    setPage("home");
  }

  function handlePaymentSuccess(data) {
    setCurrentPlan(data.planId);
    localStorage.setItem("streamx_plan", data.planId);
    setShowPayment(false);
    showToast(`✅ ${data.planName} plan activated!`);
  }

  if (!ready) return (
    <div style={{
      minHeight: "100vh", background: "#07070c",
      display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column", gap: 16,
    }}>
      <div style={{
        fontWeight: 900, fontSize: 36, letterSpacing: 2,
      }}>
        <span style={{ color: "#e50914" }}>STREAM</span>
        <span style={{ color: "#fff" }}>X</span>
      </div>
      <div style={{
        width: 40, height: 40, border: "3px solid #1a1a26",
        borderTop: "3px solid #e50914", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin}/>;

  if (page === "admin" && !isAdmin) {
    return (
      <div style={{
        minHeight: "100vh", background: "#07070c",
        display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: 16,
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
          fontWeight: 700, fontSize: 14, cursor: "pointer",
        }}>Go Back Home</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#07070c" }}>

      {/* Toast notification */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, left: "50%",
          transform: "translateX(-50%)", zIndex: 9999,
          background: "#1a1a26", color: "#fff",
          padding: "12px 24px", borderRadius: 40,
          fontSize: 13, fontWeight: 600,
          border: "1px solid #2a2a36",
          boxShadow: "0 8px 32px rgba(0,0,0,.8)",
        }}>
          {toast}
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <Payment
          user={user}
          currentPlan={currentPlan}
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      {/* Pages */}
      {page === "home"    && <Home    onNavigate={setPage} user={user} onUpgrade={() => setShowPayment(true)}/>}
      {page === "profile" && <Profile onNavigate={setPage} user={user} onLogout={handleLogout} onUpgrade={() => setShowPayment(true)}/>}
      {page === "admin"   && <Admin   onNavigate={setPage}/>}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(10,10,15,0.97)",
        borderTop: "1px solid #1a1a26",
        display: "flex", justifyContent: "space-around",
        padding: "10px 0 14px", zIndex: 500,
        backdropFilter: "blur(12px)",
      }}>
        {[
          { id: "home",    icon: "🏠", label: "Home"    },
          { id: "profile", icon: "👤", label: "Profile" },
          ...(isAdmin ? [{ id: "admin", icon: "⚡", label: "Admin" }] : []),
        ].map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            background: "none", border: "none",
            cursor: "pointer", display: "flex",
            flexDirection: "column", alignItems: "center", gap: 4,
            color: page === n.id ? "#e50914" : "#444",
          }}>
            <span style={{ fontSize: 22 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: page === n.id ? 700 : 400 }}>
              {n.label}
            </span>
          </button>
        ))}
        {/* Upgrade button */}
        <button onClick={() => setShowPayment(true)} style={{
          background: "none", border: "none",
          cursor: "pointer", display: "flex",
          flexDirection: "column", alignItems: "center", gap: 4,
          color: "#e50914",
        }}>
          <span style={{ fontSize: 22 }}>👑</span>
          <span style={{ fontSize: 10, fontWeight: 700 }}>Upgrade</span>
        </button>
      </div>

    </div>
  );
}