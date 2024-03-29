const moment = require("moment");

const { uploadFileToS3 } = require("../utils/storageS3");
const { createOrUpdateFileDb } = require("../utils/createOrUpdateFileDb");
const { setSchedulerMessage } = require("../utils/setSchedulerMessage");
const { textExtractor } = require("../utils/textExtractor");
const { createOpenAiEmbeddings } = require("../utils/createOpenAiEmbeddings");
const { updateRowById } = require("../utils/helpers");

exports.docParserCreateFile = async ({ file, ...params }) => {
  const fileKey = `${params.companyId}-${file.originalname}`;

  const fileLink = await uploadFileToS3({ file, fileKey });
  console.log("FILE UPLOADED", "|", moment().format("HH:mm:ss"), "|", fileLink);

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

  const createdFile = fileData[0];

  const response = await setSchedulerMessage({
    category: createdFile.category,
    expDate: createdFile.expireDate,
    admin: createdFile.admin,
    fileName: createdFile.name,
    fileUrl: createdFile.fileURL,
    fileId: createdFile.id,
  });
  console.log(
    "SET SCHEDULER",
    "|",
    moment().format("HH:mm:ss"),
    "|",
    response.message
  );

  return { isOk: true, ...createdFile, reminderStatus: response.isSuccess };
};

exports.docParser = async ({ file, createdFile, ...params }) => {
  try {
    console.log(
      "DOC PARSER START",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      createdFile.name
    );
    const pagesData = await textExtractor(file);
    const numberOfPages = pagesData.length;

    console.log(
      "DOC PARSER",
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
          }, 100 * cycle);
        });
      })
    );

    console.log(
      "DOC PARSER",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      `Handled ${numberOfPages} pages`
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
      createdFile.name
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
