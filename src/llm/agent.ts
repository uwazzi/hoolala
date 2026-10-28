// PLAN IT: Muse Spark drafts one meeting point for people who accepted each
// other on a signal. It reads through four read-only tools scoped to that one
// signal (several at once), then calls draft_meeting_point. It only drafts:
// a person confirms with a tap, and the draft never claims anything was sent
// or confirmed. Without the model, the poster's own spot and time.

import { checkDraft, claimsAction, type DraftContext, fallbackDraft } from "../rules/plan";
import type { QuickReplyKind, SignalRow } from "../types";
import type { Env } from "../types";
import { agentLoop, type AgentTool } from "./client";

export interface PlanInput {
  signal: Pick<SignalRow, "topic" | "when_at" | "spot" | "capacity" | "expires_at">;
  accepted: number;
  spots: string[];
  hours: string | null;
  replies: { from: "owner" | "responder"; kind: QuickReplyKind; at: string }[];
  now: Date;
}

export interface PlanDraft {
  spot: string;
  time: string;
  why: string | null;
  source: "ai" | "rules";
  toolOrder: string[];
}

const SYSTEM = `You draft one meeting point for two or three people in the same café or coworking space who agreed to talk.
Use the tools to read the signal, the place's spots, any quick replies and the opening hours; you can call several tools at once.
Then call draft_meeting_point exactly once: one of the place's spots, written exactly as given; a time between now and the signal's end, in ISO 8601 UTC; and "why", one short friendly line (at most 80 characters) on why it fits.
You only draft. People confirm it themselves. Never say you sent, confirmed, booked or told anyone anything.`;

function tools(input: PlanInput): AgentTool[] {
  const none = { type: "object", properties: {}, additionalProperties: false };
  return [
    {
      name: "get_signal",
      description: "The signal: topic, chosen time and spot, how many people, how many accepted, when it ends, and the time now.",
      parameters: none,
      run: async () => ({
        topic: input.signal.topic,
        when_at: input.signal.when_at,
        spot: input.signal.spot,
        capacity: input.signal.capacity,
        accepted: input.accepted,
        ends_at: input.signal.expires_at,
        now: input.now.toISOString(),
      }),
    },
    { name: "get_place_spots", description: "The spots in this place where people can meet.", parameters: none, run: async () => ({ spots: input.spots }) },
    {
      name: "get_quick_replies",
      description: "Quick replies the people have sent each other so far (on my way, 5 minutes late, can't make it, at the spot).",
      parameters: none,
      run: async () => ({ replies: input.replies }),
    },
    { name: "get_place_hours", description: "Opening hours of the place, if known.", parameters: none, run: async () => ({ hours: input.hours ?? "unknown" }) },
  ];
}

export async function planMeeting(env: Env, input: PlanInput): Promise<PlanDraft | null> {
  const ctx: DraftContext = { spots: input.spots, now: input.now, expiresAt: input.signal.expires_at };
  const res = await agentLoop(env, {
    purpose: "plan",
    system: SYSTEM,
    user: "Draft the meeting point for this signal.",
    tools: tools(input),
    finalTool: {
      name: "draft_meeting_point",
      description: "Propose one meeting point. A draft only; people confirm it themselves.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          spot: { type: "string", enum: input.spots },
          time: { type: "string", description: "ISO 8601 UTC, between now and the signal's end" },
          why: { type: "string" },
        },
        required: ["spot", "time", "why"],
      },
    },
    effort: "medium",
    timeoutMs: 12_000,
    maxRounds: 3,
    maxCallsPerRound: 4,
  });
  if (res.ok) {
    const checked = checkDraft(res.value.final.spot, res.value.final.time, ctx);
    const why = typeof res.value.final.why === "string" ? res.value.final.why.trim().slice(0, 80) : "";
    if (checked) {
      return { ...checked, why: why && !claimsAction(why) ? why : null, source: "ai", toolOrder: res.value.toolOrder };
    }
  }
  const fallback = fallbackDraft(input.signal, ctx);
  return fallback ? { ...fallback, why: null, source: "rules", toolOrder: [] } : null;
}
