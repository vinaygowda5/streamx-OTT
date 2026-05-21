const router = require("express").Router();

router.get("/me",          (req, res) => res.json({ success:true, data: { name:"Demo User", email:"demo@streamx.in", plan:"Premium" }}));
router.patch("/me",        (req, res) => res.json({ success:true, message:"Profile updated" }));
router.get("/watchlist",   (req, res) => res.json({ success:true, data: [] }));
router.post("/watchlist",  (req, res) => res.json({ success:true, message:"Added to watchlist" }));
router.get("/history",     (req, res) => res.json({ success:true, data: [] }));
router.get("/downloads",   (req, res) => res.json({ success:true, data: [] }));
router.get("/notifications",(req, res) => res.json({ success:true, data: [] }));
router.get("/preferences", (req, res) => res.json({ success:true, data: { autoplay:true, skipIntro:true }}));

module.exports = router;