const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const c = require("../controllers/notificationController");
router.post("/send",     requireAuth, c.sendToUser);
router.post("/broadcast",requireAuth, c.broadcast);
module.exports = router;
