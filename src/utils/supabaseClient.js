const { createClient } = require("@supabase/supabase-js");

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

const client = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON_KEY,
};

if (!client.url || !client.key) {
  throw new Error("Missing Supabase credentials");
}

exports.supabaseClient = createClient(client.url, client.key);
