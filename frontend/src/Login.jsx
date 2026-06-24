import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

/*
 ╔══════════════════════════════════════════════════════════╗
 ║  StreamX Login — Real Supabase Auth + ONE test number    ║
 ║                                                            ║
 ║  ⚠️  TESTING_BYPASS_PHONE below = +918000010000           ║
 ║  Only THIS number can log in with code 000000 without     ║
 ║  a real SMS. Every other number MUST receive a real OTP.  ║
 ║                                                            ║
 ║  ── TO REMOVE THIS BYPASS WHEN YOU GO FULLY LIVE ──        ║
 ║  Search this file for "TESTING_BYPASS_PHONE" — there are  ║
 ║  3 spots marked with that name. Delete those 3 blocks      ║
 ║  (each one is commented and easy to find), OR just ask     ║
 ║  me "remove the test bypass" and I'll give you the clean   ║
 ║  final file with zero bypass code in two seconds.          ║
 ╚══════════════════════════════════════════════════════════╝
*/

const ADMIN_PHONES = ["+918660570052", "+919000000000", "+919000000001"];

// ── TESTING_BYPASS_PHONE (1 of 3) ──
// This is the ONLY number allowed to skip real SMS verification.
// Change this to your own number, or remove this whole bypass later.
const TESTING_BYPASS_PHONE = "+918000010000";
const TESTING_BYPASS_CODE  = "000000";

const PLAN_DEVICES = {
  free:         1,
  plan_mobile:  1,
  plan_basic:   2,
  plan_premium: 4,
  plan_annual:  4,
  premium:      4,
};

