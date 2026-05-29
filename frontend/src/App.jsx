import { useState, useEffect } from "react";
import { supabase, db } from "./supabase.js";
import Login   from "./Login.jsx";
import Home    from "./Home.jsx";
import Profile from "./Profile.jsx";
import Admin   from "./Admin.jsx";
import Payment from "./Payment.jsx";
import Search  from "./Search.jsx";

const ADMIN_EMAILS = ["admin@streamx.in","vinaygowda12096909@email.com"];
const ADMIN_PHONES = ["+919000000000","+919000000001"];

export default function App() {
  const [user,        setUser]        = useState(null);
  const [page,        setPage]        = useState("home");
  const [ready,       setReady]       = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const [toast,       setToast]       = useState(null);

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      // Check Supabase session
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // Get user from our DB
        const phone = session.user.phone;
        const dbUser = phone
          ? await db.getUserByPhone(phone).catch(()=>null)
          : null;

        if (dbUser) {
          setUser(dbUser);
          setReady(true);
          return;
        }
      }

      // Check localStorage fallback
      const saved = localStorage.getItem("streamx_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        // Verify user still exists in DB
        const dbUser = await db.getUserById(parsed.id).catch(()=>null);
        if (dbUser) {
          setUser(dbUser);
        } else {
          localStorage.removeItem("streamx_user");
        }
      }
    } catch (e) {
      console.log("Session check failed:", e);
    }
    setReady(true);
  }

  const isAdmin = user && (
    ADMIN_EMAILS.includes(user.email) ||
    ADMIN_PHONES.includes(user.phone) ||
    user.role === "admin"
  );

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleLogin(userData) {
    setUser(userData);
    localStorage.setItem("streamx_user", JSON.stringify(userData));
    setPage("home");
    showToast("Welcome back, " + userData.name + "! 👋");
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    localStorage.clear();
    setUser(null);
    setPage("home");
    window.location.reload();
  }

  async function handlePaySuccess(data) {
    showToast("✅ " + data.planName + " activated!");
    setShowPayment(false);
    // Refresh user data
    if (user?.id) {
      const updated = await db.getUserById(user.id).catch(()=>null);
      if (updated) {
        setUser(updated);
        localStorage.setItem("streamx_user", JSON.stringify(updated));
      }
    }
  }

  if (!ready) return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20}}>
      <div style={{fontWeight:900,fontSize:40,letterSpacing:2}}>
        <span style={{color:"#e50914"}}>STREAM</span>
        <span style={{color:"#fff"}}>X</span>
      </div>
      <div style={{width:40,height:40,border:"3px solid #1a1a26",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin}/>;

  if (page==="admin" && !isAdmin) return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:72}}>🚫</div>
      <div style={{color:"#e50914",fontSize:28,fontWeight:900}}>Access Denied</div>
      <div style={{color:"#555",fontSize:14}}>Admin access only</div>
      <button onClick={()=>setPage("home")} style={{background:"#e50914",color:"#fff",border:"none",borderRadius:8,padding:"12px 28px",fontWeight:700,fontSize:14,cursor:"pointer",marginTop:8}}>
        Go Home
      </button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#07070c"}}>
      {/* Toast */}
      {toast&&(
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:"#1a1a26",color:"#fff",padding:"12px 24px",borderRadius:40,fontSize:13,fontWeight:600,border:"1px solid #2a2a36",boxShadow:"0 8px 32px rgba(0,0,0,.8)",whiteSpace:"nowrap"}}>
          {toast}
        </div>
      )}

      {/* Modals */}
      {showPayment&&<Payment user={user} currentPlan={user?.plan} onSuccess={handlePaySuccess} onClose={()=>setShowPayment(false)}/>}
      {showSearch &&<Search  onPlay={()=>setShowSearch(false)} onClose={()=>setShowSearch(false)}/>}

      {/* Pages */}
      {page==="home"    &&<Home    onNavigate={setPage} user={user} onUpgrade={()=>setShowPayment(true)} onSearch={()=>setShowSearch(true)}/>}
      {page==="profile" &&<Profile onNavigate={setPage} user={user} onLogout={handleLogout} onUpgrade={()=>setShowPayment(true)}/>}
      {page==="admin"   &&<Admin   onNavigate={setPage}/>}

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(10,10,15,.97)",borderTop:"1px solid #1a1a26",display:"flex",justifyContent:"space-around",padding:"10px 0 14px",zIndex:500,backdropFilter:"blur(12px)"}}>
        {[
          {id:"home",   icon:"🏠",label:"Home"},
          {id:"profile",icon:"👤",label:"Profile"},
        ].map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:page===n.id?"#e50914":"#444"}}>
            <span style={{fontSize:22}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:page===n.id?700:400}}>{n.label}</span>
          </button>
        ))}

        <button onClick={()=>setShowPayment(true)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:"#e50914"}}>
          <span style={{fontSize:22}}>👑</span>
          <span style={{fontSize:10,fontWeight:700}}>Premium</span>
        </button>

        {/* ADMIN ONLY — Hidden from normal users */}
        {isAdmin&&(
          <button onClick={()=>setPage("admin")} style={{background:page==="admin"?"rgba(229,9,20,.15)":"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:page==="admin"?"#e50914":"#f59e0b",borderRadius:8,padding:"0 8px"}}>
            <span style={{fontSize:22}}>⚡</span>
            <span style={{fontSize:10,fontWeight:700,color:"#f59e0b"}}>Admin</span>
          </button>
        )}
      </div>
    </div>
  );
}