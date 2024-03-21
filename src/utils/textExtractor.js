const pdfjs = require("pdfjs-dist");
const libre = require("libreoffice-convert");
const util = require("util");
const convert = util.promisify(libre.convert);

const extractTextFromPDF = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file || file.mimetype !== "application/pdf") {
      reject();
      return "Invalid file or not a PDF";
    }

    const pdfData = new Uint8Array(file.buffer);
    pdfjs
      .getDocument(pdfData)
      .promise.then((pdf) => {
        const pagesData = [];
        const pagePromises = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const pagePromise = pdf.getPage(i).then((page) => {
            return page.getTextContent().then((content) => {
              let extractedText = content.items
                .filter((item) => "str" in item)
                .map((item) => item.str)
                .join(" ");
              extractedText = extractedText.replace(/\s+/g, " ").trim();

              pagesData.push({ page: i, extractedText });
            });
          });
          pagePromises.push(pagePromise);
        }
        Promise.all(pagePromises)
          .then(() => resolve(pagesData))
          .catch(() => {
            return reject("Failed to process PDF");
          });
      })
      .catch(() => {
        return reject("Failed to process PDF");
      });
  });
};

exports.textExtractor = async (file) => {
  let resp = [{ page: 0, extractedText: "" }];
  if (!file) return resp;

  if (file.mimetype === "application/pdf") {
    resp = await extractTextFromPDF(file);
  } else if (
    [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/msword",
      "application/vnd.ms-powerpoint",
    ].includes(file.mimetype)
  ) {
    const convertedBuffer = await convert(file.buffer, ".pdf", undefined);

    resp = await extractTextFromPDF(convertedBuffer);
  } else if (file.mimetype === "text/plain") {
    const textContent = file.buffer
      .toString("utf8")
      .replace(/\s+/g, " ")
      .trim();

    resp = [{ page: 1, extractedText: textContent }];
  }

  return resp;
};
