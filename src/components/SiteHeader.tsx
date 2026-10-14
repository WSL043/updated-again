import { t, useLanguage } from "../i18n";
import { isDesktopApp } from "../core/native";
import type { AppRoute } from "../hooks/useHashRoute";
import type { StationStatus } from "../hooks/useUpdateStation";
import { LanguageSelector } from "./LanguageSelector";
const NAV: Array<{
    route: AppRoute;
    label: string;
    note: string;
}> = [
    { route: "play", label: t("玩一局"), note: "PLAY" },
    { route: "today", label: t("今天"), note: "01" },
    { route: "archive", label: t("全部版本"), note: "02" },
    { route: "lab", label: t("项目内部"), note: "03" },
];
export function SiteHeader({ route, status }: {
    route: AppRoute;
    status: StationStatus;
}) {
    useLanguage();
    const statusLabel = status === "error" ? t("连接异常") : status === "checking" ? t("正在检查") : status === "installing" ? t("正在安装") : t("今天仍在更新");
    return (<header className="site-header">
      <a className="brand" href="#play" aria-label={t("Updated Again 首页")}>
        <span className="brand__mark" aria-hidden="true"><i /><i /></span>
        <span><strong>UPDATED AGAIN</strong><small>{t("为了更新而更新")}</small></span>
      </a>
      <nav aria-label={t("主导航")}>
        {NAV.map((item) => (<a key={item.route} href={`#${item.route}`} className={route === item.route || (route === "mix" && item.route === "play") ? "active" : ""} aria-current={route === item.route || (route === "mix" && item.route === "play") ? "page" : undefined}>
            <small>{t(item.note)}</small><span>{t(item.label)}</span>
          </a>))}
      </nav>
      <div className="header-tools"><div className={`live-status live-status--${status}`}>
        <span aria-hidden="true"/><div><strong>{t(statusLabel)}</strong><small>{isDesktopApp() ? t("桌面版") : t("网页版")}</small></div>
      </div><LanguageSelector /></div>
    </header>);
}
