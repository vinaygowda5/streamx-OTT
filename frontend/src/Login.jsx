import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

export default function Login({ onLogin }) {
  const [step,    setStep]    = useState("phone");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [name,    setName]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(s => s-1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const fullPhone = "+91" + phone.replace(/\D/g,"").slice(-10);

  async function sendOTP() {
    setError("");
    if (phone.replace(/\D/g,"").length < 10) {
      setError("Enter valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (error) throw error;
    } catch (e) {
      // Continue anyway — show OTP screen for testing
      console.log("OTP error (test mode):", e.message);
    }
    setStep("otp");
    setTimer(30);
    setLoading(false);
  }

  async function verifyOTP() {
    setError("");
    const code = otp.join("");
    if (code.length < 6) { setError("Enter complete 6-digit OTP"); return; }
    setLoading(true);

    try {
      // Try real Supabase OTP verification
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone, token: code, type: "sms",
      });

      if (!error && data?.user) {
        // Check if user exists in our users table
        const existing = await db.getUserByPhone(fullPhone).catch(() => null);
        if (existing && existing.name) {
          onLogin(existing);
          setLoading(false);
          return;
        }
        // New user — ask for name
        setStep("name");
        setLoading(false);
        return;
      }
    } catch (e) {
      console.log("Supabase verify failed, trying test mode");
    }

    // TEST MODE — OTP 123456 always works
    if (code === "123456") {
      const existing = await db.getUserByPhone(fullPhone).catch(() => null);
      if (existing && existing.name) {
        onLogin(existing);
      } else {
        setStep("name");
      }
      setLoading(false);
      return;
    }

    setError("Invalid OTP. Use 123456 for testing.");
    setLoading(false);
  }

  async function createAccount() {
    setError("");
    if (!name.trim()) { setError("Enter your name"); return; }
    setLoading(true);

    try {
      // Check if user already exists
      const existing = await db.getUserByPhone(fullPhone).catch(() => null);
      if (existing) {
        // Update name if missing
        if (!existing.name) {
          const updated = await db.updateUser(existing.id, { name: name.trim() });
          onLogin(updated || existing);
        } else {
          onLogin(existing);
        }
        setLoading(false);
        return;
      }

      // Create new user
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
      }).catch(() => {});

      // Welcome notification
      await supabase.from("notifications").insert({
        user_id: newUser.id,
        type: "welcome",
        title: "Welcome to StreamX! 🎉",
        message: "Start watching amazing content now.",
      }).catch(() => {});

      onLogin(newUser);
    } catch (e) {
      console.error("Create account error:", e);
      // Fallback — create user directly without DB if it fails
      const fallbackUser = {
        id: "local_" + Date.now(),
        name: name.trim(),
        phone: fullPhone,
        role: "user",
        plan: "free",
      };
      onLogin(fallbackUser);
    }
    setLoading(false);
  }

  function handleOtpChange(i, v) {
    if (!/^\d?$/.test(v)) return;
    const n = [...otp]; n[i] = v; setOtp(n);
    if (v && i < 5) otpRefs[i+1].current?.focus();
    if (!v && i > 0) otpRefs[i-1].current?.focus();
  }

  function handlePaste(e) {
    const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (p.length === 6) { setOtp(p.split("")); otpRefs[5].current?.focus(); }
  }

  const inp = {
    width:"100%", background:"#0a0a14", border:"1px solid #1a1a2c",
    borderRadius:8, color:"#fff", fontSize:15, padding:"13px 16px",
    outline:"none", fontFamily:"Inter,sans-serif",
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <div style={{background:"#0f0f18",border:"1px solid #1a1a26",borderRadius:20,padding:"40px 32px",width:"100%",maxWidth:400}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontWeight:900,fontSize:36,letterSpacing:2,marginBottom:8}}>
            <span style={{color:"#e50914"}}>STREAM</span>
            <span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:13,color:"#555"}}>
            {step==="phone"&&"Sign in or create account"}
            {step==="otp"  &&"Verify your number"}
            {step==="name" &&"Almost there!"}
          </div>
        </div>

        {/* STEP 1 — Phone */}
        {step==="phone"&&(
          <div>
            <div style={{fontSize:12,color:"#555",fontWeight:600,textTransform:"uppercase",letterSpacing:.5,marginBottom:8}}>Mobile Number</div>
            <div style={{display:"flex",gap:10,marginBottom:20}}>
              <div style={{background:"#0a0a14",border:"1px solid #1a1a2c",borderRadius:8,padding:"13px 14px",color:"#aaa",fontSize:14,flexShrink:0,fontWeight:700}}>🇮🇳 +91</div>
              <input value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="98765 43210" type="tel" maxLength={10} style={{...inp,flex:1}} onKeyDown={e=>e.key==="Enter"&&sendOTP()}/>
            </div>
            {error&&<Err>{error}</Err>}
            <button onClick={sendOTP} disabled={loading||phone.replace(/\D/g,"").length<10} style={{width:"100%",background:phone.replace(/\D/g,"").length===10?"#e50914":"#333",color:"#fff",border:"none",borderRadius:10,padding:"14px 0",fontWeight:800,fontSize:15,cursor:phone.replace(/\D/g,"").length===10?"pointer":"not-allowed",fontFamily:"Inter,sans-serif",transition:"all .2s"}}>
              {loading?"Sending OTP...":"Get OTP →"}
            </button>
            <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#333"}}>By continuing you agree to StreamX Terms & Privacy Policy</div>
          </div>
        )}

        {/* STEP 2 — OTP */}
        {step==="otp"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:14,color:"#aaa",marginBottom:4}}>OTP sent to</div>
              <div style={{fontSize:16,fontWeight:700}}>+91 {phone}</div>
              <button onClick={()=>{setStep("phone");setOtp(["","","","","",""]);setError("");}} style={{background:"none",border:"none",color:"#e50914",fontSize:12,cursor:"pointer",marginTop:4}}>Change number</button>
            </div>

            <div style={{display:"flex",gap:10,justifyContent:"center",marginBottom:20}}>
              {otp.map((v,i)=>(
                <input key={i} ref={otpRefs[i]} value={v} onChange={e=>handleOtpChange(i,e.target.value)} onPaste={handlePaste} maxLength={1} type="tel"
                  style={{width:46,height:54,borderRadius:10,background:"#0a0a14",border:`2px solid ${v?"#e50914":"#1a1a2c"}`,color:"#fff",fontSize:22,textAlign:"center",outline:"none",fontFamily:"Inter,sans-serif",transition:"border-color .2s"}}
                />
              ))}
            </div>

            {error&&<Err>{error}</Err>}

            <button onClick={verifyOTP} disabled={loading||otp.join("").length<6} style={{width:"100%",background:otp.join("").length===6?"#e50914":"#333",color:"#fff",border:"none",borderRadius:10,padding:"14px 0",fontWeight:800,fontSize:15,cursor:otp.join("").length===6?"pointer":"not-allowed",fontFamily:"Inter,sans-serif",marginBottom:16}}>
              {loading?"Verifying...":"Verify OTP →"}
            </button>

            <div style={{textAlign:"center",fontSize:13,color:"#555"}}>
              {timer>0
                ? `Resend OTP in ${timer}s`
                : <button onClick={()=>{sendOTP();setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:600}}>Resend OTP</button>
              }
            </div>
            <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"#333"}}>Test mode: use OTP 123456</div>
          </div>
        )}

        {/* STEP 3 — Name */}
        {step==="name"&&(
          <div>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{fontSize:48,marginBottom:8}}>👋</div>
              <div style={{fontSize:14,color:"#aaa"}}>What should we call you?</div>
            </div>
            <div style={{marginBottom:20}}>
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inp} autoFocus onKeyDown={e=>e.key==="Enter"&&createAccount()}/>
            </div>
            {error&&<Err>{error}</Err>}
            <button onClick={createAccount} disabled={loading||!name.trim()} style={{width:"100%",background:name.trim()?"#e50914":"#333",color:"#fff",border:"none",borderRadius:10,padding:"14px 0",fontWeight:800,fontSize:15,cursor:name.trim()?"pointer":"not-allowed",fontFamily:"Inter,sans-serif"}}>
              {loading?"Creating account...":"Let's Go 🚀"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Err({children}) {
  return <div style={{background:"rgba(248,113,113,.1)",border:"1px solid rgba(248,113,113,.3)",borderRadius:7,padding:"10px 14px",marginBottom:16,color:"#f87171",fontSize:13}}>❌ {children}</div>;
}