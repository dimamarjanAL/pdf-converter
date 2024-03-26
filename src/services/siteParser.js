const puppeteer = require("puppeteer");

const { googleAuth, getWholePageLinks, getWholePageText } = require("../utils");
const { updateRowById } = require("../utils/helpers");
const { createOpenAiEmbeddings } = require("../utils/createOpenAiEmbeddings");
const { urlCleaner } = require("../utils/helpers");

const { JE_CHROMIUM_PATH } = process.env;

exports.siteParser = async ({
  url,
  siteLogin,
  sitePassword,
  companyId,
  userId,
  fileId,
}) => {
  let browser;
  console.log("===START SITE PARSE PROCESS===", url);

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(JE_CHROMIUM_PATH && {
        executablePath: JE_CHROMIUM_PATH,
      }),
    });
    const page = await browser.newPage();

    const visitedPages = [];

    console.log("===SITE CHECK AUTH===");
    const currentUrl = await googleAuth({
      page,
      url: urlCleaner(url),
      siteLogin,
      sitePassword,
    });
    console.log("===SITE AUTH OK===");
    visitedPages.push(currentUrl);

    const pageParserLoop = async () => {
      const pageLinks = await getWholePageLinks({ page });

      for (const pageLink of pageLinks) {
        if (
          pageLink &&
          pageLink.includes(currentUrl) &&
          !visitedPages.some((page) => page === pageLink)
        ) {
          console.log("===SITE PAGE PARSING===", visitedPages.length, pageLink);
          visitedPages.push(pageLink);

          await page.goto(pageLink, { waitUntil: "networkidle2", timeout: 0 });
          await page.waitForSelector("body", { timeout: 0 });

          const parsedPageText = await getWholePageText({ page });

          await createOpenAiEmbeddings({
            fileId,
            companyId,
            userId,
            fileUrl: pageLink,
            parsedPageText,
          });

          await pageParserLoop();
        }
      }
    };

    await pageParserLoop();
    await updateRowById({
      tableName: "files",
      rowId: fileId,
      data: { inProcessing: false },
    });

    console.log("===FINISH SITE PARSE PROCESS===", url);
    return { isOk: true };
  } catch (error) {
    console.error("Something went wrong:", error?.message);
    return { isOk: false, error: error?.message || "something went wrong" };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
