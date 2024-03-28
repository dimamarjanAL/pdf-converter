const moment = require("moment");
const { supabaseClient } = require("../utils/supabaseClient");

exports.createOrUpdateFileDb = async ({
  name,
  company,
  fromSiteData = false,
  fromGoogle = false,
  ...params
}) => {
  const { data, error } = await supabaseClient
    .from("files")
    .select()
    .eq("name", name)
    .eq("company", company);

  if (error) {
    console.log(
      "FILE SEARCHING ERROR",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      error
    );
  }

  if (data?.length) {
    const { data, error } = await supabaseClient
      .from("files")
      .update([
        {
          ...params,
          name,
          fromSiteData,
          fromGoogle,
          company,
        },
      ])
      .eq("name", name)
      .select("*,admin(email,slackToken)");

    return { data, error };
  } else {
    const { data, error } = await supabaseClient
      .from("files")
      .insert([
        {
          ...params,
          name,
          fromSiteData,
          fromGoogle,
          company,
        },
      ])
      .select("*,admin(email,slackToken)");

    return { data, error };
  }
};
