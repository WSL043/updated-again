import { t, useLanguage } from "../i18n";
import { CircuitRoom } from "../components/CircuitRoom";
import { PatchPlayground } from "../components/PatchPlayground";
import type { UpdateStation } from "../hooks/useUpdateStation";
import "./play-page.css";
export function PlayPage({ station, toy }: {
    station: UpdateStation;
    toy: "circuit" | "mix";
}) {
    useLanguage();
    return <div className="play-page">
    <header className="play-page-heading"><h1>{t("今日游乐场")}<span>{t("随时来，慢慢玩。")}</span></h1><nav aria-label={t("选择玩具")}><a href="#play" aria-current={toy === "circuit" ? "page" : undefined}>{t("接线室")}</a><a href="#mix" aria-current={toy === "mix" ? "page" : undefined}>{t("混合台")}</a></nav></header>
    {toy === "circuit" ? <CircuitRoom /> : <PatchPlayground entries={station.feed?.entries ?? []} installedIds={station.archive.state.installedIds}/>}
    <p className="play-page-note">{t("无需账号，成绩无需上传。")}<a href="#today">{t("看看今天的更新 →")}</a></p>
  </div>;
}
