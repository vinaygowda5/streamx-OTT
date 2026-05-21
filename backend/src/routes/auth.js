const router = require("express").Router();
const db     = require("../database.js");

// ── Register ──────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields required" });

    if (password.length < 6)
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });

    const exists = await db.users.findOne({ email });
    if (exists)
      return res.status(400).json({ success: false, message: "Email already registered" });

    const id = "u" + Date.now();
    const user = await db.users.insert({
      _id: id, name, email, password,
      role: "user", plan: "Free",
      isActive: true, createdAt: new Date()
    });

    // Welcome notification
    await db.notifications.insert({
      _id: "n" + Date.now(),
      userId: id, type: "welcome",
      title: "Welcome to StreamX! 🎉",
      message: "Start watching amazing content now.",
      isRead: false, createdAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      data: {
        accessToken: "token_" + id,
        user: { id, name, email, role: "user", plan: "Free" }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Login ─────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password required" });

    const user = await db.users.findOne({ email, password });
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid email or password" });

    if (!user.isActive)
      return res.status(401).json({ success: false, message: "Account suspended" });

    res.json({
      success: true,
      message: "Login successful!",
      data: {
        accessToken: "token_" + user._id,
        user: {
          id:    user._id,
          name:  user.name,
          email: user.email,
          role:  user.role,
          plan:  user.plan
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Me ────────────────────────────────────────
router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ success: false, message: "Not logged in" });

    const userId = token.replace("token_", "");
    const user = await db.users.findOne({ _id: userId });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, data: {
      id: user._id, name: user.name,
      email: user.email, role: user.role, plan: user.plan
    }});
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Logout ────────────────────────────────────
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;