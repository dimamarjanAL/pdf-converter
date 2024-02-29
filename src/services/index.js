const libre = require("libreoffice-convert");
const util = require("util");
const convert = util.promisify(libre.convert);
const puppeteer = require("puppeteer");
const { google } = require("googleapis");
const utils = require("../utils");
const config = require("../config");
const { googleDrive } = require("../utils");

exports.converter = async ({ file }) => {
  const buffer = file?.buffer;
  const extend = ".pdf";

  if (!buffer) {
    return { buffer: null, error: "no file loaded" };
  }

  try {
    const convertedBuffer = await convert(buffer, extend, undefined);
    return { buffer: convertedBuffer, error: null };
  } catch (err) {
    console.log(`Error converting file: ${err}`);
    return { buffer: null, error: err?.message || "something went wrong" };
  }
};

exports.walker = async ({ url }) => {
  if (!url) {
    return { url: null, body: "", error: "The URL is missing" };
  }
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    );

    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector("body");

    return await page.evaluate((pageUrl) => {
      let text = "";
      const elements = document.querySelectorAll(
        "p, h1, h2, h3, h4, h5, h6, li, span, div",
      );
      elements.forEach((el) => {
        text += el.innerText + " ";
      });
      text = text.replace(/[\n\t]+/g, " \n ");
      // text = text.replace(/\s+/g, " \n ").trim();
      return { url: pageUrl, body: text, error: null };
    }, url);
  } catch (error) {
    console.error("something went wrong", error);
    return { url, body: "", error: error?.message || "something went wrong" };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

exports.listAllDriveFiles = async ({ email }) => {
  if (!email)
    return {
      folders: [],
      filesWithoutParent: [],
    };
  const options = {
    fields: "nextPageToken, files(id, name, mimeType, parents)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    q: `'${email}' in readers`,
  };
  try {
    const auth = new google.auth.GoogleAuth({
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

    return utils.organizeFilesByFolders(allFiles);
  } catch (error) {
    console.error("listAllDriveFiles: ", { error });
    return {
      folders: [],
      filesWithoutParent: [],
    };
  }
};

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
