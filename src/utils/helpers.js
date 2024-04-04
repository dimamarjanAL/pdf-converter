const moment = require("moment");
const { supabaseClient } = require("../utils/supabaseClient");

exports.urlCleaner = (url) => {
  const linkWithoutParams = url?.split("?")[0];
  const linkWithoutHash = linkWithoutParams?.split("#")[0];
  return linkWithoutHash[linkWithoutHash.length - 1] === "/"
    ? linkWithoutHash.slice(0, -1)
    : linkWithoutHash;
};

exports.updateRowById = ({ tableName, rowId, data }) => {
  return supabaseClient.from(tableName).update([data]).eq("id", rowId);
};

exports.tryCatchWrapper = (cb) => async (req, res, next) => {
  const { method, originalUrl } = req;

  const start = Date.now();

  const request = await cb(req, res, next).catch((err) => next(err));

  console.log(
    `[${method}]`,
    moment().format("HH:mm:ss"),
    "|",
    Date.now() - start,
    "ms",
    "|",
    originalUrl
  );

  return request;
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

exports.isValidMimeType = (mimeType) => {
  const validMimeTypes = [
    // "application/vnd.google-apps.presentation",
    // "application/vnd.google-apps.spreadsheet",
    // "application/vnd.google-apps.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "application/pdf",
  ];
  return validMimeTypes.includes(mimeType);
};
