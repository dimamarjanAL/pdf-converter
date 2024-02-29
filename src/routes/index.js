const express = require("express");
const router = express.Router();
const controllers = require("../controllers");
const multer = require("multer");
const upload = multer();

const interceptFile = upload.single("file");

router.post("/converter", interceptFile, controllers.converter);
router.post("/walker", controllers.walker);
router.post("/files", controllers.listDriveFiles);
router.post("/upload-files", controllers.downloadDriveFile);

module.exports = router;
