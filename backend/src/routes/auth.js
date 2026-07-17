const router = require("express").Router();
const { sendOTP, verifyOTP, createSession } = require("../controllers/authController");
router.post("/send-otp",   sendOTP);
router.post("/verify-otp", verifyOTP);
router.post("/session",    createSession);
module.exports = router;
