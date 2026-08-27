import { useState, useEffect, useCallback } from "react";
import Landing from "./Landing.jsx";
import HostView from "./HostView.jsx";
import PlayerView from "./PlayerView.jsx";
import PricingGamesLab from "./PricingGamesLab.jsx";
import RemotePlayView from "./RemotePlayView.jsx";

function parsePath(pathname) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] === "host")
    return { view: "host", code: parts[1]?.toUpperCase() || null };
  if (parts[0] === "play")
    return { view: "play", code: parts[1]?.toUpperCase() || null };
  if (parts[0] === "remote")
    return { view: "remote", code: parts[1]?.toUpperCase() || null };
  if (parts[0] === "games")
    return { view: "games", code: null };
  return { view: "landing", code: null };
}

export default function App() {
  const [route, setRoute] = useState(() => parsePath(window.location.pathname));

  useEffect(() => {
    const onPop = () => setRoute(parsePath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((path) => {
    window.history.pushState({}, "", path);
    setRoute(parsePath(path));
  }, []);

  if (route.view === "host" && route.code)
    return <HostView code={route.code} navigate={navigate} />;
  if (route.view === "play" && route.code)
    return <PlayerView code={route.code} navigate={navigate} />;
  if (route.view === "remote" && route.code)
    return <RemotePlayView code={route.code} navigate={navigate} />;
  if (route.view === "games")
    return <PricingGamesLab navigate={navigate} />;
  return <Landing navigate={navigate} />;
}
