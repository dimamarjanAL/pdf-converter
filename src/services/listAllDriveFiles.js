const { google } = require("googleapis");

const { GOOGLE_URL, GOOGLE_KEYS_PATH } = process.env;

const { determineFolderOfFiles, googleDrive } = require("../utils/googleDrive");

exports.listAllDriveFiles = async ({ email }) => {
  if (!email) {
    return {
      folders: [],
      filesWithoutParent: [],
    };
  }

  const options = {
    fields: "nextPageToken, files(id, name, mimeType, parents, md5Checksum)",
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
      let nextPageToken = "";
      do {
        const response = await drive.files.list({
          driveId: d.id,
          corpora: "drive",
          ...options,
        });

        allFiles = allFiles.concat(response.data.files);

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);
    }

    let nextPageToken = "";
    do {
      const filesResponse = await drive.files.list({
        ...options,
        ...(nextPageToken && {
          pageToken: nextPageToken,
        }),
      });

      allFiles = allFiles.concat(filesResponse.data.files);

      nextPageToken = filesResponse.data.nextPageToken;
    } while (nextPageToken);

    return determineFolderOfFiles(allFiles);
  } catch (error) {
    console.error("listAllDriveFiles: ", { error });
    return {
      folders: [],
      filesWithoutParent: [],
    };
  }
};
