const moment = require("moment");

exports.googleAuth = async ({ page, url, siteLogin, sitePassword }) => {
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
  );

  console.log("SITE AUTH CHECK", "|", moment().format("HH:mm:ss"));

  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector("body", { timeout: 0 });
  await page.type('input[type="email"]', siteLogin);
  await page.click("#identifierNext");
  await new Promise((r) => setTimeout(r, 3000));
  await page.type('input[type="password"]', sitePassword);
  await page.click("#passwordNext");
  await page.waitForNavigation({ timeout: 0 });

  const status = await page.evaluate(() => {
    return {
      status: document
        ? document.querySelector('meta[property="og:url"]')
        : null,
    };
  });

  let currentUrl = "";

  if (status && status.status) {
    console.log("PAGE IS AVAILABLE", "|", moment().format("HH:mm:ss"));
    currentUrl = await page.url();
  } else {
    console.log("PAGE NOT FOUND", "|", moment().format("HH:mm:ss"));
    currentUrl = "error404";
  }

  console.log(
    "SITE AUTH RESULT",
    "|",
    moment().format("HH:mm:ss"),
    "|",
    url.includes(currentUrl)
  );

  return currentUrl;
};
