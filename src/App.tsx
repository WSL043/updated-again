import { SiteHeader } from "./components/SiteHeader";
import { useHashRoute } from "./hooks/useHashRoute";
import { useUpdateStation } from "./hooks/useUpdateStation";
import { ArchivePage } from "./pages/ArchivePage";
import { LabPage } from "./pages/LabPage";
import { TodayPage } from "./pages/TodayPage";

function App() {
  const route = useHashRoute();
  const station = useUpdateStation();

  return (
    <div className="app-shell">
      <SiteHeader route={route} status={station.status} />
      <main id="main-content">
        {route === "today" && <TodayPage station={station} />}
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
