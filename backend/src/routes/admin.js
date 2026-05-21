const router = require("express").Router();
const db     = require("../database.js");

// ── Stats ─────────────────────────────────────
router.get("/stats", (req, res) => {
  const totalUsers    = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  const activeUsers   = db.prepare("SELECT COUNT(*) as count FROM users WHERE is_active = 1").get().count;
  const totalContent  = db.prepare("SELECT COUNT(*) as count FROM content").get().count;
  const activeSubs    = db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").get().count;
  const totalRevenue  = db.prepare("SELECT SUM(amount) as total FROM transactions WHERE status = 'success'").get().total || 0;
  const totalViews    = db.prepare("SELECT SUM(views) as total FROM content").get().total || 0;

  res.json({ success: true, data: {
    totalUsers,
    activeUsers,
    totalContent,
    activeSubs,
    totalRevenue,
    totalViews,
    liveEvents:   2,
    adsServed:    84210,
    revenueToday: 74000,
    viewsToday:   172000,
  }});
});

// ── Get All Users ─────────────────────────────
router.get("/users", (req, res) => {
  const users = db.prepare("SELECT id, name, email, role, plan, is_active, created_at FROM users ORDER BY created_at DESC").all();
  res.json({ success: true, data: users });
});

// ── Suspend User ──────────────────────────────
router.patch("/users/:id/suspend", (req, res) => {
  db.prepare("UPDATE users SET is_active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "User suspended" });
});

// ── Get All Content ───────────────────────────
router.get("/content", (req, res) => {
  const items = db.prepare("SELECT * FROM content ORDER BY created_at DESC").all();
  res.json({ success: true, data: items });
});

// ── Add Content ───────────────────────────────
router.post("/content", (req, res) => {
  const { title, type, genre, description, emoji, is_premium, stream_url } = req.body;
  const id = "c" + Date.now();

  db.prepare(`
    INSERT INTO content (id, title, type, genre, description, emoji, is_premium, stream_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, title, type, genre, description, emoji || "🎬", is_premium ? 1 : 0, stream_url || "");

  res.status(201).json({ success: true, message: "Content added!", data: { id } });
});

// ── Update Content ────────────────────────────
router.patch("/content/:id", (req, res) => {
  const { title, type, genre, description, is_active } = req.body;
  db.prepare(`
    UPDATE content SET title = ?, type = ?, genre = ?, description = ?, is_active = ?
    WHERE id = ?
  `).run(title, type, genre, description, is_active ? 1 : 0, req.params.id);

  res.json({ success: true, message: "Content updated!" });
});

// ── Delete Content ────────────────────────────
router.delete("/content/:id", (req, res) => {
  db.prepare("UPDATE content SET is_active = 0 WHERE id = ?").run(req.params.id);
  res.json({ success: true, message: "Content removed!" });
});

// ── Get Subscriptions ─────────────────────────
router.get("/subscriptions", (req, res) => {
  const subs = db.prepare(`
    SELECT s.*, u.name, u.email
    FROM subscriptions s
    JOIN users u ON s.user_id = u.id
    ORDER BY s.created_at DESC
  `).all();
  res.json({ success: true, data: subs });
});

module.exports = router;