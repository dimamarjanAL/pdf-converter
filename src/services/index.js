const libre = require("libreoffice-convert");
const util = require("util");
const convert = util.promisify(libre.convert);
const puppeteer = require("puppeteer");

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
      // const walker = document.createTreeWalker(
      //   document.body,
      //   NodeFilter.SHOW_TEXT,
      //   null,
      // );
      // let text = "";
      // let node;
      // while ((node = walker.nextNode())) {
      //   text += node.nodeValue + " ";
      // }
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
