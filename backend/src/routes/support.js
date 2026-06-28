const router = require("express").Router();
const { chat } = require("../controllers/supportController");
router.post("/chat", chat);
module.exports = router;
