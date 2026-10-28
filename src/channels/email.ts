// WP2: the sign-in email, through Resend's HTTP API. Sends one thing only:
// the magic link. Never logs the address or the link.

import type { Env } from "../types";

export interface MagicLinkEmail {
  to: string;
  link: string;
}

export function magicLinkText(link: string): string {
  return [
    "Tap to sign in to Hoolala!:",
    "",
    link,
    "",
    "It works once, for 15 minutes.",
    "Didn't ask for it? Ignore this email and nothing happens.",
  ].join("\n");
}

/** Returns true when the provider accepted the email. */
export async function sendMagicLink(env: Env, mail: MagicLinkEmail): Promise<boolean> {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.EMAIL_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [mail.to],
      subject: "Your Hoolala! sign-in link",
      text: magicLinkText(mail.link),
    }),
  });
  return res.ok;
}
