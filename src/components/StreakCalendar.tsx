import { t, useLanguage } from "../i18n";
import { useMemo } from "react";
import { countByDay, currentStreak, lastDays } from "../core/streak";
import type { FeedEntry } from "../core/types";
import { localDay } from "../core/calendar";
const WEEKS = 14;
export function StreakCalendar({ entries }: {
    entries: FeedEntry[];
}) {
    useLanguage();
    const today = localDay();
    const { days, streak, total } = useMemo(() => {
        const counts = countByDay(entries.map((entry) => localDay(new Date(entry.publishedAt))));
        return {
            days: lastDays(counts, WEEKS * 7, today),
            streak: currentStreak(counts, today),
            total: entries.length,
        };
    }, [entries, today]);
    if (!entries.length) {
        return <p className="muted">{t("账本还没醒来，连续天数稍后揭晓。")}</p>;
    }
    return (<div className="heartbeat__body">
      <div className="heartbeat__stats">
        <span><strong>{streak}</strong><small>{t("天连续更新")}</small></span>
        <span><strong>{total}</strong><small>{t("次真实变化")}</small></span>
      </div>
      <div className="heartbeat__grid" role="img" aria-label={t("最近 {0} 周更新日历，连续更新 {1} 天", [WEEKS, streak])}>
        {days.map((day) => (<span key={day.date} className={`heartbeat__cell level-${Math.min(day.count, 4)}`} title={day.count ? t("{0}：{1} 更", [day.date, day.count]) : day.date}/>))}
      </div>
      <p className="heartbeat__legend muted">{t("一格一天。亮起来的都是真的。")}</p>
    </div>);
}
