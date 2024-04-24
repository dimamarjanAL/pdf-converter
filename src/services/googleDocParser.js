const moment = require("moment");

const { getGoogleDriveFile } = require("../utils/getGoogleDriveFile");
const { uploadFileToS3 } = require("../utils/storageS3");
const { createOrUpdateFileDb } = require("../utils/createOrUpdateFileDb");
const { setSchedulerMessage } = require("../utils/setSchedulerMessage");
const { textExtractor } = require("../utils/textExtractor");
const { createOpenAiEmbeddings } = require("../utils/createOpenAiEmbeddings");
const { updateRowById } = require("../utils/helpers");

exports.googleDocParserCreateFile = async ({ docs }) => {
  return Promise.all(
    docs.map(async (doc) => {
      const { data: fileData, error } = await createOrUpdateFileDb({
        userId: doc.userId,
        fileURL: null,
        category: doc.category,
        title: doc.name,
        description: doc.description,
        name: doc.name,
        date: moment().format("MM/DD/YYYY"),
        expireDate: Date.parse(doc.date) / 1000,
        admin: doc.admin,
        company: doc.companyId,
        fromSiteData: false,
        fromGoogle: true,
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
        return doc;
      }

      const file = fileData[0];

      const response = await setSchedulerMessage({
        category: file.category,
        expDate: file.expireDate,
        admin: file.admin,
        fileName: file.name,
        fileUrl: file.fileURL,
        fileId: file.id,
      });

      console.log(
        "SET SCHEDULER",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        response.message
      );

      return { ...doc, fileData: file, reminderStatus: response.isSuccess };
    })
  );
};

exports.googleDocParser = async (createdFiles) => {
  try {
    for (const { fileData, ...file } of createdFiles) {
      const fileBuffer = await getGoogleDriveFile({ fileId: file.id });

      const emitFile = {
        buffer: fileBuffer,
        mimetype: file.mimeType,
        name: file.name,
      };

      const fileKey = `${file.companyId}-${file.name}`;

      const fileLink = await uploadFileToS3({ file: emitFile, fileKey });

      await updateRowById({
        tableName: "files",
        rowId: fileData.id,
        data: { fileURL: fileLink },
      });

      const pagesData = await textExtractor(emitFile);
      const numberOfPages = pagesData.length;

      console.log(
        "GOOGLE DOC PARSER START",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        `Found ${numberOfPages} pages`
      );

      let cycle = 0;

      await Promise.all(
        pagesData.map(async (pageData) => {
          cycle += 1;
          await new Promise((resolve, _reject) => {
            setTimeout(() => {
              createOpenAiEmbeddings({
                fileId: fileData.id,
                companyId: file.companyId,
                userId: file?.userId,
                fileUrl: fileLink,
                parsedPageText: pageData.extractedText,
                fileName: fileData.name,
                pageNumber: pageData.page,
              });
              resolve();
            }, 50 * cycle);
          });
        })
      );

      await updateRowById({
        tableName: "files",
        rowId: fileData.id,
        data: { inProcessing: false },
      });

      console.log(
        "GOOGLE DOC PARSER FINISH",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        `Handled ${numberOfPages} pages, file: ${file.name}`
      );
    }

    return { isOk: true };
  } catch (error) {
    console.log(
      "GOOGLE DOC PARSER ERROR",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      error?.message
    );
    return { isOk: false, error: error?.message || "something went wrong" };
  }
};