function getDeviceId() {
  let id = localStorage.getItem("streamx_device_id");
  if (!id) {
    id = "dev_" + Date.now() + "_" + Math.random().toString(36).slice(2,10);
    localStorage.setItem("streamx_device_id", id);
  }
  return id;
}
function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/i.test(ua))       return "iPhone";
  if (/iPad/i.test(ua))         return "iPad";
  if (/Android.*Mobile/i.test(ua)) return "Android Phone";
  if (/Android/i.test(ua))      return "Android Tablet";
  if (/Windows/i.test(ua))      return "Windows PC";
  if (/Mac/i.test(ua))          return "Mac";
  if (/Linux/i.test(ua))        return "Linux PC";
  return "Unknown Device";
}
function getDeviceOS() {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua))          return "Android";
  if (/Windows/i.test(ua))          return "Windows";
  if (/Mac/i.test(ua))              return "macOS";
  if (/Linux/i.test(ua))            return "Linux";
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

  // ── TESTING_BYPASS_PHONE (2 of 3) ──
  const isBypassNumber = fullPhone === TESTING_BYPASS_PHONE;

  async function sendOTP(){
    setError(""); if(!canSend) return;
    setLoading(true);

    // Bypass number skips real SMS entirely
    if (isBypassNumber) {
      setLoading(false);
      setStep("otp"); setTimer(60);
      setOtp(["","","","","",""]);
      setTimeout(()=>r0.current?.focus(),150);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
    setLoading(false);
    if(error && !error.message?.includes("already")){
      setError("Failed to send OTP. Check your number."); return;
    }
    setStep("otp"); setTimer(60);
    setOtp(["","","","","",""]);
    setTimeout(()=>r0.current?.focus(),150);
  }

  async function verifyOTP(code){
    const c = code || otp.join("");
    if(c.length < 6) return;
    setError(""); setLoading(true);

    let authUserId;

    // ── TESTING_BYPASS_PHONE (3 of 3) ──
    if (isBypassNumber) {
      if (c !== TESTING_BYPASS_CODE) {
        setError(`Wrong test code. Use ${TESTING_BYPASS_CODE} for this test number.`);
        setLoading(false);
        setOtp(["","","","","",""]);
        setTimeout(()=>r0.current?.focus(),100);
        return;
      }
      // For test number: use a fixed deterministic ID so this
      // test account is always the same across sessions
      authUserId = "test-user-8000010000-fixed-id";
    } else {
      // Every other number — REAL OTP required, no bypass possible
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone, token: c, type: "sms"
      });
      if (error || !data?.user) {
        setError("Wrong OTP. Please try again.");
        setLoading(false);
        setOtp(["","","","","",""]);
        setTimeout(()=>r0.current?.focus(),100);
        return;
      }
      authUserId = data.user.id;
    }

    try {
      const isAdmin = ADMIN_PHONES.includes(fullPhone);
      let user = await db.getUserById(authUserId).catch(()=>null);

      if(!user){
        user = await db.createUserWithId(authUserId, {
          name: "User " + phone.slice(-4),
          phone: fullPhone,
          role: isAdmin ? "admin" : "user",
          plan: isAdmin ? "premium" : "free",
          is_active: true,
        });
        await supabase.from("notifications").insert({
          user_id: user.id, type:"welcome",
          title:"Welcome to StreamX! 🎉",
          message:"Start watching amazing content.",
        }).catch(()=>{});
      }

      if(!user.is_active){
        setError("Your account has been suspended. Contact support.");
        setLoading(false);
        await supabase.auth.signOut().catch(()=>{});
        return;
      }

      const allowed = await checkDeviceLimit(user);
      if(!allowed){
        setPendingUser(user);
        setStep("device_limit");
        setLoading(false); return;
      }

      await registerDevice(user);
      onLogin(user);

    } catch(e){
      setError("Login failed. Please try again.");
      console.error("Login error:", e);
    }
    setLoading(false);
  }

  async function checkDeviceLimit(user){
    const limit = PLAN_DEVICES[user.plan] || 1;
    const deviceId = getDeviceId();
    try {
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if(!sessions || sessions.length === 0) return true;
      const thisDevice = sessions.find(s => s.device_id === deviceId);
      if(thisDevice) return true;
      if(sessions.length < limit) return true;

      setActiveDevices(sessions);
      return false;
    } catch(e){
      return true;
    }
  }

  async function registerDevice(user){
    const deviceId = getDeviceId();
    try {
      await supabase.from("user_sessions").upsert({
        user_id:     user.id,
        device_id:   deviceId,
        device_name: getDeviceName(),
        device_os:   getDeviceOS(),
        is_active:   true,
        last_active: new Date().toISOString(),
      }, { onConflict: "user_id,device_id" });
    } catch(e){}
  }

  async function signOutDevice(sessionId){
    try {
      await supabase.from("user_sessions").update({ is_active:false }).eq("id", sessionId);
      const updated = activeDevices.filter(d=>d.id!==sessionId);
      setActiveDevices(updated);
      if(pendingUser){
        const limit = PLAN_DEVICES[pendingUser.plan] || 1;
        if(updated.length < limit){
          await registerDevice(pendingUser);
          onLogin(pendingUser);
        }
      }
    } catch(e){ setError("Failed to sign out device."); }
  }

  async function signOutAllDevices(){
    try {
      await supabase.from("user_sessions").update({ is_active:false }).eq("user_id", pendingUser.id);
      await registerDevice(pendingUser);
      onLogin(pendingUser);
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

  const planLabel = {
    free:"Free (1 device)",plan_mobile:"Mobile (1 device)",
    plan_basic:"Basic (2 devices)",plan_premium:"Premium (4 devices)",
    plan_annual:"Annual (4 devices)",premium:"Premium (4 devices)",
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        .otp-inp{width:46px;height:56px;border-radius:10px;background:#0f0f18;border:2px solid #1e1e2e;color:#fff;font-size:22px;text-align:center;font-family:Inter,sans-serif;transition:border-color .2s;-webkit-appearance:none;outline:none;}
        .otp-inp:focus{border-color:#e50914;}
        .txt-inp{height:52px;background:#0f0f18;border:1.5px solid #1e1e2e;border-radius:10px;color:#fff;font-size:15px;padding:0 14px;font-family:Inter,sans-serif;transition:border-color .2s;-webkit-appearance:none;outline:none;}
        .txt-inp:focus{border-color:#e50914;}
        .pri-btn{width:100%;height:52px;border:none;border-radius:12px;font-weight:800;font-size:15px;font-family:Inter,sans-serif;transition:all .2s;cursor:pointer;}
        .dev-card{display:flex;align-items:center;gap:12px;padding:12px 14px;background:#0a0a14;border:1px solid #1e1e2e;border-radius:10px;margin-bottom:8px;}
      `}</style>

      <div style={{background:"rgba(13,13,22,.98)",border:"1px solid #1a1a28",borderRadius:22,padding:"36px 24px 28px",width:"100%",maxWidth:360,animation:"fadeUp .4s ease"}}>

        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontWeight:900,fontSize:36,letterSpacing:2,lineHeight:1,marginBottom:5}}>
            <span style={{color:"#e50914"}}>STREAM</span><span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:12,color:"#2a2a3a",fontWeight:500}}>India's Premium OTT Platform</div>
        </div>

        {step==="phone" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{fontSize:13,fontWeight:600,color:"#aaa",marginBottom:16,textAlign:"center",lineHeight:1.6}}>
              Enter your mobile number to continue.<br/>
              <span style={{color:"#555",fontSize:12}}>No registration needed.</span>
            </div>
            <div style={{fontSize:10,color:"#333",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Mobile Number</div>
            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <div style={{background:"#0f0f18",border:"1.5px solid #1e1e2e",borderRadius:10,padding:"0 12px",display:"flex",alignItems:"center",gap:6,flexShrink:0,width:76,height:52,justifyContent:"center"}}>
                <span style={{fontSize:17}}>🇮🇳</span>
                <span style={{color:"#888",fontSize:13,fontWeight:700}}>+91</span>
              </div>
              <input className="txt-inp" style={{flex:1}} value={phone}
                onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))}
                placeholder="Enter mobile number" type="tel" maxLength={10} autoFocus
                onKeyDown={e=>e.key==="Enter"&&canSend&&sendOTP()}
              />
            </div>
            {error && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"9px 12px",marginBottom:14,color:"#f87171",fontSize:12,fontWeight:500}}>❌ {error}</div>}
            <button className="pri-btn" onClick={sendOTP} disabled={!canSend}
              style={{background:canSend?"linear-gradient(135deg,#e50914,#c00)":"#141420",color:"#fff"}}>
              {loading?"Sending OTP...":"Get OTP →"}
            </button>
            <div style={{textAlign:"center",marginTop:18,fontSize:11,color:"#1e1e2e",lineHeight:1.8}}>
              By continuing, you agree to StreamX<br/>Terms of Use and Privacy Policy
            </div>
          </div>
        )}

        {step==="otp" && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <div style={{width:58,height:58,borderRadius:"50%",background:"rgba(229,9,20,.1)",border:"2px solid rgba(229,9,20,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,margin:"0 auto 12px"}}>📱</div>
              <div style={{fontSize:13,color:"#555",marginBottom:3}}>OTP sent to</div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:4}}>+91 {phone}</div>
              <div style={{fontSize:12,color:"#444",marginBottom:6}}>
                {isBypassNumber ? "Test number — use the test code below" : "6-digit OTP sent via SMS"}
              </div>
              <button onClick={()=>{setStep("phone");setError("");setOtp(["","","","","",""]);}}
                style={{background:"none",border:"none",color:"#e50914",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
                ← Change number
              </button>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>
              {otp.map((v,i)=>(
                <input key={i} ref={refs[i]} value={v}
                  onChange={e=>handleOTPInput(i,e.target.value)}
                  onPaste={handlePaste} maxLength={1} type="tel" inputMode="numeric"
                  className="otp-inp" style={{borderColor:v?"#e50914":"#1e1e2e"}}
                />
              ))}
            </div>
            {error && <div style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"9px 12px",marginBottom:14,color:"#f87171",fontSize:12,textAlign:"center",fontWeight:500}}>❌ {error}</div>}
            <button className="pri-btn" onClick={()=>verifyOTP()} disabled={!canVerify}
              style={{background:canVerify?"linear-gradient(135deg,#e50914,#c00)":"#141420",color:"#fff",marginBottom:14}}>
              {loading?"Verifying...":"Verify OTP →"}
            </button>
            <div style={{textAlign:"center",fontSize:13}}>
              {timer>0
                ? <span style={{color:"#333"}}>Resend in <span style={{color:"#e50914",fontWeight:700}}>{timer}s</span></span>
                : <button onClick={()=>{sendOTP();setOtp(["","","","","",""]);}}
                    style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Inter,sans-serif"}}>
                    Resend OTP
                  </button>
              }
            </div>
            {isBypassNumber && (
              <div style={{textAlign:"center",marginTop:10,fontSize:11,color:"#f59e0b",background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:8,padding:"7px 10px"}}>
                ⚠️ Test mode — code is {TESTING_BYPASS_CODE}
              </div>
            )}
          </div>
        )}

        {step==="device_limit" && pendingUser && (
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{textAlign:"center",marginBottom:20}}>
              <div style={{fontSize:44,marginBottom:10}}>📱</div>
              <div style={{fontWeight:800,fontSize:17,color:"#fff",marginBottom:6}}>Device Limit Reached</div>
              <div style={{fontSize:13,color:"#888",lineHeight:1.6,marginBottom:4}}>
                Your <span style={{color:"#e50914",fontWeight:700}}>{planLabel[pendingUser.plan]||"Free (1 device)"}</span> plan allows {PLAN_DEVICES[pendingUser.plan]||1} active device{(PLAN_DEVICES[pendingUser.plan]||1)>1?"s":""}.
              </div>
              <div style={{fontSize:12,color:"#555"}}>Sign out from another device to continue.</div>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,color:"#444",fontWeight:700,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Active Devices</div>
              {activeDevices.map(dev=>(
                <div key={dev.id} className="dev-card">
                  <div style={{fontSize:24,flexShrink:0}}>
                    {dev.device_os==="iOS"?"📱":dev.device_os==="Android"?"📱":dev.device_os==="Windows"?"💻":dev.device_os==="macOS"?"💻":"📺"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:600,fontSize:13,color:"#fff"}}>{dev.device_name||"Unknown Device"}</div>
                    <div style={{fontSize:11,color:"#555",marginTop:1}}>
                      {dev.device_os||"Unknown OS"} · Last active {dev.last_active ? new Date(dev.last_active).toLocaleDateString("en-IN") : "Recently"}
                    </div>
                  </div>
                  <button onClick={()=>signOutDevice(dev.id)}
                    style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",color:"#f87171",borderRadius:7,padding:"5px 11px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"}}>
                    Sign Out
                  </button>
                </div>
              ))}
            </div>
            <button onClick={signOutAllDevices}
              style={{width:"100%",background:"rgba(229,9,20,.12)",border:"1px solid rgba(229,9,20,.3)",color:"#e50914",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif",marginBottom:10}}>
              Sign Out All Devices & Continue
            </button>
            <div style={{background:"linear-gradient(120deg,rgba(229,9,20,.08),rgba(245,158,11,.06))",border:"1px solid rgba(229,9,20,.15)",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:700,color:"#e50914",marginBottom:4}}>👑 Upgrade for More Devices</div>
              <div style={{fontSize:11,color:"#666",marginBottom:8}}>Basic = 2 devices · Premium = 4 devices</div>
              <div style={{display:"flex",gap:6}}>
                <div style={{flex:1,background:"rgba(255,255,255,.04)",borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#fff"}}>Basic</div>
                  <div style={{fontSize:11,color:"#888"}}>₹299/mo</div>
                  <div style={{fontSize:10,color:"#555"}}>2 devices</div>
                </div>
                <div style={{flex:1,background:"rgba(229,9,20,.1)",border:"1px solid rgba(229,9,20,.25)",borderRadius:7,padding:"7px 10px",textAlign:"center"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#e50914"}}>Premium</div>
                  <div style={{fontSize:11,color:"#888"}}>₹499/mo</div>
                  <div style={{fontSize:10,color:"#555"}}>4 devices</div>
                </div>
              </div>
            </div>
            <button onClick={()=>{setStep("phone");setError("");setOtp(["","","","","",""]);setPendingUser(null);}}
              style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid #1e1e2e",color:"#555",borderRadius:10,padding:"10px",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
