const puppeteer = require("puppeteer");

const { PRODUCTION } = require("../constants/general");
const { getWholePageText } = require("../utils/helpers");

const { APP_ENV, JE_CHROMIUM_PATH } = process.env;

exports.pageParser = async ({ url }) => {
  if (!url) {
    return { url: null, body: "", error: "The URL is missing" };
  }
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      ...(APP_ENV !== PRODUCTION &&
        JE_CHROMIUM_PATH && {
          executablePath: JE_CHROMIUM_PATH,
        }),
    });
    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
    );

    await page.goto(url, { waitUntil: "networkidle2" });

    await page.waitForSelector("body");

    const parsedPageText = await getWholePageText({ page });

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
