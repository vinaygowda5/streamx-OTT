import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

const ADMIN_PHONES = ["+918660570052", "+919000000000", "+919000000001"];

export default function Login({ onLogin }) {
  const [step,    setStep]    = useState("phone");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [name,    setName]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);

  const r0=useRef(),r1=useRef(),r2=useRef(),r3=useRef(),r4=useRef(),r5=useRef();
  const refs = [r0,r1,r2,r3,r4,r5];

  useEffect(()=>{
    if(timer<=0) return;
    const t=setTimeout(()=>setTimer(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timer]);

  const fullPhone = "+91"+phone.replace(/\D/g,"").slice(-10);
  const canSend   = phone.replace(/\D/g,"").length===10 && !loading;
  const canVerify = otp.join("").length===6 && !loading;
  const canCreate = !!name.trim() && !loading;

  async function sendOTP(){
    setError(""); if(!canSend) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if(error && !error.message?.includes("already")) {
      setError("Failed to send OTP. Check your number and try again.");
      return;
    }
    setStep("otp"); setTimer(60);
    setOtp(["","","","","",""]);
    setTimeout(()=>r0.current?.focus(),150);
  }

  async function verifyOTP(code){
    const c = code || otp.join("");
    if(c.length<6) return;
    setError(""); setLoading(true);

    const { data, error } = await supabase.auth.verifyOtp({
      phone: fullPhone, token: c, type: "sms"
    });

    if(error || !data?.user){
      setError("Wrong OTP. Please try again.");
      setLoading(false);
      setOtp(["","","","","",""]);
      setTimeout(()=>r0.current?.focus(),100);
      return;
    }

    // OTP verified — check if user exists
    try {
      const existing = await db.getUserByPhone(fullPhone).catch(()=>null);
      if(existing?.name){ onLogin(existing); setLoading(false); return; }
    } catch(e){}
    setStep("name"); setLoading(false);
  }

  function handleOTPInput(i,v){
    if(!/^\d?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<5) refs[i+1].current?.focus();
    if(!v && i>0) refs[i-1].current?.focus();
    if(v && i===5){
      const code=[...otp.slice(0,5),v].join("");
      setTimeout(()=>verifyOTP(code),80);
    }
  }

  function handlePaste(e){
    e.preventDefault();
    const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if(p.length===6){ setOtp(p.split("")); refs[5].current?.focus(); setTimeout(()=>verifyOTP(p),80); }
  }

  async function createAccount(){
    if(!canCreate) return;
    setError(""); setLoading(true);
    try {
      const isAdmin = ADMIN_PHONES.includes(fullPhone);
      let existing = await db.getUserByPhone(fullPhone).catch(()=>null);
      if(existing){
        if(!existing.name) existing = await db.updateUser(existing.id,{name:name.trim()}).catch(()=>existing);
        onLogin(existing); setLoading(false); return;
      }
      const newUser = await db.createUser({
        name:name.trim(), phone:fullPhone,
        role:isAdmin?"admin":"user",
        plan:isAdmin?"premium":"free",
        is_active:true,
      });
      await supabase.from("notifications").insert({
        user_id:newUser.id, type:"welcome",
        title:"Welcome to StreamX! 🎉",
        message:"Enjoy unlimited streaming.",
      }).catch(()=>{});
      onLogin(newUser);
    } catch(e){
      onLogin({ id:"tmp_"+Date.now(), name:name.trim(), phone:fullPhone, role:ADMIN_PHONES.includes(fullPhone)?"admin":"user", plan:"free", is_active:true });
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .otp-inp{width:46px;height:56px;border-radius:10px;background:#0f0f18;border:2px solid #1e1e2e;color:#fff;font-size:22px;text-align:center;font-family:Inter,sans-serif;transition:border-color .2s;-webkit-appearance:none;outline:none;}
        .otp-inp:focus{border-color:#e50914;}
        .txt-inp{width:100%;height:52px;background:#0f0f18;border:1.5px solid #1e1e2e;border-radius:10px;color:#fff;font-size:16px;padding:0 14px;font-family:Inter,sans-serif;transition:border-color .2s;-webkit-appearance:none;outline:none;}
        .txt-inp:focus{border-color:#e50914;}
        .pri-btn{width:100%;height:52px;border:none;border-radius:12px;font-weight:800;font-size:15px;font-family:Inter,sans-serif;transition:all .2s;letter-spacing:.3px;cursor:pointer;}
      `}</style>

      <div style={{background:"rgba(13,13,22,.98)",border:"1px solid #1a1a28",borderRadius:22,padding:"40px 24px 32px",width:"100%",maxWidth:360,animation:"fadeUp .4s ease"}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontWeight:900,fontSize:38,letterSpacing:2,lineHeight:1,marginBottom:6}}>
            <span style={{color:"#e50914"}}>STREAM</span><span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:12,color:"#2a2a3a",fontWeight:500,letterSpacing:.5}}>India's Premium OTT Platform</div>
        </div>

        {/* STEP 1 — PHONE */}
        {step==="phone" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{fontSize:10,color:"#2a2a3a",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>Mobile Number</div>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {/* Country code — fixed small */}
              <div style={{background:"#0f0f18",border:"1.5px solid #1e1e2e",borderRadius:10,padding:"0 12px",display:"flex",alignItems:"center",gap:6,flexShrink:0,width:76,height:52,justifyContent:"center"}}>
                <span style={{fontSize:17}}>🇮🇳</span>
                <span style={{color:"#888",fontSize:13,fontWeight:700}}>+91</span>
              </div>
              <input className="txt-inp" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="Enter mobile number" type="tel" maxLength={10} autoFocus onKeyDown={e=>e.key==="Enter"&&canSend&&sendOTP()} style={{flex:1,width:"auto"}}/>
            </div>
            {error && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:16,color:"#f87171",fontSize:12,fontWeight:500}}>❌ {error}</div>}
            <button className="pri-btn" onClick={sendOTP} disabled={!canSend} style={{background:canSend?"linear-gradient(135deg,#e50914,#c00)":"#141420",color:"#fff",cursor:canSend?"pointer":"not-allowed"}}>
              {loading?"Sending OTP...":"Get OTP →"}
            </button>
            <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#1e1e2e",lineHeight:1.8}}>By continuing, you agree to StreamX<br/>Terms of Use and Privacy Policy</div>
          </div>
        )}

        {/* STEP 2 — OTP */}
        {step==="otp" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{width:60,height:60,borderRadius:"50%",background:"rgba(229,9,20,.1)",border:"2px solid rgba(229,9,20,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,margin:"0 auto 14px"}}>📱</div>
              <div style={{fontSize:13,color:"#555",marginBottom:4}}>OTP sent to</div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:8}}>+91 {phone}</div>
              <button onClick={()=>{setStep("phone");setError("");setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Change number</button>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:22}}>
              {otp.map((v,i)=>(
                <input key={i} ref={refs[i]} value={v} onChange={e=>handleOTPInput(i,e.target.value)} onPaste={handlePaste} maxLength={1} type="tel" inputMode="numeric" className="otp-inp" style={{borderColor:v?"#e50914":"#1e1e2e"}}/>
              ))}
            </div>
            {error && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:16,color:"#f87171",fontSize:12,textAlign:"center",fontWeight:500}}>❌ {error}</div>}
            <button className="pri-btn" onClick={()=>verifyOTP()} disabled={!canVerify} style={{background:canVerify?"linear-gradient(135deg,#e50914,#c00)":"#141420",color:"#fff",cursor:canVerify?"pointer":"not-allowed"}}>
              {loading?"Verifying...":"Verify OTP →"}
            </button>
            <div style={{textAlign:"center",marginTop:16,fontSize:13}}>
              {timer>0
                ? <span style={{color:"#333"}}>Resend in <span style={{color:"#e50914",fontWeight:700}}>{timer}s</span></span>
                : <button onClick={()=>{sendOTP();setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Inter,sans-serif"}}>Resend OTP</button>
              }
            </div>
          </div>
        )}

        {/* STEP 3 — NAME */}
        {step==="name" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:52,marginBottom:12}}>👋</div>
              <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:6}}>Welcome!</div>
              <div style={{fontSize:13,color:"#555"}}>What should we call you?</div>
            </div>
            <input className="txt-inp" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" autoFocus onKeyDown={e=>e.key==="Enter"&&canCreate&&createAccount()} style={{marginBottom:20}}/>
            {error && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:16,color:"#f87171",fontSize:12,fontWeight:500}}>❌ {error}</div>}
            <button className="pri-btn" onClick={createAccount} disabled={!canCreate} style={{background:canCreate?"linear-gradient(135deg,#e50914,#c00)":"#141420",color:"#fff",cursor:canCreate?"pointer":"not-allowed"}}>
              {loading?"Creating account...":"Start Watching 🎬"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
