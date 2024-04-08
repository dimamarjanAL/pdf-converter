const moment = require("moment");
const { supabaseClient } = require("./supabaseClient");

exports.compareAndRemoveDriveFileDb = async ({ driveFiles, companyId }) => {
  const { data: files, error } = await supabaseClient
    .from("files")
    .select("id,name,company,fromGoogle,folderId")
    .eq("company", companyId)
    .eq("fromGoogle", true);

  if (error) {
    console.log(
      "DRIVE FILES SEARCHING ERROR",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      error
    );
  }

  if (files?.length) {
    await Promise.all(
      files.map(async (file) => {
        const isExistOnDrive = driveFiles.some(
          (driveFile) =>
            driveFile.name === file.name &&
            driveFile.folder.id === file.folderId
        );

        if (!isExistOnDrive) {
          //NEED IMPROVE DELETE REMINDER ===>

          // if (file.reminder) {
          //   await fetch("/api/slack/reminder/delete", {
          //     method: "POST",
          //     body: JSON.stringify({
          //       reminder: file.reminder,
          //       slackToken,
          //     }),
          //   });
          // }

          //NEED ADD REMOVE FILE FROM S3 ===>

          await supabaseClient.from("files").delete().eq("id", file.id);
        }
      })
    );
  }
};
