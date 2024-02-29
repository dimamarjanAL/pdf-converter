const { google } = require("googleapis");
const config = require("../config");
exports.organizeFilesByFolders = (files) => {
  const foldersById = {};
  const folders = [];
  const filesWithoutParent = [];

  files.forEach((file) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      const folder = { ...file, files: [] };
      foldersById[file.id] = folder;
      folders.push(folder);
    }
  });

  files.forEach((file) => {
    if (file.mimeType !== "application/vnd.google-apps.folder") {
      if (file.parents && file.parents.length > 0) {
        const parentFolder = foldersById[file.parents[0]];
        if (parentFolder) {
          parentFolder.files.push(file);
        } else {
          filesWithoutParent.push(file);
        }
      } else {
        filesWithoutParent.push(file);
      }
    }
  });

  return { folders, filesWithoutParent };
};

exports.googleDrive = () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: config.serviceGoogleKeysPath,
    scopes: [config.googleUrl],
  });
  return google.drive({ version: "v3", auth });
};
