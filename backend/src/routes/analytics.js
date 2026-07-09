const router = require("express").Router();
const sb     = require("../models/db");
const { ok } = require("../utils/response");
const { log } = require("../utils/logger");

router.post("/", async (req, res) => {
  const { type, data, ts, ua } = req.body;
  const ip = req.ip || "unknown";
  log("info", "analytics", { type, data, ip });
  // Optionally store in DB — for now just log
  return ok(res, null);
});

// Admin only — get stats
router.get("/stats", async (req, res) => {
  const [users, content, subs] = await Promise.all([
    sb.from("users").select("id,plan,created_at").order("created_at", { ascending: false }).limit(100),
    sb.from("content").select("id,title,views,type").order("views", { ascending: false }).limit(20),
    sb.from("subscriptions").select("plan_id,created_at").eq("status", "active"),
  ]);
  return ok(res, {
    totalUsers:    users.data?.length || 0,
    recentUsers:   users.data?.slice(0, 10) || [],
    topContent:    content.data || [],
    activeSubs:    subs.data?.length || 0,
    planBreakdown: subs.data?.reduce((acc, s) => {
      acc[s.plan_id] = (acc[s.plan_id] || 0) + 1;
      return acc;
    }, {}) || {},
  });
});

module.exports = router;
