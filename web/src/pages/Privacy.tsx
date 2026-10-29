// WP9: privacy in plain English. Every line here describes what the code
// does today; change both together.
import { Screen } from "../components/Screen";

export function Privacy() {
  return (
    <Screen title="Privacy">
      <h1 class="screen-title">Privacy</h1>
      <div class="prose">
        <p class="lcd-block">
          The short version: we keep as little as we can, for as short a time as we can. Nobody here sees your name until you've both said yes.
          Your location is used once and forgotten.
        </p>

        <h2>Who it's for</h2>
        <p>People aged 18 and over, in public places. Hoolala! is for getting outside and meeting people: one tiny thing to try in real life each day, and small invitations to talk when you share a place. It's not a dating app.</p>

        <h2>Your account</h2>
        <p>
          We keep your email address (to send your sign-in link), your first name and that you confirmed you're 18 or over. There's no password.
          The sign-in email is sent by Resend.
        </p>

        <h2>Your location</h2>
        <p>
          When you tap SHARE LOCATION, your phone's position is used once, to find places within about 150 metres and the town you're in, and then
          it's discarded. It's never stored with your check-in, in our logs or anywhere else. To find nearby places and your town, the position is
          sent to OpenStreetMap (and, if we switch it on, Google Maps), which answer and keep nothing on our behalf.
        </p>
        <p>
          The only location we ever save is a place's own, when someone adds a new place. If you search by name instead, no location is used at all.
        </p>

        <h2>Check-ins</h2>
        <p>
          A check-in records who, where (the place, not a position) and when. It ends when you leave or after 4 hours, and it's deleted after 24
          hours. For our numbers we also count whether a check-in worked, without saying who.
        </p>

        <h2>Signals and replies</h2>
        <p>
          People checked in at the same place right now can see your signal. Nobody else can. Everyone stays "Someone here" until you both accept;
          after that you see each other's first name only. Never a photo, a surname or contact details. There's no chat, only quick replies.
        </p>
        <p>Your signals and replies are kept until you delete your account. Leaving a place hides your open signals straight away.</p>

        <h2>Meeting and staying in touch</h2>
        <p>
          When you both confirm a meet-up with the QR code, we record that two people met, where and on which day. That's what the Live page counts,
          as one collective number. If you both choose STAY IN TOUCH, you become friends; if only one of you does, nobody is told.
        </p>

        <h2>Your Personal Compass (FIND ME)</h2>
        <p>
          Only if you say yes. Hoolala! searches the web for you, and only you: the name, town and links you give, at most three times. It never logs
          in to any social network. You tick what's really you. The search results are never stored. Only the compass lines you confirm with LOOKS
          RIGHT are kept, each with its source or "you said".
        </p>
        <p>
          Your compass is private. It only puts signals that fit you first, on your own screen. It's never shown to anyone and never used to match,
          rank or recommend people. Delete it any time in My compass.
        </p>

        <h2>What the AI sees</h2>
        <p>
          Hoolala! uses Muse Spark, Meta's AI model, through the Meta Model API in standard mode, where what we send isn't used to train Meta's
          models. It only ever sees what one task needs:
        </p>
        <ul class="prose-list">
          <li>Checking a post (SCREEN IT): the line you wrote. It approves or refuses and translates; it never changes your words.</li>
          <li>Topic ideas (SUGGEST IT): the place, the time and its spots. Nothing about you.</li>
          <li>FIND ME: the name, town and links you give, then the findings you ticked.</li>
          <li>Meeting point (PLAN IT): the signal, the place's spots and the quick replies, by role. No names.</li>
        </ul>
        <p>
          We log how long each AI call took and how many tokens it used. Never the text. SHOW THE WORKINGS under an AI answer tells you which tools
          and sources it used; it's kept 7 days and only you can open it.
        </p>

        <h2>Safety</h2>
        <p>
          Block works both ways, at every place, straight away. Report hides what you reported at once and we look at it. If something you write
          suggests you're going through a hard time, we show help numbers instead: in Switzerland, 143 (La Main Tendue) any time, or 144 in an
          emergency.
        </p>

        <h2>Deleting your account</h2>
        <p>
          Account, then Delete my account. Your check-ins, signals, replies, moments, friendships, compass and points go. What stays is anonymous:
          the count of meet-ups on the Live page, and places you added (without your name on them).
        </p>

        <h2>Where it runs</h2>
        <p>
          Hoolala! runs on Cloudflare. The code is open source on{" "}
          <a href="https://github.com/uwazzi/hoolala" target="_blank" rel="noopener noreferrer">GitHub</a>, so you can check all of this. Questions or
          requests: open an issue there.
        </p>
        <p class="lcd-small">Last updated 29 October 2026.</p>
      </div>
    </Screen>
  );
}
