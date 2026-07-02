const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const sb = require("../models/db");
const { ok, err } = require("../utils/response");

// Save push subscription from browser
router.post("/subscribe", requireAuth, async (req, res) => {
  const { subscription } = req.body;
  if (!subscription) return err(res, "subscription required");
  try {
    await sb.from("push_subscriptions").upsert({
      user_id: req.user.id,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    return ok(res, null, "Subscribed to push notifications");
  } catch(e) {
    return err(res, e.message);
  }
});

// Get VAPID public key (frontend needs this to subscribe)
router.get("/vapid-key", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return err(res, "Push notifications not configured");
  return ok(res, { publicKey: key });
});

module.exports = router;
