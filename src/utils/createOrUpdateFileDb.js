const moment = require("moment");
const { supabaseClient } = require("../utils/supabaseClient");

const determineQueryType = async ({ name, company, fromGoogle, folderId }) => {
  if (fromGoogle) {
    const { data, error } = await supabaseClient
      .from("files")
      .select()
      .eq("name", name)
      .eq("company", company)
      .is("fromGoogle", fromGoogle)
      .eq("folderId", folderId);

    if (error) {
      console.log(
        "FILE SEARCHING ERROR",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        error
      );
    }

    return data[0];
  } else {
    const { data, error } = await supabaseClient
      .from("files")
      .select()
      .eq("name", name)
      .eq("company", company)
      .is("fromGoogle", fromGoogle);

    if (error) {
      console.log(
        "FILE SEARCHING ERROR",
        "|",
        moment().format("HH:mm:ss"),
        "|",
        error
      );
    }

    return data[0];
  }
};

exports.createOrUpdateFileDb = async ({
  name,
  company,
  fromSiteData = false,
  fromGoogle = false,
  folderId = null,
  md5Checksum = null,
  ...params
}) => {
  let file = await determineQueryType({ name, company, fromGoogle, folderId });

  if (!!file) {
    if (file.fromGoogle) {
      if (file.inProcessing && !!file.warningMsg) {
        await supabaseClient
          .from("files")
          .update({
            warningMsg: null,
          })
          .eq("id", file.id);
      }

      if (!file.md5Checksum) {
        await supabaseClient
          .from("files")
          .update({
            md5Checksum,
          })
          .eq("id", file.id);
      }
      return { data: file };
    } else {
      await supabaseClient.from("documents").delete().eq("file", file.id);

      const { data, error } = await supabaseClient
        .from("files")
        .update([
          {
            ...params,
            name,
            fromSiteData,
            fromGoogle,
            folderId,
            company,
          },
        ])
        .eq("id", file.id)
        .select("*,admin(email,slackToken)");

      return { data: data[0], error };
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
          folderId,
          company,
          md5Checksum,
        },
      ])
      .select("*,admin(email,slackToken)");

    return { data: data[0], error };
  }
};
