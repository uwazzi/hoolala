// Hoolala! web app (WP27): one Preact build for the browser and the
// Telegram Mini App. Screens call the Worker API only; no rules here.
import { render } from "preact";
import { LocationProvider, Route, Router, useLocation } from "preact-iso";
import { useEffect } from "preact/hooks";
import { Home } from "./pages/Home";
import { Arrive } from "./pages/Arrive";
import { Here, Live, Meet, NotFound } from "./pages/Placeholders";
import { SignIn } from "./pages/SignIn";
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
      <Route path="/signin" component={SignIn} />
      <Route path="/arrive" component={Arrive} />
      <Route path="/here" component={Here} />
      <Route path="/meet" component={Meet} />
      <Route path="/live" component={Live} />
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
