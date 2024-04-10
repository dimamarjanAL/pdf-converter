const moment = require("moment");

const { supabaseClient } = require("../utils/supabaseClient");
const { listAllDriveFiles } = require("./listAllDriveFiles");
const {
  compareAndRemoveDriveFileDb,
} = require("../utils/compareAndRemoveDriveFileDb");
const { createOrUpdateFileDb } = require("../utils/createOrUpdateFileDb");
const { findOrCreateCategory } = require("../utils/findOrCreateCategoryDb");
const { googleDocParser } = require("./googleDocParser");

exports.googleDriveScan = async () => {
  let { data: companies } = await supabaseClient
    .from("companies")
    .select("id,slackId,slackToken,googleDriveEmail")
    .neq("googleDriveEmail", "null");

  for (const company of companies) {
    console.log(
      "DRIVE COMPANY HANDLING",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      `ID: ${company.id}`,
      "|",
      `Email: ${company.googleDriveEmail}`
    );

    const driveFiles = await listAllDriveFiles({
      email: company.googleDriveEmail,
    });
    console.log(
      `Account ${company.googleDriveEmail} includes <<<––${driveFiles.length}––>>> files`
    );

    await compareAndRemoveDriveFileDb({
      driveFiles,
      companyId: company.id,
      slackToken: company.slackToken,
    });

    const files = await Promise.all(
      driveFiles.map(async (driveFile) => {
        const { data: fileData, error } = await createOrUpdateFileDb({
          userId: null,
          fileURL: null,
          category: null,
          title: driveFile.name,
          description: null,
          name: driveFile.name,
          date: moment().format("MM/DD/YYYY"),
          expireDate: null,
          admin: null,
          company: company.id,
          fromSiteData: false,
          fromGoogle: true,
          folderId: driveFile?.folder?.id,
          folderName: driveFile?.folder?.name,
          isPrivate: false,
          inProcessing: !!driveFile?.folder?.id,
        });
        if (error) {
          console.log(
            "FILE CREATING ERROR",
            "|",
            moment().format("HH:mm:ss"),
            "|",
            error
          );
          return driveFile;
        }

        return { ...driveFile, companyId: company.id, fileData };
      })
    );

    let itr = 0;
    await Promise.all(
      files.map(async (file) => {
        const { id, folderName, category } = file.fileData;

        if (folderName && !category) {
          const { category } = await findOrCreateCategory({
            folderName,
            company,
          });

          if (category) {
            await new Promise((resolve, _reject) => {
              setTimeout(() => {
                resolve(googleDocParser([file]));
              }, 3000 * itr);

              itr += 1;
            });

            await supabaseClient
              .from("files")
              .update({
                category,
              })
              .eq("id", id);
          } else {
            await supabaseClient
              .from("files")
              .update({
                warningMsg: `The ${folderName} channel wasn't found`,
              })
              .eq("id", id);
          }
        }
      })
    );
  }
};
