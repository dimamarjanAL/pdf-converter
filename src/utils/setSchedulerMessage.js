const moment = require("moment");
const { supabaseClient } = require("./supabaseClient");
const { listSlackUsers, createSlackReminder } = require("./slack");

const slackSchedulerMessageHandler = async ({
  admin,
  channel,
  expDate,
  fileName,
  fileUrl,
  fileId,
}) => {
  try {
    const users = await listSlackUsers({ slackToken: admin.slackToken });
    const response = JSON.parse(users);

    const foundUser = response.members.find(
      (member) => member.profile.email === admin.email.trim()
    );

    if (!foundUser) {
      return {
        isSuccess: false,
        message: `The user with the email address ${admin.email} is not in Slack`,
      };
    }

    const respData = await createSlackReminder({
      slackToken: admin.slackToken,
      channel,
      expDate,
      foundUserId: foundUser.id,
      fileUrl,
      fileName,
      fileId,
    });

    if (respData.ok) {
      const date = moment(expDate * 1000).format("MM/DD/YYYY HH:mm");
      await supabaseClient
        .from("files")
        .update({ reminder: respData })
        .eq("id", fileId)
        .select();

      return {
        isSuccess: true,
        message: `Reminder successfully set to ${date}`,
      };
    }

    return {
      isSuccess: false,
      message: `Reminder is not set. Error: ${respData.error}`,
    };
  } catch (error) {
    return {
      isSuccess: false,
      message: "REMINDER: An error occurred while processing the request.",
    };
  }
};

exports.setSchedulerMessage = async ({
  category,
  expDate,
  admin,
  fileName,
  fileUrl,
  fileId,
}) => {
  if (!expDate) {
    return {
      isSuccess: true,
      message: `Expiration date is not select`,
    };
  }

  const { data: channelData, error: channelDataError } = await supabaseClient
    .from("channels")
    .select("slackId")
    .eq("category", category);

  if (channelDataError) {
    return {
      isSuccess: false,
      message: channelDataError,
    };
  }
  if (!channelData?.length || (channelData && !channelData[0]?.slackId)) {
    return {
      isSuccess: false,
      message: `The category '${category}' has no channel`,
    };
  } else {
    if (admin) {
      try {
        return slackSchedulerMessageHandler({
          admin,
          channel: channelData[0].slackId,
          fileName,
          fileUrl,
          expDate,
          fileId,
        });
      } catch (err) {
        console.error("Something went wrong:", err);
      }
    }
  }
};
