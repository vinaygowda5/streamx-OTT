const router = require("express").Router();

// ── Users Database ──────────────────────────
const USERS = [
  {
    id: "u1",
    name: "Rahul Sharma",
    email: "demo@streamx.in",
    password: "Demo@1234",
    role: "user",
    plan: "Premium"
  },
  {
    id: "admin1",
    name: "Vinay Admin",
    email: "admin@streamx.in",
    password: "Admin@1234",
    role: "admin",
    plan: "Premium"
  },
  {
    id: "admin2",
    name: "Vinay",
    email: "vinaygowda12096909@email.com",
    password: "Vinay@1234",
    role: "admin",
    plan: "Premium"
  },
];

// ── Register ─────────────────────────────────
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "All fields required" });

  const exists = USERS.find(u => u.email === email);
  if (exists)
    return res.status(400).json({ success: false, message: "Email already registered" });

  const newUser = {
    id: "u" + Date.now(),
    name, email, password,
    role: "user",
    plan: "Free"
  };
  USERS.push(newUser);

  res.status(201).json({
    success: true,
    message: "Account created!",
    data: {
      accessToken: "token_" + newUser.id,
      user: { id: newUser.id, name, email, role: "user", plan: "Free" }
    }
  });
});

// ── Login ────────────────────────────────────
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: "Email and password required" });

  const user = USERS.find(u => u.email === email && u.password === password);
  if (!user)
    return res.status(401).json({ success: false, message: "Invalid email or password" });

  res.json({
    success: true,
    message: "Login successful!",
    data: {
      accessToken: "token_" + user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        plan: user.plan
      }
    }
  });
});

// ── Me ───────────────────────────────────────
router.get("/me", (req, res) => {
  res.json({
    success: true,
    data: { name: "Demo User", email: "demo@streamx.in", role: "user" }
  });
});

// ── Logout ───────────────────────────────────
router.post("/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

module.exports = router;