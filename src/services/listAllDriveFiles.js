const { google } = require("googleapis");

const { GOOGLE_URL, GOOGLE_KEYS_PATH } = process.env;

const { organizeFilesByFolders, googleDrive } = require("../utils/googleDrive");

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
      keyFile: GOOGLE_KEYS_PATH,
      scopes: [GOOGLE_URL],
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
