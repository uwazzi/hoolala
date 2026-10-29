// WP26 SURPRISE ME: Muse Spark keeps a short conversation going (one follow-up
// question at a time, at most 5 turns), then drafts a compass from the
// person's own words, one playful observation and two topic ideas. Every line
// must echo what they said; questions, observation and ideas pass the code
// rules. Without the model: the scripted questions, and answers as lines.

import type { CompassLine } from "../rules/compass";
import {
  cleanIdeas,
  cleanObservation,
  cleanQuestion,
  cleanSurpriseCompass,
  compassFromTurns,
  isFinished,
  MIN_TURNS,
  scriptedQuestion,
  type Turn,
} from "../rules/surprise";
import type { Env } from "../types";
import { structured } from "./client";

const ASK_SYSTEM = `You are Hoolala!, a friendly voice helping one person say what they like talking about, so people at the same café can start a good conversation.
Read the conversation and ask ONE short follow-up question (at most 120 characters, ending with "?"), spoken out loud, warm and curious, in the language they answered in.
Aim to learn, over 5 questions in all: their passions, what they're making or working on, what inspires them, what they'd like more of, and anything they'd rather not talk about. Build on what they just said.
In English, use UK English. Never use em dashes. Never ask about health, politics, religion, sexuality, family, age, where they live, contact details or relationships. Never give advice or judge them. Set done to true only if they asked to stop.`;

const ASK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { question: { type: "string" }, done: { type: "boolean" } },
  required: ["question", "done"],
};

/** The next question, or null when the conversation is over. Model first, script as the fallback. */
export async function nextQuestion(env: Env, turns: Turn[]): Promise<{ question: string | null; source: "ai" | "rules" }> {
  if (isFinished(turns)) return { question: null, source: "rules" };
  if (turns.length > 0) {
    const res = await structured(env, {
      purpose: "surprise_ask",
      system: ASK_SYSTEM,
      user: JSON.stringify({ turns, questions_left: 5 - turns.length }),
      schemaName: "next_question",
      schema: ASK_SCHEMA,
      validate: (v) => {
        const { question, done } = (v ?? {}) as { question?: unknown; done?: unknown };
        if (done === true && turns.length >= MIN_TURNS) return { question: null };
        const q = cleanQuestion(question);
        return q ? { question: q } : null;
      },
      effort: "minimal",
      timeoutMs: 6000,
      maxTokens: 300,
    });
    if (res.ok) return { question: res.value.question, source: "ai" };
  }
  return { question: scriptedQuestion(turns), source: "rules" };
}

const DRAFT_SYSTEM = `You turn a short conversation into a person's Personal Compass: what they like talking about. Use only their own answers.
Parts: "interest" (passions), "talk_about" (projects, things they're making or working on), "more_of" (inspiration, what they'd like more of), "filter" (what they'd rather not talk about).
Up to 8 lines, each at most 60 characters, using their own words. Never invent anything they didn't say.
Then one playful, kind observation (at most 140 characters) about the mix of things they said, not about who they are: no personality types, no judgement, no advice.
Then two short topic ideas (at most 50 characters each) they could post at a café to start a conversation, from what they said.
Never a health, political, religious or sexuality label. In English, use UK English. Never use em dashes.`;

const DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    compass: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { part: { type: "string", enum: ["interest", "talk_about", "more_of", "filter"] }, text: { type: "string" } },
        required: ["part", "text"],
      },
    },
    observation: { type: "string" },
    ideas: { type: "array", items: { type: "string" } },
  },
  required: ["compass", "observation", "ideas"],
};

export interface Surprise {
  lines: CompassLine[];
  observation: string | null;
  ideas: string[];
  source: "ai" | "rules";
}

export async function surpriseDraft(env: Env, turns: Turn[]): Promise<Surprise> {
  const res = await structured(env, {
    purpose: "surprise_draft",
    system: DRAFT_SYSTEM,
    user: JSON.stringify({ turns }),
    schemaName: "surprise",
    schema: DRAFT_SCHEMA,
    validate: (v) => {
      const { compass, observation, ideas } = (v ?? {}) as { compass?: unknown; observation?: unknown; ideas?: unknown };
      if (!Array.isArray(compass)) return null;
      const lines = cleanSurpriseCompass(compass as { part: unknown; text: unknown }[], turns);
      return lines.length ? { lines, observation: cleanObservation(observation), ideas: cleanIdeas(ideas) } : null;
    },
    effort: "low",
    timeoutMs: 10_000,
    maxTokens: 1500,
  });
  if (res.ok) return { ...res.value, source: "ai" };
  return { lines: compassFromTurns(turns), observation: null, ideas: [], source: "rules" };
}
