const router = require("express").Router();

router.get("/stats", (req, res) => res.json({ success:true, data: {
  totalUsers:   248431,
  premiumSubs:  62109,
  totalContent: 10,
  liveEvents:   2,
  totalRevenue: 3104500,
  viewsToday:   172000,
  adsServed:    84210,
}}));

router.get("/users",   (req, res) => res.json({ success:true, data: [] }));
router.get("/content", (req, res) => res.json({ success:true, data: [] }));

module.exports = router;