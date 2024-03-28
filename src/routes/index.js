const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer();
const { tryCatchWrapper } = require("../utils/helpers");
const {
  converter,
  docParser,
  googleDocParser,
  pageParser,
  siteChecker,
  siteParser,
  listDriveFiles,
  channelsUpdater,
} = require("../controllers");

const interceptFile = upload.single("file");

router.post("/converter", interceptFile, tryCatchWrapper(converter));
router.post("/doc-parser", interceptFile, tryCatchWrapper(docParser));
router.post("/google-doc-parser", tryCatchWrapper(googleDocParser));
router.post("/page-parser", tryCatchWrapper(pageParser));
router.post("/site-checker", tryCatchWrapper(siteChecker));
router.post("/site-parser", tryCatchWrapper(siteParser));
router.post("/files", tryCatchWrapper(listDriveFiles));
router.post("/channels-updater", tryCatchWrapper(channelsUpdater));

module.exports = router;
