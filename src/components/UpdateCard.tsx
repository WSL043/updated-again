import type { FeedEntry } from "../core/types";

interface UpdateCardProps {
  entry: FeedEntry;
  installed: boolean;
  onInstall: () => void;
  busy: boolean;
}

export function UpdateCard({ entry, installed, onInstall, busy }: UpdateCardProps) {
  const date = new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(
    new Date(`${entry.plannedFor}T12:00:00+08:00`),
  );
  return (
    <article className="update-card">
      <div className="update-card__meta">
        <span>{date}</span>
        <span>{entry.channel}</span>
        <span>荒诞度 {entry.absurdity}</span>
      </div>
      <h3>{entry.headline}</h3>
      <p>
        {entry.kind} · {entry.mood}
      </p>
      <button className="text-button" disabled={installed || busy} onClick={onInstall}>
        {installed ? "已进入你的历史" : "安装这一更"}
      </button>
    </article>
  );
}
