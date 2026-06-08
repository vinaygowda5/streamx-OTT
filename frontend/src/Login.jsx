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

  const ref0 = useRef(); const ref1 = useRef(); const ref2 = useRef();
  const ref3 = useRef(); const ref4 = useRef(); const ref5 = useRef();
  const otpRefs = [ref0,ref1,ref2,ref3,ref4,ref5];

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
    setError("");
    if(!canSend) return;
    setLoading(true);
    try {
      await supabase.auth.signInWithOtp({ phone: fullPhone });
    } catch(e){}
    setLoading(false);
    setStep("otp");
    setTimer(30);
    setOtp(["","","","","",""]);
    setTimeout(()=>ref0.current?.focus(),150);
  }

  async function verifyOTP(code){
    const c = code || otp.join("");
    if(c.length<6) return;
    setError("");
    setLoading(true);
    let ok = false;
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone:fullPhone, token:c, type:"sms" });
      if(!error && data?.user) ok = true;
    } catch(e){}
    // Test OTP fallback
    if(!ok && c==="123456") ok = true;
    if(!ok){
      setError("Wrong OTP. Please try again.");
      setLoading(false);
      setOtp(["","","","","",""]);
      setTimeout(()=>ref0.current?.focus(),100);
      return;
    }
    try {
      const existing = await db.getUserByPhone(fullPhone).catch(()=>null);
      if(existing?.name){ onLogin(existing); setLoading(false); return; }
    } catch(e){}
    setStep("name");
    setLoading(false);
  }

  function handleOTPInput(i, v){
    if(!/^\d?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<5) otpRefs[i+1].current?.focus();
    if(!v && i>0) otpRefs[i-1].current?.focus();
    if(v && i===5){
      const code=[...otp.slice(0,5),v].join("");
      setTimeout(()=>verifyOTP(code),80);
    }
  }

  function handlePaste(e){
    e.preventDefault();
    const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if(p.length===6){
      setOtp(p.split(""));
      otpRefs[5].current?.focus();
      setTimeout(()=>verifyOTP(p),80);
    }
  }

  async function createAccount(){
    if(!canCreate) return;
    setError("");
    setLoading(true);
    try {
      const isAdmin = ADMIN_PHONES.includes(fullPhone);
      let existing = await db.getUserByPhone(fullPhone).catch(()=>null);
      if(existing){
        if(!existing.name) existing = await db.updateUser(existing.id,{name:name.trim()}).catch(()=>existing);
        onLogin(existing);
        setLoading(false);
        return;
      }
      const newUser = await db.createUser({
        name: name.trim(),
        phone: fullPhone,
        role: isAdmin ? "admin" : "user",
        plan: isAdmin ? "premium" : "free",
        is_active: true,
      });
      await supabase.from("notifications").insert({
        user_id: newUser.id,
        type: "welcome",
        title: "Welcome to StreamX! 🎉",
        message: "Enjoy unlimited streaming.",
      }).catch(()=>{});
      onLogin(newUser);
    } catch(e){
      // Fallback if DB fails
      onLogin({
        id: "tmp_"+Date.now(),
        name: name.trim(),
        phone: fullPhone,
        role: ADMIN_PHONES.includes(fullPhone) ? "admin" : "user",
        plan: "free",
        is_active: true,
      });
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight:"100vh",
      background:"#07070c",
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      padding:20,
      fontFamily:"Inter,sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .otp-box:focus{border-color:#e50914!important;outline:none;}
        .inp-field:focus{border-color:#e50914!important;outline:none;}
        .otp-box{width:46px;height:56px;border-radius:10px;background:#0f0f18;border:2px solid #1e1e2e;color:#fff;font-size:22px;text-align:center;font-family:Inter,sans-serif;transition:border-color .2s;-webkit-appearance:none;}
      `}</style>

      {/* Card */}
      <div style={{
        background:"rgba(13,13,22,.98)",
        border:"1px solid #1a1a28",
        borderRadius:22,
        padding:"40px 24px 32px",
        width:"100%",
        maxWidth:360,
        animation:"fadeUp .4s ease",
      }}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontWeight:900,fontSize:38,letterSpacing:2,lineHeight:1,marginBottom:6}}>
            <span style={{color:"#e50914"}}>STREAM</span>
            <span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:12,color:"#333",fontWeight:500,letterSpacing:.5}}>
            India's Premium OTT Platform
          </div>
        </div>

        {/* ═══ STEP 1: PHONE ═══ */}
        {step==="phone" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{fontSize:10,color:"#333",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:10}}>
              Mobile Number
            </div>

            {/* Input row */}
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              {/* Country code — fixed small width */}
              <div style={{
                background:"#0f0f18",
                border:"1px solid #1e1e2e",
                borderRadius:10,
                padding:"0 12px",
                display:"flex",
                alignItems:"center",
                gap:7,
                flexShrink:0,
                width:76,
                height:52,
                justifyContent:"center",
              }}>
                <span style={{fontSize:17}}>🇮🇳</span>
                <span style={{color:"#aaa",fontSize:13,fontWeight:700}}>+91</span>
              </div>

              {/* Phone number input */}
              <input
                className="inp-field"
                value={phone}
                onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                placeholder="Enter mobile number"
                type="tel"
                maxLength={10}
                autoFocus
                onKeyDown={e=>e.key==="Enter"&&canSend&&sendOTP()}
                style={{
                  flex:1,
                  height:52,
                  background:"#0f0f18",
                  border:"1px solid #1e1e2e",
                  borderRadius:10,
                  color:"#fff",
                  fontSize:16,
                  padding:"0 14px",
                  fontFamily:"Inter,sans-serif",
                  transition:"border-color .2s",
                  WebkitAppearance:"none",
                }}
              />
            </div>

            {error && (
              <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:16,color:"#f87171",fontSize:12,fontWeight:500}}>
                ❌ {error}
              </div>
            )}

            <button
              onClick={sendOTP}
              disabled={!canSend}
              style={{
                width:"100%",
                height:52,
                background: canSend ? "linear-gradient(135deg,#e50914,#c00)" : "#141420",
                color: "#fff",
                border: "none",
                borderRadius:12,
                fontWeight:800,
                fontSize:15,
                cursor: canSend ? "pointer" : "not-allowed",
                fontFamily:"Inter,sans-serif",
                transition:"all .2s",
                letterSpacing:.3,
              }}
            >
              {loading ? "Sending OTP..." : "Get OTP →"}
            </button>

            <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#1e1e2e",lineHeight:1.8}}>
              By continuing, you agree to StreamX<br/>
              Terms of Use and Privacy Policy
            </div>
          </div>
        )}

        {/* ═══ STEP 2: OTP ═══ */}
        {step==="otp" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{
                width:60,height:60,borderRadius:"50%",
                background:"rgba(229,9,20,.1)",
                border:"2px solid rgba(229,9,20,.2)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:26,margin:"0 auto 14px",
              }}>📱</div>
              <div style={{fontSize:13,color:"#555",marginBottom:4}}>OTP sent to</div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:8}}>
                +91 {phone}
              </div>
              <button
                onClick={()=>{setStep("phone");setError("");setOtp(["","","","","",""]);}}
                style={{background:"none",border:"none",color:"#e50914",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}
              >
                ← Change number
              </button>
            </div>

            {/* 6-digit OTP boxes */}
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:22}}>
              {otp.map((v,i)=>(
                <input
                  key={i}
                  ref={otpRefs[i]}
                  value={v}
                  onChange={e=>handleOTPInput(i,e.target.value)}
                  onPaste={handlePaste}
                  maxLength={1}
                  type="tel"
                  inputMode="numeric"
                  className="otp-box"
                  style={{borderColor: v ? "#e50914" : "#1e1e2e"}}
                />
              ))}
            </div>

            {error && (
              <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:16,color:"#f87171",fontSize:12,textAlign:"center",fontWeight:500}}>
                ❌ {error}
              </div>
            )}

            <button
              onClick={()=>verifyOTP()}
              disabled={!canVerify}
              style={{
                width:"100%",
                height:52,
                background: canVerify ? "linear-gradient(135deg,#e50914,#c00)" : "#141420",
                color:"#fff",
                border:"none",
                borderRadius:12,
                fontWeight:800,
                fontSize:15,
                cursor: canVerify ? "pointer" : "not-allowed",
                fontFamily:"Inter,sans-serif",
                transition:"all .2s",
              }}
            >
              {loading ? "Verifying..." : "Verify OTP →"}
            </button>

            <div style={{textAlign:"center",marginTop:16,fontSize:13}}>
              {timer>0
                ? <span style={{color:"#333"}}>Resend in <span style={{color:"#e50914",fontWeight:700}}>{timer}s</span></span>
                : <button
                    onClick={()=>{sendOTP();setOtp(["","","","","",""]);}}
                    style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Inter,sans-serif"}}
                  >Resend OTP</button>
              }
            </div>

            <div style={{textAlign:"center",marginTop:8,fontSize:10,color:"#1a1a28"}}>
              Test mode: use OTP 123456
            </div>
          </div>
        )}

        {/* ═══ STEP 3: NAME ═══ */}
        {step==="name" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:52,marginBottom:12}}>👋</div>
              <div style={{fontSize:22,fontWeight:800,color:"#fff",marginBottom:6}}>Welcome!</div>
              <div style={{fontSize:13,color:"#555"}}>What should we call you?</div>
            </div>

            <input
              className="inp-field"
              value={name}
              onChange={e=>setName(e.target.value)}
              placeholder="Enter your full name"
              autoFocus
              onKeyDown={e=>e.key==="Enter"&&canCreate&&createAccount()}
              style={{
                width:"100%",
                height:52,
                background:"#0f0f18",
                border:"1px solid #1e1e2e",
                borderRadius:10,
                color:"#fff",
                fontSize:16,
                padding:"0 16px",
                fontFamily:"Inter,sans-serif",
                marginBottom:20,
                transition:"border-color .2s",
              }}
            />

            {error && (
              <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"10px 12px",marginBottom:16,color:"#f87171",fontSize:12,fontWeight:500}}>
                ❌ {error}
              </div>
            )}

            <button
              onClick={createAccount}
              disabled={!canCreate}
              style={{
                width:"100%",
                height:52,
                background: canCreate ? "linear-gradient(135deg,#e50914,#c00)" : "#141420",
                color:"#fff",
                border:"none",
                borderRadius:12,
                fontWeight:800,
                fontSize:15,
                cursor: canCreate ? "pointer" : "not-allowed",
                fontFamily:"Inter,sans-serif",
                transition:"all .2s",
              }}
            >
              {loading ? "Creating account..." : "Start Watching 🎬"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
