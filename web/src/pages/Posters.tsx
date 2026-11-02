// The printable poster: one generic QR for coffee machines. Scan it to
// join Hoolala! in 30 seconds and post an icebreaker on the spot. The
// page prints cleanly: everything but the poster hides on paper.
import { Qr } from "../components/Qr";
import { Screen } from "../components/Screen";

export function Posters() {
  const url = `${window.location.origin}/p`;
  return (
    <Screen title="Your poster">
      <div class="poster-sheet">
        <span class="table-kicker">HOOLALA!</span>
        <h1 class="around-head">TALK TO A HUMAN HERE.</h1>
        <div class="poster-qr">
          <Qr text={url} label="Hoolala! poster QR: scan to join and post an icebreaker" />
        </div>
        <p class="around-privacy">{url}</p>
        <ol class="quiet-list">
          <li>Scan me with your camera.</li>
          <li>Join in 30 seconds.</li>
          <li>Post one line. Meet around you.</li>
        </ol>
      </div>
      <div class="thumb-zone no-print">
        <button class="thumb-key" type="button" onClick={() => window.print()}><span>PRINT THIS POSTER</span><span aria-hidden="true">&gt;</span></button>
        <a class="thumb-link" href="/around">BACK TO AROUND</a>
      </div>
    </Screen>
  );
}
