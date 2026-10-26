# AI and data

AI is the conversational navigation layer, never the source of anyone's posts.

## Architecture

```text
Web LCD UI or Telegram (state, keyboard, accessibility)
   | text, voice note or photo
   v
Conversation controller (intent + finite session state)
   +--> permissioned social backend (notes, circle, signals, invitations, compass)
   +--> Muse Spark, one job per function:
   |      TELL IT   conversation state + structured output -> compass draft
   |      SAY IT    native audio -> transcript + intent
   |      SNAP IT   vision -> event details
   |      FIND IT   web search with citations + ranking -> briefing lines
   |      PLAN IT   parallel tool calls -> one draft invitation
   +--> guardrails in code (compass validator, grounding validator, signal rule, caps)
   +--> confirmation boundary (sending, RSVP, compass changes)
   +--> workings log (CHECK IT) and the QR meet adapter
   v
One short reply / one clear next action / an intentional end
```

The app must work with the model switched off: every function has a rule-based fallback (scripted onboarding, friends-only briefing, typed details, a prefilled form).

## Muse Spark by function

| Function | Capability | Guardrail in code | Fallback |
|---|---|---|---|
| TELL IT | Multi-turn conversation, structured output | Every compass item traces to the person's words; no personality, health or screen-time labels; nothing saved before LOOKS RIGHT | Scripted stages |
| SAY IT | Native audio understanding | Audio in memory only; transcript shown first; crisis words checked on it | Type it |
| SNAP IT | Vision | Image in memory only; no people or faces described; low confidence asks for a check | Type the details |
| FIND IT | Web search with citations, ranking | Every line maps to a real friend item or a source returned in that call, plus a compass item; cap; friends first; mood signals never used | Friends' items, newest first |
| PLAN IT | Parallel tool calling | Draft only; confirmation token from a tap; only signals shared with this person | Prefilled invitation form |
| CHECK IT | Verifiable workings | Logs tool names, sources and grounded counts, never personal text | "Model off: rules only." |

## Tool contracts (server-side, authorised, audited)

| Tool | Rule |
|---|---|
| `list_my_updates({limit: 1-3, after?})` | Only after an explicit catch-up request. No load-more. |
| `get_open_invitations({limit: 1-3})` | Chronological, never by popularity. |
| `draft_note({text, audience_ids})` | Draft only. The UI shows recipients. |
| `publish_note({draft_id, confirmation_token})` | Only after a separate user gesture. Returns receipt or error. |
| `rsvp_invitation({invitation_id, response, confirmation_token})` | Confirmation required. |
| `start_focus_session({declared_minutes?})`, `complete_focus_session({session_id})` | Records a declared break, not OS screen time. |
| `begin_mutual_tap({peer_ephemeral_token})`, `confirm_mutual_tap({exchange_id})` | Opt-in on both sides, short TTL, no location. |
| `get_my_private_keepsakes({limit: 3})` | The person's own records only. |
| `get_my_compass()` | The requesting person's compass only. |
| `propose_compass_change({text})` | Returns BEFORE / AFTER; saves nothing. |
| `confirm_compass_change({proposal_id, confirmation_token})`, `undo_compass_change({change_id})` | Only after a separate user gesture; every change undoable. |
| `get_shared_availability()` | Availability signals shared with the requester; never mood. |
| `find_nearby({query, area?})` | Muse Spark web search, at most 2 per briefing; returns sources. |
| `draft_invitation({activity, when, where, to_ids, line})` | Draft only, labelled AI / DRAFT. |

The model never queries raw social data itself and never claims it sent anything by composing a reply. The backend authorises, executes, logs and reports success or failure.

## Grounding

- Summaries cite note ids internally so faithfulness can be checked.
- Friend names come only from permitted backend results.
- No data: NO NEWS RIGHT NOW. Never invent news.
- Asked to invent friend activity: decline and offer to draft a note instead.
- Summaries are visibly labelled (e.g. a `SUMMARY` kicker) and the original note is one tap away.

## Compass record

| Field | Notes |
|---|---|
| `id`, `owner_id` | Owner only |
| `part` | `intention`, `interest`, `filter`, `delivery`, `action` |
| `text` | The person's own words (or a choice they picked) |
| `why` | Only if the person chose to say |
| `origin` | `onboarding`, `edit`, `feedback` |
| `active`, `created_at` | |

Changes live in a separate log (`before`, `after`, the person's words, `confirmed_at`, `undone_at`). Nothing is inferred from time spent, opens or scrolling.

## Workings record (SHOW THE WORKINGS)

`id, owner_id, function (tell, say, snap, find, plan), tools (names only), sources (URLs), grounded_count, total_count, reasoning_effort, created_at`, purged after 7 days. Never prompts, transcripts, photos or friends' text.

## Signal record

| Field | Notes |
|---|---|
| `id`, `owner_id` | Owner only can edit or cancel |
| `type`, `custom_text` | One of the preset types, or up to 40 characters |
| `kind` | `availability` or `mood`; mood signals are never used for suggestions |
| `audience` | `circle`, `chosen` (list of friend ids) or `private` |
| `created_at`, `expires_at` | Default expiry 4 hours |
| `state` | `active` or `cancelled` |

Server rule: a viewer sees a signal only if it is active, unexpired, not private, and the viewer is in its audience. Tools: `set_signal`, `cancel_signal`, `get_friend_signals({limit: 3})` (only for the requesting user), `get_social_opportunities()` (availability signals plus the user's own moment history; never mood, location or behaviour).

## Observation record

| Field | Notes |
|---|---|
| `id`, `owner_id` | Ownership is always stored, also for anonymous public ones |
| `say`, `happens` | The two human-written lines, 80 characters each |
| `source.happens` | `human`, `ai-accepted` or `ai-edited` |
| `ai_suggestion` | The suggestion text, kept separate from the human text |
| `visibility` | `private`, `circle` or `public` |
| `audience` | Circle or one friend, for `circle` |
| `moderation` | `not-applicable`, `pending`, `approved`, `rejected` |
| `pii_consent` | Explicit consent when identifying details were flagged |
| `created_at`, `updated_at` | Timestamps |

Extra tools: `draft_observation_suggestion({text, mode: shorter|funnier})` (suggestion only), `save_observation`, `share_observation({id, audience, confirmation_token})`, `submit_observation_for_review({id, confirmation_token})`, `get_discovery_observations({limit: 1-3})` (approved public only), `delete_observation({id})`.

## Privacy

- Notes are private by recipient ACL. No sharing to new audiences without the author.
- No access to contacts, calendar, precise location or usage analytics without a specific permission and a clear purpose.
- Quiet hours, no bulk notifications, data deletion and circle revocation are first-class settings.
- Photos (SNAP IT) and voice notes (SAY IT) are processed in memory and never written to storage or logs.
- LinkedIn and Instagram are "links you share only": their platform rules don't allow reading feeds or building digests.
- Telegram: only the chat id needed to reply is stored; unlinking deletes it.
- Demo and prototype data is fictional and labelled SAMPLE ("Sample Sophie" for judges).
