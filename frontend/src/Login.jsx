import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

const ADMIN_PHONES = ["+918660570052", "+919000000000", "+919000000001"];
const TEST_PHONE = "+918000010000";
const TEST_CODE  = "000000";

const PLAN_DEVICES = {
  free:1, plan_mobile:1, plan_basic:2, plan_premium:4, plan_annual:4, premium:4,
};

function getDeviceId() {
  let id = localStorage.getItem("streamx_device_id");
  if (!id) { id = "dev_"+Date.now()+"_"+Math.random().toString(36).slice(2,10); localStorage.setItem("streamx_device_id", id); }
  return id;
}
function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android.*Mobile/i.test(ua)) return "Android Phone";
  if (/Android/i.test(ua)) return "Android Tablet";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Mac/i.test(ua)) return "Mac";
  return "Unknown Device";
}
function getDeviceOS() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Mac/i.test(ua)) return "macOS";
  return "Unknown";
}

export default function Login({ onLogin }) {
  const [step,         setStep]         = useState("phone");
  const [phone,        setPhone]        = useState("");
  const [otp,          setOtp]          = useState(["","","","","",""]);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [timer,        setTimer]        = useState(0);
  const [activeDevices,setActiveDevices]= useState([]);
  const [pendingUser,  setPendingUser]  = useState(null);

  const refs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  useEffect(()=>{
    if(timer<=0) return;
    const t=setTimeout(()=>setTimer(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timer]);

  const fullPhone = "+91"+phone.replace(/\D/g,"").slice(-10);
  const isTest    = fullPhone === TEST_PHONE;
  const canSend   = phone.replace(/\D/g,"").length===10 && !loading;
  const canVerify = otp.join("").length===6 && !loading;

  async function sendOTP(){
    setError(""); if(!canSend) return;
    setLoading(true);
    if(!isTest){
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if(error && !error.message?.includes("already")){
        setLoading(false); setError("Failed to send OTP. Check your number."); return;
      }
    }
    setLoading(false); setStep("otp"); setTimer(60);
    setOtp(["","","","","",""]); setTimeout(()=>refs[0].current?.focus(),150);
  }

  async function verifyOTP(code){
    const c = code || otp.join("");
    if(c.length < 6) return;
    setError(""); setLoading(true);

    try {
      // TEST NUMBER — skip real OTP, use phone lookup directly
      if(isTest){
        if(c !== TEST_CODE){
          setError("Wrong test code. Use "+TEST_CODE);
          setLoading(false); setOtp(["","","","","",""]); setTimeout(()=>refs[0].current?.focus(),100); return;
        }
        // Just find or create by phone, no auth session needed for test
        let user = await db.getUserByPhone(fullPhone).catch(()=>null);
        if(!user){
          user = await db.createUser({
            name: "Test User",
            phone: fullPhone,
            role: "admin", // give test user admin so you can test everything
            plan: "premium",
            is_active: true,
          });
          await supabase.from("notifications").insert({
            user_id: user.id, type:"welcome",
            title:"Welcome to StreamX! 🎉",
            message:"Test account ready.",
          }).catch(()=>{});
        }
        if(!user.is_active){ setError("Account suspended."); setLoading(false); return; }
        const allowed = await checkDeviceLimit(user);
        if(!allowed){ setPendingUser(user); setStep("device_limit"); setLoading(false); return; }
        await registerDevice(user);
        onLogin(user);
        setLoading(false); return;
      }

      // REAL NUMBER — require proper Supabase OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone, token: c, type: "sms"
      });
      if(error || !data?.user){
        setError("Wrong OTP. Please try again.");
        setLoading(false); setOtp(["","","","","",""]); setTimeout(()=>refs[0].current?.focus(),100); return;
      }

      // Use Supabase's real auth ID — this makes RLS work correctly
      const authId = data.user.id;
      const isAdmin = ADMIN_PHONES.includes(fullPhone);

      // Try to find existing user by auth ID first, then by phone
      let user = await db.getUserById(authId).catch(()=>null);
      if(!user) user = await db.getUserByPhone(fullPhone).catch(()=>null);

      if(!user){
        // New user — create with Supabase auth ID so RLS works
        user = await supabase.from("users").insert({
          id: authId,
          name: "User "+phone.slice(-4),
          phone: fullPhone,
          role: isAdmin ? "admin" : "user",
          plan: isAdmin ? "premium" : "free",
          is_active: true,
        }).select().single().then(r=>{ if(r.error) throw r.error; return r.data; });
        await supabase.from("notifications").insert({
          user_id: user.id, type:"welcome",
          title:"Welcome to StreamX! 🎉",
          message:"Start watching amazing content.",
        }).catch(()=>{});
      }

      if(!user.is_active){ setError("Account suspended. Contact support."); setLoading(false); return; }
      const allowed = await checkDeviceLimit(user);
      if(!allowed){ setPendingUser(user); setStep("device_limit"); setLoading(false); return; }
      await registerDevice(user);
      onLogin(user);

    } catch(e){
      console.error("Login error:", e);
      setError("Login failed: "+e.message);
    }
    setLoading(false);
  }

  async function checkDeviceLimit(user){
    const limit = PLAN_DEVICES[user.plan] || 1;
    const deviceId = getDeviceId();
    try {
      const { data: sessions } = await supabase.from("user_sessions").select("*").eq("user_id", user.id).eq("is_active", true);
      if(!sessions || sessions.length===0) return true;
      if(sessions.find(s=>s.device_id===deviceId)) return true;
      if(sessions.length < limit) return true;
      setActiveDevices(sessions); return false;
    } catch(e){ return true; }
  }

  async function registerDevice(user){
    try {
      await supabase.from("user_sessions").upsert({
        user_id: user.id, device_id: getDeviceId(),
        device_name: getDeviceName(), device_os: getDeviceOS(),
        is_active: true, last_active: new Date().toISOString(),
      }, { onConflict: "user_id,device_id" });
    } catch(e){}
  }

  async function signOutDevice(sessionId){
    try {
      await supabase.from("user_sessions").update({ is_active:false }).eq("id", sessionId);
      const updated = activeDevices.filter(d=>d.id!==sessionId);
      setActiveDevices(updated);
      if(pendingUser && updated.length < (PLAN_DEVICES[pendingUser.plan]||1)){
        await registerDevice(pendingUser); onLogin(pendingUser);
      }
    } catch(e){ setError("Failed to sign out device."); }
  }

  async function signOutAllDevices(){
    try {
      await supabase.from("user_sessions").update({ is_active:false }).eq("user_id", pendingUser.id);
      await registerDevice(pendingUser); onLogin(pendingUser);
    } catch(e){ setError("Failed. Try again."); }
  }

  function handleOTPInput(i,v){
    if(!/^\d?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v && i<5) refs[i+1].current?.focus();
    if(!v && i>0) refs[i-1].current?.focus();
    if(v && i===5) setTimeout(()=>verifyOTP([...otp.slice(0,5),v].join("")),80);
  }

  function handlePaste(e){
    e.preventDefault();
    const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if(p.length===6){ setOtp(p.split("")); refs[5].current?.focus(); setTimeout(()=>verifyOTP(p),80); }
  }

  const planLabel = { free:"Free (1 device)", plan_mobile:"Mobile (1 device)", plan_basic:"Basic (2 devices)", plan_premium:"Premium (4 devices)", plan_annual:"Annual (4 devices)", premium:"Premium (4 devices)" };

  const S = {
    wrap:  { minHeight:"100vh", background:"#07070c", display:"flex", alignItems:"center", justifyContent:"center", padding:20, fontFamily:"Inter,sans-serif" },
    card:  { background:"rgba(13,13,22,.98)", border:"1px solid #1a1a28", borderRadius:22, padding:"36px 24px 28px", width:"100%", maxWidth:360, animation:"fadeUp .4s ease" },
    btn:   (on) => ({ width:"100%", height:52, background:on?"linear-gradient(135deg,#e50914,#c00)":"#141420", color:"#fff", border:"none", borderRadius:12, fontWeight:800, fontSize:15, cursor:on?"pointer":"not-allowed", fontFamily:"Inter,sans-serif", transition:"all .2s" }),
    err:   { background:"rgba(248,113,113,.08)", border:"1px solid rgba(248,113,113,.2)", borderRadius:8, padding:"9px 12px", marginBottom:14, color:"#f87171", fontSize:12, textAlign:"center", fontWeight:500 },
    devCard:{ display:"flex", alignItems:"center", gap:12, padding:"12px 14px", background:"#0a0a14", border:"1px solid #1e1e2e", borderRadius:10, marginBottom:8 },
  };

  return (
    <div style={S.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .otp-inp{width:46px;height:56px;border-radius:10px;background:#0f0f18;border:2px solid #1e1e2e;color:#fff;font-size:22px;text-align:center;font-family:Inter,sans-serif;transition:border-color .2s;-webkit-appearance:none;outline:none;}
        .otp-inp:focus{border-color:#e50914;}
        .txt-inp{height:52px;background:#0f0f18;border:1.5px solid #1e1e2e;border-radius:10px;color:#fff;font-size:15px;padding:0 14px;font-family:Inter,sans-serif;transition:border-color .2s;-webkit-appearance:none;outline:none;}
        .txt-inp:focus{border-color:#e50914;}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 30px #0f0f18 inset!important;-webkit-text-fill-color:#fff!important;}
      `}</style>

      <div style={S.card}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontWeight:900,fontSize:36,letterSpacing:2,lineHeight:1,marginBottom:5}}>
            <span style={{color:"#e50914"}}>STREAM</span><span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:12,color:"#2a2a3a"}}>India's Premium OTT Platform</div>
        </div>

        {/* STEP 1 — PHONE */}
        {step==="phone" && (
          <div style={{animation:"fadeUp .25s ease"}}>
            <div style={{fontSize:13,color:"#aaa",marginBottom:16,textAlign:"center",lineHeight:1.6,fontWeight:600}}>
              Enter mobile number to continue<br/><span style={{fontSize:11,color:"#444"}}>No registration needed</span>
            </div>
            <div style={{fontSize:10,color:"#333",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Mobile Number</div>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <div style={{background:"#0f0f18",border:"1.5px solid #1e1e2e",borderRadius:10,padding:"0 12px",display:"flex",alignItems:"center",gap:6,flexShrink:0,width:76,height:52,justifyContent:"center"}}>
                <span style={{fontSize:17}}>🇮🇳</span><span style={{color:"#888",fontSize:13,fontWeight:700}}>+91</span>
              </div>
              <input className="txt-inp" style={{flex:1}} value={phone}
                onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                placeholder="Enter mobile number" type="tel" maxLength={10} autoFocus
                onKeyDown={e=>e.key==="Enter"&&canSend&&sendOTP()}
              />
            </div>
            {error && <div style={S.err}>❌ {error}</div>}
            <button style={S.btn(canSend)} onClick={sendOTP} disabled={!canSend}>{loading?"Sending OTP...":"Get OTP →"}</button>
            <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#1a1a28",lineHeight:1.8}}>By continuing, you agree to StreamX<br/>Terms of Use and Privacy Policy</div>
          </div>
        )}

        {/* STEP 2 — OTP */}
        {step==="otp" && (
          <div style={{animation:"fadeUp .25s ease"}}>
            <div style={{textAlign:"center",marginBottom:22}}>
              <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(229,9,20,.1)",border:"2px solid rgba(229,9,20,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>📱</div>
              <div style={{fontSize:13,color:"#555",marginBottom:2}}>OTP sent to</div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:4}}>+91 {phone}</div>
              <div style={{fontSize:12,color:"#444",marginBottom:6}}>{isTest ? "Test number — use code below" : "6-digit OTP sent via SMS"}</div>
              <button onClick={()=>{setStep("phone");setError("");setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Change number</button>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>
              {otp.map((v,i)=><input key={i} ref={refs[i]} value={v} onChange={e=>handleOTPInput(i,e.target.value)} onPaste={handlePaste} maxLength={1} type="tel" inputMode="numeric" className="otp-inp" style={{borderColor:v?"#e50914":"#1e1e2e"}}/>)}
            </div>
            {error && <div style={S.err}>❌ {error}</div>}
            <button style={{...S.btn(canVerify),marginBottom:12}} onClick={()=>verifyOTP()} disabled={!canVerify}>{loading?"Verifying...":"Verify OTP →"}</button>
            <div style={{textAlign:"center",fontSize:13}}>
              {timer>0
                ? <span style={{color:"#333"}}>Resend in <span style={{color:"#e50914",fontWeight:700}}>{timer}s</span></span>
                : <button onClick={()=>{sendOTP();setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Inter,sans-serif"}}>Resend OTP</button>
              }
            </div>
            {isTest && <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"#f59e0b",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,padding:"7px 10px"}}>⚠️ Test mode — code is {TEST_CODE}</div>}
          </div>
        )}

        {/* STEP 3 — DEVICE LIMIT */}
        {step==="device_limit" && pendingUser && (
          <div style={{animation:"fadeUp .25s ease"}}>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontSize:40,marginBottom:10}}>📱</div>
              <div style={{fontWeight:800,fontSize:17,color:"#fff",marginBottom:6}}>Device Limit Reached</div>
              <div style={{fontSize:13,color:"#888",lineHeight:1.6}}>
                Your <span style={{color:"#e50914",fontWeight:700}}>{planLabel[pendingUser.plan]||"Free (1 device)"}</span> plan allows <span style={{color:"#fff",fontWeight:700}}>{PLAN_DEVICES[pendingUser.plan]||1}</span> device{(PLAN_DEVICES[pendingUser.plan]||1)>1?"s":""}.
              </div>
            </div>
            {activeDevices.map(d=>(
              <div key={d.id} style={S.devCard}>
                <span style={{fontSize:22}}>{d.device_os==="iOS"||d.device_os==="Android"?"📱":"💻"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{d.device_name||"Unknown"}</div>
                  <div style={{fontSize:11,color:"#555"}}>Last active {d.last_active?new Date(d.last_active).toLocaleDateString("en-IN"):"recently"}</div>
                </div>
                <button onClick={()=>signOutDevice(d.id)} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",color:"#f87171",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"}}>Sign Out</button>
              </div>
            ))}
            <button onClick={signOutAllDevices} style={{width:"100%",background:"rgba(229,9,20,.12)",border:"1px solid rgba(229,9,20,.3)",color:"#e50914",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif",marginBottom:10}}>
              Sign Out All & Continue
            </button>
            <div style={{background:"rgba(229,9,20,.06)",border:"1px solid rgba(229,9,20,.15)",borderRadius:10,padding:"12px",marginBottom:10}}>
              <div style={{fontSize:11,fontWeight:700,color:"#e50914",marginBottom:6}}>👑 Need more screens?</div>
              <div style={{display:"flex",gap:6}}>
                {[{p:"Basic",pr:"₹299",d:"2 devices"},{p:"Premium",pr:"₹499",d:"4 devices"}].map(x=>(
                  <div key={x.p} style={{flex:1,background:"rgba(255,255,255,.04)",borderRadius:7,padding:"7px",textAlign:"center"}}>
                    <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>{x.p}</div>
                    <div style={{fontSize:12,color:"#e50914",fontWeight:800}}>{x.pr}<span style={{fontSize:9,color:"#555",fontWeight:400}}>/mo</span></div>
                    <div style={{fontSize:10,color:"#555"}}>{x.d}</div>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={()=>{setStep("phone");setError("");setOtp(["","","","","",""]);setPendingUser(null);}} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid #1e1e2e",color:"#555",borderRadius:10,padding:"10px",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}