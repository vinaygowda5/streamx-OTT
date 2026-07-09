import { useState, useEffect } from "react";
import Login    from "./Login.jsx";
import Home     from "./Home.jsx";
import Profile  from "./Profile.jsx";
import Admin    from "./Admin.jsx";
import Payment  from "./Payment.jsx";
const registerPWA = async () => {};
const subscribeToPush = async () => {};
const canInstall = () => false;
const promptInstall = async () => false;
const initMonitoring = () => {};
const trackPageView = () => {};
const trackEvent = () => {};

const BACKEND = "YOUR_RAILWAY_BACKEND_URL_HERE"; // ← paste Railway URL

export default function App() {
  const [user,    setUser]    = useState(null);
  const [page,    setPage]    = useState("loading");
  const [upgrade, setUpgrade] = useState(false);
  const [installBanner, setInstallBanner] = useState(false);

  // ── Load user from localStorage on startup ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem("streamx_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u?.id) { setUser(u); setPage("home"); }
        else setPage("login");
      } else {
        setPage("login");
      }
    } catch(e) {
      setPage("login");
    }
  }, []);

  // ── Register PWA + monitoring after user loads ──
  useEffect(() => {
    registerPWA();
    if (user) {
      initMonitoring(user);
      // Ask to subscribe to push notifications after 5 seconds
      const t = setTimeout(async () => {
        const token = localStorage.getItem("streamx_token");
        if (token && BACKEND !== "YOUR_RAILWAY_BACKEND_URL_HERE") {
          await subscribeToPush(BACKEND, token).catch(() => {});
        }
      }, 5000);
      // Show install banner after 10 seconds if installable
      const t2 = setTimeout(() => {
        if (canInstall()) setInstallBanner(true);
      }, 10000);
      return () => { clearTimeout(t); clearTimeout(t2); };
    }
  }, [user]);

  // ── Track page changes ──
  useEffect(() => {
    if (page !== "loading") trackPageView(page, user);
  }, [page]);

  function handleLogin(u) {
    setUser(u);
    localStorage.setItem("streamx_user", JSON.stringify(u));
    setPage("home");
    trackEvent("login", { plan: u.plan, role: u.role });
  }

  function handleLogout() {
    setUser(null);
    localStorage.removeItem("streamx_user");
    localStorage.removeItem("streamx_token");
    setPage("login");
    trackEvent("logout");
  }

  function navigate(p) {
    setPage(p);
    trackEvent("navigate", { to: p });
  }

  // ── Loading splash ──
  if (page === "loading") {
    return (
      <div style={{
        minHeight:"100vh", background:"#07070c",
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        fontFamily:"Arial, sans-serif", gap:20,
      }}>
        <style>{`
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        `}</style>
        {/* StreamX Logo */}
        <div style={{ animation:"fadeIn .5s ease", textAlign:"center" }}>
          <div style={{ fontSize:48, fontWeight:900, letterSpacing:2, lineHeight:1 }}>
            <span style={{ color:"#e50914" }}>STREAM</span>
            <span style={{ color:"#fff" }}>X</span>
          </div>
          <div style={{ fontSize:13, color:"#333", marginTop:6, letterSpacing:3 }}>
            INDIA'S PREMIUM OTT
          </div>
        </div>
        <div style={{
          width:36, height:36,
          border:"3px solid #1a1a1a",
          borderTop:"3px solid #e50914",
          borderRadius:"50%",
          animation:"spin .8s linear infinite",
        }}/>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#07070c" }}>

      {/* ── PWA Install Banner ── */}
      {installBanner && (
        <div style={{
          position:"fixed", bottom:80, left:16, right:16, zIndex:9999,
          background:"#0e0e1e", border:"1px solid #e50914",
          borderRadius:14, padding:"14px 16px",
          display:"flex", alignItems:"center", gap:12,
          boxShadow:"0 8px 32px rgba(0,0,0,.8)",
          animation:"slideUp .3s ease",
        }}>
          <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div style={{
            width:44, height:44, borderRadius:10,
            background:"#e50914", display:"flex",
            alignItems:"center", justifyContent:"center",
            fontSize:22, flexShrink:0,
          }}>🎬</div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:"#fff", fontFamily:"Inter,sans-serif" }}>
              Install StreamX
            </div>
            <div style={{ fontSize:12, color:"#666", fontFamily:"Inter,sans-serif" }}>
              Add to home screen for quick access
            </div>
          </div>
          <button onClick={async () => {
            const accepted = await promptInstall();
            setInstallBanner(false);
            if (accepted) trackEvent("pwa_installed");
          }} style={{
            background:"#e50914", color:"#fff", border:"none",
            borderRadius:8, padding:"8px 14px", fontSize:12,
            fontWeight:700, cursor:"pointer", fontFamily:"Inter,sans-serif",
            flexShrink:0,
          }}>
            Install
          </button>
          <button onClick={() => setInstallBanner(false)} style={{
            background:"none", border:"none", color:"#555",
            cursor:"pointer", fontSize:18, flexShrink:0,
          }}>✕</button>
        </div>
      )}

      {/* ── Pages ── */}
      {page === "login"   && <Login   onLogin={handleLogin}/>}
      {page === "home"    && <Home    onNavigate={navigate} user={user} onUpgrade={()=>setUpgrade(true)}/>}
      {page === "profile" && <Profile onNavigate={navigate} user={user} onLogout={handleLogout} onUpgrade={()=>setUpgrade(true)}/>}
      {page === "admin"   && user?.role === "admin" && <Admin onNavigate={navigate} user={user}/>}

      {/* ── Payment Modal ── */}
      {upgrade && (
        <Payment
          user={user}
          onClose={() => setUpgrade(false)}
          onSuccess={(planId) => {
            const updated = { ...user, plan: planId };
            setUser(updated);
            localStorage.setItem("streamx_user", JSON.stringify(updated));
            setUpgrade(false);
            trackEvent("subscription_purchased", { plan: planId });
          }}
        />
      )}
    </div>
  );
}
