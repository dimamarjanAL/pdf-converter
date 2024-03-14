exports.slack = {
  channelsUrl: (teamId, cursor) =>
    `https://slack.com/api/conversations.list?team_id=${teamId}&types=public_channel%2Cprivate_channel&exclude_archived=true&limit=1000&cursor=${cursor}`,
  requestOptions: function (accessToken) {
    return {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    };
  },
};
