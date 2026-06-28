const router = require("express").Router();
const c = require("../controllers/contentController");
router.get("/",          c.getAll);
router.get("/search",    c.search);
router.get("/trending",  c.getTrending);
router.get("/:id",       c.getById);
module.exports = router;
