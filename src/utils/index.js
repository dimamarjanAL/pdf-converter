const { google } = require("googleapis");
const { supabaseClient } = require("../utils/supabaseClient");

const { GOOGLE_URL, GOOGLE_KEYS_PATH } = process.env;

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

exports.googleAuth = async ({ page, url, siteLogin, sitePassword }) => {
  await page.setUserAgent(
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36"
  );

  await page.goto(url, { waitUntil: "networkidle2" });
  await page.waitForSelector("body");
  await page.type('input[type="email"]', siteLogin);
  await page.click("#identifierNext");
  await new Promise((r) => setTimeout(r, 3000));
  await page.type('input[type="password"]', sitePassword);
  await page.click("#passwordNext");
  await page.waitForNavigation({ timeout: 15000 });

  return page.url();
};

exports.getWholePageText = async ({ page }) => {
  return await page.evaluate(() => {
    let text = "";
    const elements = document.querySelectorAll(
      "p, span, strong, b, em, i, h1, h2, h3, h4, h5, h6, ul, ol, li, div, a, table, tr, td, button, blockquote, code"
    );

    elements.forEach((el) => {
      Array.from(el.childNodes).forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          text += `${node.textContent} `;
        }
      });
    });
    text = text.replace(/\s+/g, " ").trim();

    return text;
  });
};

exports.getWholePageLinks = async ({ page }) => {
  return await page.evaluate(() => {
    const elements = document.querySelectorAll("a");
    const pagesLink = [];

    elements.forEach((el) => {
      const linkWithoutParams = el.href?.split("?")[0];
      const linkWithoutHash = linkWithoutParams?.split("#")[0];
      const clearUrl =
        linkWithoutHash[linkWithoutHash.length - 1] === "/"
          ? linkWithoutHash.slice(0, -1)
          : linkWithoutHash;

      pagesLink.push(clearUrl);
    });

    return pagesLink;
  });
};

exports.createChannels = async ({ team, channelsData }) => {
  if (team && channelsData?.length) {
    const { error } = await supabaseClient.from("channels").upsert(
      channelsData.map((channel) => ({
        slackId: channel.id || null,
        slackName: channel.name || null,
        nameNormalized: channel.name_normalized || null,
        contextTeamId: channel.context_team_id || null,
        purpose: channel.purpose || null,
        company: team.id,
        isPrivate: channel.is_private || false,
      })),
      { onConflict: "slackId" }
    );
    if (error) console.log(error);
  }
};
