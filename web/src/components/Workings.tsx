// WP14 CHECK IT: SHOW THE WORKINGS under an AI answer. Loads on demand and
// shows only to its owner: capability, tools in order, sources, verdict,
// grounding and reasoning level. "Model off: rules only." when no model ran.
import { useState } from "preact/hooks";
import { api } from "../api";

interface WorkingsView {
  function: string;
  capability: string;
  model: string | null;
  tools: string[];
  citations: { url: string; source: string }[];
  verdict: string | null;
  grounded: { count: number; of: number } | null;
  reasoningEffort: string | null;
}

const TOOL_LABEL: Record<string, string> = { web_search: "Web search" };

export function Workings({ id }: { id: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [w, setW] = useState<WorkingsView | null>(null);
  const [failed, setFailed] = useState(false);

  if (!id) return <p class="lcd-small workings-off">Model off: rules only.</p>;

  async function toggle() {
    if (!open && !w) {
      const res = await api<WorkingsView>("GET", `/api/workings/${id}`);
      if (res.status === 200) setW(res.data);
      else setFailed(true);
    }
    setOpen(!open);
  }

  return (
    <div class="workings">
      <button class="workings-toggle" type="button" aria-expanded={open} onClick={toggle}>
        {open ? "Hide the workings" : "Show the workings"}
      </button>
      {open && failed && <p class="lcd-small">The workings have expired (kept 7 days).</p>}
      {open && w && (
        <dl class="workings-list">
          <dt>Function</dt><dd>{w.function} · {w.capability}</dd>
          <dt>Tools</dt><dd>{w.tools.length ? w.tools.map((t, i) => `${i + 1}. ${TOOL_LABEL[t] ?? t}`).join("  ") : "None"}</dd>
          {w.citations.length > 0 && (
            <>
              <dt>Sources</dt>
              <dd>{w.citations.map((c) => <a key={c.url} href={c.url} target="_blank" rel="noopener noreferrer">&gt; {c.source} </a>)}</dd>
            </>
          )}
          {w.grounded && <><dt>Grounded</dt><dd>{w.grounded.count} of {w.grounded.of}</dd></>}
          {w.verdict && <><dt>Verdict</dt><dd>{w.verdict}</dd></>}
          <dt>Reasoning</dt><dd>{w.reasoningEffort ?? "default"}{w.model ? ` · ${w.model}` : ""}</dd>
        </dl>
      )}
    </div>
  );
}
