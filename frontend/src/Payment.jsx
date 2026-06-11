import { useState } from "react";
import { supabase, db } from "./supabase.js";

const PLANS = [
  {
    id: "plan_mobile",
    name: "Mobile",
    price: 149,
    period: "month",
    color: "#3b82f6",
    icon: "📱",
    devices: 1,
    quality: "HD",
    features: ["1 screen","HD quality","Mobile & tablet","Ads supported"],
    noAds: false,
  },
  {
    id: "plan_basic",
    name: "Basic",
    price: 299,
    period: "month",
    color: "#8b5cf6",
    icon: "⭐",
    devices: 2,
    quality: "Full HD",
    features: ["2 screens","Full HD 1080p","TV + Mobile","Fewer ads"],
    noAds: false,
  },
  {
    id: "plan_premium",
    name: "Premium",
    price: 499,
    period: "month",
    color: "#e50914",
    icon: "👑",
    devices: 4,
    quality: "4K HDR",
    best: true,
    features: ["4 screens","4K HDR","All devices","Downloads","NO ADS ✓","All languages"],
    noAds: true,
  },
  {
    id: "plan_annual",
    name: "Super Saver",
    price: 999,
    period: "year",
    color: "#f59e0b",
    icon: "🏆",
    devices: 4,
    quality: "4K HDR",
    features: ["4 screens","4K HDR","All devices","Downloads","NO ADS ✓","Save 83%"],
    noAds: true,
    savings: "Save ₹4,989/yr",
  },
];

