const express = require("express");
const cors    = require("cors");
const compression = require("compression");
const dotenv  = require("dotenv");
dotenv.config();

const { log } = require("./src/utils/logger");
const { isRedisActive } = require("./src/utils/cache");
const {
  securityHeaders, ipGuard, requestValidator,
  apiLimiter, otpLimiter, adminLimiter, loginLimiter,
} = require("./src/middleware/firewall");

const app = express();

app.use(compression()); // gzip API responses — cuts payload size ~70% for JSON

// Request timing — logs every request's duration so real latency is measurable
// (this is the "monitoring" data point: see it in Railway logs, or query
// recent samples at GET /api/analytics/perf)
const _recentTimings = [];
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    _recentTimings.push({ path: req.path, method: req.method, ms: Math.round(ms), status: res.statusCode, time: Date.now() });
    if (_recentTimings.length > 200) _recentTimings.shift();
    if (ms > 200) log("warn", "slow_request", { path: req.path, ms: Math.round(ms) });
  });
  next();
});
app.get("/api/analytics/perf", (req, res) => {
  const avg = _recentTimings.length
    ? Math.round(_recentTimings.reduce((s, t) => s + t.ms, 0) / _recentTimings.length)
    : 0;
  res.json({
    avg_response_ms: avg,
    redis_active: isRedisActive(),
    sample_size: _recentTimings.length,
    recent: _recentTimings.slice(-20),
  });
});

app.use(securityHeaders);
app.use(ipGuard);
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
app.use(express.json({ limit:"10mb" }));
app.use(express.urlencoded({ extended:true, limit:"10mb" }));
app.use(requestValidator);
app.use("/api", apiLimiter);
app.use("/api/auth/send-otp",   otpLimiter);
app.use("/api/auth/verify-otp", loginLimiter);
app.use("/api/admin",           adminLimiter);

// ── All Routes ──
app.use("/api/auth",          require("./src/routes/auth"));
app.use("/api/users",         require("./src/routes/users"));
app.use("/api/content",       require("./src/routes/content"));
app.use("/api/subscriptions", require("./src/routes/subscriptions"));
app.use("/api/admin",         require("./src/routes/admin"));
app.use("/api/support",       require("./src/routes/support"));
app.use("/api/notifications", require("./src/routes/notifications"));
app.use("/api/push",          require("./src/routes/push"));
app.use("/api/analytics",     require("./src/routes/analytics"));

app.get("/", (req,res) => res.json({
  status: "✅ StreamX Backend Running",
  firewall: "🔥 3-Layer Active",
  version: "1.0.0",
}));

app.use(require("./src/middleware/errorHandler"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🎬 StreamX backend on port ${PORT}`);
});
