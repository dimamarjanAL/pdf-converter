const { format } = require("date-fns");

const { uploadFileToS3 } = require("../utils/storageS3");
const { createOrUpdateFileDb } = require("../utils/createOrUpdateFileDb");
const { setSchedulerMessage } = require("../utils/setSchedulerMessage");
const { textExtractor } = require("../utils/textExtractor");
const { createOpenAiEmbeddings } = require("../utils/createOpenAiEmbeddings");
const { updateRowById } = require("../utils/helpers");

exports.docParser = async ({ file, ...params }) => {
  try {
    const fileKey = `${params.companyId}-${file.originalname}`;

    const fileLink = await uploadFileToS3({ file, fileKey });
    console.log("========FILE UPLOADED========", fileLink);

    const { data: fileData, error } = await createOrUpdateFileDb({
      userId: params.userId,
      fileURL: fileLink,
      category: params.category,
      title: file.originalname,
      description: params.description,
      name: file.originalname,
      date: format(new Date(), "MM/dd/yyyy"),
      expireDate: Date.parse(params.date) / 1000,
      admin: params.admin,
      company: params.companyId,
      fromSiteData: false,
      fromGoogle: false,
      isPrivate: false,
      inProcessing: true,
    });

    if (error) {
      console.error("Something went wrong:", error);
    }

    const createdFile = fileData[0];

    await setSchedulerMessage({
      category: createdFile.category,
      expDate: Date.parse(createdFile.date) / 1000,
      admin: createdFile.admin.email,
      fileName: createdFile.name,
      fileUrl: createdFile.fileURL,
      fileId: createdFile.id,
    });

    console.log("========START========", createdFile.name);
    const pagesData = await textExtractor(file);
    const numberOfPages = pagesData.length;

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
              fileUrl: fileLink,
              parsedPageText: pageData.extractedText,
              fileName: createdFile.name,
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
      rowId: createdFile.id,
      data: { inProcessing: false },
    });

    console.log("========FINISH========", createdFile.name);

    return { isOk: true };
  } catch (error) {
    return { isOk: false, error: error?.message || "something went wrong" };
  }
};
