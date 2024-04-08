const { request } = require("express");
const { google } = require("googleapis");

const { isValidMimeType } = require("./helpers");

const { GOOGLE_URL, GOOGLE_KEYS_PATH } = process.env;

exports.determineFolderOfFiles = (files) => {
  const existFolders = {};
  const updatedFiles = [];

  files.forEach((file) => {
    if (file.mimeType === "application/vnd.google-apps.folder") {
      existFolders[file.id] = file.name;
    }
  });

  files.forEach((file) => {
    if (isValidMimeType(file.mimeType)) {
      if (file.parents && file.parents.length > 0) {
        updatedFiles.push({
          ...file,
          folder: {
            id: file.parents[0],
            name: existFolders[file.parents[0]],
          },
        });
      }
    }
  });

  return updatedFiles;
};

exports.googleDrive = () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_KEYS_PATH,
    scopes: [GOOGLE_URL],
  });
  return google.drive({ version: "v3", auth });
};
