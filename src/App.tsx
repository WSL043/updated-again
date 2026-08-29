import { useMemo } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { createStyleGenome } from "./core/style-genome";
import { useHashRoute } from "./hooks/useHashRoute";
import { useUpdateStation } from "./hooks/useUpdateStation";
import { ArchivePage } from "./pages/ArchivePage";
import { LabPage } from "./pages/LabPage";
import { TodayPage } from "./pages/TodayPage";

function App() {
  const route = useHashRoute();
  const station = useUpdateStation();
  const genome = useMemo(() => createStyleGenome({
    date: station.latestEntry?.plannedFor,
    updateSeed: station.latestEntry?.seed,
    kind: station.latestEntry?.kind,
    sequence: station.latestEntry?.sequence,
  }), [station.latestEntry?.kind, station.latestEntry?.plannedFor, station.latestEntry?.seed, station.latestEntry?.sequence]);

  return (
    <div
      className="app-shell"
      data-composition={genome.composition}
      data-geometry={genome.geometry}
      data-texture={genome.texture}
      style={genome.cssVariables}
    >
      <SiteHeader route={route} status={station.status} />
      <main id="main-content">
        {route === "today" && <TodayPage station={station} genome={genome} />}
        {route === "archive" && <ArchivePage station={station} />}
        {route === "lab" && <LabPage station={station} />}
      </main>
      <footer className="site-footer">
        <div><strong>UPDATED AGAIN</strong><span>明天还会更。至于为什么，明天再说。</span></div>
        <div><a href="https://github.com/WSL043/updated-again" target="_blank" rel="noreferrer">看源码</a><a href="https://github.com/WSL043/updated-again/issues/new?template=update-idea.yml" target="_blank" rel="noreferrer">塞一个更新理由</a></div>
      </footer>
    </div>
  );
}

export default App;
