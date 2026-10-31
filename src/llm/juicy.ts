// WP39 juicy-bits extraction: one structured call over the two free-text
// answers. Code validates (short plain topics, allow-list roles, a short
// nearly-said line, nothing off the table, never a name or a label); SCREEN
// IT checks topics and line; two bad drafts fall back to code.

import { fallbackJuicy, JUICY_ROLES, OFFTABLE_CHIPS, validateJuicy, type JuicyBits } from "../rules/juicy";
import type { Env } from "../types";
import { llmEnabled, structured, writeWorking } from "./client";
import { screenWithModel } from "./screen";

const SYSTEM = `You keep the juicy bits of two spoken answers: only what helps write small-talk and kindness tries.
topics: at most 3, each 1 to 3 plain lowercase words, subjects from the story (never filler like um, like, basically, honestly, really, just).
people: roles mentioned, each { role (exactly one of: ${JUICY_ROLES.join(", ")}), tier: "said" }. Strangers are nobody: no entry. Never a name.
nearly_said: what they nearly said, { line (at most 60 characters, in their voice), to_role (a role from the list, or null) }, or null when nothing was nearly said.
Never off-table themes, never what the person is (no personality, health, politics, religion or sexuality labels), never a name.
Answer with the JSON schema only.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    topics: { type: "array", items: { type: "string" } },
    people: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { role: { type: "string" }, tier: { type: "string" } },
        required: ["role", "tier"],
      },
    },
    nearly_said: {
      type: ["object", "null"],
      additionalProperties: false,
      properties: { line: { type: "string" }, to_role: { type: ["string", "null"] } },
      required: ["line", "to_role"],
    },
  },
  required: ["topics", "people", "nearly_said"],
};

export interface JuicyInput {
  q1f: string | null;
  q4: string | null;
  chips: { q1: string | null; q2: string[]; q2f: string[]; q3: string | null };
  q5: string[];
}

function offTable(q5: string[]): string[] {
  return q5.filter((c): c is (typeof OFFTABLE_CHIPS)[number] => (OFFTABLE_CHIPS as readonly string[]).includes(c));
}

export async function extractJuicy(env: Env, userId: string, input: JuicyInput): Promise<{ bits: JuicyBits; fallback: boolean }> {
  const offtable = offTable(input.q5);
  const fallback = () => fallbackJuicy(input.q1f, input.q4, offtable);
  if (!llmEnabled(env)) return { bits: fallback(), fallback: true };
  const user = [
    `Story: ${input.q1f ?? "none"}.`,
    `Nearly said: ${input.q4 ?? "none"}.`,
    `Chips: ${input.chips.q1 ?? "none"} / said hi: ${input.chips.q2.join(", ") || "nobody"} / nodded: ${input.chips.q2f.join(", ") || "nobody"} / battery: ${input.chips.q3 ?? "none"}.`,
    offtable.length > 0 ? `Off the table (never these): ${offtable.join(", ")}.` : "Off the table: none.",
  ].join("\n");
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await structured<JuicyBits>(env, {
      purpose: "juicy",
      system: SYSTEM,
      user,
      schemaName: "juicy_bits",
      schema: SCHEMA,
      validate: (value: unknown) => validateJuicy(value, { offtable }),
      effort: "low",
      timeoutMs: 8000,
      maxTokens: 400,
    });
    if (!res.ok) continue;
    const screenable = [...res.value.topics, res.value.nearlySaid?.line ?? ""].filter(Boolean).join(". ");
    const screen = screenable ? await screenWithModel(env, screenable) : null;
    if (screen?.verdict === "reject") continue;
    // 'juicy' is missing from the shared writeWorking type in src/llm/client.ts
    // (owned by another track); migration 0020 adds it to the DB check.
    await writeWorking(env, { userId, fn: "juicy" as "compassdraft", tools: [], verdict: "approved", effort: "low" });
    return { bits: res.value, fallback: false };
  }
  await writeWorking(env, { userId, fn: "juicy" as "compassdraft", tools: [], verdict: "rejected: invalid", effort: "low" });
  return { bits: fallback(), fallback: true };
}
