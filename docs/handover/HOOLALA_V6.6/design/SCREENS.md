# Screen and state index · HOOLALA v6.6

The screens are the design canvas source files (.dc.html). The easiest way to see them is the live canvas "Hoolala! v6.6: Landing" in the owner's claude.ai artifacts: press Play on an artboard. `Mobile.dc.html` shows `Main.dc.html` at 390px wide.

| WP | Feature / state | Screen file | How to reach it | Spec section |
|---|---|---|---|---|
| WP66 | Landing on a phone (first) | `Mobile.dc.html` | Open, press Play | Layout |
| WP66 | Landing on desktop | `Main.dc.html` | Open, press Play | Layout |
| WP66 | Headline typing and rotating | `Main.dc.html` | Play; watch the hero for about 30 s | Motion |
| WP66 | Plant growing to 9 leaves and blooming | `Main.dc.html` | Play; the box beside the hero | Motion |
| WP66 | Story squares replaying in turn, progress squares, beat label | `Main.dc.html` | Play; scroll to WHY GO? | Motion |
| WP66 | Reduced motion (everything complete and still) | `Main.dc.html` | Turn on reduced motion in the operating system, then Play | States |

Not drawn (use the existing app):
- Today for signed-in people (unchanged).
- The Story for signed-in people with `introSeen === false` (unchanged).
- `/signin`, `/posters`, `/privacy` (unchanged).
- Auth loading with the local seen flag (shows nothing, as today).
