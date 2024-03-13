const { createClient } = require("@supabase/supabase-js");

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const client = {
  url: process.env.SUPABASE_URL,
  key: process.env.SUPABASE_ANON_KEY
};

if (!client.url || !client.key) {
  throw new Error("Missing Supabase credentials");
}

exports.supabaseClient = createClient(client.url, client.key);
