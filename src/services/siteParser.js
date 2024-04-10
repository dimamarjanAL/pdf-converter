const puppeteer = require("puppeteer");
const moment = require("moment");

const { PRODUCTION } = require("../constants/general");
const { createOrUpdateFileDb } = require("../utils/createOrUpdateFileDb");
const { setSchedulerMessage } = require("../utils/setSchedulerMessage");
const { googleAuth } = require("../utils/googleAuth");
const { getWholePageLinks, getWholePageText } = require("../utils/helpers");
const { updateRowById } = require("../utils/helpers");
const { createOpenAiEmbeddings } = require("../utils/createOpenAiEmbeddings");
const { urlCleaner } = require("../utils/helpers");

const { APP_ENV, JE_CHROMIUM_PATH } = process.env;

exports.siteParserCreateFile = async ({ sitesData, companyId, userId }) => {
  return Promise.all(
    sitesData.map(async (site) => {
      const { data: fileData, error } = await createOrUpdateFileDb({
        userId,
        fileURL: site.url,
        category: site.category,
        title: site.name,
        description: site?.description,
        name: site.name,
        date: moment().format("MM/DD/YYYY"),
        expireDate: Date.parse(site.date) / 1000,
        admin: site.admin,
        company: companyId,
        fromSiteData: true,
        fromGoogle: false,
        isPrivate: site.isPrivate,
        inProcessing: site.isPrivate,
      });

      if (error) {
        console.log(
          "SITE CREATING ERROR",
          "|",
          moment().format("HH:mm:ss"),
          "|",
          error
        );
        return site;
      }

      const response = await setSchedulerMessage({
        category: fileData.category,
        expDate: fileData.expireDate,
        admin: fileData.admin,
        fileName: fileData.name,
        fileUrl: fileData.fileURL,
        fileId: fileData.id,
      });
      console.log(
        "SET SCHEDULER",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        response.message
      );

      if (!site.isPrivate) {
        return {
          ...site,
          companyId,
          userId,
          fileId: fileData.id,
          reminderStatus: response.isSuccess,
        };
      }

      return {
        ...site,
        companyId,
        userId,
        fileId: fileData.id,
        fileData,
        reminderStatus: response.isSuccess,
      };
    })
  );
};

exports.siteParser = async (sites) => {
  const sortedSites = sites.sort((a, b) => {
    if (a.isPrivate === b.isPrivate) {
      return 0;
    }
    return a.isPrivate ? 1 : -1;
  });

  for (const {
    url,
    siteLogin,
    sitePassword,
    companyId,
    userId,
    fileId,
    isPrivate,
    context,
  } of sortedSites) {
    let browser;

    if (!isPrivate) {
      console.log(
        "START OPEN SITE PARSE PROCESS",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        url
      );
      await createOpenAiEmbeddings({
        fileId,
        companyId,
        userId,
        fileUrl: url,
        parsedPageText: context,
      });
      console.log(
        "FINISH OPEN SITE PARSE PROCESS",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        url
      );

      continue;
    }

    console.log(
      "START SITE PARSE PROCESS",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      url
    );

    try {
      browser = await puppeteer.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        ...(APP_ENV !== PRODUCTION &&
          JE_CHROMIUM_PATH && {
            executablePath: JE_CHROMIUM_PATH,
          }),
      });
      const page = await browser.newPage();

      const visitedPages = [];

      const currentUrl = await googleAuth({
        page,
        url: urlCleaner(url),
        siteLogin,
        sitePassword,
      });

      visitedPages.push(currentUrl);

      const pageParserLoop = async () => {
        const pageLinks = await getWholePageLinks({ page });

        for (const pageLink of pageLinks) {
          if (
            pageLink &&
            pageLink.includes(currentUrl) &&
            !visitedPages.some((page) => page === pageLink)
          ) {
            console.log(
              "START SITE PARSE PROCESS",
              "|",
              moment().format("HH:mm:ss"),
              "|",
              visitedPages.length,
              "|",
              pageLink
            );

            visitedPages.push(pageLink);

            await page.goto(pageLink, {
              waitUntil: "networkidle2",
              timeout: 0,
            });
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

      console.log(
        "FINISH SITE PARSE PROCESS",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        url
      );
      continue;
    } catch (error) {
      console.log(
        "SITE PARSING ERROR",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        error?.message
      );
      continue;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};
