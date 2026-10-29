// Hoolala! type contract (WP1). Change only with a note in docs/DECISIONS.md.
// Conventions: ids are TEXT; timestamps are ISO 8601 UTC strings; booleans are
// 0/1 integers in D1. Runtime bindings are declared as minimal structural
// interfaces so `npm run typecheck` needs no Cloudflare type package.

export type IsoDateTime = string;

// --- Runtime bindings (minimal) -------------------------------------------

export interface D1Result<T = Record<string, unknown>> {
  results: T[];
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<unknown>;
  /** Runs the statements in one transaction (WP2: delete account). */
  batch(statements: D1PreparedStatement[]): Promise<unknown[]>;
}

export interface KVNamespace {
  get(key: string, options?: { type: "text" }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  ASSETS: Fetcher;
  LLM_ENABLED?: string;
  PLACES_PROVIDER?: string;
  MUSE_SPARK_MODEL?: string;
  META_API_BASE?: string;
  META_API_KEY?: string;
  GOOGLE_MAPS_KEY?: string;
  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_USERNAME?: string;
}

// --- D1 rows (one per table in docs/BUILD-PLAN.md) --------------------------

export interface UserRow {
  id: string;
  email: string | null;
  telegram_user_id: string | null;
  first_name: string | null;
  is_adult: number;
  created_at: IsoDateTime;
  deleted_at: IsoDateTime | null;
  is_sample?: number; // migration 0005
  current_step: number; // migration 0006: tiny-try ladder, 1 to 5
}

export interface TryRow {
  id: string;
  user_id: string;
  step: number;
  source: string;
  library_id: string | null;
  place_kind: string;
  outcome: string;
  created_at: IsoDateTime;
}

export interface CrewRow {
  id: string;
  name: string;
  shared_library_id: string;
  created_by: string;
  created_at: IsoDateTime;
}

export interface CrewMemberRow {
  crew_id: string;
  user_id: string;
  joined_at: IsoDateTime;
}

export interface CrewInviteRow {
  token_hash: string;
  crew_id: string;
  created_by: string;
  created_at: IsoDateTime;
  expires_at: IsoDateTime;
}

export interface CrewPostRow {
  id: string;
  crew_id: string;
  user_id: string;
  outcome: string;
  text: string;
  screening_verdict: string;
  created_at: IsoDateTime;
}

export interface CrewNiceRow {
  post_id: string;
  user_id: string;
  created_at: IsoDateTime;
}

export interface SessionRow {
  id: string;
  user_id: string;
  expires_at: IsoDateTime;
}

export interface LoginTokenRow {
  token_hash: string;
  email: string;
  expires_at: IsoDateTime;
  used_at: IsoDateTime | null;
}

export type CompassPart = "interest" | "talk_about" | "more_of" | "filter";
export type CompassOrigin = "find_me" | "questions" | "edit";

export interface CompassItemRow {
  id: string;
  user_id: string;
  part: CompassPart;
  text: string;
  source_url: string | null; // null means "you said"
  origin: CompassOrigin;
  active: number;
  created_at: IsoDateTime;
}

export interface CompassChangeRow {
  id: string;
  user_id: string;
  before: string;
  after: string;
  words: string;
  confirmed_at: IsoDateTime;
  undone_at: IsoDateTime | null;
}

export type PlaceKind = "cafe" | "bar" | "coworking" | "library" | "other";
export type PlaceStatus = "new" | "active" | "hidden";

export interface PlaceRow {
  id: string;
  slug: string;
  name: string;
  kind: PlaceKind;
  city: string | null; // display name, e.g. "Échallens"
  city_key: string | null; // search key, e.g. "echallens" (migration 0004)
  lat: number | null;
  lng: number | null;
  radius_m: number;
  google_place_id: string | null;
  osm_id: string | null; // e.g. "node/123" (migration 0003)
  spots_json: string | null;
  code: string | null;
  poster_key_hash: string | null;
  added_by: string | null;
  status: PlaceStatus;
  first_other_checkin_at: IsoDateTime | null;
  created_at: IsoDateTime;
  is_sample: number; // migration 0005
}

export type FactField =
  | "hours"
  | "menu_item"
  | "price"
  | "spot"
  | "wifi"
  | "sockets"
  | "quiet"
  | "rule";
export type FactSource = "people" | "google" | "web" | "snap";
export type FactState = "found" | "confirmed" | "disputed";

export interface PlaceFactRow {
  id: string;
  place_id: string;
  field: FactField;
  value: string;
  source: FactSource;
  source_url: string | null;
  state: FactState;
  added_by: string | null;
  confirmations: number;
  updated_at: IsoDateTime;
}

export type ContributionAction = "add_place" | "add_fact" | "fix_fact" | "confirm_fact";
export type ContributionState = "pending" | "counted" | "rejected";

export interface PlaceContributionRow {
  id: string;
  user_id: string;
  place_id: string;
  fact_id: string | null;
  action: ContributionAction;
  points: number;
  state: ContributionState;
  month: string; // YYYY-MM, for the one-confirm-per-fact-per-month rule
  created_at: IsoDateTime;
  counted_at: IsoDateTime | null;
}

export type CheckinMethod = "location" | "add" | "search" | "qr" | "code";

export interface CheckinRow {
  id: string;
  user_id: string;
  place_id: string;
  method: CheckinMethod;
  started_at: IsoDateTime;
  ends_at: IsoDateTime;
  left_at: IsoDateTime | null;
}

// No user id, no coordinates, ever.
export type CheckinAttemptReason =
  | "no_places_nearby"
  | "permission_denied"
  | "out_of_city"
  | "bad_key"
  | "wrong_code"
  | "expired";

export interface CheckinAttemptRow {
  id: string;
  place_id: string | null;
  method: CheckinMethod;
  ok: number;
  reason: CheckinAttemptReason | null;
  created_at: IsoDateTime;
}

export type SignalAudience = "place" | "circle" | "private";
export type SignalState = "open" | "full" | "cancelled" | "expired";

export interface SignalRow {
  id: string;
  owner_id: string;
  audience: SignalAudience;
  place_id: string | null;
  topic: string;
  when_at: IsoDateTime | null;
  spot: string | null;
  capacity: number;
  lang: string | null;
  translation: string | null;
  screening_verdict: string | null;
  screening_category: string | null;
  created_at: IsoDateTime;
  expires_at: IsoDateTime;
  state: SignalState;
}

export type SignalResponseState = "requested" | "accepted" | "declined" | "withdrawn";

export interface SignalResponseRow {
  id: string;
  signal_id: string;
  responder_id: string;
  line: string | null;
  state: SignalResponseState;
  created_at: IsoDateTime;
  decided_at: IsoDateTime | null;
}

export type QuickReplyKind = "on_my_way" | "five_late" | "cant_make_it" | "at_spot";

export interface QuickReplyRow {
  id: string;
  signal_id: string;
  user_id: string;
  kind: QuickReplyKind;
  created_at: IsoDateTime;
}

export interface MeetingPointRow {
  signal_id: string;
  spot: string | null;
  time: IsoDateTime | null;
  proposed_by: "person" | "agent";
  confirmed_at: IsoDateTime | null;
}

export interface BlockRow {
  blocker_id: string;
  blocked_id: string;
  created_at: IsoDateTime;
}

export interface ReportRow {
  id: string;
  reporter_id: string;
  target_user_id: string | null;
  signal_id: string | null;
  reason: string;
  created_at: IsoDateTime;
  status: string;
}

export interface MeetExchangeRow {
  id: string;
  initiator_id: string;
  token_hash: string;
  expires_at: IsoDateTime;
  joiner_id: string | null;
  initiator_agreed_at: IsoDateTime | null;
  joiner_agreed_at: IsoDateTime | null;
  signal_id: string | null;
}

export type InteractionKind = "here" | "meet" | "invitation";

export interface InteractionRow {
  id: string;
  kind: InteractionKind;
  user_a: string;
  user_b: string;
  place_id: string | null;
  signal_id: string | null;
  day: string; // YYYY-MM-DD
  confirmed_at: IsoDateTime;
}

export interface StayInTouchRow {
  user_id: string;
  other_id: string;
  signal_id: string;
  chosen_at: IsoDateTime;
}

export interface FriendshipRow {
  user_a: string;
  user_b: string;
  created_at: IsoDateTime;
  status: string;
}

export interface MomentRow {
  id: string;
  user_id: string;
  interaction_id: string;
  label: string;
}

export type WorkingsFunction = "findme" | "place" | "suggest" | "screen" | "plan" | "snap" | "try_it";

export interface WorkingRow {
  id: string;
  user_id: string;
  function: WorkingsFunction;
  tools_json: string;
  citations_json: string;
  verdict: string | null;
  grounded_count: number | null;
  total_count: number | null;
  reasoning_effort: string | null;
  created_at: IsoDateTime;
}

// No prompt or user text, ever.
export interface LlmCallRow {
  id: string;
  purpose: string;
  model: string;
  latency_ms: number | null;
  tool_calls: number | null;
  validated: number | null;
  fallback_used: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  created_at: IsoDateTime;
}

export interface MetricsDailyRow {
  place_id: string;
  day: string; // YYYY-MM-DD
  checkin_attempts: number;
  checkin_ok_first_try: number;
  places_added: number;
  facts_found: number;
  facts_confirmed: number;
  facts_fixed: number;
  signals: number;
  signals_with_response: number;
  responses: number;
  accepted: number;
  confirmed_meets: number;
  stay_in_touch: number;
}

// --- API shapes ---------------------------------------------------------------

export interface HealthResponse {
  ok: true;
  time: IsoDateTime;
}

export interface ApiError {
  error: string;
}

/** A place as the web app sees it. Never coordinates. */
export interface PlaceSummary {
  id: string;
  slug: string;
  name: string;
  kind: PlaceKind;
}

/** One row of POST /api/places/nearby: a Hoolala! place, or a map place to pick. */
export interface NearbyPlace {
  ref: { id: string } | { provider: "osm" | "google"; externalId: string };
  name: string;
  kind: PlaceKind;
  band: "here" | "next_door";
  source: "hoolala" | "osm" | "google";
}

/** GET /api/checkin and every successful check-in. */
export interface CheckinView {
  place: PlaceSummary;
  method: CheckinMethod;
  endsAt: IsoDateTime;
}

/** GET /api/me: only what the person needs about themselves. */
export interface MeResponse {
  id: string;
  firstName: string | null;
  isAdult: boolean;
}
