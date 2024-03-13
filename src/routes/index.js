const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const {
  converter,
  pageParser,
  siteChecker,
  siteParser,
  listDriveFiles,
  downloadDriveFile,
} = require("../controllers");

const interceptFile = upload.single("file");
router.post("/converter", interceptFile, converter);
router.post("/page-parser", pageParser);
router.post("/site-checker", siteChecker);
router.post("/site-parser", siteParser);
router.post("/files", listDriveFiles);
router.post("/upload-files", downloadDriveFile);

module.exports = router;
