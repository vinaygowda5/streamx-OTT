const router = require("express").Router();

const CONTENT = [
  { id:"c1", title:"Apex Protocol",     type:"Movie",  genre:"Action",  score:9.1, premium:true,  views:4200000 },
  { id:"c2", title:"Dark Meridian",     type:"Series", genre:"Sci-Fi",  score:8.8, premium:true,  views:3100000 },
  { id:"c3", title:"Bombay Central",    type:"Movie",  genre:"Drama",   score:8.5, premium:false, views:5600000 },
  { id:"c4", title:"IPL 2026 Finals",   type:"Live",   genre:"Cricket", score:0,   premium:false, views:12400000},
  { id:"c5", title:"Steel Horizon",     type:"Series", genre:"Action",  score:8.6, premium:true,  views:2800000 },
  { id:"c6", title:"Rang De Basanti 2", type:"Movie",  genre:"Drama",   score:9.0, premium:false, views:7200000 },
];

router.get("/",          (req, res) => res.json({ success:true, data: CONTENT }));
router.get("/featured",  (req, res) => res.json({ success:true, data: CONTENT.filter(c => c.views > 4000000) }));
router.get("/trending",  (req, res) => res.json({ success:true, data: [...CONTENT].sort((a,b) => b.views - a.views) }));
router.get("/search",    (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  res.json({ success:true, data: CONTENT.filter(c => c.title.toLowerCase().includes(q)) });
});
router.get("/:id",       (req, res) => {
  const item = CONTENT.find(c => c.id === req.params.id);
  if (!item) return res.status(404).json({ success:false, message:"Not found" });
  res.json({ success:true, data: item });
});

module.exports = router;