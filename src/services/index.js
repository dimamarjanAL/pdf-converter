const libre = require("libreoffice-convert");
const util = require("util");
const convert = util.promisify(libre.convert);
const puppeteer = require("puppeteer");
const { google } = require("googleapis");
const config = require("../config");
const {
  organizeFilesByFolders,
  googleDrive,
  getWholePageText,
  getWholePageLinks,
  googleAuth,
  createEmbeddings,
  updateFileData,
} = require("../utils");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

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

exports.pageParser = async ({ url }) => {
  if (!url) {
    return { url: null, body: "", error: "The URL is missing" };
  }
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      ...process.env.JE_CHROMIUM_PATH && {
          executablePath: process.env.JE_CHROMIUM_PATH,
      },
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    );

    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector("body");

    const parsedPageText = await getWholePageText({ page })

    return { url, body: parsedPageText, error: null };
  } catch (error) {
    console.error("something went wrong", error);
    return { url, body: "", error: error?.message || "something went wrong" };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

exports.siteChecker = async ({ url, siteLogin, sitePassword }) => {
  if (!url) {
    return { url: null, body: "", error: "The URL is missing" };
  }
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...process.env.JE_CHROMIUM_PATH && {
          executablePath: process.env.JE_CHROMIUM_PATH,
      },
    });
    const page = await browser.newPage();

    const currentUrl = await googleAuth({ page, url, siteLogin, sitePassword })

    return { url, isLoggedIn: currentUrl === url };
  } catch (error) {
    console.error("Something went wrong:", error?.message);
    return { url, isLoggedIn: false, error: error?.message || "something went wrong" };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

exports.siteParser = async ({ url, siteLogin, sitePassword, companyId, userId, fileId }) => {
  console.log('url======', url)
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      ...process.env.JE_CHROMIUM_PATH && {
          executablePath: process.env.JE_CHROMIUM_PATH,
      },
    });
    const page = await browser.newPage();

    const visitedPages = []

    const currentUrl = await googleAuth({ page, url, siteLogin, sitePassword })
    visitedPages.push(currentUrl)
    console.log('LINK======', currentUrl)

    const pageParserLoop = async (page) => {
      const pageLinks = await getWholePageLinks({ page })
      
      for (const pageLink of pageLinks) {
        if (pageLink && pageLink.includes(currentUrl) && !visitedPages.some(page => page === pageLink)) {
          visitedPages.push(pageLink)
          console.log('LINK======', pageLink)

          await page.goto(pageLink, { waitUntil: 'domcontentloaded', timeout: 0 });
          await page.waitForSelector("body");

          const parsedPageText = await getWholePageText({ page })
          console.log('parsedPageText======', parsedPageText.length)

          await createEmbeddings({
            fileId,
            companyId,
            userId,
            pageLink,
            parsedPageText, 
          })

          await pageParserLoop(page)
        }
      }
    }

    await pageParserLoop(page)
    await updateFileData(fileId) 
    console.log('================isOver================')

    return { isOk: true };
  } catch (error) {
    console.error("Something went wrong:", error?.message);
    return { isOk: false, error: error?.message || "something went wrong" };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

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

    return organizeFilesByFolders(allFiles);
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
