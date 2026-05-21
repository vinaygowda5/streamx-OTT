const router = require("express").Router();

// Temporary simple routes to test server starts
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "All fields required" });
  res.status(201).json({ success: true, message: "Registered!", data: { name, email } });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (email === "demo@streamx.in" && password === "Demo@1234") {
    return res.json({ success: true, message: "Login successful", data: {
      accessToken: "demo_token_123",
      user: { id: "u1", name: "Rahul Sharma", email, role: "user" }
    }});
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

router.post("/logout",  (req, res) => res.json({ success: true, message: "Logged out" }));
router.post("/refresh", (req, res) => res.json({ success: true, message: "Token refreshed" }));
router.get ("/me",      (req, res) => res.json({ success: true, data: { name: "Demo User" } }));

module.exports = router;