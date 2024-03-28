const moment = require("moment");
const puppeteer = require("puppeteer");

const { googleAuth } = require("../utils/googleAuth");
const { urlCleaner } = require("../utils/helpers");

const { JE_CHROMIUM_PATH } = process.env;

exports.siteChecker = async ({ url, siteLogin, sitePassword }) => {
  if (!url) {
    return { url: null, body: "", error: "The URL is missing" };
  }
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      ...(JE_CHROMIUM_PATH && {
        executablePath: JE_CHROMIUM_PATH,
      }),
    });
    const page = await browser.newPage();

    const currentUrl = await googleAuth({
      page,
      url: urlCleaner(url),
      siteLogin,
      sitePassword,
    });

    return { url: currentUrl, isLoggedIn: url.includes(currentUrl) };
  } catch (error) {
    console.log(
      "SITE AUTH ERROR",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      error?.message
    );
    return {
      url,
      isLoggedIn: false,
      error: error?.message || "something went wrong",
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
