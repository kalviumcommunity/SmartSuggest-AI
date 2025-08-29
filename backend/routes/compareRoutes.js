const express = require("express");
const { compareProducts } = require("../controllers/compareController");

const router = express.Router();

router.post("/", compareProducts);

module.exports = router;
