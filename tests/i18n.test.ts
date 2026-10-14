import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { catalog, specimenMessages } from "../src/i18n/messages";
import { getLanguage, LANGUAGE_KEY, LANGUAGES, readLanguage, setLanguage, t } from "../src/i18n";
import { CircuitRoom } from "../src/components/CircuitRoom";
import { LanguageSelector } from "../src/components/LanguageSelector";
import { localDay } from "../src/core/calendar";
import { FAMILIES, EXPERIMENTS } from "../src/core/patch-playground";
import { releaseCalendarDay, dateInUTC } from "../scripts/lib.mjs";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: Root;
beforeEach(() => {
  localStorage.clear(); setLanguage("en"); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-14T04:00:00Z"));
  window.history.replaceState(null, "", "/");
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("language preferences and complete message catalog", () => {
  it("defaults to English, restores explicit choices, and tolerates blocked or invalid storage", () => {
    localStorage.clear(); expect(readLanguage()).toBe("en");
    expect(setLanguage("ja")).toBe(true); expect(readLanguage()).toBe("ja");
    localStorage.setItem(LANGUAGE_KEY, "unknown"); expect(readLanguage()).toBe("en");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readLanguage()).toBe("en");
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(setLanguage("es")).toBe(false); expect(getLanguage()).toBe("es");
  });

  it("has translations for every UI source message and keeps interpolation slots in every language", () => {
    const files = [join(process.cwd(), "src/App.tsx"), ...["components", "pages", "remotion"].flatMap((folder) => readdirSync(join(process.cwd(), "src", folder)).filter((name) => name.endsWith(".tsx")).map((name) => join(process.cwd(), "src", folder, name)))];
    for (const file of files) for (const match of readFileSync(file, "utf8").matchAll(/\bt\(("(?:[^"\\]|\\.)*")/g)) {
      const key = JSON.parse(match[1]);
      expect(catalog[key] ?? catalog[key.trim()], `${file}: ${key}`).toBeDefined();
    }
    const slots = (text: string) => [...text.matchAll(/\{\d+\}/g)].map((match) => match[0]).sort();
    for (const [key, row] of Object.entries(catalog)) {
      expect(row).toHaveLength(3);
      for (const translation of row) { expect(translation.trim().length).toBeGreaterThan(0); expect(slots(translation), key).toEqual(slots(key)); }
    }
    expect(specimenMessages.length).toBe(FAMILIES.length);
    for (const item of EXPERIMENTS) for (const language of ["en", "es"] as const) {
      expect(t(item.name, [], language)).not.toMatch(/\p{Script=Han}/u);
      expect(t(item.note, [], language)).not.toMatch(/\p{Script=Han}/u);
      expect(t(item.clue, [], language)).not.toMatch(/\p{Script=Han}/u);
    }
  });

  it("translates saved dynamic messages, nested labels and original text without changing arbitrary release content", () => {
    expect(t("第 3 关", [], "en")).toBe("Round 3");
    expect(t("Round 3", [], "es")).toBe("Ronda 3");
    expect(t("{0} 步 · {1}", [5, "独立完成"], "en")).toBe("5 moves · Without hints");
    expect(t("A release written by a contributor", [], "ja")).toBe("A release written by a contributor");
  });

  it("switches all four languages without resetting circuit progress or changing board seeds", () => {
    act(() => root.render(createElement("div", null, createElement(LanguageSelector), createElement(CircuitRoom))));
    act(() => host.querySelector<HTMLButtonElement>(".circuit-cell")!.click());
    const board = () => [...host.querySelectorAll(".circuit-cell")].map((node) => node.getAttribute("aria-pressed"));
    const before = board();
    for (const language of LANGUAGES) {
      act(() => setLanguage(language.id));
      expect(board()).toEqual(before);
      expect(host.querySelector(".circuit-score strong")?.textContent).toContain("01");
      expect(document.documentElement.lang).toBe(language.id);
      expect(host.querySelector("h2")?.textContent).toContain(t("补丁接线室", [], language.id));
      expect(host.querySelector(".circuit-room")?.textContent).not.toContain("上海");
      if (language.id === "en" || language.id === "es") expect(host.querySelector(".circuit-room")?.textContent).not.toMatch(/\p{Script=Han}/u);
    }
  });
});

describe("local play dates and UTC releases", () => {
  it("uses device-calendar dates across offsets, daylight saving transitions and year boundaries", () => {
    const date = new Date("2026-10-14T01:00:00Z");
    expect(localDay(date, "America/Los_Angeles")).toBe("2026-10-13");
    expect(localDay(date, "Asia/Tokyo")).toBe("2026-10-14");
    expect(localDay(new Date("2026-03-08T07:01:00Z"), "America/New_York")).toBe("2026-03-08");
    expect(localDay(new Date("2026-01-01T01:00:00Z"), "America/Los_Angeles")).toBe("2025-12-31");
    expect(dateInUTC(date)).toBe("2026-10-14");
  });

  it("honors legacy signed calendars while new signed releases use UTC", () => {
    const old = { publishedAt: "2026-10-13T17:00:00Z", plannedFor: "2026-10-14" };
    expect(releaseCalendarDay(old)).toBe("2026-10-14");
    expect(releaseCalendarDay({ ...old, calendarTimeZone: "UTC" })).toBe("2026-10-13");
  });
});
