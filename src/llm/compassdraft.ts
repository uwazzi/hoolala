// WP36 COMPASS DRAFT: one structured call per spoken answer. Code validates
// (the question's part, a short line about what happened, allow-list roles);
// two bad drafts fall back to the trimmed answer with keyword roles.

import { fallbackDraft, validateDraft, type CompassDraft } from "../rules/compass";
import type { CompassPart, Env } from "../types";
import { llmEnabled, structured, writeWorking } from "./client";

const SYSTEM = `You read one spoken answer to a getting-to-know-you question and draft a compass line from it.
The line: at most 60 characters, about what happened, in plain words. Never a personality type or label, never what the person is, never health, politics, religion or sexuality. Never a name.
part: exactly the direction given. topic: the subject in one or two plain words, or null. place_kind: where it happened in one or two plain words, or null. pace: gentle, social or bold. people: at most 3, each a role from: barista, boss, brother, child, colleague, dad, friend, mum, neighbour, regular, sister, teammate. Strangers are nobody: no entry.
Answer with the JSON schema only.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    part: { type: "string" },
    line: { type: "string" },
    topic: { type: ["string", "null"] },
    place_kind: { type: ["string", "null"] },
    pace: { type: "string" },
    people: { type: "array", items: { type: "object", additionalProperties: false, properties: { role: { type: "string" } }, required: ["role"] } },
  },
  required: ["part", "line", "topic", "place_kind", "pace", "people"],
};

export async function draftAnswer(
  env: Env,
  userId: string,
  question: { id: string; part: CompassPart; text: string },
  answer: string,
): Promise<{ draft: CompassDraft; fallback: boolean }> {
  if (!llmEnabled(env)) return { draft: fallbackDraft(question.part, answer), fallback: true };
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await structured<CompassDraft>(env, {
      purpose: "compass_draft",
      system: SYSTEM,
      user: `Question ${question.id} (${question.part}): ${question.text}\nAnswer: ${answer}`,
      schemaName: "compass_draft",
      schema: SCHEMA,
      validate: (value: unknown) => validateDraft(question.part, value),
      effort: "low",
      timeoutMs: 8000,
      maxTokens: 400,
    });
    if (res.ok) {
      await writeWorking(env, { userId, fn: "compassdraft", tools: [], verdict: "approved", effort: "low" });
      return { draft: res.value, fallback: false };
    }
  }
  await writeWorking(env, { userId, fn: "compassdraft", tools: [], verdict: "rejected: invalid", effort: "low" });
  return { draft: fallbackDraft(question.part, answer), fallback: true };
}
