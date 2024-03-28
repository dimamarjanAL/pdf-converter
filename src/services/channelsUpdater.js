const { updateRowById, createChannels } = require("../utils/helpers");

const { SLACK_CONVERSATIONS_LIST_API } = process.env;

exports.channelsUpdater = async ({ slackId, slackToken, team, companyId }) => {
  let cursor = "";

  await updateRowById({
    tableName: "companies",
    rowId: companyId,
    data: { isChannelsUpdating: true },
  });

  const getPartOfChannels = async () => {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append("team_id", slackId);
      queryParams.append("types", "public_channel,private_channel");
      queryParams.append("exclude_archived", true);
      queryParams.append("limit", 1000);
      queryParams.append("cursor", cursor);

      const fetchLink = `${SLACK_CONVERSATIONS_LIST_API}?${queryParams.toString()}`;
      const list = await fetch(fetchLink, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${slackToken}`,
        },
      });

      const { channels: channelsData, response_metadata: metadata } =
        await list.json();

      if (channelsData) {
        await createChannels({ team, channelsData });
      }
      if (metadata?.next_cursor) {
        cursor = metadata.next_cursor;
        await new Promise((resolve, _reject) => {
          setTimeout(() => {
            resolve(getPartOfChannels());
          }, 3000);
        });
      }
    } catch (err) {
      console.log("Request error", err.message || "Message not found");

      await updateRowById({
        tableName: "companies",
        rowId: companyId,
        data: { isChannelsUpdating: false },
      });

      return { isSuccess: false };
    }
  };

  await getPartOfChannels();

  await updateRowById({
    tableName: "companies",
    rowId: companyId,
    data: { isChannelsUpdating: false },
  });

  return { isSuccess: true };
};
