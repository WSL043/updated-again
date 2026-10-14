import { canonicalize, dateInShanghai } from "./lib.mjs";

export const START = "<!-- daily-status:start -->";
export const END = "<!-- daily-status:end -->";

export function shiftDay(day, offset) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function streak(days, today) {
  let cursor = days.has(today) ? today : shiftDay(today, -1);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = shiftDay(cursor, -1);
  }
  return count;
}

export function summarizeFeed(feed, now = new Date()) {
  const today = dateInShanghai(now);
  const entries = feed.entries.filter((entry) => entry.plannedFor <= today && new Date(entry.publishedAt) <= now);
  const covered = new Set(entries.map((entry) => entry.plannedFor));
  const onTime = new Set(entries.filter((entry) => dateInShanghai(new Date(entry.publishedAt)) === entry.plannedFor).map((entry) => entry.plannedFor));
  const days = [...covered].sort();
  const missing = [];
  for (let day = days[0]; day && day < today; day = shiftDay(day, 1)) {
    if (!covered.has(day)) missing.push(day);
  }
  const recent = Array.from({ length: 7 }, (_, index) => {
    const day = shiftDay(today, -index);
    const updates = entries.filter((entry) => entry.plannedFor === day);
    const punctual = updates.filter((entry) => dateInShanghai(new Date(entry.publishedAt)) === day).length;
    return { day, count: updates.length, punctual, kinds: [...new Set(updates.map((entry) => entry.kind))].sort() };
  });
  return {
    today, firstDay: days[0], latestDay: days.at(-1), total: entries.length,
    coveredDays: days.length, coverageStreak: streak(covered, today),
    onTimeStreak: streak(onTime, today), backfilledDays: days.filter((day) => !onTime.has(day)).length,
    missing, recent,
  };
}

export function renderStatus(stats) {
  const rows = stats.recent.map(({ day, count, punctual, kinds }) => {
    const state = punctual > 0 ? "当日发布" : count > 0 ? "已补发" : day === stats.today ? "今日等待中" : !stats.firstDay || day < stats.firstDay ? "尚未启动" : "缺更";
    return `| ${day} | ${count} | ${state} | ${kinds.map((kind) => `\`${kind}\``).join("、") || "—"} |`;
  });
  return [
    START,
    "## 每日运行记录",
    "",
    "[![每日体检](https://github.com/WSL043/updated-again/actions/workflows/project-health.yml/badge.svg)](https://github.com/WSL043/updated-again/actions/workflows/project-health.yml) [![日更调度](https://github.com/WSL043/updated-again/actions/workflows/daily-update.yml/badge.svg)](https://github.com/WSL043/updated-again/actions/workflows/daily-update.yml)",
    "",
    `截至 **${stats.today}（上海时间）**，连续按日发布 **${stats.onTimeStreak} 天**；账本连续覆盖 **${stats.coverageStreak} 天**。`,
    "",
    "| 指标 | 当前记录 |",
    "|---|---|",
    `| 首次胶囊日期 | ${stats.firstDay || "暂无"} |`,
    `| 最近覆盖日期 | ${stats.latestDay || "暂无"} |`,
    `| 累计胶囊 / 覆盖日期 | ${stats.total} 个 / ${stats.coveredDays} 天 |`,
    `| 仅靠补发覆盖的日期 | ${stats.backfilledDays} 天 |`,
    `| 已结束日期仍缺更 | ${stats.missing.length} 天 |`,
    "",
    "最近七天：",
    "",
    "| 日期 | 胶囊数 | 发布情况 | 变化类型 |",
    "|---|---:|---|---|",
    ...rows,
    "",
    "由签名账本自动生成，日更发布和每日体检时刷新。连续按日发布要求 `publishedAt` 的上海日期等于 `plannedFor`；补发只计入账本覆盖，不能修复按日发布记录。今天尚未发布时从昨天回溯，已结束日期缺更则中断计数。",
    "",
    "这是日更记录，不是站点全天在线时长；每日体检另行验证公开 Pages 账本与最新胶囊是否同步，检查失败会显示红色。请结合本页快照日期和体检运行时间判断是否过期。",
    END,
  ].join("\n");
}

export function replaceStatus(readme, block) {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start === -1 && end === -1) {
    const anchor = "## 它现在真的会做什么";
    if (!readme.includes(anchor)) throw new Error("README status insertion anchor missing");
    return readme.replace(anchor, `${block}\n\n${anchor}`);
  }
  if (start === -1 || end < start || readme.indexOf(START, start + START.length) !== -1 || readme.indexOf(END, end + END.length) !== -1) {
    throw new Error("README status markers must form exactly one ordered pair");
  }
  return readme.slice(0, start) + block + readme.slice(end + END.length);
}

export function assertDeployment(feed, remoteFeed, localCapsule, remoteCapsule, today) {
  const stats = summarizeFeed(feed, new Date(`${today}T15:59:59.999Z`));
  const yesterday = shiftDay(today, -1);
  if (!stats.firstDay || stats.firstDay > yesterday || stats.latestDay < yesterday || stats.missing.length) {
    throw new Error(`Ledger must cover every completed Shanghai day through ${yesterday}`);
  }
  // Comparing complete data catches stale deployments even if the latest ID is unchanged.
  if (canonicalize(remoteFeed) !== canonicalize(feed)) throw new Error("Public Pages ledger differs from repository ledger");
  if (canonicalize(remoteCapsule) !== canonicalize(localCapsule)) throw new Error("Public latest capsule differs from verified repository capsule");
}
