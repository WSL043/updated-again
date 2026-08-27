import { isDesktopApp } from "../core/native";
import type { AppRoute } from "../hooks/useHashRoute";
import type { StationStatus } from "../hooks/useUpdateStation";

const NAV: Array<{ route: AppRoute; label: string; note: string }> = [
  { route: "today", label: "今天", note: "LIVE" },
  { route: "archive", label: "全部版本", note: "LEDGER" },
  { route: "lab", label: "项目内部", note: "SYSTEM" },
];

export function SiteHeader({ route, status }: { route: AppRoute; status: StationStatus }) {
  const statusLabel = status === "error" ? "连接异常" : status === "checking" ? "正在检查" : status === "installing" ? "正在安装" : "今天仍在更新";
  return (
    <header className="site-header">
      <a className="brand" href="#today" aria-label="Updated Again 首页">
        <span className="brand__mark" aria-hidden="true"><i /><i /></span>
        <span><strong>UPDATED AGAIN</strong><small>又更了</small></span>
      </a>
      <nav aria-label="主导航">
        {NAV.map((item) => (
          <a key={item.route} href={`#${item.route}`} className={route === item.route ? "active" : ""} aria-current={route === item.route ? "page" : undefined}>
            <small>{item.note}</small><span>{item.label}</span>
          </a>
        ))}
      </nav>
      <div className={`live-status live-status--${status}`}>
        <span aria-hidden="true" /><div><strong>{statusLabel}</strong><small>{isDesktopApp() ? "DESKTOP" : "WEB / PWA"}</small></div>
      </div>
    </header>
  );
}
