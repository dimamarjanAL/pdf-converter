const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const {
  converter,
  pageParser,
  siteChecker,
  siteParser,
  docParser,
  listDriveFiles,
  downloadDriveFile,
  channelsUpdater,
} = require("../controllers");

const interceptFile = upload.single("file");

router.post("/converter", interceptFile, converter);
router.post("/doc-parser", interceptFile, docParser);
router.post("/page-parser", pageParser);
router.post("/site-checker", siteChecker);
router.post("/site-parser", siteParser);
router.post("/files", listDriveFiles);
router.post("/upload-files", downloadDriveFile);
router.post("/channels-updater", channelsUpdater);

module.exports = router;
