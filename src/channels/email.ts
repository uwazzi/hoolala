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

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [250, 750];
const MAX_RETRY_AFTER_MS = 2000;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Network errors, 429 and 5xx are worth another try; other 4xx never are. */
function retryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function retryDelay(res: Response | null, attempt: number): number {
  const header = res?.headers.get("retry-after");
  const seconds = header ? Number(header) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, MAX_RETRY_AFTER_MS);
  return BACKOFF_MS[attempt] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
}

/**
 * Returns true when the provider accepted the email. One idempotency key per
 * sign-in attempt, reused across retries, so a retry never sends twice.
 */
export async function sendMagicLink(
  env: Env,
  mail: MagicLinkEmail,
  sleep: (ms: number) => Promise<void> = wait,
): Promise<boolean> {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) return false;
  const idempotencyKey = `signin/${crypto.randomUUID()}`;
  const body = JSON.stringify({
    from: env.EMAIL_FROM,
    to: [mail.to],
    subject: "Your Hoolala! sign-in link",
    text: magicLinkText(mail.link),
  });

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let res: Response | null = null;
    try {
      res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.EMAIL_API_KEY}`,
          "content-type": "application/json",
          "idempotency-key": idempotencyKey,
        },
        body,
      });
    } catch {
      // Network error: fall through to a retry.
    }
    if (res?.ok) return true;
    if (res && !retryable(res.status)) return false;
    if (attempt < MAX_ATTEMPTS - 1) await sleep(retryDelay(res, attempt));
  }
  return false;
}
