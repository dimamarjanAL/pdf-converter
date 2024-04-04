const moment = require("moment");
const { supabaseClient } = require("./supabaseClient");

exports.findOrCreateCategory = async ({ folderName, company }) => {
  const { data: channel, error } = await supabaseClient
    .from("channels")
    .select("id,slackId,slackName,category")
    .eq("slackName", folderName.toLowerCase())
    .eq("company", company.slackId);

  if (error) {
    console.log(
      "CHANNEL SEARCHING ERROR",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      error
    );
  }

  if (channel?.length) {
    if (channel[0]?.category) {
      return { category: channel[0]?.category };
    } else {
      const { data: category } = await supabaseClient
        .from("categories")
        .insert({
          name: folderName,
          chatId: channel[0]?.slackId,
          company: company.id,
        })
        .select("id");

      await supabaseClient
        .from("channels")
        .update({
          category: category[0].id,
        })
        .eq("id", channel[0]?.id);

      return { category: category[0].id };
    }
  }
  return { category: null };
};
