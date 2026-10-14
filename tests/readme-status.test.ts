// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parse } from "yaml";
import { assertDeployment, END, renderStatus, replaceStatus, START, summarizeFeed } from "../scripts/readme-status.mjs";

const entry = (plannedFor: string, publishedAt = `${plannedFor}T01:00:00Z`, kind = "message") => ({ plannedFor, publishedAt, kind });
const feed = (...entries: ReturnType<typeof entry>[]) => ({ entries, latest: "test", total: entries.length });
const now = new Date("2026-10-14T04:00:00Z");

describe("README daily record", () => {
  it("counts Shanghai dates, duplicate releases once per day, and recent kinds", () => {
    const stats = summarizeFeed(feed(entry("2026-10-14", "2026-10-13T17:00:00Z"), entry("2026-10-14", undefined, "theme"), entry("2026-10-13")), now);
    expect(stats).toMatchObject({ total: 3, coveredDays: 2, coverageStreak: 2, onTimeStreak: 2, backfilledDays: 0 });
    expect(stats.recent[0]).toEqual({ day: "2026-10-14", count: 2, punctual: 2, kinds: ["message", "theme"] });
  });

  it("does not let a backfill repair an on-time streak", () => {
    const stats = summarizeFeed(feed(entry("2026-10-12"), entry("2026-10-13", "2026-10-14T01:00:00Z"), entry("2026-10-14")), now);
    expect(stats).toMatchObject({ coverageStreak: 3, onTimeStreak: 1, backfilledDays: 1 });
    expect(renderStatus(stats)).toContain("已补发");
  });

  it("allows an unfinished today, but breaks the streak for an absent yesterday", () => {
    expect(summarizeFeed(feed(entry("2026-10-12"), entry("2026-10-13")), now).onTimeStreak).toBe(2);
    const stats = summarizeFeed(feed(entry("2026-10-12")), now);
    expect(stats.onTimeStreak).toBe(0);
    expect(stats.missing).toEqual(["2026-10-13"]);
    expect(renderStatus(stats)).toContain("今日等待中");
  });

  it("ignores future-dated releases and handles empty and year-boundary ledgers", () => {
    expect(summarizeFeed(feed(entry("2026-10-15"), entry("2026-10-14", "2026-10-14T15:00:00Z")), now).total).toBe(0);
    expect(summarizeFeed(feed(), now).onTimeStreak).toBe(0);
    expect(summarizeFeed(feed(entry("2025-12-31"), entry("2026-01-01")), new Date("2026-01-01T04:00:00Z")).onTimeStreak).toBe(2);
  });

  it("replaces only its marked section, is idempotent, and rejects damaged markers", () => {
    const source = "intro\n\n## 它现在真的会做什么\nbody\n";
    const block = renderStatus(summarizeFeed(feed(entry("2026-10-14")), now));
    const next = replaceStatus(source, block);
    expect(replaceStatus(next, block)).toBe(next);
    expect(next.split(START)[0]).toBe("intro\n\n");
    expect(next.split(END)[1]).toBe("\n\n## 它现在真的会做什么\nbody\n");
    for (const broken of [START, END, END + START, START + START + END, START + END + END]) {
      expect(() => replaceStatus(broken, block)).toThrow();
    }
  });
});

describe("deployment audit", () => {
  it("at midnight checks completed days rather than requiring a new update immediately", () => {
    const ledger = feed(entry("2026-10-12"), entry("2026-10-13"));
    expect(() => assertDeployment(ledger, ledger, { signed: true }, { signed: true }, "2026-10-14")).not.toThrow();
  });

  it("rejects missing completed days, stale ledgers with the same latest ID, and different capsule data", () => {
    const ledger = feed(entry("2026-10-12"), entry("2026-10-14"));
    expect(() => assertDeployment(ledger, ledger, {}, {}, "2026-10-14")).toThrow(/completed/);
    const good = feed(entry("2026-10-13"));
    expect(() => assertDeployment(good, { ...good, total: 2 }, {}, {}, "2026-10-14")).toThrow(/ledger differs/);
    expect(() => assertDeployment(good, good, { signed: true }, { signed: false }, "2026-10-14")).toThrow(/capsule differs/);
    expect(() => assertDeployment(feed(), feed(), {}, {}, "2026-10-14")).toThrow();
  });

  it("shares the writer lock and leaves failed health checks red after incident handling", () => {
    const workflow = parse(readFileSync(new URL("../.github/workflows/project-health.yml", import.meta.url), "utf8"));
    expect(workflow.concurrency.group).toBe("living-release-writer");
    const last = workflow.jobs.audit.steps.at(-1);
    expect(last.if).toBe("always() && steps.health.outcome == 'failure'");
    expect(last.run).toBe("exit 1");
  });
});
