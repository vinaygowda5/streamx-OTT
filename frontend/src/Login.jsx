import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

// ── Admin numbers ─────────────────────────
const ADMIN_PHONES = ["+918088820924", "+919000000000", "+919000000001"];

export default function Login({ onLogin }) {
  const [step,    setStep]    = useState("phone");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [name,    setName]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);
  const otpRefs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  const fullPhone = "+91" + phone.replace(/\D/g,"").slice(-10);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  // ── Send OTP ────────────────────────────
  async function sendOTP() {
    setError("");
    const digits = phone.replace(/\D/g,"");
    if (digits.length < 10) {
      setError("Enter valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });
      if (error) console.log("Supabase OTP:", error.message);
    } catch (e) {
      console.log("OTP send error:", e.message);
    }
    // Always go to OTP screen
    setStep("otp");
    setTimer(30);
    setOtp(["","","","","",""]);
    setLoading(false);
    setTimeout(() => otpRefs[0].current?.focus(), 100);
  }

  // ── Verify OTP ──────────────────────────
  async function verifyOTP() {
    setError("");
    const code = otp.join("");
    if (code.length < 6) {
      setError("Enter complete 6-digit OTP");
      return;
    }
    setLoading(true);

    let verified = false;

    // Try real Supabase OTP
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone, token: code, type: "sms",
      });
      if (!error && data?.user) verified = true;
    } catch (e) {}

    // Test mode — 123456 always works
    if (!verified && code === "123456") verified = true;

    if (!verified) {
      setError("Invalid OTP. Please try again.");
      setLoading(false);
      return;
    }

    // Check if user exists
    try {
      const existing = await db.getUserByPhone(fullPhone).catch(() => null);
      if (existing) {
        // Existing user — login directly
        onLogin(existing);
        setLoading(false);
        return;
      }
    } catch (e) {}

    // New user — ask for name
    setStep("name");
    setLoading(false);
  }

  // ── Create Account ──────────────────────
  async function createAccount() {
    setError("");
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }
    setLoading(true);

    try {
      // Check again if user exists (race condition)
      const existing = await db.getUserByPhone(fullPhone).catch(() => null);
      if (existing) {
        const updated = existing.name
          ? existing
          : await db.updateUser(existing.id, { name: name.trim() }).catch(() => existing);
        onLogin(updated);
        setLoading(false);
        return;
      }

      // Determine role
      const isAdmin = ADMIN_PHONES.includes(fullPhone);

      // Create new user in Supabase DB
      const newUser = await db.createUser({
        name:      name.trim(),
        phone:     fullPhone,
        role:      isAdmin ? "admin" : "user",
        plan:      isAdmin ? "premium" : "free",
        is_active: true,
      });

      // Create default profile
      await supabase.from("profiles").insert({
        user_id: newUser.id,
        name:    name.trim(),
        emoji:   "😊",
        color:   "#e50914",
      }).catch(() => {});

      // Welcome notification
      await supabase.from("notifications").insert({
        user_id: newUser.id,
        type:    "welcome",
        title:   "Welcome to StreamX! 🎉",
        message: "Start watching amazing content now.",
      }).catch(() => {});

      onLogin(newUser);
    } catch (e) {
      console.error("Create account error:", e);
      // Fallback — let them in anyway
      const isAdmin = ADMIN_PHONES.includes(fullPhone);
      const fallback = {
        id:    "temp_" + Date.now(),
        name:  name.trim(),
        phone: fullPhone,
        role:  isAdmin ? "admin" : "user",
        plan:  isAdmin ? "premium" : "free",
        is_active: true,
      };
      onLogin(fallback);
    }
    setLoading(false);
  }

  function handleOtpChange(i, v) {
    if (!/^\d?$/.test(v)) return;
    const n = [...otp];
    n[i] = v;
    setOtp(n);
    if (v && i < 5) otpRefs[i+1].current?.focus();
    if (!v && i > 0) otpRefs[i-1].current?.focus();
  }

  function handlePaste(e) {
    const p = e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if (p.length === 6) {
      setOtp(p.split(""));
      otpRefs[5].current?.focus();
    }
  }

  const inp = {
    background:"#0a0a14",
    border:"1px solid #1a1a2c",
    borderRadius:8, color:"#fff",
    fontSize:15, outline:"none",
    fontFamily:"Inter,sans-serif",
  };

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(135deg,#07070c 0%,#0f0a14 100%)",
      display:"flex", alignItems:"center",
      justifyContent:"center", padding:20,
      fontFamily:"Inter,sans-serif",
    }}>
      <div style={{
        background:"rgba(15,15,24,.95)",
        border:"1px solid #1a1a26",
        borderRadius:24,
        padding:"40px 28px",
        width:"100%", maxWidth:400,
        boxShadow:"0 24px 64px rgba(0,0,0,.6)",
      }}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{fontWeight:900,fontSize:38,letterSpacing:2,marginBottom:6}}>
            <span style={{color:"#e50914"}}>STREAM</span>
            <span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:12,color:"#444",letterSpacing:.5}}>
            {step==="phone" && "India's Premium OTT Platform"}
            {step==="otp"   && "Verify your mobile number"}
            {step==="name"  && "Create your account"}
          </div>
        </div>

        {/* ── PHONE STEP ── */}
        {step === "phone" && (
          <div>
            <div style={{fontSize:11,color:"#555",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>
              Mobile Number
            </div>
            <div style={{display:"flex",gap:10,marginBottom:24}}>
              <div style={{...inp, padding:"14px 14px", flexShrink:0, display:"flex", alignItems:"center", gap:8, fontSize:14, fontWeight:700, color:"#aaa"}}>
                🇮🇳 <span style={{color:"#fff"}}>+91</span>
              </div>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                placeholder="Enter mobile number"
                type="tel"
                maxLength={10}
                style={{...inp, flex:1, padding:"14px 16px", fontSize:16}}
                onKeyDown={e => e.key==="Enter" && sendOTP()}
                autoFocus
              />
            </div>

            {error && <ErrBox>{error}</ErrBox>}

            <button
              onClick={sendOTP}
              disabled={loading || phone.replace(/\D/g,"").length < 10}
              style={{
                width:"100%",
                background: phone.replace(/\D/g,"").length===10
                  ? "linear-gradient(135deg,#e50914,#ff4444)"
                  : "#1a1a26",
                color:"#fff", border:"none", borderRadius:12,
                padding:"16px 0", fontWeight:800, fontSize:16,
                cursor: phone.replace(/\D/g,"").length===10 ? "pointer" : "not-allowed",
                fontFamily:"Inter,sans-serif", transition:"all .2s",
                letterSpacing:.5,
              }}
            >
              {loading ? "Sending OTP..." : "Get OTP →"}
            </button>

            <div style={{textAlign:"center",marginTop:20,fontSize:11,color:"#2a2a36",lineHeight:1.6}}>
              By continuing, you agree to StreamX<br/>Terms of Use and Privacy Policy
            </div>
          </div>
        )}

        {/* ── OTP STEP ── */}
        {step === "otp" && (
          <div>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{
                width:64,height:64,borderRadius:"50%",
                background:"rgba(229,9,20,.12)",
                border:"2px solid rgba(229,9,20,.3)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:28, margin:"0 auto 16px",
              }}>📱</div>
              <div style={{fontSize:14,color:"#aaa",marginBottom:4}}>OTP sent to</div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff"}}>+91 {phone}</div>
              <button
                onClick={() => {setStep("phone"); setError(""); setOtp(["","","","","",""]);}}
                style={{background:"none",border:"none",color:"#e50914",fontSize:12,cursor:"pointer",marginTop:6,fontWeight:600}}
              >
                ← Change number
              </button>
            </div>

            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:24}}>
              {otp.map((v,i) => (
                <input
                  key={i}
                  ref={otpRefs[i]}
                  value={v}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onPaste={handlePaste}
                  maxLength={1}
                  type="tel"
                  inputMode="numeric"
                  style={{
                    width:48, height:56, borderRadius:10,
                    background:"#0a0a14",
                    border:`2px solid ${v ? "#e50914" : "#1a1a2c"}`,
                    color:"#fff", fontSize:24,
                    textAlign:"center", outline:"none",
                    fontFamily:"Inter,sans-serif",
                    transition:"border-color .2s",
                  }}
                />
              ))}
            </div>

            {error && <ErrBox>{error}</ErrBox>}

            <button
              onClick={verifyOTP}
              disabled={loading || otp.join("").length < 6}
              style={{
                width:"100%",
                background: otp.join("").length===6
                  ? "linear-gradient(135deg,#e50914,#ff4444)"
                  : "#1a1a26",
                color:"#fff", border:"none", borderRadius:12,
                padding:"16px 0", fontWeight:800, fontSize:16,
                cursor: otp.join("").length===6 ? "pointer" : "not-allowed",
                fontFamily:"Inter,sans-serif", marginBottom:16,
              }}
            >
              {loading ? "Verifying..." : "Verify OTP →"}
            </button>

            <div style={{textAlign:"center",fontSize:13,color:"#555"}}>
              {timer > 0
                ? <span>Resend OTP in <span style={{color:"#e50914",fontWeight:700}}>{timer}s</span></span>
                : <button
                    onClick={() => {sendOTP(); setOtp(["","","","","",""]);}}
                    style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:700}}
                  >
                    Resend OTP
                  </button>
              }
            </div>
            <div style={{textAlign:"center",marginTop:8,fontSize:10,color:"#1f1f2e"}}>
              Test: OTP 123456
            </div>
          </div>
        )}

        {/* ── NAME STEP ── */}
        {step === "name" && (
          <div>
            <div style={{textAlign:"center",marginBottom:28}}>
              <div style={{fontSize:52,marginBottom:12}}>👋</div>
              <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>Welcome to StreamX!</div>
              <div style={{fontSize:13,color:"#555"}}>What should we call you?</div>
            </div>

            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your full name"
              style={{...inp, width:"100%", padding:"14px 16px", fontSize:15, marginBottom:20}}
              autoFocus
              onKeyDown={e => e.key==="Enter" && createAccount()}
            />

            {error && <ErrBox>{error}</ErrBox>}

            <button
              onClick={createAccount}
              disabled={loading || !name.trim()}
              style={{
                width:"100%",
                background: name.trim()
                  ? "linear-gradient(135deg,#e50914,#ff4444)"
                  : "#1a1a26",
                color:"#fff", border:"none", borderRadius:12,
                padding:"16px 0", fontWeight:800, fontSize:16,
                cursor: name.trim() ? "pointer" : "not-allowed",
                fontFamily:"Inter,sans-serif",
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

function ErrBox({ children }) {
  return (
    <div style={{
      background:"rgba(248,113,113,.1)",
      border:"1px solid rgba(248,113,113,.3)",
      borderRadius:8, padding:"10px 14px",
      marginBottom:16, color:"#f87171", fontSize:13,
    }}>❌ {children}</div>
  );
}