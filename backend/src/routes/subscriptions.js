const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const c = require("../controllers/subscriptionController");
router.get("/",       requireAuth, c.getMySub);
router.post("/order", requireAuth, c.createOrder);
router.post("/verify",requireAuth, c.verifyPayment);
module.exports = router;
