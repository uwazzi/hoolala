// The one way Hoolala! talks to Muse Spark (Meta Model API). Every call:
// a timeout, a JSON-schema answer checked again by our own validator, a rule-
// based fallback in the caller, and one llm_calls row with token counts only.
// Never prompt text, user text or answers in logs or rows. Never throws:
// a failure is { ok: false } and the caller falls back to its rules.

import type { Env } from "../types";

export type Effort = "minimal" | "low" | "medium" | "high";
export type FailReason = "off" | "timeout" | "http" | "invalid";

export interface StructuredCall<T> {
  purpose: string; // e.g. "screen"; stored in llm_calls
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  validate: (value: unknown) => T | null;
  effort: Effort;
  timeoutMs: number;
  maxTokens: number;
}

export type CallResult<T> =
  | { ok: true; value: T; latencyMs: number }
  | { ok: false; reason: FailReason; latencyMs: number };

export function llmEnabled(env: Env): boolean {
  return env.LLM_ENABLED === "true" && Boolean(env.META_API_KEY) && Boolean(env.META_API_BASE);
}

async function logCall(
  env: Env,
  row: { purpose: string; latencyMs: number; validated: boolean; fallback: boolean; promptTokens: number | null; completionTokens: number | null },
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO llm_calls (id, purpose, model, latency_ms, tool_calls, validated, fallback_used, prompt_tokens, completion_tokens, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        row.purpose,
        env.MUSE_SPARK_MODEL ?? "unknown",
        row.latencyMs,
        row.validated ? 1 : 0,
        row.fallback ? 1 : 0,
        row.promptTokens,
        row.completionTokens,
        new Date().toISOString(),
      )
      .run();
  } catch {
    // Accounting must never break the feature.
  }
}

/** One Chat Completions call with a strict JSON schema. */
export async function structured<T>(env: Env, call: StructuredCall<T>): Promise<CallResult<T>> {
  if (!llmEnabled(env)) return { ok: false, reason: "off", latencyMs: 0 };
  const started = Date.now();
  let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined;
  let result: CallResult<T>;
  try {
    const res = await fetch(`${env.META_API_BASE}/chat/completions`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.META_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.MUSE_SPARK_MODEL,
        reasoning_effort: call.effort,
        max_completion_tokens: call.maxTokens,
        messages: [
          { role: "system", content: call.system },
          { role: "user", content: call.user },
        ],
        response_format: { type: "json_schema", json_schema: { name: call.schemaName, strict: true, schema: call.schema } },
      }),
      signal: AbortSignal.timeout(call.timeoutMs),
    });
    if (!res.ok) {
      result = { ok: false, reason: "http", latencyMs: Date.now() - started };
    } else {
      const body = (await res.json()) as { choices?: { message?: { content?: string | null } }[]; usage?: typeof usage };
      usage = body.usage;
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(body.choices?.[0]?.message?.content ?? "");
      } catch {
        parsed = null;
      }
      const value = call.validate(parsed);
      result = value === null ? { ok: false, reason: "invalid", latencyMs: Date.now() - started } : { ok: true, value, latencyMs: Date.now() - started };
    }
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    result = { ok: false, reason: timedOut ? "timeout" : "http", latencyMs: Date.now() - started };
  }
  await logCall(env, {
    purpose: call.purpose,
    latencyMs: result.latencyMs,
    validated: result.ok,
    fallback: !result.ok,
    promptTokens: usage?.prompt_tokens ?? null,
    completionTokens: usage?.completion_tokens ?? null,
  });
  return result;
}

/** CHECK IT: what a person can see about how an AI answer was made. No personal text. */
export async function writeWorking(
  env: Env,
  w: {
    userId: string;
    fn: "findme" | "place" | "suggest" | "screen" | "plan" | "snap";
    tools?: string[];
    citations?: string[];
    verdict?: string | null;
    grounded?: number | null;
    total?: number | null;
    effort: Effort;
  },
): Promise<string | null> {
  const id = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO workings (id, user_id, function, tools_json, citations_json, verdict, grounded_count, total_count, reasoning_effort, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(id, w.userId, w.fn, JSON.stringify(w.tools ?? []), JSON.stringify(w.citations ?? []), w.verdict ?? null, w.grounded ?? null, w.total ?? null, w.effort, new Date().toISOString())
      .run();
    return id;
  } catch {
    return null;
  }
}
