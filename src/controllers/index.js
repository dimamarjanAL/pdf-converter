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
    // console.log({ url });
    // console.log(req.body);

    const newExample = await services.walker({ url });
    res.json(newExample);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
};
