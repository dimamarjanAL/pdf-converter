const { google } = require("googleapis");
const config = require("../config");

const {
  organizeFilesByFolders,
  googleDrive,
} = require("../utils");

exports.listAllDriveFiles = async ({ email }) => {
  if (!email) {

    return {
      folders: [],
      filesWithoutParent: [],
    };
  }

  const options = {
    fields: "nextPageToken, files(id, name, mimeType, parents)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: `'${email}' in readers`,
  };

  try {
    new google.auth.GoogleAuth({
      keyFile: config.serviceGoogleKeysPath,
      scopes: [config.googleUrl],
    });

    const drive = googleDrive();

    const driveResponse = await drive.drives.list();
    const drives = driveResponse.data.drives || [];

    let allFiles = [];
    for (const d of drives) {
      const response = await drive.files.list({
        driveId: d.id,
        corpora: "drive",
        ...options,
      });

      allFiles = allFiles.concat(response.data.files);
    }

    const filesResponse = await drive.files.list(options);
    allFiles = allFiles.concat(filesResponse.data.files);

    return organizeFilesByFolders(allFiles);
  } catch (error) {
    console.error("listAllDriveFiles: ", { error });
    return {
      folders: [],
      filesWithoutParent: [],
    };
  }
};