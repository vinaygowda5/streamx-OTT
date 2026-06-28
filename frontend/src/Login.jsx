import { useState, useEffect, useRef } from "react";

/*
  Namma Cinema Login — Secure Version
  - All OTP logic runs on YOUR backend (Railway)
  - No Supabase keys exposed in frontend
  - Email OTP via Resend (real email delivery)
  - JWT token returned and stored in localStorage

  ── WHERE TO PUT YOUR BACKEND URL ──
  Line below: replace YOUR_RAILWAY_URL with your Railway backend URL
  Example: https://nammacinema-backend.railway.app
*/
const API = "https://streamx-ott-production.up.railway.app"; // ← PASTE YOUR RAILWAY URL HERE

const PLAN_DEVICES = {
  free:1, plan_mobile:1, plan_basic:2, plan_premium:4, plan_annual:4, premium:4,
};

function getDeviceId() {
  let id = localStorage.getItem("nammacinema_device_id");
  if (!id) { id = "dev_"+Date.now()+"_"+Math.random().toString(36).slice(2,10); localStorage.setItem("nammacinema_device_id",id); }
  return id;
}

export default function Login({ onLogin }) {
  const [step,    setStep]    = useState("email");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);
  const [isNew,   setIsNew]   = useState(false);

  const refs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  useEffect(()=>{
    if(timer<=0)return;
    const t=setTimeout(()=>setTimer(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timer]);

  const canSend   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !loading;
  const canVerify = otp.join("").length===6 && !loading;

  async function sendOTP(){
    setError(""); if(!canSend)return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/send-otp`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if(!data.success){ setError(data.msg||"Failed to send OTP"); setLoading(false); return; }
      setStep("otp"); setTimer(60); setOtp(["","","","","",""]);
      setTimeout(()=>refs[0].current?.focus(),150);
    } catch(e){ setError("Network error. Check your internet."); }
    setLoading(false);
  }

  async function verifyOTP(code){
    const c = code||otp.join("");
    if(c.length<6)return;
    setError(""); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/verify-otp`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ email:email.trim().toLowerCase(), code:c, phone:phone?"+91"+phone:"" }),
      });
      const data = await res.json();
      if(!data.success){ setError(data.msg||"Wrong OTP"); setLoading(false); setOtp(["","","","","",""]); setTimeout(()=>refs[0].current?.focus(),100); return; }

      // Save JWT token
      localStorage.setItem("nammacinema_token", data.data.token);
      localStorage.setItem("nammacinema_user", JSON.stringify(data.data.user));
      onLogin(data.data.user);
    } catch(e){ setError("Network error. Check your internet."); }
    setLoading(false);
  }

  function handleOTPInput(i,v){
    if(!/^\d?$/.test(v))return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v&&i<5) refs[i+1].current?.focus();
    if(!v&&i>0) refs[i-1].current?.focus();
    if(v&&i===5) setTimeout(()=>verifyOTP([...otp.slice(0,5),v].join("")),80);
  }

  function handlePaste(e){
    e.preventDefault();
    const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if(p.length===6){ setOtp(p.split("")); refs[5].current?.focus(); setTimeout(()=>verifyOTP(p),80); }
  }

  const inp = { width:"100%",height:52,background:"#0f0f18",border:"1.5px solid #1e1e2e",borderRadius:10,color:"#fff",fontSize:15,padding:"0 14px",fontFamily:"Inter,sans-serif",outline:"none" };
  const btn = (on) => ({ width:"100%",height:52,background:on?"linear-gradient(135deg,#e50914,#c00)":"#141420",color:"#fff",border:"none",borderRadius:12,fontWeight:800,fontSize:15,cursor:on?"pointer":"not-allowed",fontFamily:"Inter,sans-serif",transition:"all .2s" });

  return(
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .otp-inp{width:46px;height:56px;border-radius:10px;background:#0f0f18;border:2px solid #1e1e2e;color:#fff;font-size:22px;text-align:center;font-family:Inter,sans-serif;transition:border-color .2s;-webkit-appearance:none;outline:none;}
        .otp-inp:focus{border-color:#e50914;}
        input:focus{border-color:#e50914!important;}
      `}</style>

      <div style={{background:"rgba(13,13,22,.98)",border:"1px solid #1a1a28",borderRadius:22,padding:"36px 24px 28px",width:"100%",maxWidth:380,animation:"fadeUp .4s ease"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontWeight:900,fontSize:36,letterSpacing:2,lineHeight:1,marginBottom:5}}>
            <span style={{color:"#e50914"}}>NAMMA</span><span style={{color:"#fff"}}> CINEMA</span>
          </div>
          <div style={{fontSize:12,color:"#2a2a3a"}}>ನಮ್ಮ ಸಿನಿಮಾ | India's Own OTT</div>
        </div>

        {/* STEP 1 — EMAIL */}
        {step==="email"&&(
          <div style={{animation:"fadeUp .25s ease"}}>
            <div style={{fontSize:13,color:"#aaa",marginBottom:20,textAlign:"center",lineHeight:1.7,fontWeight:600}}>
              Enter your email to continue<br/><span style={{fontSize:11,color:"#444"}}>We'll send a 6-digit verification code</span>
            </div>
            <div style={{fontSize:10,color:"#333",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Email Address</div>
            <input style={inp} value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" autoFocus onKeyDown={e=>e.key==="Enter"&&canSend&&sendOTP()}/>
            {error&&<div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"9px 12px",marginTop:10,color:"#f87171",fontSize:12}}>❌ {error}</div>}
            <button style={{...btn(canSend),marginTop:14}} onClick={sendOTP} disabled={!canSend}>{loading?"Sending code...":"Send OTP →"}</button>
            <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#1a1a28",lineHeight:1.8}}>By continuing, you agree to Namma Cinema Terms &amp; Privacy Policy</div>
          </div>
        )}

        {/* STEP 2 — OTP */}
        {step==="otp"&&(
          <div style={{animation:"fadeUp .25s ease"}}>
            <div style={{textAlign:"center",marginBottom:22}}>
              <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(229,9,20,.1)",border:"2px solid rgba(229,9,20,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>📧</div>
              <div style={{fontSize:13,color:"#555",marginBottom:2}}>Code sent to</div>
              <div style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:4}}>{email}</div>
              <div style={{fontSize:12,color:"#444",marginBottom:6}}>Check your inbox and spam folder</div>
              <button onClick={()=>{setStep("email");setError("");setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Change email</button>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>
              {otp.map((v,i)=><input key={i} ref={refs[i]} value={v} onChange={e=>handleOTPInput(i,e.target.value)} onPaste={handlePaste} maxLength={1} type="tel" inputMode="numeric" className="otp-inp" style={{borderColor:v?"#e50914":"#1e1e2e"}}/>)}
            </div>
            {error&&<div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"9px 12px",marginBottom:12,color:"#f87171",fontSize:12,textAlign:"center"}}>❌ {error}</div>}
            <button style={{...btn(canVerify),marginBottom:12}} onClick={()=>verifyOTP()} disabled={!canVerify}>{loading?"Verifying...":"Verify OTP →"}</button>
            <div style={{textAlign:"center",fontSize:13}}>
              {timer>0
                ?<span style={{color:"#333"}}>Resend in <span style={{color:"#e50914",fontWeight:700}}>{timer}s</span></span>
                :<button onClick={()=>{sendOTP();setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Inter,sans-serif"}}>Resend OTP</button>
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
