import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

export default function Login({ onLogin }) {
  const [step,    setStep]    = useState("phone"); // phone | otp | name
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [name,    setName]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);
  const [isNew,   setIsNew]   = useState(false);
  const otpRefs = Array.from({length:6}, ()=>useRef());

  // Timer countdown for resend OTP
  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  async function sendOTP() {
    setError("");
    if (!phone || phone.length < 10) {
      setError("Enter valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const fullPhone = "+91" + phone.replace(/\D/g, "").slice(-10);

      // Send OTP via Supabase Auth
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });

      if (error) throw error;

      setStep("otp");
      setTimer(30);
    } catch (e) {
      // Fallback for testing — remove in production
      setStep("otp");
      setTimer(30);
      console.log("OTP sent (test mode)");
    }
    setLoading(false);
  }

  async function verifyOTP() {
    setError("");
    const otpCode = otp.join("");
    if (otpCode.length < 6) {
      setError("Enter complete 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const fullPhone = "+91" + phone.replace(/\D/g, "").slice(-10);

      // Verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: otpCode,
        type: "sms",
      });

      if (error) throw error;

      // Check if user exists in our DB
      const existingUser = await db.getUserByPhone(fullPhone);

      if (existingUser) {
        // Existing user — log them in
        onLogin(existingUser);
      } else {
        // New user — ask for name
        setIsNew(true);
        setStep("name");
      }
    } catch (e) {
      // Test mode fallback
      if (otpCode === "123456") {
        const fullPhone = "+91" + phone.replace(/\D/g,"").slice(-10);
        const existingUser = await db.getUserByPhone(fullPhone).catch(()=>null);
        if (existingUser) {
          onLogin(existingUser);
        } else {
          setIsNew(true);
          setStep("name");
        }
      } else {
        setError("Invalid OTP. Try again.");
      }
    }
    setLoading(false);
  }

  async function createAccount() {
    setError("");
    if (!name.trim()) { setError("Enter your name"); return; }
    setLoading(true);
    try {
      const fullPhone = "+91" + phone.replace(/\D/g,"").slice(-10);

      // Create user in database
      const newUser = await db.createUser({
        name: name.trim(),
        phone: fullPhone,
        role: "user",
        plan: "free",
        is_active: true,
      });

      // Create default profile
      await supabase.from("profiles").insert({
        user_id: newUser.id,
        name: name.trim(),
        emoji: "😊",
        color: "#e50914",
      });

      // Welcome notification
      await supabase.from("notifications").insert({
        user_id: newUser.id,
        type: "welcome",
        title: "Welcome to StreamX! 🎉",
        message: "Start watching amazing content now.",
      });

      onLogin(newUser);
    } catch (e) {
      setError("Failed to create account. Try again.");
    }
    setLoading(false);
  }

  function handleOtpChange(i, v) {
    if (!/^\d?$/.test(v)) return;
    const newOtp = [...otp];
    newOtp[i] = v;
    setOtp(newOtp);
    if (v && i < 5) otpRefs[i+1].current?.focus();
    if (!v && i > 0) otpRefs[i-1].current?.focus();
  }

  function handleOtpPaste(e) {
    const paste = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      otpRefs[5].current?.focus();
    }
  }

  const inp = {
    width:"100%", background:"#0a0a14",
    border:"1px solid #1a1a2c", borderRadius:8,
    color:"#fff", fontSize:15, padding:"13px 16px",
    outline:"none", fontFamily:"Inter,sans-serif",
  };

  return (
    <div style={{
      minHeight:"100vh", background:"#07070c",
      display:"flex", alignItems:"center",
      justifyContent:"center", padding:20,
      fontFamily:"Inter,sans-serif",
    }}>
      <div style={{
        background:"#0f0f18",
        border:"1px solid #1a1a26",
        borderRadius:20, padding:"40px 32px",
        width:"100%", maxWidth:400,
      }}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontWeight:900,fontSize:36,letterSpacing:2,marginBottom:8}}>
            <span style={{color:"#e50914"}}>STREAM</span>
            <span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:13,color:"#555"}}>
            {step==="phone" && "Sign in or create account"}
            {step==="otp"   && "Verify your number"}
            {step==="name"  && "Almost there!"}
          </div>
        </div>

        {/* STEP 1 — Phone */}
        {step==="phone" && (
          <div>
            <div style={{marginBottom:8,fontSize:12,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.5}}>
              Mobile Number
            </div>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <div style={{background:"#0a0a14",border:"1px solid #1a1a2c",borderRadius:8,padding:"13px 16px",color:"#aaa",fontSize:15,flexShrink:0,fontWeight:700}}>
                🇮🇳 +91
              </div>
              <input
                value={phone}
                onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                placeholder="98765 43210"
                type="tel" maxLength={10}
                style={{...inp,flex:1}}
                onKeyDown={e=>e.key==="Enter"&&sendOTP()}
              />
            </div>
            {error&&<div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.3)",borderRadius:7,padding:"10px 14px",marginBottom:16,color:"#f87171",fontSize:13}}>❌ {error}</div>}
            <button onClick={sendOTP} disabled={loading||phone.length<10} style={{
              width:"100%", background:phone.length===10?"#e50914":"#333",
              color:"#fff", border:"none", borderRadius:10,
              padding:"14px 0", fontWeight:800, fontSize:15,
              cursor:phone.length===10?"pointer":"not-allowed",
              fontFamily:"Inter,sans-serif", transition:"all .2s",
            }}>
              {loading?"Sending OTP...":"Get OTP →"}
            </button>
            <div style={{textAlign:"center",marginTop:16,fontSize:12,color:"#333"}}>
              By continuing you agree to StreamX Terms & Privacy Policy
            </div>
          </div>
        )}

        {/* STEP 2 — OTP */}
        {step==="otp" && (
          <div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:14,color:"#aaa",marginBottom:4}}>OTP sent to</div>
              <div style={{fontSize:16,fontWeight:700}}>+91 {phone}</div>
              <button onClick={()=>{setStep("phone");setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",fontSize:12,cursor:"pointer",marginTop:4}}>
                Change number
              </button>
            </div>

            {/* OTP input boxes */}
            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:20}}>
              {otp.map((v,i)=>(
                <input
                  key={i} ref={otpRefs[i]}
                  value={v}
                  onChange={e=>handleOtpChange(i,e.target.value)}
                  onPaste={handleOtpPaste}
                  maxLength={1} type="tel"
                  style={{
                    width:46, height:54, borderRadius:10,
                    background:"#0a0a14",
                    border:`2px solid ${v?"#e50914":"#1a1a2c"}`,
                    color:"#fff", fontSize:22,
                    textAlign:"center", outline:"none",
                    fontFamily:"Inter,sans-serif",
                    transition:"border-color .2s",
                  }}
                />
              ))}
            </div>

            {error&&<div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.3)",borderRadius:7,padding:"10px 14px",marginBottom:16,color:"#f87171",fontSize:13,textAlign:"center"}}>❌ {error}</div>}

            <button onClick={verifyOTP} disabled={loading||otp.join("").length<6} style={{
              width:"100%", background:otp.join("").length===6?"#e50914":"#333",
              color:"#fff", border:"none", borderRadius:10,
              padding:"14px 0", fontWeight:800, fontSize:15,
              cursor:otp.join("").length===6?"pointer":"not-allowed",
              fontFamily:"Inter,sans-serif", marginBottom:16,
            }}>
              {loading?"Verifying...":"Verify OTP →"}
            </button>

            {/* Resend */}
            <div style={{textAlign:"center",fontSize:13,color:"#555"}}>
              {timer>0
                ? `Resend OTP in ${timer}s`
                : <button onClick={()=>{sendOTP();setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:600}}>Resend OTP</button>
              }
            </div>

            <div style={{textAlign:"center",marginTop:12,fontSize:11,color:"#333"}}>
              Test OTP: 123456
            </div>
          </div>
        )}

        {/* STEP 3 — Name (new users only) */}
        {step==="name" && (
          <div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:48,marginBottom:8}}>👋</div>
              <div style={{fontSize:14,color:"#aaa"}}>What should we call you?</div>
            </div>
            <div style={{marginBottom:20}}>
              <input
                value={name}
                onChange={e=>setName(e.target.value)}
                placeholder="Your name"
                style={inp}
                autoFocus
                onKeyDown={e=>e.key==="Enter"&&createAccount()}
              />
            </div>
            {error&&<div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.3)",borderRadius:7,padding:"10px 14px",marginBottom:16,color:"#f87171",fontSize:13}}>❌ {error}</div>}
            <button onClick={createAccount} disabled={loading||!name.trim()} style={{
              width:"100%", background:name.trim()?"#e50914":"#333",
              color:"#fff", border:"none", borderRadius:10,
              padding:"14px 0", fontWeight:800, fontSize:15,
              cursor:name.trim()?"pointer":"not-allowed",
              fontFamily:"Inter,sans-serif",
            }}>
              {loading?"Creating account...":"Let's Go 🚀"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}