export default function Payment({ user, onClose, onSuccess }) {
  const [sel,     setSel]     = useState("plan_premium");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);
  const [error,   setError]   = useState("");

  const plan = PLANS.find(p => p.id === sel) || PLANS[2];

  async function loadRazorpay() {
    return new Promise((res, rej) => {
      if (window.Razorpay) { res(); return; }
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = res; s.onerror = () => rej(new Error("Failed to load Razorpay"));
      document.head.appendChild(s);
    });
  }

  async function pay() {
    setError(""); setLoading(true);
    try {
      await loadRazorpay();
      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY || "rzp_test_YOUR_KEY_HERE",
        amount: plan.price * 100,
        currency: "INR",
        name: "StreamX",
        description: `${plan.name} Plan`,
        image: "https://streamx-ott.vercel.app/favicon.ico",
        prefill: { contact: user?.phone?.replace("+91","") || "", email: user?.email || "", name: user?.name || "" },
        theme: { color: plan.color },
        handler: async (response) => { await activate(response.razorpay_payment_id); },
        modal: { ondismiss: () => setLoading(false) },
      };
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (r) => { setError("Payment failed: " + r.error.description); setLoading(false); });
      rzp.open();
    } catch(e) { setError("Payment error. Try again."); setLoading(false); }
  }

  async function activate(paymentId) {
    try {
      const end = new Date();
      if (plan.period === "year") end.setFullYear(end.getFullYear() + 1);
      else end.setMonth(end.getMonth() + 1);
      await supabase.from("subscriptions").insert({ user_id:user.id, plan_id:plan.id, status:"active", amount:plan.price, payment_id:paymentId, end_date:end.toISOString() });
      await supabase.from("transactions").insert({ user_id:user.id, plan_id:plan.id, amount:plan.price, status:"success", payment_id:paymentId });
      await db.updateUser(user.id, { plan: plan.id });
      const saved = JSON.parse(localStorage.getItem("streamx_user") || "{}");
      localStorage.setItem("streamx_user", JSON.stringify({ ...saved, plan: plan.id }));
      await supabase.from("notifications").insert({ user_id:user.id, type:"subscription", title:`${plan.name} Plan Activated! ${plan.icon}`, message:`Enjoy ${plan.devices} screens and ${plan.quality}!` });
      setDone(true); setLoading(false);
      setTimeout(() => onSuccess?.({ ...user, plan: plan.id }), 2000);
    } catch(e) { setError("Failed to activate. Contact support."); setLoading(false); }
  }

  if (done) return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"#07070c",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"Inter,sans-serif" }}>
      <div style={{ textAlign:"center",padding:24 }}>
        <div style={{ fontSize:72,marginBottom:16 }}>🎉</div>
        <div style={{ fontWeight:900,fontSize:26,color:"#fff",marginBottom:8 }}>{plan.name} Activated!</div>
        <div style={{ fontSize:14,color:plan.color,fontWeight:700 }}>{plan.noAds?"Enjoy ad-free streaming! 🎬":"Start watching now!"}</div>
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,.96)",display:"flex",alignItems:"center",justifyContent:"center",padding:16,fontFamily:"Inter,sans-serif",overflowY:"auto" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box;}@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <div style={{ width:"100%",maxWidth:420,animation:"fadeUp .3s ease" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:900,fontSize:22,color:"#fff" }}>StreamX Premium</div>
            <div style={{ fontSize:12,color:"#555" }}>Choose your plan</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.06)",border:"1px solid #1a1a26",color:"#aaa",borderRadius:9,width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:18 }}>✕</button>
        </div>
        {PLANS.map(p => (
          <div key={p.id} onClick={() => setSel(p.id)} style={{ background:sel===p.id?`${p.color}14`:"rgba(255,255,255,.03)",border:`2px solid ${sel===p.id?p.color:"#1a1a26"}`,borderRadius:14,padding:"14px 16px",marginBottom:10,cursor:"pointer",position:"relative",transition:"all .2s" }}>
            {p.best && <div style={{ position:"absolute",top:-10,right:16,background:p.color,color:"#fff",fontSize:10,fontWeight:800,padding:"2px 12px",borderRadius:20 }}>MOST POPULAR</div>}
            {p.savings && <div style={{ position:"absolute",top:-10,left:16,background:"#00c853",color:"#fff",fontSize:10,fontWeight:800,padding:"2px 10px",borderRadius:20 }}>{p.savings}</div>}
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8 }}>
              <div>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:3 }}>
                  <span style={{ fontSize:18 }}>{p.icon}</span>
                  <span style={{ fontWeight:800,fontSize:16,color:"#fff" }}>{p.name}</span>
                </div>
                <div style={{ fontSize:11,color:"#666" }}>{p.devices} screen{p.devices>1?"s":""} · {p.quality}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontWeight:900,fontSize:22,color:p.color }}>₹{p.price}</div>
                <div style={{ fontSize:10,color:"#555" }}>/{p.period}</div>
              </div>
            </div>
            <div style={{ display:"flex",flexWrap:"wrap",gap:5 }}>
              {p.features.map(f => (
                <span key={f} style={{ background:"rgba(255,255,255,.05)",color:f.includes("NO ADS")?p.color:"#777",fontSize:10,fontWeight:f.includes("NO ADS")?700:400,padding:"3px 8px",borderRadius:20 }}>{f}</span>
              ))}
            </div>
          </div>
        ))}
        {error && <div style={{ background:"rgba(248,113,113,.08)",border:"1px solid rgba(248,113,113,.2)",borderRadius:8,padding:"9px 14px",marginBottom:12,color:"#f87171",fontSize:12 }}>❌ {error}</div>}
        <button onClick={pay} disabled={loading} style={{ width:"100%",height:54,background:loading?"#1a1a26":`linear-gradient(135deg,${plan.color},${plan.color}cc)`,color:"#fff",border:"none",borderRadius:13,fontWeight:800,fontSize:16,cursor:loading?"not-allowed":"pointer",fontFamily:"Inter,sans-serif",marginBottom:12 }}>
          {loading?"Processing...": `Pay ₹${plan.price} · Subscribe`}
        </button>
        <div style={{ textAlign:"center",fontSize:11,color:"#333",lineHeight:1.8 }}>🔒 Secure payment via Razorpay · Cancel anytime</div>
      </div>
    </div>
  );
}
