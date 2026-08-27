import { useEffect, useState } from "react";

export type AppRoute = "today" | "archive" | "lab";

const ROUTES = new Set<AppRoute>(["today", "archive", "lab"]);

function readRoute(): AppRoute {
  const route = window.location.hash.slice(1) as AppRoute;
  return ROUTES.has(route) ? route : "today";
}

export function useHashRoute() {
  const [route, setRoute] = useState<AppRoute>(readRoute);

  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  return route;
}
