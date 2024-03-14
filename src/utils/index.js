const { google } = require("googleapis");
const config = require("../config");
const { supabaseClient } = require("../utils/supabaseClient");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

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
    keyFile: config.serviceGoogleKeysPath,
    scopes: [config.googleUrl],
  });
  return google.drive({ version: "v3", auth });
};

exports.googleAuth = async ({ page, url, siteLogin, sitePassword }) => {
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36",
    );

    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector("body");
    await page.type('input[type="email"]', siteLogin);
    await page.click('#identifierNext');
    await new Promise(r => setTimeout(r, 3000))
    await page.type('input[type="password"]', sitePassword)
    await page.click('#passwordNext')
    await page.waitForNavigation({ timeout: 5000 });

    return page.url();
}

exports.getWholePageText = async ({ page }) => {
  return await page.evaluate(() => {
    let text = "";
    const elements = document.querySelectorAll(
      "p, span, strong, b, em, i, h1, h2, h3, h4, h5, h6, ul, ol, li, div, a, table, tr, td, button, blockquote, code",
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
}

exports.getWholePageLinks = async ({ page }) => {
  return await page.evaluate(() => {
    const elements = document.querySelectorAll("a");
    const pagesLink = []

    elements.forEach((el) => {
      const linkWithoutParams = el.href?.split("?")[0]
      const linkWithoutHash = linkWithoutParams?.split("#")[0]
      const linkWithoutLastSlash = linkWithoutHash[linkWithoutHash.length - 1] === '/' ? linkWithoutHash.slice(0, -1) : linkWithoutHash

      pagesLink.push(linkWithoutLastSlash)
    })

    return pagesLink
  });
}

exports.createEmbeddings = async ({ fileId, companyId, userId, pageLink, parsedPageText }) => {
 const documents = [];

  let start = 0;
  const docSize = 2500;

  while (start < parsedPageText.length) {
    const end = start + docSize;
    const chunk = parsedPageText.slice(start, end);
    documents.push(chunk);
    start = end;
  }

  for (const doc of documents) {
    const apiURL = process.env.OPENAI_API_URL;
    const apiKey = process.env.OPENAI_API_KEY;
    
    try {
      const embeddingResponse = await fetch(apiURL + "/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: doc,
          model: "text-embedding-ada-002",
        }),
      });
      const embeddingData = await embeddingResponse.json();

      const [{ embedding }] = embeddingData.data;

      await supabaseClient.from("documents").insert({
        content: doc,
        embedding,
        url: pageLink,
        file_url: pageLink,
        user_id: userId,
        file: fileId,
        company: companyId,
      });
    } catch (error) {
      console.error("Something went wrong: " + error);
    }
  }
}

exports.createChannels = async ({ team, channelsData }) => {
  if (team && channelsData?.length) {
    const { error } = await supabaseClient.from("channels")
      .upsert(channelsData.map((channel) => ({
        slackId: channel.id || null,
        slackName: channel.name || null,
        nameNormalized: channel.name_normalized || null,
        contextTeamId: channel.context_team_id || null,
        purpose: channel.purpose || null,
        company: team.id,
        isPrivate: channel.is_private || false,
      })),
      { onConflict: "slackId" },
    );
    if (error) console.log(error);
  }
}

exports.updateRowById = ({ tableName, rowId, data }) => {
  return supabaseClient
    .from(tableName)
    .update([data])
    .eq("id", rowId);
}