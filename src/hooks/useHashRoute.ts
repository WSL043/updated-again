import { useEffect, useState } from "react";

export type AppRoute = "today" | "play" | "mix" | "archive" | "lab";

const ROUTES = new Set<AppRoute>(["today", "play", "mix", "archive", "lab"]);

function readRoute(): AppRoute {
  const route = window.location.hash.slice(1).split("?")[0] as AppRoute;
  return ROUTES.has(route) ? route : "play";
}

export function useHashRoute() {
  const [route, setRoute] = useState<AppRoute>(readRoute);

  useEffect(() => {
    const update = () => { setRoute(readRoute()); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return route;
}
