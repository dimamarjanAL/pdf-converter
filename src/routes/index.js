const express = require("express");
const router = express.Router();
const controllers = require("../controllers");
const multer = require("multer");
const upload = multer();

const interceptFile = upload.single("file");

router.post("/converter", interceptFile, controllers.converter);
router.post("/walker", controllers.walker);

module.exports = router;
