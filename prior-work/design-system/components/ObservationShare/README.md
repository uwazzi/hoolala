# ObservationShare

Audience choice and consent for an observation. Private is the default; every step outward needs an explicit choice.

> **ROADMAP.** Designed, not in the hackathon build (26 Oct 2026).

| Choice | What happens | Stored as |
|---|---|---|
| Keep it for myself | Saved to My observations only | `visibility: private` |
| Share with my circle | Pick close circle or one friend, confirm, arrives in their mailbox from you | `visibility: circle`, `audience` |
| Contribute anonymously | Explained, checked for identifying details, submitted to human review | `visibility: public`, `moderation: pending` |

## Anonymous contributions

- Copy states plainly: your name is never shown; a person reviews it first; anonymous means anonymous to readers, not untraceable.
- Before submitting, check both lines for names (circle and capitalised names), places, emails, phone numbers, handles, links and street addresses. If anything is found, show THIS MIGHT IDENTIFY SOMEONE: [items], suggest "a friend", and require an explicit consent checkbox or an edit.
- Friends' private or circle observations never enter public discovery without the author's permission.
- My observations lists every item with its status (Private, Shared / audience, Public / in review or approved), COPY and DELETE (with an inline confirm; deleting a public one withdraws it).
