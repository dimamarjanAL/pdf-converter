const puppeteer = require("puppeteer");

const { getWholePageText } = require("../utils");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

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