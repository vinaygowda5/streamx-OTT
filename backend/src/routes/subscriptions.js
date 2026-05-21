const router = require("express").Router();

const PLANS = [
  { id:"plan_mobile",  name:"Mobile",  price:149, period:"monthly", maxScreens:1, quality:"720p",  hasAds:true  },
  { id:"plan_basic",   name:"Basic",   price:299, period:"monthly", maxScreens:1, quality:"1080p", hasAds:false },
  { id:"plan_premium", name:"Premium", price:499, period:"monthly", maxScreens:4, quality:"4K",    hasAds:false },
  { id:"plan_annual",  name:"Annual",  price:999, period:"yearly",  maxScreens:4, quality:"4K",    hasAds:false },
];

router.get("/plans",       (req, res) => res.json({ success:true, data: PLANS }));
router.get("/current",     (req, res) => res.json({ success:true, data: { plan: PLANS[2], status:"active", endDate:"2026-06-18" }}));
router.post("/subscribe",  (req, res) => res.json({ success:true, message:"Subscribed!", data: { planId: req.body.planId }}));
router.post("/cancel",     (req, res) => res.json({ success:true, message:"Subscription cancelled" }));
router.get("/history",     (req, res) => res.json({ success:true, data: [] }));
router.get("/transactions",(req, res) => res.json({ success:true, data: [] }));

module.exports = router;