const { supabaseClient } = require("./supabaseClient");
const { SLACK_BOT_TOKEN, SLACK_USERS_LIST_API, SLACK_SCHEDULE_MESSAGE_API } =
  process.env;

const slackSchedulerMessageHandler = async ({
  email,
  channel,
  expDate,
  fileName,
  fileUrl,
  fileId,
}) => {
  try {
    const usersResponse = await fetch(SLACK_USERS_LIST_API, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });
    const users = await usersResponse.text();

    const response = JSON.parse(users);
    const foundUser = response.members.find(
      (member) => member.profile.email === email.trim()
    );

    if (!foundUser) {
      return new Response(
        `The user with the email address ${email} is not in Slack`
      );
    }

    const resp = await fetch(SLACK_SCHEDULE_MESSAGE_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel,
        post_at: expDate,
        text: `Hey <@${foundUser.id}> - This is a reminder that <${fileUrl}|${fileName}> should be reviewed and updated, please use the following link to access the document  <https://app.accountingcopilot.ai/dashboard/upload-files?file=${fileId}|accounting-copilot dashboard>`,
      }),
    });
    const respData = await resp.json();

    if (respData.ok) {
      const d = new Date(expDate * 1000);
      await supabaseClient
        .from("files")
        .update({ reminder: respData })
        .eq("id", fileId)
        .select();

      return new Response(`Reminder successfully set to ${d.toString()}`);
    }

    return new Response(`Reminder is not set. Error: ${respData.error}`);
  } catch (error) {
    return new Response("An error occurred while processing the request.");
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
  const { data: channelData, error: channelDataError } = await supabaseClient
    .from("channels")
    .select("slackId")
    .eq("category", category);

  if (channelDataError) {
    console.error(channelDataError);
  }
  if (!channelData?.length || (channelData && !channelData[0]?.slackId)) {
    console.error(`The category '${category}' has no channel`);
    return;
  } else {
    if (admin) {
      try {
        const slackResp = await slackSchedulerMessageHandler({
          email: admin,
          channel: channelData[0].slackId,
          fileName,
          fileUrl,
          expDate,
          fileId,
        });
        const slackRespDate = await slackResp.text();

        if (slackRespDate) {
          console.log("Response:", slackRespDate);
        }
      } catch (err) {
        console.error("Something went wrong:", err);
      }
    }
  }
};
