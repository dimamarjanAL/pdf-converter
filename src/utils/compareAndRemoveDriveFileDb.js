const moment = require("moment");
const { supabaseClient } = require("./supabaseClient");
const { removeFileFromS3 } = require("./storageS3");
const { removeSlackReminder } = require("./slack");

exports.compareAndRemoveDriveFileDb = async ({
  driveFiles,
  companyId,
  slackToken,
}) => {
  const { data: files, error } = await supabaseClient
    .from("files")
    .select("id,name,company,reminder,fromGoogle,folderId,md5Checksum")
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
        const driveFile = driveFiles.find(
          (driveFile) =>
            driveFile.name === file.name &&
            driveFile.folder.id === file.folderId
        );

        if (!driveFile || file.md5Checksum !== driveFile?.md5Checksum) {
          if (file.reminder) {
            const { channel, scheduled_message_id } = file.reminder;

            await removeSlackReminder({
              slackToken,
              channel,
              scheduled_message_id,
            });
          }

          await removeFileFromS3({
            fileKey: `${file.company}-drive-${file.name}`,
          });

          await supabaseClient.from("files").delete().eq("id", file.id);
        }
      })
    );
  }
};
