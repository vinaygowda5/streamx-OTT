require("dotenv").config();
const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");

const app = express();

// ── Middleware ──────────────────────────────────
app.use(helmet());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────
app.use("/api/auth",          require("./routes/auth"));
app.use("/api/content",       require("./routes/content"));
app.use("/api/users",         require("./routes/users"));
app.use("/api/subscriptions", require("./routes/subscriptions"));
app.use("/api/admin",         require("./routes/admin"));

// ── Health Check ─────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "StreamX API is running! 🚀",
    time: new Date().toISOString()
  });
});

// ── 404 Handler ──────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// ── Error Handler ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ success: false, message: "Server error" });
});

// ── Start Server ──────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("\n✅ StreamX Backend is RUNNING!");
  console.log(`🚀 API     → http://localhost:${PORT}/api`);
  console.log(`❤️  Health  → http://localhost:${PORT}/api/health\n`);
});