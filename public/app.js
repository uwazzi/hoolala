// Hoolala! front end (WP1). No API calls yet; pages beyond home and
// sign-in are honest placeholders until their work package lands.
(function () {
  "use strict";

  // Telegram Mini App: keep the LCD look, use the full height.
  var tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    tg.ready();
    tg.expand();
  }

  // Escape returns home, per the design system.
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && window.location.pathname !== "/") {
      window.location.href = "/";
    }
  });
})();
