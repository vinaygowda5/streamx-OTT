import { useState, useEffect } from "react";
import Login   from "./Login.jsx";
import Home    from "./Home.jsx";
import Profile from "./Profile.jsx";
import Admin   from "./Admin.jsx";
import Payment from "./Payment.jsx";
import Search  from "./Search.jsx";

export default function App() {
  const [user,    setUser]    = useState(null);
  const [page,    setPage]    = useState("loading");
  const [upgrade, setUpgrade] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(()=>{
    try {
      const saved = localStorage.getItem("streamx_user");
      if (saved) {
        const u = JSON.parse(saved);
        if (u?.id) { setUser(u); setPage("home"); }
        else setPage("login");
      } else {
        setPage("login");
      }
    } catch(e) { setPage("login"); }
  },[]);

  function handleLogin(u){
    setUser(u);
    localStorage.setItem("streamx_user", JSON.stringify(u));
    setPage("home");
  }

  function handleLogout(){
    setUser(null);
    localStorage.removeItem("streamx_user");
    localStorage.removeItem("streamx_token");
    setPage("login");
  }

  function navigate(p){
    if(p === "search"){ setShowSearch(true); return; }
    setShowSearch(false);
    setPage(p);
  }

  // Loading splash
  if(page === "loading"){
    return(
      <div style={{minHeight:"100vh",background:"#07070c",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"Arial,sans-serif",gap:20}}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        <div style={{animation:"fadeIn .5s ease",textAlign:"center"}}>
          <div style={{fontSize:48,fontWeight:900,letterSpacing:2,lineHeight:1}}>
            <span style={{color:"#e50914"}}>STREAM</span>
            <span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:13,color:"#333",marginTop:6,letterSpacing:3}}>INDIA'S PREMIUM OTT</div>
        </div>
        <div style={{width:36,height:36,border:"3px solid #1a1a1a",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
      </div>
    );
  }

  return(
    <div style={{minHeight:"100vh",background:"#07070c"}}>

      {/* Search overlay */}
      {showSearch && (
        <Search
          user={user}
          onClose={()=>setShowSearch(false)}
          onNavigate={navigate}
          onPlay={item=>{setShowSearch(false);}}
        />
      )}

      {/* Pages */}
      {!showSearch && page==="login"   && <Login   onLogin={handleLogin}/>}
      {!showSearch && page==="home"    && (
        <Home
          onNavigate={navigate}
          user={user}
          onUpgrade={()=>setUpgrade(true)}
        />
      )}
      {!showSearch && page==="profile" && (
        <Profile
          onNavigate={navigate}
          user={user}
          onLogout={handleLogout}
          onUpgrade={()=>setUpgrade(true)}
        />
      )}
      {!showSearch && page==="admin" && user?.role==="admin" && (
        <Admin onNavigate={navigate} user={user}/>
      )}

      {/* Payment modal */}
      {upgrade && (
        <Payment
          user={user}
          onClose={()=>setUpgrade(false)}
          onSuccess={(planId)=>{
            const updated={...user,plan:planId};
            setUser(updated);
            localStorage.setItem("streamx_user",JSON.stringify(updated));
            setUpgrade(false);
          }}
        />
      )}

      {/* Bottom navigation — only show when logged in */}
      {page!=="login" && page!=="loading" && (
        <div style={{
          position:"fixed",bottom:0,left:0,right:0,zIndex:300,
          background:"rgba(7,7,12,.98)",
          borderTop:"1px solid rgba(255,255,255,.08)",
          display:"flex",
          padding:"8px 0 calc(8px + env(safe-area-inset-bottom))",
          fontFamily:"Inter,sans-serif",
        }}>
          {[
            {id:"home",    icon:"🏠", label:"Home"},
            {id:"search",  icon:"🔍", label:"Search"},
            {id:"profile", icon:"👤", label:"Profile"},
            ...(user?.role==="admin"?[{id:"admin",icon:"⚡",label:"Admin"}]:[]),
          ].map(n=>{
            const isActive =
              (n.id==="home"    && page==="home"    && !showSearch) ||
              (n.id==="search"  && showSearch) ||
              (n.id==="profile" && page==="profile" && !showSearch) ||
              (n.id==="admin"   && page==="admin"   && !showSearch);
            return(
              <button key={n.id} onClick={()=>navigate(n.id)}
                style={{flex:1,background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",gap:3,cursor:"pointer",padding:"6px 0"}}>
                <span style={{fontSize:20}}>{n.icon}</span>
                <span style={{fontSize:10,fontWeight:600,color:isActive?"#e50914":"#555"}}>{n.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}