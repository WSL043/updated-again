import { getLanguage, t, useLanguage } from "../i18n";
import type { FeedEntry } from "../core/types";
interface UpdateCardProps {
    entry: FeedEntry;
    installed: boolean;
    onInstall: () => void;
    busy: boolean;
}
export function UpdateCard({ entry, installed, onInstall, busy }: UpdateCardProps) {
    useLanguage();
    const date = new Intl.DateTimeFormat(getLanguage(), { month: "short", day: "numeric" }).format(new Date(entry.publishedAt));
    return (<article className="update-card">
      <span className="update-card__sequence" aria-hidden="true">#{String(entry.sequence).padStart(4, "0")}</span>
      <div className="update-card__meta">
        <span>{date}</span>
        <span>{entry.channel}</span>
        <span>{t("荒诞度")}{entry.absurdity}</span>
      </div>
      <h3>{entry.headline}</h3>
      <p>
        {entry.kind} · {entry.mood}
      </p>
      <button className="text-button" disabled={installed || busy} onClick={onInstall}>
        {installed ? t("已进入你的历史") : t("安装这一更")}
      </button>
    </article>);
}
