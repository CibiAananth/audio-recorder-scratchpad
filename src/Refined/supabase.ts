import { createClient } from "@supabase/supabase-js";

const options = {
  db: {
    schema: "public",
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: { "x-my-custom-header": "rec" },
  },
};

export const supabase = createClient(
  "https://wujqkfxwjcdlaqwzqttd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1anFrZnh3amNkbGFxd3pxdHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk1OTgzODgsImV4cCI6MjAwNTE3NDM4OH0.BhqKBRB_uj-v-GiK2ZMp5hlfMNTtGMxvTGFi9pQnOtY",
  options
);
