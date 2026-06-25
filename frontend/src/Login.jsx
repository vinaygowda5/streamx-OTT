import { useState, useEffect, useRef } from "react";
import { supabase, db } from "./supabase.js";

const ADMIN_PHONES = ["+918660570052", "+919000000000", "+919000000001"];
const PLAN_DEVICES = { free:1, plan_mobile:1, plan_basic:2, plan_premium:4, plan_annual:4, premium:4 };

function getDeviceId() {
  let id = localStorage.getItem("sx_did");
  if (!id) { id = "d_"+Date.now()+"_"+Math.random().toString(36).slice(2,8); localStorage.setItem("sx_did",id); }
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
  return "Browser";
}

export default function Login({ onLogin }) {
  const [step,    setStep]    = useState("phone");
  const [phone,   setPhone]   = useState("");
  const [otp,     setOtp]     = useState(["","","","","",""]);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [timer,   setTimer]   = useState(0);
  const [devices, setDevices] = useState([]);
  const [pUser,   setPUser]   = useState(null);

  const r = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  useEffect(()=>{
    if(timer<=0) return;
    const t=setTimeout(()=>setTimer(s=>s-1),1000);
    return()=>clearTimeout(t);
  },[timer]);

  const fp = "+91"+phone.replace(/\D/g,"").slice(-10);
  const ok1 = phone.replace(/\D/g,"").length===10&&!loading;
  const ok2 = otp.join("").length===6&&!loading;

  async function send(){
    setError(""); if(!ok1) return;
    setLoading(true);
    await supabase.auth.signInWithOtp({phone:fp}).catch(()=>{});
    setLoading(false); setStep("otp"); setTimer(60);
    setOtp(["","","","","",""]); setTimeout(()=>r[0].current?.focus(),100);
  }

  async function verify(code){
    const c=code||otp.join(""); if(c.length<6) return;
    setError(""); setLoading(true);
    const {data,error}=await supabase.auth.verifyOtp({phone:fp,token:c,type:"sms"});
    const ok = (!error&&data?.user)||(c==="123456");
    if(!ok){ setError("Wrong OTP. Try again."); setLoading(false); setOtp(["","","","","",""]); setTimeout(()=>r[0].current?.focus(),80); return; }
    try {
      const isAdmin=ADMIN_PHONES.includes(fp);
      let u=await db.getUserByPhone(fp).catch(()=>null);
      if(!u) u=await db.createUser({name:"User"+phone.slice(-4),phone:fp,role:isAdmin?"admin":"user",plan:isAdmin?"premium":"free",is_active:true});
      if(!u.is_active){setError("Account suspended.");setLoading(false);return;}
      const devOk=await checkDev(u);
      if(!devOk){setPUser(u);setLoading(false);return;}
      await regDev(u); onLogin(u);
    } catch(e){
      onLogin({id:"t"+Date.now(),name:"User"+phone.slice(-4),phone:fp,role:ADMIN_PHONES.includes(fp)?"admin":"user",plan:"free",is_active:true});
    }
    setLoading(false);
  }

  async function checkDev(u){
    const limit=PLAN_DEVICES[u.plan]||1;
    const did=getDeviceId();
    try {
      const {data}=await supabase.from("user_sessions").select("*").eq("user_id",u.id).eq("is_active",true);
      if(!data||data.length===0) return true;
      if(data.find(s=>s.device_id===did)) return true;
      if(data.length<limit) return true;
      setDevices(data); setStep("devices"); return false;
    } catch(e){ return true; }
  }

  async function regDev(u){
    try {
      await supabase.from("user_sessions").upsert({user_id:u.id,device_id:getDeviceId(),device_name:getDeviceName(),is_active:true,last_active:new Date().toISOString()},{onConflict:"user_id,device_id"});
    } catch(e){}
  }

  async function signOutDev(id){
    await supabase.from("user_sessions").update({is_active:false}).eq("id",id).catch(()=>{});
    const upd=devices.filter(d=>d.id!==id); setDevices(upd);
    if(pUser&&upd.length<(PLAN_DEVICES[pUser.plan]||1)){ await regDev(pUser); onLogin(pUser); }
  }

  async function signOutAll(){
    await supabase.from("user_sessions").update({is_active:false}).eq("user_id",pUser.id).catch(()=>{});
    await regDev(pUser); onLogin(pUser);
  }

  function inp(i,v){
    if(!/^\d?$/.test(v)) return;
    const n=[...otp]; n[i]=v; setOtp(n);
    if(v&&i<5) r[i+1].current?.focus();
    if(!v&&i>0) r[i-1].current?.focus();
    if(v&&i===5) setTimeout(()=>verify([...otp.slice(0,5),v].join("")),60);
  }
  function paste(e){
    e.preventDefault();
    const p=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
    if(p.length===6){setOtp(p.split(""));r[5].current?.focus();setTimeout(()=>verify(p),60);}
  }

  const S = {
    wrap:{minHeight:"100vh",background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"},
    card:{background:"rgba(13,13,22,.98)",border:"1px solid #1a1a28",borderRadius:22,padding:"36px 24px 28px",width:"100%",maxWidth:360,animation:"fadeUp .35s ease"},
    btn:(on)=>({width:"100%",height:52,background:on?"linear-gradient(135deg,#e50914,#c00)":"#141420",color:"#fff",border:"none",borderRadius:12,fontWeight:800,fontSize:15,cursor:on?"pointer":"not-allowed",fontFamily:"Inter,sans-serif",transition:"all .2s"}),
    err:{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"9px 12px",marginBottom:14,color:"#f87171",fontSize:12,fontWeight:500},
    inp:{height:52,background:"#0f0f18",border:"1.5px solid #1e1e2e",borderRadius:10,color:"#fff",fontSize:15,padding:"0 14px",fontFamily:"Inter,sans-serif",outline:"none",transition:"border-color .2s"},
  };

  return (
    <div style={S.wrap}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        .oi{width:46px;height:56px;border-radius:10px;background:#0f0f18;border:2px solid #1e1e2e;color:#fff;font-size:22px;text-align:center;font-family:Inter,sans-serif;outline:none;-webkit-appearance:none;}
        .oi:focus{border-color:#e50914;}
        input:focus{border-color:#e50914!important;}
        input:-webkit-autofill{-webkit-box-shadow:0 0 0 30px #0f0f18 inset!important;-webkit-text-fill-color:#fff!important;}
      `}</style>

      <div style={S.card}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontWeight:900,fontSize:36,letterSpacing:2,lineHeight:1,marginBottom:5}}>
            <span style={{color:"#e50914"}}>STREAM</span><span style={{color:"#fff"}}>X</span>
          </div>
          <div style={{fontSize:12,color:"#2a2a3a"}}>India's Premium OTT Platform</div>
        </div>

        {/* PHONE */}
        {step==="phone"&&(
          <div style={{animation:"fadeUp .25s ease"}}>
            <div style={{fontSize:13,color:"#666",textAlign:"center",marginBottom:18,lineHeight:1.6}}>
              Enter mobile number to continue<br/><span style={{fontSize:11,color:"#333"}}>No registration needed</span>
            </div>
            <div style={{fontSize:10,color:"#333",fontWeight:700,letterSpacing:1.5,textTransform:"uppercase",marginBottom:8}}>Mobile Number</div>
            <div style={{display:"flex",gap:8,marginBottom:18}}>
              <div style={{...S.inp,width:76,display:"flex",alignItems:"center",justifyContent:"center",gap:6,flexShrink:0}}>
                <span style={{fontSize:17}}>🇮🇳</span><span style={{color:"#888",fontSize:13,fontWeight:700}}>+91</span>
              </div>
              <input style={{...S.inp,flex:1}} value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,"").slice(0,10))} placeholder="Enter mobile number" type="tel" maxLength={10} autoFocus onKeyDown={e=>e.key==="Enter"&&ok1&&send()}/>
            </div>
            {error&&<div style={S.err}>❌ {error}</div>}
            <button style={S.btn(ok1)} onClick={send} disabled={!ok1}>{loading?"Sending OTP...":"Get OTP →"}</button>
            <div style={{textAlign:"center",marginTop:16,fontSize:11,color:"#1a1a28",lineHeight:1.8}}>By continuing, you agree to StreamX<br/>Terms of Use and Privacy Policy</div>
          </div>
        )}

        {/* OTP */}
        {step==="otp"&&(
          <div style={{animation:"fadeUp .25s ease"}}>
            <div style={{textAlign:"center",marginBottom:22}}>
              <div style={{width:56,height:56,borderRadius:"50%",background:"rgba(229,9,20,.1)",border:"2px solid rgba(229,9,20,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,margin:"0 auto 10px"}}>📱</div>
              <div style={{fontSize:13,color:"#555",marginBottom:2}}>OTP sent to</div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",marginBottom:6}}>+91 {phone}</div>
              <button onClick={()=>{setStep("phone");setError("");setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Change number</button>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:18}}>
              {otp.map((v,i)=><input key={i} ref={r[i]} value={v} onChange={e=>inp(i,e.target.value)} onPaste={paste} maxLength={1} type="tel" inputMode="numeric" className="oi" style={{borderColor:v?"#e50914":"#1e1e2e"}}/>)}
            </div>
            {error&&<div style={S.err}>❌ {error}</div>}
            <button style={{...S.btn(ok2),marginBottom:12}} onClick={()=>verify()} disabled={!ok2}>{loading?"Verifying...":"Verify OTP →"}</button>
            <div style={{textAlign:"center",fontSize:13}}>
              {timer>0
                ? <span style={{color:"#333"}}>Resend in <span style={{color:"#e50914",fontWeight:700}}>{timer}s</span></span>
                : <button onClick={()=>{send();setOtp(["","","","","",""]);}} style={{background:"none",border:"none",color:"#e50914",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"Inter,sans-serif"}}>Resend OTP</button>
              }
            </div>
            <div style={{textAlign:"center",marginTop:6,fontSize:10,color:"#1a1a28"}}>Test OTP: 123456</div>
          </div>
        )}

        {/* DEVICE LIMIT */}
        {step==="devices"&&pUser&&(
          <div style={{animation:"fadeUp .25s ease"}}>
            <div style={{textAlign:"center",marginBottom:18}}>
              <div style={{fontSize:40,marginBottom:10}}>📱</div>
              <div style={{fontWeight:800,fontSize:17,color:"#fff",marginBottom:6}}>Device Limit Reached</div>
              <div style={{fontSize:13,color:"#888",lineHeight:1.6}}>
                Your <span style={{color:"#e50914",fontWeight:700}}>{pUser.plan||"free"}</span> plan allows <span style={{color:"#fff",fontWeight:700}}>{PLAN_DEVICES[pUser.plan]||1}</span> device{(PLAN_DEVICES[pUser.plan]||1)>1?"s":""}.
              </div>
            </div>
            {devices.map(d=>(
              <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,background:"#0a0a14",border:"1px solid #1e1e2e",borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                <span style={{fontSize:22}}>{d.device_name?.includes("iPhone")||d.device_name?.includes("Android")?"📱":"💻"}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#fff"}}>{d.device_name||"Unknown"}</div>
                  <div style={{fontSize:11,color:"#555"}}>Last active {d.last_active?new Date(d.last_active).toLocaleDateString("en-IN"):"recently"}</div>
                </div>
                <button onClick={()=>signOutDev(d.id)} style={{background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",color:"#f87171",borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif",whiteSpace:"nowrap"}}>Sign Out</button>
              </div>
            ))}
            <button onClick={signOutAll} style={{width:"100%",background:"rgba(229,9,20,.12)",border:"1px solid rgba(229,9,20,.3)",color:"#e50914",borderRadius:10,padding:"11px",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"Inter,sans-serif",marginBottom:10}}>
              Sign Out All & Continue
            </button>
            {/* Upgrade box */}
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
            <button onClick={()=>{setStep("phone");setError("");setOtp(["","","","","",""]);setPUser(null);}} style={{width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid #1e1e2e",color:"#555",borderRadius:10,padding:"10px",fontSize:12,cursor:"pointer",fontFamily:"Inter,sans-serif"}}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}
