import { canonicalize, dateInUTC, releaseCalendarDay } from "./lib.mjs";

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
  const today = dateInUTC(now);
  const entries = feed.entries.filter((entry) => entry.plannedFor <= today && new Date(entry.publishedAt) <= now);
  const covered = new Set(entries.map((entry) => entry.plannedFor));
  const onTime = new Set(entries.filter((entry) => releaseCalendarDay(entry) === entry.plannedFor).map((entry) => entry.plannedFor));
  const days = [...covered].sort();
  const missing = [];
  for (let day = days[0]; day && day < today; day = shiftDay(day, 1)) {
    if (!covered.has(day)) missing.push(day);
  }
  const recent = Array.from({ length: 7 }, (_, index) => {
    const day = shiftDay(today, -index);
    const updates = entries.filter((entry) => entry.plannedFor === day);
    const punctual = updates.filter((entry) => releaseCalendarDay(entry) === day).length;
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
    const state = punctual > 0 ? "Published on schedule" : count > 0 ? "Backfilled" : day === stats.today ? "Pending today" : !stats.firstDay || day < stats.firstDay ? "Not started" : "Missing";
    return `| ${day} | ${count} | ${state} | ${kinds.map((kind) => `\`${kind}\``).join(", ") || "—"} |`;
  });
  return [START, "## Daily running record", "",
    "[![Health audit](https://github.com/WSL043/updated-again/actions/workflows/project-health.yml/badge.svg)](https://github.com/WSL043/updated-again/actions/workflows/project-health.yml) [![Daily release](https://github.com/WSL043/updated-again/actions/workflows/daily-update.yml/badge.svg)](https://github.com/WSL043/updated-again/actions/workflows/daily-update.yml)", "",
    `As of **${stats.today} (UTC)**: **${stats.onTimeStreak} consecutive on-schedule release days**, with **${stats.coverageStreak} consecutive days covered by the ledger**.`, "",
    "| Metric | Record |", "|---|---|",
    `| First release date | ${stats.firstDay || "None"} |`,
    `| Latest covered date | ${stats.latestDay || "None"} |`,
    `| Capsules / covered dates | ${stats.total} / ${stats.coveredDays} |`,
    `| Dates covered only by backfills | ${stats.backfilledDays} |`,
    `| Completed dates still missing | ${stats.missing.length} |`, "",
    "Last seven days:", "", "| Date | Capsules | Publication | Types |", "|---|---:|---|---|", ...rows, "",
    "Generated from the signed ledger during publication and daily audits. New releases use UTC. Historical entries without calendar metadata retain their original recorded calendar; they are never rewritten. Backfills restore ledger coverage, but do not repair on-schedule publication streaks. An unfinished today is allowed; a missing completed day breaks the streak.", "",
    "This measures release activity, not continuous website uptime. Health audits separately verify the public Pages ledger and latest capsule. Check the snapshot date and audit timestamp for freshness.", END].join("\n");
}
export function replaceStatus(readme, block) {
  const start = readme.indexOf(START);
  const end = readme.indexOf(END);
  if (start === -1 && end === -1) {
    const anchor = ["## What you can do", "## 它现在真的会做什么"].find((heading) => readme.includes(heading));
    if (!anchor) throw new Error("README status insertion anchor missing");
    return readme.replace(anchor, `${block}\n\n${anchor}`);
  }
  if (start === -1 || end < start || readme.indexOf(START, start + START.length) !== -1 || readme.indexOf(END, end + END.length) !== -1) {
    throw new Error("README status markers must form exactly one ordered pair");
  }
  return readme.slice(0, start) + block + readme.slice(end + END.length);
}

export function assertDeployment(feed, remoteFeed, localCapsule, remoteCapsule, today) {
  const stats = summarizeFeed(feed, new Date(`${today}T23:59:59.999Z`));
  const yesterday = shiftDay(today, -1);
  if (!stats.firstDay || stats.firstDay > yesterday || stats.latestDay < yesterday || stats.missing.length) {
    throw new Error(`Ledger must cover every completed UTC release day through ${yesterday}`);
  }
  // Comparing complete data catches stale deployments even if the latest ID is unchanged.
  if (canonicalize(remoteFeed) !== canonicalize(feed)) throw new Error("Public Pages ledger differs from repository ledger");
  if (canonicalize(remoteCapsule) !== canonicalize(localCapsule)) throw new Error("Public latest capsule differs from verified repository capsule");
}
