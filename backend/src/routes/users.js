const router = require("express").Router();
const db     = require("../database.js");

// ── Get My Profile ────────────────────────────
router.get("/me", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Not logged in" });

  const userId = token.replace("token_", "");
  const user = db.prepare("SELECT id, name, email, role, plan FROM users WHERE id = ?").get(userId);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });

  res.json({ success: true, data: user });
});

// ── Update Profile ────────────────────────────
router.patch("/me", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Not logged in" });

  const userId = token.replace("token_", "");
  const { name } = req.body;

  db.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").run(name, userId);
  res.json({ success: true, message: "Profile updated!" });
});

// ── Get Watchlist ─────────────────────────────
router.get("/watchlist", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Not logged in" });

  const userId = token.replace("token_", "");
  const items = db.prepare(`
    SELECT w.id, w.added_at, c.id as content_id, c.title, c.emoji, c.genre, c.score, c.type, c.tags
    FROM watchlist w
    JOIN content c ON w.content_id = c.id
    WHERE w.user_id = ?
    ORDER BY w.added_at DESC
  `).all(userId);

  res.json({ success: true, data: items });
});

// ── Add to Watchlist ──────────────────────────
router.post("/watchlist", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Not logged in" });

  const userId = token.replace("token_", "");
  const { contentId } = req.body;

  const exists = db.prepare("SELECT id FROM watchlist WHERE user_id = ? AND content_id = ?").get(userId, contentId);
  if (exists) return res.status(400).json({ success: false, message: "Already in watchlist" });

  db.prepare("INSERT INTO watchlist (id, user_id, content_id) VALUES (?, ?, ?)").run("wl" + Date.now(), userId, contentId);
  res.json({ success: true, message: "Added to watchlist!" });
});

// ── Remove from Watchlist ─────────────────────
router.delete("/watchlist/:contentId", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Not logged in" });

  const userId = token.replace("token_", "");
  db.prepare("DELETE FROM watchlist WHERE user_id = ? AND content_id = ?").run(userId, req.params.contentId);
  res.json({ success: true, message: "Removed from watchlist!" });
});

// ── Get Watch History ─────────────────────────
router.get("/history", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Not logged in" });

  const userId = token.replace("token_", "");
  const items = db.prepare(`
    SELECT h.*, c.title, c.emoji, c.genre, c.type
    FROM watch_history h
    JOIN content c ON h.content_id = c.id
    WHERE h.user_id = ?
    ORDER BY h.watched_at DESC
  `).all(userId);

  res.json({ success: true, data: items });
});

// ── Get Notifications ─────────────────────────
router.get("/notifications", (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Not logged in" });

  const userId = token.replace("token_", "");
  const items = db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC").all(userId);
  const unread = items.filter(n => !n.is_read).length;

  res.json({ success: true, data: { notifications: items, unreadCount: unread } });
});

module.exports = router;