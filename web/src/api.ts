// The one way the web app talks to the Worker: JSON, same-origin cookie.
// Types come from the server contract, type-only.
import { pushLog } from "./log";

export type { MeResponse } from "../../src/types";

export interface ApiResult<T> {
  status: number;
  data: T & { error?: string };
}

export async function api<T = Record<string, unknown>>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    pushLog(`${method} ${path} -> network-error`);
    throw err;
  }
  pushLog(`${method} ${path} -> ${res.status}`);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data: data as ApiResult<T>["data"] };
}
