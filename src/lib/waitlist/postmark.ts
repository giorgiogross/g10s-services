import { serverEnv, type Env } from "./env";
import type { ConfirmMailer } from "./service";

/** Created through the Postmark Templates API; the model takes `confirm_url`. */
export const CONFIRM_TEMPLATE_ALIAS = "g10s-waitlist-confirm";

export function postmarkMailer(env: Env = serverEnv(), fetcher: typeof fetch = fetch): ConfirmMailer {
  const token = env.POSTMARK_TX_SMTP_API_KEY?.trim();
  const from = env.POSTMARK_SENDER_EMAIL?.trim();
  if (!token || !from) throw new Error("POSTMARK_TX_SMTP_API_KEY and POSTMARK_SENDER_EMAIL are required");

  return {
    async sendConfirm(email, confirmUrl) {
      const response = await fetcher("https://api.postmarkapp.com/email/withTemplate", {
        method: "POST",
        signal: AbortSignal.timeout(10_000),
        headers: { "Content-Type": "application/json", Accept: "application/json", "X-Postmark-Server-Token": token },
        body: JSON.stringify({
          From: from,
          To: email,
          TemplateAlias: env.POSTMARK_WAITLIST_TEMPLATE_ALIAS?.trim() || CONFIRM_TEMPLATE_ALIAS,
          TemplateModel: { confirm_url: confirmUrl },
          MessageStream: env.POSTMARK_MESSAGE_STREAM?.trim() || "outbound",
          Tag: "g10s-waitlist-confirm",
        }),
      });
      if (!response.ok) throw new Error(`Postmark ${response.status}: ${await response.text()}`);
    },
  };
}
