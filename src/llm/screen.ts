// SCREEN IT: a second opinion after the code rules (src/rules/screening.ts)
// have passed, plus FR/EN translation. It approves or rejects with a
// category; it never rewrites anyone's words (the text people typed is the
// only text stored and shown as theirs). 4 s, minimal reasoning. On timeout,
// an invalid answer or with the model off, the code rules' approval stands.

import type { Env } from "../types";
import { structured } from "./client";

export const SCREEN_CATEGORIES = ["ok", "dating", "selling", "contact", "abuse", "crisis", "other"] as const;
export type ScreenCategoryAI = (typeof SCREEN_CATEGORIES)[number];
export const LANGS = ["en", "fr", "de", "it", "other"] as const;

export interface ScreenVerdict {
  verdict: "approve" | "reject";
  category: ScreenCategoryAI;
  lang: (typeof LANGS)[number];
  en: string;
  fr: string;
}

const SYSTEM = `You check short lines people post in Hoolala!, a public app for starting conversations with people in the same café or coworking space.
Approve: friendly, public invitations to talk, ask, share a table or a coffee; light humour; work talk.
Reject with a category:
- dating: flirting, romance, looks, "single", hook-ups, anything that reads like a date.
- selling: ads, promotions, recruiting, money, crypto, MLM.
- contact: phone numbers, emails, links, social handles, ways to move the talk elsewhere.
- abuse: insults, harassment, hate, threats, anything degrading.
- crisis: someone in distress or at risk of harming themselves.
- other: anything else unfit for a public room.
Never rewrite, correct or improve the text. Give its language, and translations into English (en) and French (fr); if it is already in that language, repeat it exactly.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    verdict: { type: "string", enum: ["approve", "reject"] },
    category: { type: "string", enum: [...SCREEN_CATEGORIES] },
    lang: { type: "string", enum: [...LANGS] },
    en: { type: "string" },
    fr: { type: "string" },
  },
  required: ["verdict", "category", "lang", "en", "fr"],
};

/** Our own check of the model's answer; anything off means fall back to the rules. */
export function validateScreen(value: unknown, original: string): ScreenVerdict | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.verdict !== "approve" && v.verdict !== "reject") return null;
  if (!SCREEN_CATEGORIES.includes(v.category as ScreenCategoryAI)) return null;
  if (!LANGS.includes(v.lang as ScreenVerdict["lang"])) return null;
  if (typeof v.en !== "string" || typeof v.fr !== "string") return null;
  // An approval must say "ok"; a rejection must name a reason.
  if ((v.verdict === "approve") !== (v.category === "ok")) return null;
  // Translations are a single short line, never an essay.
  const max = original.length * 3 + 40;
  if (v.en.length > max || v.fr.length > max || /[\n\r]/.test(v.en + v.fr)) return null;
  return { verdict: v.verdict, category: v.category as ScreenCategoryAI, lang: v.lang as ScreenVerdict["lang"], en: v.en.trim(), fr: v.fr.trim() };
}

export async function screenWithModel(env: Env, text: string): Promise<ScreenVerdict | null> {
  const res = await structured(env, {
    purpose: "screen",
    system: SYSTEM,
    user: text,
    schemaName: "screen",
    schema: SCHEMA,
    validate: (v) => validateScreen(v, text),
    effort: "minimal",
    timeoutMs: 4000,
    maxTokens: 400,
  });
  return res.ok ? res.value : null;
}

/** What to store next to the original: the other of English or French, if it differs. */
export function translationFor(v: ScreenVerdict, original: string): string | null {
  const t = v.lang === "en" ? v.fr : v.en;
  return t && t !== original ? t : null;
}
