import { useState } from "react";
import { supabase } from "./supabase.js";

export default function FaceAuth({ user, onSuccess, onSkip }) {
  const [status, setStatus] = useState("idle"); // idle | registering | verifying | success | error
  const [msg,    setMsg]    = useState("");

  const isSupported = window.PublicKeyCredential !== undefined;

  async function registerFace() {
    setStatus("registering");
    setMsg("Setting up Face ID / Fingerprint...");
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const cred = await navigator.credentials.create({
        publicKey: {
          challenge,
          rp: { name: "StreamX", id: window.location.hostname },
          user: {
            id: new TextEncoder().encode(user.id),
            name: user.phone || user.email || "admin",
            displayName: user.name || "Admin",
          },
          pubKeyCredParams: [
            { alg: -7,   type: "public-key" },
            { alg: -257, type: "public-key" },
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      });

      if (cred) {
        // Save credential ID to Supabase
        const credId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
        await supabase.from("face_auth").insert({
          user_id:       user.id,
          credential_id: credId,
          public_key:    JSON.stringify({ type: cred.type }),
        }).catch(() => {});

        setStatus("success");
        setMsg("Face ID registered! ✅");
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (e) {
      setStatus("error");
      setMsg(e.message || "Face ID setup failed. Try again.");
    }
  }

  async function verifyFace() {
    setStatus("verifying");
    setMsg("Scanning face / fingerprint...");
    try {
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId:            window.location.hostname,
          userVerification: "required",
          timeout:          60000,
        },
      });

      if (assertion) {
        setStatus("success");
        setMsg("Identity verified! ✅");
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (e) {
      setStatus("error");
      setMsg("Verification failed. Try again.");
    }
  }

  if (!isSupported) {
    return (
      <div style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,.9)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
        <div style={{background:"#0f0f18",border:"1px solid #1a1a26",borderRadius:20,padding:36,width:"100%",maxWidth:380,textAlign:"center"}}>
          <div style={{fontSize:52,marginBottom:16}}>⚠️</div>
          <div style={{fontWeight:700,fontSize:18,marginBottom:8}}>Not Supported</div>
          <div style={{color:"#666",fontSize:14,marginBottom:24}}>Your browser doesn't support biometric authentication. Use a modern mobile browser.</div>
          <button onClick={onSkip} style={{width:"100%",background:"#e50914",color:"#fff",border:"none",borderRadius:10,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer"}}>Continue Without Face ID</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:800,background:"rgba(0,0,0,.92)",display:"flex",alignItems:"center",justifyContent:"center",padding:20,fontFamily:"Inter,sans-serif"}}>
      <div style={{background:"#0f0f18",border:"1px solid #1a1a26",borderRadius:20,padding:"40px 32px",width:"100%",maxWidth:380,textAlign:"center"}}>

        {/* Logo */}
        <div style={{fontWeight:900,fontSize:28,letterSpacing:2,marginBottom:24}}>
          <span style={{color:"#e50914"}}>STREAM</span><span style={{color:"#fff"}}>X</span>
          <div style={{fontSize:11,color:"#e50914",letterSpacing:3,fontWeight:700,marginTop:4}}>ADMIN ACCESS</div>
        </div>

        {/* Icon */}
        <div style={{width:100,height:100,borderRadius:"50%",background:"rgba(229,9,20,.1)",border:"2px solid rgba(229,9,20,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,margin:"0 auto 24px"}}>
          {status==="success"?"✅":status==="error"?"❌":"🔐"}
        </div>

        <div style={{fontSize:18,fontWeight:700,marginBottom:8}}>
          {status==="idle"      && "Admin Verification Required"}
          {status==="registering"&&"Setting Up Biometrics"}
          {status==="verifying" && "Verifying Identity"}
          {status==="success"   && "Access Granted!"}
          {status==="error"     && "Verification Failed"}
        </div>

        <div style={{fontSize:13,color:"#666",marginBottom:32,lineHeight:1.6}}>
          {status==="idle" && "Use Face ID or Fingerprint to access the Admin Panel"}
          {status!=="idle" && msg}
        </div>

        {status==="idle" && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button onClick={registerFace} style={{width:"100%",background:"#e50914",color:"#fff",border:"none",borderRadius:12,padding:"14px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
              📱 Set Up Face ID / Fingerprint
            </button>
            <button onClick={verifyFace} style={{width:"100%",background:"rgba(255,255,255,.06)",border:"1px solid #1a1a26",color:"#aaa",borderRadius:12,padding:"14px",fontWeight:600,fontSize:14,cursor:"pointer"}}>
              🔓 Already Set Up — Verify Now
            </button>
            <button onClick={onSkip} style={{background:"none",border:"none",color:"#444",fontSize:12,cursor:"pointer",padding:"8px"}}>
              Skip for now
            </button>
          </div>
        )}

        {status==="error" && (
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button onClick={()=>setStatus("idle")} style={{background:"#e50914",color:"#fff",border:"none",borderRadius:8,padding:"11px 24px",fontWeight:700,fontSize:13,cursor:"pointer"}}>
              Try Again
            </button>
            <button onClick={onSkip} style={{background:"rgba(255,255,255,.06)",border:"1px solid #1a1a26",color:"#aaa",borderRadius:8,padding:"11px 20px",fontSize:13,cursor:"pointer"}}>
              Skip
            </button>
          </div>
        )}

        {(status==="registering"||status==="verifying") && (
          <div style={{display:"flex",justifyContent:"center"}}>
            <div style={{width:40,height:40,border:"3px solid #333",borderTop:"3px solid #e50914",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
          </div>
        )}

        <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
      </div>
    </div>
  );
}