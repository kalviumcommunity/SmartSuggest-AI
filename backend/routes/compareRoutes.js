const express = require("express");
const { compareZeroShot, compareOneShot, compareMultiShot } = require("../controllers/compareController");

const router = express.Router();

router.post("/zero-shot", compareZeroShot);
router.post("/one-shot", compareOneShot);
router.post("/multi-shot", compareMultiShot);

module.exports = router;
