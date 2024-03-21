const libre = require("libreoffice-convert");
const util = require("util");
const convert = util.promisify(libre.convert);
const { google } = require("googleapis");
const config = require("../config");

exports.downloadDriveFileAndConvertToPdf = async ({ filesId }) => {
  const fileId = filesId[0];
  if (!fileId) {
    console.error("No fileId provided");
    return null;
  }

  const credentials = "docuseer-d572e9584240.json";

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: credentials,
      scopes: [config.googleUrl],
    });

    const drive = google.drive({ version: "v3", auth });
    console.log("Trying to download file...");
    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" },
    );

    const buffer = Buffer.from(response.data);

    return await convert(buffer, ".pdf", undefined);
  } catch (error) {
    console.error("error in downloadDriveFileAndConvertToPdf: ", error);
    return null;
  }
};