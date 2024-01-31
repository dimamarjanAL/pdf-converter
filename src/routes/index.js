const express = require("express");
const router = express.Router();
const controllers = require("../controllers");
const multer = require("multer");
const upload = multer();

const interceptFile = upload.single("file");

router.post("/converter", interceptFile, controllers.extractDocxContext);

module.exports = router;
