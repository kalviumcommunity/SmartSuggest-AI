const express = require("express");
const { compareZeroShot, compareOneShot, compareMultiShot, compareSystemUser } = require("../controllers/compareController");

const router = express.Router();

router.post("/zero-shot", compareZeroShot);
router.post("/one-shot", compareOneShot);
router.post("/multi-shot", compareMultiShot);
router.post("/system-user", compareSystemUser);

module.exports = router;
