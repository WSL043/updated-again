import { useMemo } from "react";
import { countByDay, currentStreak, lastDays } from "../core/streak";
import type { FeedEntry } from "../core/types";

const WEEKS = 14;

function todayString(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function StreakCalendar({ entries }: { entries: FeedEntry[] }) {
  const today = todayString();
  const { days, streak, total } = useMemo(() => {
    const counts = countByDay(entries.map((entry) => entry.plannedFor));
    return {
      days: lastDays(counts, WEEKS * 7, today),
      streak: currentStreak(counts, today),
      total: entries.length,
    };
  }, [entries, today]);

  if (!entries.length) {
    return <p className="muted">账本还没醒来，连续天数稍后揭晓。</p>;
  }

  return (
    <div className="heartbeat__body">
      <div className="heartbeat__stats">
        <span><strong>{streak}</strong> 连续更新天数</span>
        <span><strong>{total}</strong> 次真实变化</span>
      </div>
      <div
        className="heartbeat__grid"
        role="img"
        aria-label={`最近 ${WEEKS} 周更新日历，连续更新 ${streak} 天`}
      >
        {days.map((day) => (
          <span
            key={day.date}
            className={`heartbeat__cell level-${Math.min(day.count, 4)}`}
            title={day.count ? `${day.date}：${day.count} 更` : day.date}
          />
        ))}
      </div>
      <p className="heartbeat__legend muted">每一格都是一天，颜色越亮那天更得越勤。</p>
    </div>
  );
}
