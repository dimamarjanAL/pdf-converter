const {
  converter,
  pageParser,
  siteChecker,
  siteParser,
  listAllDriveFiles,
  downloadDriveFileAndConvertToPdf,
  channelsUpdater,
} = require("../services");

exports.converter = async (req, res) => {
  try {
    const { file } = await req;
    const { buffer, error } = await converter({ file });
    if (error) {
      return res.status(500).json({ error });
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${file.originalname.split(".").slice(-1).join()}.pdf"`,
    );
    res.setHeader("Content-Length", buffer.length.toString());
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.pageParser = async (req, res) => {
  try {
    const response = await pageParser(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.siteChecker = async (req, res) => {
  try {
    const response = await siteChecker(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.siteParser = async (req, res) => {
  try {
    const response = await siteParser(req.body);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.listDriveFiles = async (req, res) => {
  try {
    const { email } = req.body;
    const response = await listAllDriveFiles({ email });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.downloadDriveFile = async (req, res) => {
  try {
    const { filesId } = req.body;
    const buffer = await downloadDriveFileAndConvertToPdf({
      filesId,
    });

    res.setHeader("Content-Disposition", "attachment; filename=file");
    res.setHeader("Content-Type", "application/pdf");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.channelsUpdater = async (req, res) => {
  try {
    channelsUpdater(req.body);
    const response = { isSuccess: true }
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};