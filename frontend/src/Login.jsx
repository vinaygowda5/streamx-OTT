// frontend/src/Login.jsx
import { useState } from "react";
import { auth } from "./api.js";

export default function Login({ onLogin }) {
  const [tab,    setTab]    = useState("login");
  const [name,   setName]   = useState("");
  const [email,  setEmail]  = useState("demo@streamx.in");
  const [pass,   setPass]   = useState("Demo@1234");
  const [error,  setError]  = useState("");
  const [loading,setLoading]= useState(false);

  async function handleSubmit() {
    setError(""); setLoading(true);
    try {
      let res;
      if (tab === "login") {
        res = await auth.login(email, pass);
      } else {
        res = await auth.register(name, email, pass);
      }
      if (res.success) {
        if (res.data?.accessToken) {
          localStorage.setItem("streamx_token", res.data.accessToken);
          localStorage.setItem("streamx_user",  JSON.stringify(res.data.user));
        }
        onLogin(res.data?.user || { name, email });
      } else {
        setError(res.message || "Something went wrong");
      }
    } catch (e) {
      setError("Cannot connect to server. Make sure backend is running.");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#07070c",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "Inter, sans-serif"
    }}>
      <div style={{
        background: "#0f0f18", border: "1px solid #1a1a26",
        borderRadius: 16, padding: 36, width: "100%", maxWidth: 420
      }}>
        {/* Logo */}
        <div style={{
          textAlign: "center", marginBottom: 32,
          fontWeight: 900, fontSize: 32, letterSpacing: 1
        }}>
          <span style={{ color: "#e50914" }}>STREAM</span>
          <span style={{ color: "#fff" }}>X</span>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex", background: "#111120",
          borderRadius: 8, padding: 4, marginBottom: 28
        }}>
          {["login","register"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, background: tab === t ? "#e50914" : "transparent",
              color: "#fff", border: "none", borderRadius: 6,
              padding: "9px 0", fontWeight: 700,
              fontSize: 13, cursor: "pointer",
              fontFamily: "Inter, sans-serif",
              transition: "all .2s"
            }}>
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {/* Fields */}
        {tab === "register" && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: "#555", fontWeight: 700,
              display: "block", marginBottom: 6, textTransform: "uppercase" }}>
              Full Name
            </label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Your name"
              style={{
                width: "100%", background: "#0a0a14",
                border: "1px solid #1a1a2c", borderRadius: 7,
                color: "#fff", fontSize: 13, padding: "10px 12px", outline: "none"
              }}
            />
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 11, color: "#555", fontWeight: 700,
            display: "block", marginBottom: 6, textTransform: "uppercase" }}>
            Email
          </label>
          <input value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com" type="email"
            style={{
              width: "100%", background: "#0a0a14",
              border: "1px solid #1a1a2c", borderRadius: 7,
              color: "#fff", fontSize: 13, padding: "10px 12px", outline: "none"
            }}
          />
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 11, color: "#555", fontWeight: 700,
            display: "block", marginBottom: 6, textTransform: "uppercase" }}>
            Password
          </label>
          <input value={pass} onChange={e => setPass(e.target.value)}
            placeholder="••••••••" type="password"
            style={{
              width: "100%", background: "#0a0a14",
              border: "1px solid #1a1a2c", borderRadius: 7,
              color: "#fff", fontSize: 13, padding: "10px 12px", outline: "none"
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: "rgba(248,113,113,.1)", border: "1px solid rgba(248,113,113,.3)",
            borderRadius: 7, padding: "10px 14px", marginBottom: 16,
            color: "#f87171", fontSize: 13
          }}>
            ❌ {error}
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{
          width: "100%", background: loading ? "#666" : "#e50914",
          color: "#fff", border: "none", borderRadius: 8,
          padding: "13px 0", fontWeight: 800, fontSize: 14,
          cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "Inter, sans-serif", transition: "all .2s"
        }}>
          {loading ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
        </button>

        {/* Demo hint */}
        <div style={{
          textAlign: "center", marginTop: 16,
          fontSize: 11, color: "#444"
        }}>
          Demo: demo@streamx.in / Demo@1234
        </div>
      </div>
    </div>
  );
}