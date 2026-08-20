import { describe, expect, it } from "vitest";
import { countByDay, currentStreak, lastDays, shiftDate } from "../src/core/streak";

describe("streak helpers", () => {
  it("shiftDate crosses month and year boundaries", () => {
    expect(shiftDate("2026-08-01", -1)).toBe("2026-07-31");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDate("2026-08-20", 1)).toBe("2026-08-21");
    expect(shiftDate("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("countByDay aggregates updates per planned day", () => {
    const counts = countByDay(["2026-08-20", "2026-08-20", "2026-08-19"]);
    expect(counts.get("2026-08-20")).toBe(2);
    expect(counts.get("2026-08-19")).toBe(1);
    expect(counts.get("2026-08-18")).toBeUndefined();
  });

  it("currentStreak counts back from today", () => {
    const counts = countByDay(["2026-08-20", "2026-08-19", "2026-08-18", "2026-08-16"]);
    expect(currentStreak(counts, "2026-08-20")).toBe(3);
    expect(currentStreak(counts, "2026-08-19")).toBe(2);
  });

  it("currentStreak grants today as a grace day when empty", () => {
    const counts = countByDay(["2026-08-19", "2026-08-18"]);
    expect(currentStreak(counts, "2026-08-20")).toBe(2);
    expect(currentStreak(counts, "2026-08-17")).toBe(0);
  });

  it("lastDays produces a contiguous window ending today", () => {
    const counts = countByDay(["2026-08-20"]);
    const days = lastDays(counts, 7, "2026-08-20");
    expect(days).toHaveLength(7);
    expect(days[6]).toEqual({ date: "2026-08-20", count: 1 });
    expect(days[5]).toEqual({ date: "2026-08-19", count: 0 });
    expect(days[0]).toEqual({ date: "2026-08-14", count: 0 });
  });
});
