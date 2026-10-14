import { CircuitRoom } from "../components/CircuitRoom";
import { PatchPlayground } from "../components/PatchPlayground";
import type { UpdateStation } from "../hooks/useUpdateStation";
import "./play-page.css";

export function PlayPage({ station, toy }: { station: UpdateStation; toy: "circuit" | "mix" }) {
  return <div className="play-page">
    <header className="play-page-heading"><h1>今日游乐场<span>随时来，慢慢玩。</span></h1><nav aria-label="选择玩具"><a href="#play" aria-current={toy === "circuit" ? "page" : undefined}>接线室</a><a href="#mix" aria-current={toy === "mix" ? "page" : undefined}>混合台</a></nav></header>
    {toy === "circuit" ? <CircuitRoom /> : <PatchPlayground entries={station.feed?.entries ?? []} installedIds={station.archive.state.installedIds} />}
    <p className="play-page-note">无需账号，成绩无需上传。<a href="#today">看看今天的更新 →</a></p>
  </div>;
}
