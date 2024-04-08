const moment = require("moment");
const { supabaseClient } = require("../utils/supabaseClient");

exports.createOrUpdateFileDb = async ({
  name,
  company,
  fromSiteData = false,
  fromGoogle = false,
  ...params
}) => {
  const { data: file, error } = await supabaseClient
    .from("files")
    .select()
    .eq("name", name)
    .eq("company", company)
    .eq("fromGoogle", fromGoogle)
    .eq("folderId", params.folderId);

  if (error) {
    console.log(
      "FILE SEARCHING ERROR",
      "|",
      moment().format("HH:mm:ss"),
      "|",
      error
    );
  }

  if (file?.length) {
    if (file[0].fromGoogle) {
      if (file[0].inProcessing && file[0].warningMsg) {
        await supabaseClient
          .from("files")
          .update({
            warningMsg: null,
          })
          .eq("id", file[0].id);
      }

      return { data: file, error };
    } else {
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
        .eq("id", file[0].id)
        .select("*,admin(email,slackToken)");

      return { data, error };
    }
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
