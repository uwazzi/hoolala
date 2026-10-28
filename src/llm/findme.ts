// FIND ME: with the person's consent, Muse Spark searches the web for them
// only (the name, town and links they give; at most 3 searches) and returns
// short findings, each with the page it came from. Nothing is stored: the
// findings go back to the person for IS THIS YOU?, and only the compass lines
// they confirm are saved. Then a draft compass from what they ticked.

import { type Answers, type CompassLine, cleanCompass, compassFromAnswers, hasAnswers, hasBannedLabel, MAX_FINDINGS } from "../rules/compass";
import { resolveCitation } from "../rules/grounding";
import type { Env } from "../types";
import { searchStructured, structured } from "./client";

export interface Finding {
  text: string;
  url: string;
}

export const FIND_INSTRUCTIONS = `You help one person describe what they like talking about, using only what is public about them.
Search only for this person, using the name, town and links given; at most 3 searches. Never search for anyone else.
Return up to 6 short findings (one sentence each) about their public interests, work, projects, hobbies or activities, each with the full URL of the page it came from (starting with https://), copied exactly from the search results.
Never include health, politics, religion, sexuality, family, age, home address, contact details or anything private. No opinions about the person, no personality traits.
Namesakes are normal: if results seem to be about different people with the same name, include them anyway as separate findings; the person will tick which ones are really them.`;

export const FIND_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    findings: {
      type: "array",
      items: { type: "object", additionalProperties: false, properties: { text: { type: "string" }, url: { type: "string" } }, required: ["text", "url"] },
    },
  },
  required: ["findings"],
};

export function validateFindings(value: unknown): Finding[] | null {
  const list = (value as { findings?: unknown })?.findings;
  if (!Array.isArray(list)) return null;
  return list.flatMap((f): Finding[] =>
    f && typeof f === "object" && typeof (f as Finding).text === "string" && typeof (f as Finding).url === "string" ? [f as Finding] : [],
  );
}

/** Findings with a source the search returned (or one of their links). Null when the model is off or failed. */
export async function findMe(
  env: Env,
  who: { name: string; town: string | null; links: string[] },
): Promise<{ findings: Finding[]; searches: number; total: number; droppedNoSource: number; droppedLabel: number } | null> {
  const res = await searchStructured(env, {
    purpose: "findme",
    instructions: FIND_INSTRUCTIONS,
    input: `Name used online: ${who.name}. Town: ${who.town ?? "not given"}. Links: ${who.links.length ? who.links.join(", ") : "none"}.`,
    schemaName: "findings",
    schema: FIND_SCHEMA,
    validate: validateFindings,
    effort: "low",
    timeoutMs: 15_000,
    maxTokens: 3000,
    maxSearches: 3,
  });
  if (!res.ok) return null;
  const seen = new Set<string>();
  const findings: Finding[] = [];
  let droppedNoSource = 0;
  let droppedLabel = 0;
  for (const f of res.value.value) {
    const text = f.text.trim().replace(/\s+/g, " ").slice(0, 160);
    if (!text || seen.has(text.toLowerCase())) continue;
    if (hasBannedLabel(text)) {
      droppedLabel++;
      continue;
    }
    const url = resolveCitation(f.url, text, res.value.results, who.links, { sameSiteFallback: true });
    if (!url) {
      droppedNoSource++;
      continue;
    }
    seen.add(text.toLowerCase());
    findings.push({ text, url });
    if (findings.length === MAX_FINDINGS) break;
  }
  return { findings, searches: res.value.searches, total: res.value.value.length, droppedNoSource, droppedLabel };
}

const DRAFT_SYSTEM = `You turn what a person ticked as really them (findings with their source URL) and their own answers into a short Personal Compass: what they like talking about.
Parts: "interest" (things they're into), "talk_about" (things they'd happily chat about), "more_of" (what they'd like more of), "filter" (what they'd rather not talk about).
Up to 8 lines, each at most 80 characters, in their own plain words. Every line comes from a finding (give its exact source_url) or from their answers (source_url null).
Never a personality type, score, judgement, or a health, political, religious or sexuality label. Don't invent anything that isn't in the findings or answers.`;

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    compass: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          part: { type: "string", enum: ["interest", "talk_about", "more_of", "filter"] },
          text: { type: "string" },
          source_url: { type: ["string", "null"] },
        },
        required: ["part", "text", "source_url"],
      },
    },
  },
  required: ["compass"],
};

/**
 * A draft from the ticked findings and answers, cleaned by the compass rules.
 * Without the model: each ticked finding becomes an interest line with its
 * source, plus the answers as "you said".
 */
export async function draftCompass(env: Env, kept: Finding[], answers: Answers): Promise<{ lines: CompassLine[]; source: "ai" | "rules" }> {
  const answered = hasAnswers(answers);
  const ticked = kept.map((k) => k.url);
  if (kept.length) {
    const res = await structured(env, {
      purpose: "findme_draft",
      system: DRAFT_SYSTEM,
      user: JSON.stringify({ findings: kept, answers: answered ? answers : null }),
      schemaName: "compass",
      schema: DRAFT_SCHEMA,
      validate: (v) => (Array.isArray((v as { compass?: unknown })?.compass) ? ((v as { compass: unknown[] }).compass as { part: unknown; text: unknown; source_url: unknown }[]) : null),
      effort: "low",
      timeoutMs: 8000,
      maxTokens: 1500,
    });
    if (res.ok) {
      const lines = cleanCompass(res.value, ticked, answered);
      if (lines.length) return { lines, source: "ai" };
    }
  }
  const fromFindings = cleanCompass(
    kept.map((k) => ({ part: "interest", text: k.text.length > 80 ? `${k.text.slice(0, 77)}...` : k.text, source_url: k.url })),
    ticked,
    false,
  );
  return { lines: [...fromFindings, ...compassFromAnswers(answers)].slice(0, 8), source: "rules" };
}
