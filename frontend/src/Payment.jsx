import { useState } from "react";

const PLANS = [
  {
    id: "plan_mobile",
    name: "Mobile",
    price: 149,
    period: "month",
    color: "#6b7280",
    features: ["720p only", "1 screen", "Mobile only", "Ads included"],
  },
  {
    id: "plan_basic",
    name: "Basic",
    price: 299,
    period: "month",
    color: "#3b82f6",
    features: ["1080p HD", "1 screen", "All devices", "No Ads"],
  },
  {
    id: "plan_premium",
    name: "Premium",
    price: 499,
    period: "month",
    color: "#e50914",
    features: ["4K + HDR", "4 screens", "Downloads", "Dolby Atmos", "No Ads"],
    popular: true,
  },
  {
    id: "plan_annual",
    name: "Annual",
    price: 999,
    period: "year",
    color: "#f59e0b",
    features: ["4K + HDR", "4 screens", "Unlimited downloads", "Save 80%", "No Ads"],
  },
];

export default function Payment({ user, currentPlan, onSuccess, onClose }) {
  const [selected, setSelected] = useState("plan_premium");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("plans"); // plans | paying | success

  const plan = PLANS.find(p => p.id === selected);

  function handlePayment() {
    setLoading(true);

    const options = {
      // ← Replace with your Razorpay test key
      key: "rzp_test_StY0bYNyFRDQBb",
      amount: plan.price * 100, // in paise
      currency: "INR",
      name: "StreamX",
      description: `${plan.name} Plan — ${plan.period}ly subscription`,
      image: "https://via.placeholder.com/60x60/e50914/ffffff?text=SX",
      prefill: {
        name:  user?.name  || "StreamX User",
        email: user?.email || "",
      },
      notes: {
        planId: plan.id,
        userId: user?.id || "",
      },
      theme: {
        color: "#e50914",
      },
      handler: function(response) {
        // Payment successful!
        setStep("success");
        setLoading(false);
        setTimeout(() => {
          onSuccess({
            planId:    plan.id,
            planName:  plan.name,
            amount:    plan.price,
            paymentId: response.razorpay_payment_id,
          });
        }, 2000);
      },
      modal: {
        ondismiss: () => setLoading(false),
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        setLoading(false);
        alert("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (e) {
      setLoading(false);
      alert("Payment gateway not loaded. Please refresh.");
    }
  }

  if (step === "success") {
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 800,
        background: "rgba(0,0,0,.9)",
        display: "flex", alignItems: "center",
        justifyContent: "center",
      }}>
        <div style={{
          background: "#0f0f18",
          border: "1px solid #00c853",
          borderRadius: 20, padding: 40,
          textAlign: "center", maxWidth: 380,
        }}>
          <div style={{ fontSize: 72, marginBottom: 16 }}>🎉</div>
          <div style={{
            fontFamily: "serif", fontSize: 28,
            fontWeight: 900, color: "#00c853", marginBottom: 8,
          }}>Payment Successful!</div>
          <div style={{ color: "#888", fontSize: 14, marginBottom: 24 }}>
            Welcome to StreamX {plan.name}!<br/>
            Enjoy unlimited streaming.
          </div>
          <div style={{
            background: "rgba(0,200,83,.1)",
            border: "1px solid rgba(0,200,83,.3)",
            borderRadius: 10, padding: 16, marginBottom: 24,
          }}>
            <div style={{ fontSize: 13, color: "#aaa" }}>Plan Activated</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#00c853" }}>
              {plan.name} — ₹{plan.price}/{plan.period}
            </div>
          </div>
          <button onClick={onClose} style={{
            width: "100%", background: "#e50914",
            color: "#fff", border: "none", borderRadius: 8,
            padding: "13px 0", fontWeight: 800,
            fontSize: 14, cursor: "pointer",
          }}>
            Start Watching 🎬
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 800,
      background: "rgba(0,0,0,.88)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center",
      justifyContent: "center", padding: 16,
      overflowY: "auto",
    }}>
      <div style={{
        background: "#0a0a0f",
        border: "1px solid #1a1a26",
        borderRadius: 20, padding: 28,
        width: "100%", maxWidth: 520,
        margin: "auto",
      }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginBottom: 24,
        }}>
          <div>
            <div style={{
              fontFamily: "serif", fontWeight: 900,
              fontSize: 24, letterSpacing: 1,
            }}>
              <span style={{ color: "#e50914" }}>STREAM</span>
              <span style={{ color: "#fff" }}>X</span>
              <span style={{ color: "#888", fontSize: 14, fontWeight: 400, marginLeft: 8 }}>
                Premium
              </span>
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
              Choose your plan
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,.06)",
            border: "1px solid #1a1a26", color: "#aaa",
            borderRadius: 8, padding: "6px 12px",
            cursor: "pointer", fontSize: 14,
          }}>✕</button>
        </div>

        {/* Plans grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10, marginBottom: 20,
        }}>
          {PLANS.map(p => (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                border: `2px solid ${selected === p.id ? p.color : "#1a1a26"}`,
                borderRadius: 12, padding: 16,
                cursor: "pointer", position: "relative",
                background: selected === p.id ? `${p.color}11` : "#0f0f18",
                transition: "all .2s",
              }}
            >
              {p.popular && (
                <div style={{
                  position: "absolute", top: -10, left: "50%",
                  transform: "translateX(-50%)",
                  background: "#e50914", color: "#fff",
                  fontSize: 9, fontWeight: 800,
                  padding: "2px 10px", borderRadius: 20, letterSpacing: 1,
                  whiteSpace: "nowrap",
                }}>MOST POPULAR</div>
              )}
              <div style={{
                fontSize: 15, fontWeight: 800,
                color: p.color, marginBottom: 4,
              }}>{p.name}</div>
              <div style={{
                fontSize: 24, fontWeight: 900,
                color: "#fff",
              }}>₹{p.price}</div>
              <div style={{ fontSize: 11, color: "#555", marginBottom: 10 }}>
                /{p.period}
              </div>
              {p.features.map(f => (
                <div key={f} style={{
                  fontSize: 11, color: "#888",
                  marginBottom: 4, display: "flex", gap: 5,
                }}>
                  <span style={{ color: p.color }}>✓</span>{f}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Selected plan summary */}
        <div style={{
          background: `${plan.color}11`,
          border: `1px solid ${plan.color}33`,
          borderRadius: 10, padding: 14,
          marginBottom: 16,
          display: "flex", justifyContent: "space-between",
          alignItems: "center",
        }}>
          <div>
            <div style={{ fontSize: 12, color: "#888" }}>Selected Plan</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: plan.color }}>
              {plan.name}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 24, fontWeight: 900 }}>₹{plan.price}</div>
            <div style={{ fontSize: 11, color: "#555" }}>/{plan.period}</div>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePayment}
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? "#333" : "#e50914",
            color: "#fff", border: "none",
            borderRadius: 10, padding: "14px 0",
            fontWeight: 800, fontSize: 15,
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: 12, transition: "all .2s",
          }}
        >
          {loading ? "Opening Payment..." : `Pay ₹${plan.price} Securely →`}
        </button>

        {/* Security badges */}
        <div style={{
          display: "flex", justifyContent: "center",
          gap: 16, fontSize: 11, color: "#444",
        }}>
          <span>🔒 256-bit SSL</span>
          <span>🏦 Razorpay Secure</span>
          <span>✅ Cancel Anytime</span>
        </div>
      </div>
    </div>
  );
}