const moment = require("moment");

const { uploadFileToS3 } = require("../utils/storageS3");
const { createOrUpdateFileDb } = require("../utils/createOrUpdateFileDb");
const { setSchedulerMessage } = require("../utils/setSchedulerMessage");
const { textExtractor } = require("../utils/textExtractor");
const { createOpenAiEmbeddings } = require("../utils/createOpenAiEmbeddings");
const { updateRowById } = require("../utils/helpers");

exports.docParserCreateFile = async ({ file, ...params }) => {
  const fileKey = `${params.companyId}-file-${file.originalname}`;
  const fileLink = await uploadFileToS3({ file, fileKey });

  const { data: fileData, error } = await createOrUpdateFileDb({
    userId: params.userId,
    fileURL: fileLink,
    category: params.category,
    title: file.originalname,
    description: params.description,
    name: file.originalname,
    date: moment().format("MM/DD/YYYY"),
    expireDate: params.date / 1000,
    admin: params.admin,
    company: params.companyId,
    fromSiteData: false,
    fromGoogle: false,
    isPrivate: false,
    inProcessing: true,
  });

  if (error) {
    console.log(
      "FILE CREATING ERROR",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      error
    );
    return { isOk: false, error: error?.message || "something went wrong" };
  }

  const response = await setSchedulerMessage({
    category: fileData.category,
    expDate: fileData.expireDate,
    admin: fileData.admin,
    fileName: fileData.name,
    fileUrl: fileData.fileURL,
    fileId: fileData.id,
  });
  console.log(
    "SET SCHEDULER",
    "|",
    moment().format("HH:mm:ss"),
    "|",
    response.message
  );

  return { isOk: true, ...fileData, reminderStatus: response.isSuccess };
};

exports.docParser = async ({ file, createdFile, ...params }) => {
  try {
    const pagesData = await textExtractor(file);
    const numberOfPages = pagesData.length;

    console.log(
      "DOC PARSER START",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      `Found ${numberOfPages} pages`
    );

    let cycle = 0;

    await Promise.all(
      pagesData.map(async (pageData, idx) => {
        cycle += 1;
        await new Promise((resolve, _reject) => {
          setTimeout(() => {
            createOpenAiEmbeddings({
              fileId: createdFile.id,
              companyId: params.companyId,
              userId: params.userId,
              fileUrl: createdFile.fileURL,
              parsedPageText: pageData.extractedText,
              fileName: createdFile.name,
              pageNumber: pageData.page,
            });
            resolve();
          }, 50 * cycle);
        });
      })
    );

    await updateRowById({
      tableName: "files",
      rowId: createdFile.id,
      data: { inProcessing: false },
    });

    console.log(
      "DOC PARSER FINISH",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      `Handled ${numberOfPages} pages, file: ${createdFile.name}`
    );

    return { isOk: true };
  } catch (error) {
    console.log(
      "DOC PARSER ERROR",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      error?.message
    );
    return { isOk: false, error: error?.message || "something went wrong" };
  }
};
