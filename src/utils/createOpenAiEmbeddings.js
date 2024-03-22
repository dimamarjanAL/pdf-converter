const { supabaseClient } = require("../utils/supabaseClient");

exports.createOpenAiEmbeddings = async ({
  fileId,
  companyId,
  userId,
  fileUrl,
  parsedPageText,
  fileName,
  pageNumber,
}) => {
  const documents = [];

  let start = 0;
  const docSize = 2500;

  while (start < parsedPageText.length) {
    const end = start + docSize;
    const chunk = parsedPageText.slice(start, end);
    const chunkWithoutUnicode = chunk.replace(/\u0000/g, "");
    documents.push(
      pageNumber
        ? `"DOCUMENT PAGE: ${pageNumber}": ` + chunkWithoutUnicode
        : chunkWithoutUnicode
    );
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
        url: fileName || fileUrl,
        file_url: fileUrl,
        user_id: userId,
        file: fileId,
        company: companyId,
      });
    } catch (error) {
      console.error("Something went wrong: " + error);
    }
  }
};
