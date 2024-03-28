const moment = require("moment");
const { google } = require("googleapis");

const { GOOGLE_URL, GOOGLE_KEYS_PATH } = process.env;

exports.getGoogleDriveFile = async ({ fileId }) => {
  if (!fileId) {
    console.error("No fileId provided");
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: GOOGLE_KEYS_PATH,
      scopes: [GOOGLE_URL],
    });

    const drive = google.drive({ version: "v3", auth });

    console.log("TRYING TO DOWNLOAD FILE", "|", moment().format("HH:mm:ss"));

    const response = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error("Error in getGoogleDriveFile: ", error);
    return null;
  }
};
