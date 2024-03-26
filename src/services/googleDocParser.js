const { format } = require("date-fns");

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
        date: format(new Date(), "MM/dd/yyyy"),
        expireDate: doc.date / 1000,
        admin: doc.admin,
        company: doc.companyId,
        fromSiteData: false,
        fromGoogle: true,
        isPrivate: false,
        inProcessing: true,
      });

      if (error) {
        console.error("Something went wrong:", error);
        return doc;
      }

      return { ...doc, fileData: fileData[0] };
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
      console.log("===FILE UPLOADED===", fileLink);

      await updateRowById({
        tableName: "files",
        rowId: fileData.id,
        data: { fileURL: fileLink },
      });

      await setSchedulerMessage({
        category: fileData.category,
        expDate: Date.parse(fileData.date) / 1000,
        admin: fileData.admin.email,
        fileName: fileData.name,
        fileUrl: fileData.fileURL,
        fileId: fileData.id,
      });

      console.log("===START===", file.name);
      const pagesData = await textExtractor(emitFile);
      const numberOfPages = pagesData.length;

      let cycle = 0;

      await Promise.all(
        pagesData.map(async (pageData, idx) => {
          cycle += 1;
          await new Promise((resolve, _reject) => {
            setTimeout(() => {
              createOpenAiEmbeddings({
                fileId: fileData.id,
                companyId: file.companyId,
                userId: file.userId,
                fileUrl: fileLink,
                parsedPageText: pageData.extractedText,
                fileName: fileData.name,
                pageNumber: pageData.page,
              });
              resolve();
              console.log("HANDLED PAGE #", idx + 1, "/", numberOfPages);
            }, 100 * cycle);
          });
        })
      );

      await updateRowById({
        tableName: "files",
        rowId: fileData.id,
        data: { inProcessing: false },
      });

      console.log("===FINISH===", file.name);
    }

    return { isOk: true };
  } catch (error) {
    return { isOk: false, error: error?.message || "something went wrong" };
  }
};
