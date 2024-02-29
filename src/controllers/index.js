const services = require("../services");

exports.converter = async (req, res) => {
  try {
    const { file } = await req;
    const { buffer, error } = await services.converter({ file });
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

exports.walker = async (req, res) => {
  try {
    const { url } = req.body;
    const newExample = await services.walker({ url });
    res.json(newExample);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.listDriveFiles = async (req, res) => {
  try {
    const { email } = req.body;
    const newExample = await services.listAllDriveFiles({ email });
    res.json(newExample);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.downloadDriveFile = async (req, res) => {
  try {
    const { filesId } = req.body;
    const buffer = await services.downloadDriveFileAndConvertToPdf({
      filesId,
    });

    res.setHeader("Content-Disposition", "attachment; filename=file");
    res.setHeader("Content-Type", "application/pdf");
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
