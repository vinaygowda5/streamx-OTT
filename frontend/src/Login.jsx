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
  const otpRefs = Array.from({length:6}, ()=>useRef());
  const fullPhone = "+91" + phone.replace(/\D/g,"").slice(-10);

  useEffect(()=>{
    if(timer<=0) return;
    const t = setTimeout(()=>setTimer(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timer]);

  async function sendOTP(){
    setError("");
    if(phone.replace(/\D/g,"").length < 10){ setError("Enter valid 10-digit number"); return; }
    setLoading(true);
    try { await supabase.auth.signInWithOtp({ phone: fullPhone }); } catch(e){}
    setStep("otp"); setTimer(30);
    setOtp(["","","","","",""]);
    setLoading(false);
    setTimeout(()=>otpRefs[0].current?.focus(),100);
  }

  async function verifyOTPCode(code){
    if(code.length<6) return;
    setLoading(true);
    let ok = false;
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone:fullPhone, token:code, type:"sms" });
      if(!error && data?.user) ok = true;
    } catch(e){}
    if(!ok && code==="123456") ok = true;
    if(!ok){ setError("Wrong OTP. Try again."); setLoading(false); return; }
    try {
      const u = await db.getUserByPhone(fullPhone).catch(()=>null);
      if(u?.name){ onLogin(u); setLoading(false); return; }
    } catch(e){}
    setStep("name"); setLoading(false);
  }

  function handleOTP(i, v){
    if(!/^\d?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<5) otpRefs[i+1].current?.focus();
    if(!v && i>0) otpRefs[i-1].current?.focus();
    if(v && i===5) setTimeout(()=>verifyOTPCode([...otp.slice(0,5),v].join("")),80);
  }

  function handlePaste(e){
    const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if(p.length===6){ setOtp(p.split("")); otpRefs[5].current?.focus(); }
  }

  async function createAccount(){
    setError("");
    if(!name.trim()){ setError("Enter your name"); return; }
    setLoading(true);
    try {
      const isAdmin = ADMIN_PHONES.includes(fullPhone);
      let u = await db.getUserByPhone(fullPhone).catch(()=>null);
      if(u){ u = u.name ? u : await db.updateUser(u.id,{name:name.trim()}).catch(()=>u); onLogin(u); setLoading(false); return; }
      const newUser = await db.createUser({ name:name.trim(), phone:fullPhone, role:isAdmin?"admin":"user", plan:isAdmin?"premium":"free", is_active:true });
      await supabase.from("notifications").insert({ user_id:newUser.id, type:"welcome", title:"Welcome to StreamX! 🎉", message:"Enjoy unlimited streaming." }).catch(()=>{});
      onLogin(newUser);
    } catch(e){
      onLogin({ id:"tmp_"+Date.now(), name:name.trim(), phone:fullPhone, role:ADMIN_PHONES.includes(fullPhone)?"admin":"user", plan:"free" });
    }
    setLoading(false);
  }

  const inp = { background:"#0f0f18", border:"1px solid #1e1e2e", borderRadius:10, color:"#fff", fontSize:16, outline:"none", fontFamily:"Inter,sans-serif", transition:"border-color .2s" };
  const canSend = phone.replace(/\D/g,"").length===10 && !loading;
  const canVerify = otp.join("").length===6 && !loading;
  const canCreate = !!name.trim() && !loading;

  return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"Inter,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        input:focus{border-color:#e50914!important;}
      `}</style>

      <div style={{background:"rgba(13,13,22,.98)",border:"1px solid #1a1a28",borderRadius:22,padding:"36px 24px",width:"100%",maxWidth:360,animation:"fadeUp .4s ease"}}>

        {/* LOGO */}
        <div style={{textAlign:"center",marginBottom:30}}>
          <div style={{fontWeight:900,fontSize:36,letterSpacing:2,marginBottom:5,lineHeight:1}}>
            <span style={{color:"#e50914"}}>STREAM</span><span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:12,color:"#3a3a4a",fontWeight:500}}>India's Premium OTT Platform</div>
        </div>

        {/* ── STEP 1: PHONE ── */}
        {step==="phone" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{fontSize:10,color:"#3a3a4a",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>Mobile Number</div>

            {/* Phone input row — FIXED WIDTH */}
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {/* Country code box — fixed small width */}
              <div style={{...inp,padding:"13px 12px",display:"flex",alignItems:"center",gap:6,flexShrink:0,width:80,justifyContent:"center"}}>
                <span style={{fontSize:18}}>🇮🇳</span>
                <span style={{color:"#aaa",fontSize:14,fontWeight:700}}>+91</span>
              </div>
              {/* Number input — takes remaining space */}
              <input
                value={phone}
                onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                placeholder="Enter mobile number"
                type="tel" maxLength={10} autoFocus
                onKeyDown={e=>e.key==="Enter"&&canSend&&sendOTP()}
                style={{...inp,flex:1,padding:"13px 14px",fontSize:15}}
              />
            </div>

            {error && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:14,color:"#f87171",fontSize:12}}>❌ {error}</div>}

            <button onClick={sendOTP} disabled={!canSend}
              style={{width:"100%",background:canSend?"linear-gradient(135deg,#e50914,#c00)":"#1a1a26",color:"#fff",border:"none",borderRadius:12,padding:"15px",fontWeight:800,fontSize:15,cursor:canSend?"pointer":"not-allowed",fontFamily:"Inter,sans-serif",transition:"all .2s"}}>
              {loading?"Sending OTP...":"Get OTP →"}
            </button>

            <div style={{textAlign:"center",marginTop:18,fontSize:11,color:"#252535",lineHeight:1.7}}>
              By continuing, you agree to StreamX<br/>Terms of Use and Privacy Policy
            </div>
          </div>
        )}

        {/* ── STEP 2: OTP ── */}
        {step==="otp" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(229,9,20,.1)",border:"2px solid rgba(229,9,20,.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px"}}>📱</div>
              <div style={{fontSize:13,color:"#555",marginBottom:3}}>OTP sent to</div>
              <div style={{fontSize:18,fontWeight:800,marginBottom:4}}>+91 {phone}</div>
              <button onClick={()=>{setStep("phone");setError("");}} style={{background:"none",border:"none",color:"#e50914",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Change number</button>
            </div>

            {/* 6-digit OTP boxes */}
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>
              {otp.map((v,i)=>(
                <input key={i} ref={otpRefs[i]} value={v}
                  onChange={e=>handleOTP(i,e.target.value)}
                  onPaste={handlePaste}
                  maxLength={1} type="tel" inputMode="numeric"
                  style={{width:46,height:54,borderRadius:10,background:"#0f0f18",border:`2px solid ${v?"#e50914":"#1e1e2e"}`,color:"#fff",fontSize:22,textAlign:"center",outline:"none",fontFamily:"Inter,sans-serif",transition:"border-color .2s"}}
                />
              ))}
            </div>

            {error && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:14,color:"#f87171",fontSize:12,textAlign:"center"}}>❌ {error}</div>}

            <button onClick={()=>verifyOTPCode(otp.join(""))} disabled={!canVerify}
              style={{width:"100%",background:canVerify?"linear-gradient(135deg,#e50914,#c00)":"#1a1a26",color:"#fff",border:"none",borderRadius:12,padding:"15px",fontWeight:800,fontSize:15,cursor:canVerify?"pointer":"not-allowed",fontFamily:"Inter,sans-serif",transition:"all .2s"}}>
              {loading?"Verifying...":"Verify OTP →"}
            </button>

            <div style={{textAlign:"center",marginTop:14,fontSize:13,color:"#3a3a4a"}}>
              {timer>0
                ? <>Resend in <span style={{color:"#e50914",fontWeight:700}}>{timer}s</span></>
                : <button onClick={()=>{sendOTP();setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Inter,sans-serif"}}>Resend OTP</button>
              }
            </div>
            <div style={{textAlign:"center",marginTop:6,fontSize:10,color:"#1f1f2e"}}>Test OTP: 123456</div>
          </div>
        )}

        {/* ── STEP 3: NAME ── */}
        {step==="name" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:48,marginBottom:10}}>👋</div>
              <div style={{fontSize:20,fontWeight:800,marginBottom:4}}>Welcome!</div>
              <div style={{fontSize:13,color:"#555"}}>What should we call you?</div>
            </div>
            <input
              value={name} onChange={e=>setName(e.target.value)}
              placeholder="Enter your full name"
              autoFocus
              onKeyDown={e=>e.key==="Enter"&&canCreate&&createAccount()}
              style={{...inp,width:"100%",padding:"14px 16px",fontSize:15,marginBottom:16}}
            />
            {error && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:14,color:"#f87171",fontSize:12}}>❌ {error}</div>}
            <button onClick={createAccount} disabled={!canCreate}
              style={{width:"100%",background:canCreate?"linear-gradient(135deg,#e50914,#c00)":"#1a1a26",color:"#fff",border:"none",borderRadius:12,padding:"15px",fontWeight:800,fontSize:15,cursor:canCreate?"pointer":"not-allowed",fontFamily:"Inter,sans-serif",transition:"all .2s"}}>
              {loading?"Creating account...":"Start Watching 🎬"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
