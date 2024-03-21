const { textExtractor } = require("../utils/textExtractor");
const { createEmbeddings, updateRowById } = require("../utils");

exports.docParser = async ({ file, fileId, ...params }) => {
  try {
    console.log("========START========", file.originalname);
    const pagesData = await textExtractor(file);
    const numberOfPages = pagesData.length;

    let cycle = 0;

    await Promise.all(
      pagesData.map(async (pageData, idx) => {
        cycle += 1;
        await new Promise((resolve, _reject) => {
          setTimeout(() => {
            createEmbeddings({
              parsedPageText: pageData.extractedText,
              fileName: file.originalname,
              pageNumber: pageData.page,
              fileId,
              ...params,
            });
            resolve();
            console.log("HANDLED PAGE #", idx, "/", numberOfPages);
          }, 100 * cycle);
        });
      })
    );

    await updateRowById({
      tableName: "files",
      rowId: fileId,
      data: { inProcessing: false },
    });

    console.log("========FINISH========", file.originalname);

    return { isOk: true };
  } catch (error) {
    return { isOk: false, error: error?.message || "something went wrong" };
  }
};
