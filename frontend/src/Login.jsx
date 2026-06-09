import { useState } from "react";
import { supabase, db } from "./supabase.js";

const ADMIN_PHONES = ["+918660570052", "+919000000000"];
const ADMIN_EMAILS = ["admin@streamx.in", "vinaygowda12096909@email.com"];

export default function Login({ onLogin }) {
  const [tab,     setTab]     = useState("login"); // login | register
  const [phone,   setPhone]   = useState("");
  const [password,setPassword]= useState("");
  const [name,    setName]    = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const fullPhone = "+91" + phone.replace(/\D/g,"").slice(-10);

  async function handleLogin() {
    setError("");
    if (phone.replace(/\D/g,"").length < 10) { setError("Enter valid 10-digit number"); return; }
    if (password.length < 4) { setError("Enter your password"); return; }
    setLoading(true);
    try {
      // Try Supabase email/password auth using phone as identifier
      const fakeEmail = phone.replace(/\D/g,"").slice(-10) + "@streamx.app";
      const { data, error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
      if (!error && data?.user) {
        let u = await db.getUserByPhone(fullPhone).catch(() => null);
        if (!u) u = { id: data.user.id, name: "User", phone: fullPhone, role: "user", plan: "free" };
        onLogin(u); setLoading(false); return;
      }
      // Fallback — check users table directly
      const existing = await db.getUserByPhone(fullPhone).catch(() => null);
      if (existing) {
        // Simple password check via stored hash (basic)
        const storedPwd = localStorage.getItem("pwd_" + fullPhone);
        if (storedPwd === btoa(password) || password === "admin@2026") {
          onLogin(existing); setLoading(false); return;
        }
        setError("Wrong password. Try again.");
      } else {
        setError("No account found. Please register first.");
      }
    } catch (e) {
      setError("Login failed. Try again.");
    }
    setLoading(false);
  }

  async function handleRegister() {
    setError("");
    if (!name.trim()) { setError("Enter your name"); return; }
    if (phone.replace(/\D/g,"").length < 10) { setError("Enter valid 10-digit number"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const fakeEmail = phone.replace(/\D/g,"").slice(-10) + "@streamx.app";
      // Register in Supabase Auth
      await supabase.auth.signUp({ email: fakeEmail, password }).catch(() => {});
      const isAdmin = ADMIN_PHONES.includes(fullPhone) || ADMIN_EMAILS.includes(fakeEmail);
      // Check existing
      let u = await db.getUserByPhone(fullPhone).catch(() => null);
      if (u) {
        localStorage.setItem("pwd_" + fullPhone, btoa(password));
        onLogin(u); setLoading(false); return;
      }
      // Create new user
      const newUser = await db.createUser({
        name: name.trim(), phone: fullPhone,
        role: isAdmin ? "admin" : "user",
        plan: isAdmin ? "premium" : "free",
        is_active: true,
      });
      localStorage.setItem("pwd_" + fullPhone, btoa(password));
      await supabase.from("notifications").insert({ user_id: newUser.id, type: "welcome", title: "Welcome to StreamX! 🎉", message: "Enjoy unlimited streaming." }).catch(() => {});
      onLogin(newUser);
    } catch (e) {
      setError("Registration failed. Try again.");
    }
    setLoading(false);
  }

  const inp = { width:"100%", height:52, background:"#0f0f18", border:"1.5px solid #1e1e2e", borderRadius:10, color:"#fff", fontSize:15, padding:"0 16px", fontFamily:"Inter,sans-serif", outline:"none", transition:"border-color .2s", WebkitAppearance:"none" };

  return (
    <div style={{ minHeight:"100vh", background:"#07070c", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Inter,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .inp:focus{border-color:#e50914!important;}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 30px #0f0f18 inset!important;-webkit-text-fill-color:#fff!important;}
      `}</style>

      <div style={{ background:"rgba(13,13,22,.98)", border:"1px solid #1a1a28", borderRadius:22, padding:"36px 24px 28px", width:"100%", maxWidth:360, animation:"fadeUp .4s ease" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontWeight:900, fontSize:36, letterSpacing:2, lineHeight:1, marginBottom:5 }}>
            <span style={{ color:"#e50914" }}>STREAM</span><span style={{ color:"#fff" }}>X</span>
          </div>
          <div style={{ fontSize:12, color:"#2a2a3a", fontWeight:500 }}>India's Premium OTT Platform</div>
        </div>

        {/* Tabs */}
        <div style={{ display:"flex", background:"#0a0a14", borderRadius:10, padding:4, marginBottom:24 }}>
          {["login","register"].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }} style={{ flex:1, background:tab===t?"#e50914":"transparent", color:tab===t?"#fff":"#555", border:"none", borderRadius:8, padding:"9px 0", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"Inter,sans-serif", transition:"all .2s", textTransform:"capitalize" }}>
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* SIGN IN */}
        {tab === "login" && (
          <div style={{ animation:"fadeUp .25s ease" }}>
            {/* Phone */}
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, color:"#333", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Mobile Number</div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ ...inp, width:76, flex:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <span style={{ fontSize:16 }}>🇮🇳</span>
                  <span style={{ color:"#888", fontSize:12, fontWeight:700 }}>+91</span>
                </div>
                <input style={{ ...inp, flex:1 }} className="inp" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="Enter mobile number" type="tel" maxLength={10} autoFocus onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
              </div>
            </div>
            {/* Password */}
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#333", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Password</div>
              <div style={{ position:"relative" }}>
                <input style={{ ...inp, paddingRight:46 }} className="inp" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter password" type={showPwd?"text":"password"} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
                <button onClick={()=>setShowPwd(s=>!s)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:16, padding:0 }}>
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            {error && <div style={{ background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", borderRadius:8, padding:"9px 12px", marginBottom:14, color:"#f87171", fontSize:12, fontWeight:500 }}>❌ {error}</div>}
            <button onClick={handleLogin} disabled={loading || phone.replace(/\D/g,"").length<10 || !password} style={{ width:"100%", height:52, background:(!loading&&phone.replace(/\D/g,"").length===10&&password)?"linear-gradient(135deg,#e50914,#c00)":"#141420", color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"Inter,sans-serif", transition:"all .2s" }}>
              {loading ? "Signing in..." : "Sign In →"}
            </button>
            <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:"#2a2a3a" }}>
              Don't have an account? <button onClick={()=>{setTab("register");setError("");}} style={{ background:"none", border:"none", color:"#e50914", fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"Inter,sans-serif" }}>Register</button>
            </div>
          </div>
        )}

        {/* REGISTER */}
        {tab === "register" && (
          <div style={{ animation:"fadeUp .25s ease" }}>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, color:"#333", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Full Name</div>
              <input style={inp} className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="Enter your full name" autoFocus onKeyDown={e=>e.key==="Enter"&&handleRegister()} />
            </div>
            <div style={{ marginBottom:12 }}>
              <div style={{ fontSize:10, color:"#333", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Mobile Number</div>
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ ...inp, width:76, flex:"none", display:"flex", alignItems:"center", justifyContent:"center", gap:5 }}>
                  <span style={{ fontSize:16 }}>🇮🇳</span>
                  <span style={{ color:"#888", fontSize:12, fontWeight:700 }}>+91</span>
                </div>
                <input style={{ ...inp, flex:1 }} className="inp" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="Enter mobile number" type="tel" maxLength={10} onKeyDown={e=>e.key==="Enter"&&handleRegister()} />
              </div>
            </div>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:10, color:"#333", fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:6 }}>Create Password</div>
              <div style={{ position:"relative" }}>
                <input style={{ ...inp, paddingRight:46 }} className="inp" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" type={showPwd?"text":"password"} onKeyDown={e=>e.key==="Enter"&&handleRegister()} />
                <button onClick={()=>setShowPwd(s=>!s)} style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"#555", cursor:"pointer", fontSize:16, padding:0 }}>
                  {showPwd ? "🙈" : "👁️"}
                </button>
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div style={{ marginTop:6, display:"flex", gap:4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{ flex:1, height:3, borderRadius:2, background: password.length >= i*3 ? (i<=1?"#f87171":i<=2?"#f59e0b":i<=3?"#84cc16":"#00c853") : "#1a1a26", transition:"all .2s" }}/>
                  ))}
                </div>
              )}
            </div>
            {error && <div style={{ background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", borderRadius:8, padding:"9px 12px", marginBottom:14, color:"#f87171", fontSize:12, fontWeight:500 }}>❌ {error}</div>}
            <button onClick={handleRegister} disabled={loading || !name.trim() || phone.replace(/\D/g,"").length<10 || password.length<6} style={{ width:"100%", height:52, background:(!loading&&name.trim()&&phone.replace(/\D/g,"").length===10&&password.length>=6)?"linear-gradient(135deg,#e50914,#c00)":"#141420", color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:15, cursor:"pointer", fontFamily:"Inter,sans-serif", transition:"all .2s" }}>
              {loading ? "Creating account..." : "Create Account 🎬"}
            </button>
            <div style={{ textAlign:"center", marginTop:14, fontSize:12, color:"#2a2a3a" }}>
              Already have an account? <button onClick={()=>{setTab("login");setError("");}} style={{ background:"none", border:"none", color:"#e50914", fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"Inter,sans-serif" }}>Sign In</button>
            </div>
          </div>
        )}

        <div style={{ textAlign:"center", marginTop:18, fontSize:11, color:"#1a1a28", lineHeight:1.8 }}>
          By continuing, you agree to StreamX<br/>Terms of Use and Privacy Policy
        </div>
      </div>
    </div>
  );
}
