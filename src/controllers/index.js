const services = require("../services");

exports.extractDocxContext = async (req, res) => {
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

// exports.extractPptxContext = async (req, res) => {
//   try {
//     const { name } = req.body;
//     const newExample = await services.extractPptxContext(name);
//     res.json(newExample);
//   } catch (error) {
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// };
