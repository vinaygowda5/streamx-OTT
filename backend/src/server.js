const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");
dotenv.config();

const {
  securityHeaders,
  ipGuard,
  requestValidator,
  apiLimiter,
  otpLimiter,
  adminLimiter,
  loginLimiter,
} = require("./src/middleware/firewall");

const app = express();

// ── LAYER 3: Security headers on EVERY response ──
app.use(securityHeaders);

// ── LAYER 3: IP Guard — blocks banned IPs and unknown origins ──
app.use(ipGuard);

// ── CORS — only allow your frontend ──
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || "https://streamx-ott.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

// ── Body parser with size limit ──
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── LAYER 2: Request validator on ALL routes ──
app.use(requestValidator);

// ── LAYER 1: General rate limiter on all API routes ──
app.use("/api", apiLimiter);

// ── Specific rate limiters on sensitive routes ──
app.use("/api/auth/send-otp",   otpLimiter);
app.use("/api/auth/verify-otp", loginLimiter);
app.use("/api/admin",           adminLimiter);

// ── Routes ──
app.use("/api/auth",          require("./src/routes/auth"));
app.use("/api/users",         require("./src/routes/users"));
app.use("/api/content",       require("./src/routes/content"));
app.use("/api/subscriptions", require("./src/routes/subscriptions"));
app.use("/api/admin",         require("./src/routes/admin"));
app.use("/api/support",       require("./src/routes/support"));

// ── Health check ──
app.get("/", (req, res) => res.json({
  status: "✅ Namma Cinema Backend Running",
  firewall: "🔥 3-Layer Active",
  version: "1.0.0",
}));

// ── Error handler ──
app.use(require("./src/middleware/errorHandler"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🎬 Namma Cinema backend running on port ${PORT}`);
  console.log(`🔥 Firewall: Layer 1 (Rate Limit) + Layer 2 (Validator) + Layer 3 (IP Guard) ACTIVE`);
});
