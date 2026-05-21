const router = require("express").Router();
const db     = require("../database.js");

// ── Get All Content ───────────────────────────
router.get("/", async (req, res) => {
  try {
    const { genre, type, search } = req.query;
    let query = { isActive: true };
    if (genre)  query.genre = genre;
    if (type)   query.type  = type;
    if (search) query.title = new RegExp(search, "i");

    const items = await db.content.find(query).sort({ views: -1 });
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Featured ──────────────────────────────────
router.get("/featured", async (req, res) => {
  try {
    const items = await db.content.find({ isFeatured: true, isActive: true }).sort({ views: -1 }).limit(5);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Trending ──────────────────────────────────
router.get("/trending", async (req, res) => {
  try {
    const items = await db.content.find({ isActive: true }).sort({ views: -1 }).limit(10);
    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Search ────────────────────────────────────
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: [] });

    const items = await db.content.find({
      isActive: true,
      title: new RegExp(q, "i")
    }).sort({ views: -1 });

    res.json({ success: true, data: items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Single Content ────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const item = await db.content.findOne({ _id: req.params.id, isActive: true });
    if (!item) return res.status(404).json({ success: false, message: "Content not found" });

    // Update views
    await db.content.update({ _id: req.params.id }, { $inc: { views: 1 } });

    // Related content
    const related = await db.content.find({
      genre: item.genre, _id: { $ne: req.params.id }, isActive: true
    }).limit(6);

    res.json({ success: true, data: { ...item, related } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;