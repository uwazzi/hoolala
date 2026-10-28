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

export async function logCall(
  env: Env,
  row: { purpose: string; latencyMs: number; validated: boolean; fallback: boolean; promptTokens: number | null; completionTokens: number | null; model?: string },
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO llm_calls (id, purpose, model, latency_ms, tool_calls, validated, fallback_used, prompt_tokens, completion_tokens, created_at)
       VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        row.purpose,
        row.model ?? env.MUSE_SPARK_MODEL ?? "unknown",
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

export interface SearchCall<T> {
  purpose: string;
  instructions: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  validate: (value: unknown) => T | null;
  effort: Effort;
  timeoutMs: number;
  maxTokens: number;
  maxSearches: number;
  location?: { country: string; city?: string; timezone?: string };
}

/** One page the web search returned: what grounding checks citations against. */
export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

/**
 * One Responses API call with web search and a strict JSON answer. Returns the
 * pages the search actually returned, so grounding can check every citation.
 */
export async function searchStructured<T>(
  env: Env,
  call: SearchCall<T>,
): Promise<CallResult<{ value: T; results: SearchResult[]; searches: number }>> {
  if (!llmEnabled(env)) return { ok: false, reason: "off", latencyMs: 0 };
  const started = Date.now();
  let usage: { input_tokens?: number; output_tokens?: number } | undefined;
  let searches = 0;
  let result: CallResult<{ value: T; results: SearchResult[]; searches: number }>;
  try {
    const res = await fetch(`${env.META_API_BASE}/responses`, {
      method: "POST",
      headers: { authorization: `Bearer ${env.META_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: env.MUSE_SPARK_MODEL,
        reasoning: { effort: call.effort },
        max_output_tokens: call.maxTokens,
        max_tool_calls: call.maxSearches,
        include: ["web_search_call.results"],
        tools: [
          {
            type: "web_search",
            search_context_size: "low",
            ...(call.location ? { user_location: { type: "approximate", ...call.location } } : {}),
          },
        ],
        instructions: call.instructions,
        input: call.input,
        text: { format: { type: "json_schema", name: call.schemaName, strict: true, schema: call.schema } },
      }),
      signal: AbortSignal.timeout(call.timeoutMs),
    });
    if (!res.ok) {
      result = { ok: false, reason: "http", latencyMs: Date.now() - started };
    } else {
      const body = (await res.json()) as {
        output?: { type?: string; results?: { url?: string; title?: string; snippet?: string }[]; content?: { type?: string; text?: string }[] }[];
        usage?: typeof usage;
      };
      usage = body.usage;
      const output = body.output ?? [];
      const calls = output.filter((o) => o.type === "web_search_call");
      searches = calls.length;
      const results = calls.flatMap((c) =>
        (c.results ?? []).flatMap((r): SearchResult[] => (typeof r.url === "string" ? [{ url: r.url, title: r.title ?? "", snippet: r.snippet ?? "" }] : [])),
      );
      // The JSON answer is the last message; earlier ones are the model's preamble.
      const texts = output
        .filter((o) => o.type === "message")
        .flatMap((o) => (o.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? ""));
      let value: T | null = null;
      for (const text of texts.reverse()) {
        try {
          value = call.validate(JSON.parse(text));
        } catch {
          value = null;
        }
        if (value !== null) break;
      }
      result =
        value === null
          ? { ok: false, reason: "invalid", latencyMs: Date.now() - started }
          : { ok: true, value: { value, results, searches }, latencyMs: Date.now() - started };
    }
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    result = { ok: false, reason: timedOut ? "timeout" : "http", latencyMs: Date.now() - started };
  }
  try {
    await env.DB.prepare(
      `INSERT INTO llm_calls (id, purpose, model, latency_ms, tool_calls, validated, fallback_used, prompt_tokens, completion_tokens, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), call.purpose, env.MUSE_SPARK_MODEL ?? "unknown", result.latencyMs, searches, result.ok ? 1 : 0, result.ok ? 0 : 1, usage?.input_tokens ?? null, usage?.output_tokens ?? null, new Date().toISOString())
      .run();
  } catch {
    // Accounting must never break the feature.
  }
  return result;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Read-only, scoped by the caller. Returns what the model may see. */
  run: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface AgentCall {
  purpose: string;
  system: string;
  user: string;
  tools: AgentTool[];
  /** The tool that ends the loop; its arguments are the answer, checked by the caller. */
  finalTool: { name: string; description: string; parameters: Record<string, unknown> };
  effort: Effort;
  timeoutMs: number;
  maxRounds: number;
  maxCallsPerRound: number;
}

/**
 * A short tool loop on Chat Completions. The model may call the read-only
 * tools (several at once) and must finish by calling the final tool. Never
 * acts on its own: the final tool's arguments are a draft for a person.
 */
export async function agentLoop(
  env: Env,
  call: AgentCall,
): Promise<CallResult<{ final: Record<string, unknown>; toolOrder: string[] }>> {
  if (!llmEnabled(env)) return { ok: false, reason: "off", latencyMs: 0 };
  const started = Date.now();
  const deadline = started + call.timeoutMs;
  const toolOrder: string[] = [];
  const byName = new Map(call.tools.map((t) => [t.name, t]));
  const toolDefs = [...call.tools, call.finalTool].map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
  type Message = Record<string, unknown>;
  const messages: Message[] = [
    { role: "system", content: call.system },
    { role: "user", content: call.user },
  ];
  const fail = (reason: FailReason): CallResult<never> => ({ ok: false, reason, latencyMs: Date.now() - started });

  for (let round = 0; round < call.maxRounds; round++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return fail("timeout");
    let usage: { prompt_tokens?: number; completion_tokens?: number } | undefined;
    let toolCalls: { id: string; function: { name: string; arguments: string } }[] = [];
    let message: Message | undefined;
    const roundStart = Date.now();
    try {
      const res = await fetch(`${env.META_API_BASE}/chat/completions`, {
        method: "POST",
        headers: { authorization: `Bearer ${env.META_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          model: env.MUSE_SPARK_MODEL,
          reasoning_effort: call.effort,
          max_completion_tokens: 1500,
          messages,
          tools: toolDefs,
          tool_choice: "auto",
          parallel_tool_calls: true,
        }),
        signal: AbortSignal.timeout(remaining),
      });
      if (!res.ok) {
        await logRound(env, call.purpose, Date.now() - roundStart, 0, false, undefined);
        return fail("http");
      }
      const body = (await res.json()) as { choices?: { message?: Message }[]; usage?: typeof usage };
      usage = body.usage;
      message = body.choices?.[0]?.message;
      toolCalls = ((message?.tool_calls as typeof toolCalls | undefined) ?? []).slice(0, call.maxCallsPerRound);
    } catch (err) {
      const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
      await logRound(env, call.purpose, Date.now() - roundStart, 0, false, undefined);
      return fail(timedOut ? "timeout" : "http");
    }

    const final = toolCalls.find((c) => c.function?.name === call.finalTool.name);
    await logRound(env, call.purpose, Date.now() - roundStart, toolCalls.length, Boolean(final), usage);
    if (final) {
      toolOrder.push(call.finalTool.name);
      try {
        const args = JSON.parse(final.function.arguments) as Record<string, unknown>;
        return { ok: true, value: { final: args, toolOrder }, latencyMs: Date.now() - started };
      } catch {
        return fail("invalid");
      }
    }
    if (!toolCalls.length) return fail("invalid");

    // Run the read-only tools the model asked for (together), and hand back the results.
    messages.push({ role: "assistant", content: message?.content ?? null, tool_calls: toolCalls });
    const outputs = await Promise.all(
      toolCalls.map(async (c) => {
        const tool = byName.get(c.function?.name);
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(c.function.arguments || "{}");
        } catch {
          args = {};
        }
        toolOrder.push(c.function?.name ?? "unknown");
        const output = tool ? await tool.run(args).catch(() => ({ error: "failed" })) : { error: "unknown tool" };
        return { role: "tool", tool_call_id: c.id, content: JSON.stringify(output) };
      }),
    );
    messages.push(...outputs);
  }
  return fail("invalid");
}

async function logRound(
  env: Env,
  purpose: string,
  latencyMs: number,
  toolCalls: number,
  done: boolean,
  usage: { prompt_tokens?: number; completion_tokens?: number } | undefined,
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO llm_calls (id, purpose, model, latency_ms, tool_calls, validated, fallback_used, prompt_tokens, completion_tokens, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    )
      .bind(crypto.randomUUID(), purpose, env.MUSE_SPARK_MODEL ?? "unknown", latencyMs, toolCalls, done ? 1 : 0, usage?.prompt_tokens ?? null, usage?.completion_tokens ?? null, new Date().toISOString())
      .run();
  } catch {
    // Accounting must never break the feature.
  }
}
