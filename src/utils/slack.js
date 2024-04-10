const {
  SLACK_USERS_LIST_API,
  SLACK_SCHEDULE_MESSAGE_API,
  SLACK_SCHEDULE_MESSAGE_DELETE_API,
} = process.env;

exports.listSlackUsers = async ({ slackToken }) => {
  const usersResponse = await fetch(SLACK_USERS_LIST_API, {
    method: "GET",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${slackToken}`,
    },
  });

  return usersResponse.text();
};

exports.createSlackReminder = async ({
  slackToken,
  channel,
  expDate,
  foundUserId,
  fileUrl,
  fileName,
  fileId,
}) => {
  const resp = await fetch(SLACK_SCHEDULE_MESSAGE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${slackToken}`,
    },
    body: JSON.stringify({
      channel,
      post_at: expDate,
      text: `Hey <@${foundUserId}> - This is a reminder that <${fileUrl}|${fileName}> should be reviewed and updated, please use the following link to access the document  <https://app.accountingcopilot.ai/dashboard/upload-files?file=${fileId}|accounting-copilot dashboard>`,
    }),
  });

  return resp.json();
};

exports.removeSlackReminder = async ({
  slackToken,
  channel,
  scheduled_message_id,
}) => {
  return fetch(SLACK_SCHEDULE_MESSAGE_DELETE_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${slackToken}`,
    },
    body: JSON.stringify({
      channel,
      scheduled_message_id,
    }),
  });
};
