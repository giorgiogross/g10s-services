import { createClient } from "@supabase/supabase-js";
import { serverEnv, type Env } from "./env";
import type { MailingListStore, PendingSignup, Subscriber } from "./service";

const COLUMNS = "id, confirmed, confirm_sent_at, confirm_expires_at";

/**
 * `g10s_data.mailing_list` in the Batchbrew Supabase project, through the service role (the table has no RLS
 * policies). Its migration lives in giorgiogross/margatsni.
 */
export function supabaseStore(env: Env = serverEnv()): MailingListStore {
  const url = env.SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  const db = createClient(url, key, { db: { schema: "g10s_data" }, auth: { persistSession: false } });
  const table = () => db.from("mailing_list");

  return {
    async find(campaign, email) {
      const { data, error } = await table().select(COLUMNS).eq("campaign", campaign).eq("email", email).maybeSingle();
      if (error) throw error;
      return data as Subscriber | null;
    },
    async findByTokenHash(hash) {
      const { data, error } = await table().select(COLUMNS).eq("confirm_token_hash", hash).maybeSingle();
      if (error) throw error;
      return data as Subscriber | null;
    },
    async savePending(signup: PendingSignup) {
      const { error } = await table().upsert(signup, { onConflict: "campaign,email" });
      if (error) throw error;
    },
    async markConfirmed(id, at) {
      const { error } = await table().update({ confirmed: true, confirmed_at: at }).eq("id", id);
      if (error) throw error;
    },
  };
}
