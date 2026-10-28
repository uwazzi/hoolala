// Hoolala! front end. WP2 adds sign-in; pages beyond home and sign-in are
// honest placeholders until their work package lands.
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

  function api(method, path, body) {
    return fetch(path, {
      method: method,
      credentials: "same-origin",
      headers: body ? { "content-type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, data: data };
      });
    });
  }

  // --- Sign-in (WP2) ---------------------------------------------------------

  var signin = document.querySelector("[data-signin]");
  if (!signin) return;

  var note = document.getElementById("signin-note");
  var title = document.getElementById("signin-title");
  var TITLES = { email: "Sign in", sent: "Link sent", name: "Your name", "signed-in": "Signed in", delete: "Delete account" };
  var ERRORS = {
    bad_email: "That doesn't look like an email. Check it and try again.",
    adult_required: "Hoolala! is for people 18 and over.",
    too_many: "That's a lot of links. Wait a few minutes, then try again.",
    email_failed: "We couldn't send the email. Try again in a minute.",
    bad_name: "First name only, letters only, up to 30.",
    signed_out: "You've been signed out. Sign in again.",
  };

  function say(text) { note.textContent = text || ""; }

  function show(step) {
    var sections = signin.querySelectorAll("[data-step]");
    for (var i = 0; i < sections.length; i++) {
      sections[i].hidden = sections[i].getAttribute("data-step") !== step;
    }
    title.textContent = TITLES[step];
    say("");
  }

  function failed(res) {
    say(ERRORS[res.data.error] || "Something went wrong. Try again.");
  }

  function signedIn(me) {
    if (!me.firstName) return show("name");
    signin.querySelector("[data-first-name]").textContent = me.firstName;
    show("signed-in");
  }

  signin.addEventListener("click", function (event) {
    var target = event.target.closest("[data-goto]");
    if (target) show(target.getAttribute("data-goto"));
  });

  document.getElementById("email-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var email = document.getElementById("email").value;
    var adult = document.getElementById("adult").checked;
    if (!adult) return say(ERRORS.adult_required);
    api("POST", "/api/auth/start", { email: email, adult: true }).then(function (res) {
      if (res.status === 200) return show("sent");
      failed(res);
    });
  });

  document.getElementById("name-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var firstName = document.getElementById("first-name").value;
    api("PATCH", "/api/me", { firstName: firstName }).then(function (res) {
      if (res.status === 200) return signedIn(res.data);
      failed(res);
    });
  });

  document.getElementById("sign-out").addEventListener("click", function () {
    api("POST", "/api/auth/logout").then(function () { show("email"); });
  });

  document.getElementById("delete-account").addEventListener("click", function () {
    api("DELETE", "/api/me").then(function (res) {
      if (res.status !== 200) return failed(res);
      show("email");
      say("Your account is gone. Thanks for trying Hoolala!");
    });
  });

  var params = new URLSearchParams(window.location.search);
  api("GET", "/api/me").then(function (res) {
    if (res.status === 200) return signedIn(res.data);
    show("email");
    if (params.get("error") === "link") {
      say("That link has expired or was already used. Send yourself a new one.");
    }
  });
})();
