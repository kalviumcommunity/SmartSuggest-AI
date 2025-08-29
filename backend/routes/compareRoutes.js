const express = require("express");
const { compareZeroShot, compareOneShot } = require("../controllers/compareController");

const router = express.Router();

router.post("/zero-shot", compareZeroShot);
router.post("/one-shot", compareOneShot);

module.exports = router;
