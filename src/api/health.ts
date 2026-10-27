import type { Env, HealthResponse } from "../types";

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function handleHealth(_request: Request, _env: Env): Promise<Response> {
  const body: HealthResponse = { ok: true, time: new Date().toISOString() };
  return json(body);
}
