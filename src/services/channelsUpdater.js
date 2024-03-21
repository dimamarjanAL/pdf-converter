const {
  createChannels,
  updateRowById,
} = require("../utils");
const { slack } = require("../utils/slack")

exports.channelsUpdater = async ({ slackId, slackToken, team, companyId }) => {
  let cursor = "";

  await updateRowById({
    tableName: "companies",
    rowId: companyId,
    data: { isChannelsUpdating: true },
  })

  const getPartOfChannels = async () => {
    try {
      const list = await fetch(
        slack.channelsUrl(slackId, cursor),
        slack.requestOptions(slackToken),
      );
      const { channels: channelsData, response_metadata: metadata } = await list.json();
      
      if (channelsData) {
        await createChannels({ team, channelsData })
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
      console.log('Request error', err.message || 'Message not found');

      await updateRowById({
        tableName: "companies",
        rowId: companyId,
        data: { isChannelsUpdating: false },
      })

      return { isSuccess: false }
    }
  };

  await getPartOfChannels();

  await updateRowById({
    tableName: "companies",
    rowId: companyId,
    data: { isChannelsUpdating: false },
  })

  return { isSuccess: true }
}