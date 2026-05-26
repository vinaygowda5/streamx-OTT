import { useState, useEffect } from "react";
import Login from "./Login.jsx";
import Home from "./Home.jsx";
import Profile from "./Profile.jsx";
import Admin from "./Admin.jsx";
import Payment from "./Payment.jsx";
import Search from "./Search.jsx";

const ADMIN_EMAILS = ["admin@streamx.in","vinaygowda12096909@email.com"];

const LOCAL_USERS = [
  {id:"u1",name:"Rahul Sharma",email:"demo@streamx.in",  password:"Demo@1234", role:"user",  plan:"Premium"},
  {id:"a1",name:"Vinay Admin",  email:"admin@streamx.in", password:"Admin@1234",role:"admin", plan:"Premium"},
  {id:"a2",name:"Vinay",email:"vinaygowda12096909@email.com",password:"Vinay@1234",role:"admin",plan:"Premium"},
];

export default function App() {
  const [user,        setUser]        = useState(null);
  const [page,        setPage]        = useState("home");
  const [ready,       setReady]       = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showSearch,  setShowSearch]  = useState(false);
  const [plan,        setPlan]        = useState("free");
  const [toast,       setToast]       = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("streamx_user");
    const p = localStorage.getItem("streamx_plan");
    if (u) setUser(JSON.parse(u));
    if (p) setPlan(p);
    setReady(true);
  }, []);

  const isAdmin = user && ADMIN_EMAILS.includes(user.email);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function handleLogin(userData) {
    setUser(userData);
    localStorage.setItem("streamx_user", JSON.stringify(userData));
    setPage("home");
  }

  function handleLogout() {
    localStorage.clear();
    setUser(null);
    setPage("home");
  }

  function handlePaySuccess(data) {
    setPlan(data.planId);
    localStorage.setItem("streamx_plan", data.planId);
    setShowPayment(false);
    showToast("✅ " + data.planName + " activated!");
  }

  if (!ready) return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontWeight:900,fontSize:36,letterSpacing:2}}>
        <span style={{color:"#e50914"}}>STREAM</span><span style={{color:"#fff"}}>X</span>
      </div>
      <div style={{width:36,height:36,border:"3px solid #1a1a26",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  if (!user) return <Login onLogin={handleLogin} localUsers={LOCAL_USERS}/>;

  if (page === "admin" && !isAdmin) return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{fontSize:64}}>🚫</div>
      <div style={{color:"#e50914",fontSize:24,fontWeight:900}}>Access Denied</div>
      <button onClick={()=>setPage("home")} style={{background:"#e50914",color:"#fff",border:"none",borderRadius:8,padding:"12px 28px",fontWeight:700,fontSize:14,cursor:"pointer"}}>Go Home</button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#07070c"}}>
      {toast && (
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",zIndex:9999,background:"#1a1a26",color:"#fff",padding:"12px 24px",borderRadius:40,fontSize:13,fontWeight:600,border:"1px solid #2a2a36",boxShadow:"0 8px 32px rgba(0,0,0,.8)"}}>
          {toast}
        </div>
      )}

      {showPayment && <Payment user={user} currentPlan={plan} onSuccess={handlePaySuccess} onClose={()=>setShowPayment(false)}/>}
      {showSearch  && <Search onPlay={()=>setShowSearch(false)} onClose={()=>setShowSearch(false)}/>}

      {page==="home"    && <Home    onNavigate={setPage} user={user} onUpgrade={()=>setShowPayment(true)} onSearch={()=>setShowSearch(true)}/>}
      {page==="profile" && <Profile onNavigate={setPage} user={user} onLogout={handleLogout} onUpgrade={()=>setShowPayment(true)}/>}
      {page==="admin"   && <Admin   onNavigate={setPage}/>}

      <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(10,10,15,.97)",borderTop:"1px solid #1a1a26",display:"flex",justifyContent:"space-around",padding:"10px 0 14px",zIndex:500,backdropFilter:"blur(12px)"}}>
        {[
          {id:"home",   icon:"🏠",label:"Home"},
          {id:"profile",icon:"👤",label:"Profile"},
          ...(isAdmin?[{id:"admin",icon:"⚡",label:"Admin"}]:[]),
          {id:"upgrade",icon:"👑",label:"Premium"},
        ].map(n=>(
          <button key={n.id} onClick={()=>n.id==="upgrade"?setShowPayment(true):setPage(n.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,color:page===n.id?"#e50914":"#444"}}>
            <span style={{fontSize:22}}>{n.icon}</span>
            <span style={{fontSize:10,fontWeight:page===n.id?700:400}}>{n.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}