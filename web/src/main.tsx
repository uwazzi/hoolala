// Hoolala! web app (WP27): one Preact build for the browser and the
// Telegram Mini App. Screens call the Worker API only; no rules here.
import { render } from "preact";
import { LocationProvider, Route, Router, useLocation } from "preact-iso";
import { useEffect } from "preact/hooks";
import { Friends } from "./pages/Friends";
import { Home } from "./pages/Home";
import { Join } from "./pages/Join";
import { Arrive } from "./pages/Arrive";
import { Compass } from "./pages/Compass";
import { Here } from "./pages/Here";
import { Live } from "./pages/Live";
import { Meet } from "./pages/Meet";
import { NotFound } from "./pages/Placeholders";
import { Place } from "./pages/Place";
import { Privacy } from "./pages/Privacy";
import { SignIn } from "./pages/SignIn";
import { Start } from "./pages/Start";
import { Surprise } from "./pages/Surprise";
import "./styles.css";

declare global {
  interface Window {
    Telegram?: { WebApp?: { ready(): void; expand(): void } };
  }
}

// Telegram Mini App: keep the LCD look, use the full height.
const tg = window.Telegram?.WebApp;
tg?.ready();
tg?.expand();

// Links from the WP1/WP2 pages (/signin.html) keep working.
if (location.pathname.endsWith(".html")) {
  const path = location.pathname.replace(/(index)?\.html$/, "") || "/";
  history.replaceState(null, "", path + location.search);
}

function App() {
  const { route, path } = useLocation();

  // Escape returns home, per the design system.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && path !== "/") route("/");
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [path]);

  return (
    <Router>
      <Route path="/" component={Home} />
      <Route path="/friends/join" component={Join} />
      <Route path="/friends" component={Friends} />
      <Route path="/signin" component={SignIn} />
      <Route path="/arrive" component={Arrive} />
      <Route path="/start" component={Start} />
      <Route path="/surprise" component={Surprise} />
      <Route path="/compass" component={Compass} />
      <Route path="/here" component={Here} />
      <Route path="/meet" component={Meet} />
      <Route path="/live" component={Live} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/place" component={Place} />
      <Route default component={NotFound} />
    </Router>
  );
}

render(
  <LocationProvider>
    <App />
  </LocationProvider>,
  document.getElementById("app")!,
);
