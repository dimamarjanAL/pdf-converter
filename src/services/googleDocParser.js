const { format } = require("date-fns");

const { getGoogleDriveFile } = require("../utils/getGoogleDriveFile");
const { uploadFileToS3 } = require("../utils/storageS3");
const { createOrUpdateFileDb } = require("../utils/createOrUpdateFileDb");
const { setSchedulerMessage } = require("../utils/setSchedulerMessage");
const { textExtractor } = require("../utils/textExtractor");
const { createOpenAiEmbeddings } = require("../utils/createOpenAiEmbeddings");
const { updateRowById } = require("../utils/helpers");

exports.googleDocParser = async ({ docs }) => {
  try {
    for (const doc of docs) {
      const fileBuffer = await getGoogleDriveFile({ fileId: doc.id });

      const emitFile = {
        buffer: fileBuffer,
        mimetype: doc.mimeType,
        name: doc.name,
      };

      const fileKey = `${doc.companyId}-${doc.name}`;

      const fileLink = await uploadFileToS3({ file: emitFile, fileKey });
      console.log("========FILE UPLOADED========", fileLink);

      const { data: fileData, error } = await createOrUpdateFileDb({
        userId: doc.userId,
        fileURL: fileLink,
        category: doc.category,
        title: doc.name,
        description: doc.description,
        name: doc.name,
        date: format(new Date(), "MM/dd/yyyy"),
        expireDate: Date.parse(doc.date) / 1000,
        admin: doc.admin,
        company: doc.companyId,
        fromSiteData: false,
        fromGoogle: true,
        isPrivate: false,
        inProcessing: true,
      });

      if (error) {
        console.error("Something went wrong:", error);
      }

      const file = fileData[0];

      await setSchedulerMessage({
        category: file.category,
        expDate: Date.parse(file.date) / 1000,
        admin: file.admin.email,
        fileName: file.name,
        fileUrl: file.fileURL,
        fileId: file.id,
      });

      console.log("========START========", doc.name);
      const pagesData = await textExtractor(emitFile);
      const numberOfPages = pagesData.length;

      let cycle = 0;

      await Promise.all(
        pagesData.map(async (pageData, idx) => {
          cycle += 1;
          await new Promise((resolve, _reject) => {
            setTimeout(() => {
              createOpenAiEmbeddings({
                fileId: file.id,
                companyId: doc.companyId,
                userId: doc.userId,
                fileUrl: fileLink,
                parsedPageText: pageData.extractedText,
                fileName: file.name,
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
        rowId: file.id,
        data: { inProcessing: false },
      });

      console.log("========FINISH========", doc.name);
    }

    return { isOk: true };
  } catch (error) {
    return { isOk: false, error: error?.message || "something went wrong" };
  }
};
