import { useState } from "react";

export default function Login({ onLogin, localUsers = [] }) {
  const [tab,     setTab]     = useState("login");
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("demo@streamx.in");
  const [pass,    setPass]    = useState("Demo@1234");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(""); setLoading(true);

    // Local login — works without backend
    const found = localUsers.find(u => u.email===email && u.password===pass);
    if (found && tab==="login") {
      const userData = {id:found.id,name:found.name,email:found.email,role:found.role,plan:found.plan};
      onLogin(userData);
      setLoading(false);
      return;
    }

    // Register locally
    if (tab==="register") {
      if (!name||!email||!pass) { setError("All fields required"); setLoading(false); return; }
      if (pass.length<6) { setError("Password min 6 characters"); setLoading(false); return; }
      const userData = {id:"u"+Date.now(),name,email,role:"user",plan:"Free"};
      onLogin(userData);
      setLoading(false);
      return;
    }

    // Try real backend
    try {
      const res = await fetch((import.meta.env.VITE_API_URL||"http://localhost:5000/api")+"/auth/login",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({email,password:pass})
      });
      const data = await res.json();
      if (data.success) {
        if (data.data?.accessToken) localStorage.setItem("streamx_token",data.data.accessToken);
        onLogin(data.data?.user||{name:email,email});
      } else {
        setError(data.message||"Invalid credentials");
      }
    } catch {
      setError("Invalid email or password");
    }
    setLoading(false);
  }

  const inp = {width:"100%",background:"#0a0a14",border:"1px solid #1a1a2c",borderRadius:7,color:"#fff",fontSize:13,padding:"10px 12px",outline:"none",fontFamily:"Inter,sans-serif"};

  return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <div style={{background:"#0f0f18",border:"1px solid #1a1a26",borderRadius:16,padding:36,width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:32,fontWeight:900,fontSize:32,letterSpacing:1}}>
          <span style={{color:"#e50914"}}>STREAM</span><span style={{color:"#fff"}}>X</span>
        </div>

        <div style={{display:"flex",background:"#111120",borderRadius:8,padding:4,marginBottom:28}}>
          {["login","register"].map(t=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,background:tab===t?"#e50914":"transparent",color:"#fff",border:"none",borderRadius:6,padding:"9px 0",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"Inter,sans-serif",transition:"all .2s"}}>
              {t==="login"?"Sign In":"Register"}
            </button>
          ))}
        </div>

        {tab==="register"&&(
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,color:"#555",fontWeight:700,display:"block",marginBottom:6,textTransform:"uppercase"}}>Full Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inp}/>
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,color:"#555",fontWeight:700,display:"block",marginBottom:6,textTransform:"uppercase"}}>Email</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@email.com" style={inp}/>
        </div>

        <div style={{marginBottom:24}}>
          <label style={{fontSize:11,color:"#555",fontWeight:700,display:"block",marginBottom:6,textTransform:"uppercase"}}>Password</label>
          <input value={pass} onChange={e=>setPass(e.target.value)} type="password" placeholder="••••••••" style={inp}/>
        </div>

        {error&&<div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.3)",borderRadius:7,padding:"10px 14px",marginBottom:16,color:"#f87171",fontSize:13}}>❌ {error}</div>}

        <button onClick={handleSubmit} disabled={loading} style={{width:"100%",background:loading?"#666":"#e50914",color:"#fff",border:"none",borderRadius:8,padding:"13px 0",fontWeight:800,fontSize:14,cursor:loading?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",transition:"all .2s"}}>
          {loading?"Please wait...":(tab==="login"?"Sign In":"Create Account")}
        </button>

        <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#444"}}>
          Demo: demo@streamx.in / Demo@1234
        </div>
      </div>
    </div>
  );
}