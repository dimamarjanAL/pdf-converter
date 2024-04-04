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
      } else {
        updatedFiles.push(file);
      }
    }
  });

  return updatedFiles;
};

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
    keyFile: GOOGLE_KEYS_PATH,
    scopes: [GOOGLE_URL],
  });
  return google.drive({ version: "v3", auth });
};
