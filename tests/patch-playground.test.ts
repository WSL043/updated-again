import { describe, expect, it } from "vitest";
import { availableMaterials, dailyExperiment, EXPERIMENTS, FAMILIES, MATERIAL_KINDS, METHODS, mix, projectDay } from "../src/core/patch-playground";
import { discover, emptyNotebook, loadMaterialCache, loadNotebook, MATERIAL_CACHE_KEY, MAX_NOTEBOOK_BYTES, mergeNotebooks, NOTEBOOK_KEY, parseNotebook, saveMaterialCache, saveNotebook, serializeNotebook } from "../src/core/play-notebook";
import { paginate } from "../src/core/pagination";
import type { FeedEntry } from "../src/core/types";

const entries: FeedEntry[] = MATERIAL_KINDS.map((kind, index) => ({ id: `capsule-${index}`, kind, headline: `材料 ${kind}`, sequence: index + 1, publishedAt: "2026-09-07T00:00:00Z", plannedFor: "2026-09-07", channel: "daily", mood: "好奇", absurdity: 60, path: "unused", payloadSha256: "unused", recipe: "unused", seed: "unused" }));
function storage() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe("patch recipe algebra", () => {
  it("has 28 explicit families and 84 unique states", () => {
    expect(FAMILIES).toHaveLength(28); expect(EXPERIMENTS).toHaveLength(84);
    expect(new Set(EXPERIMENTS.map((recipe) => recipe.id)).size).toBe(84);
  });
  it("covers every pair and method, independent of ingredient order", () => {
    for (const a of MATERIAL_KINDS) for (const b of MATERIAL_KINDS) for (const method of METHODS) {
      expect(mix(a, b, method.id)).toBe(mix(b, a, method.id));
      expect(mix(a, b, method.id).name.length).toBeGreaterThan(0);
    }
  });
  it("rejects unsupported methods instead of inventing outcomes", () => {
    expect(() => mix("theme", "message", "unknown" as never)).toThrow();
  });
  it("uses Shanghai midnight, independent of the visitor's timezone", () => {
    expect(projectDay(new Date("2026-09-06T15:59:59Z"))).toBe("2026-09-06");
    expect(projectDay(new Date("2026-09-06T16:00:00Z"))).toBe("2026-09-07");
  });
  it("offers every v1 state exactly once in an 84-day cycle", () => {
    const recipes = Array.from({ length: 84 }, (_, offset) => dailyExperiment(new Date(Date.UTC(2026, 0, 1 + offset)).toISOString().slice(0, 10)).id);
    expect(new Set(recipes).size).toBe(84);
    expect(dailyExperiment("2026-01-01").id).toBe(dailyExperiment("2026-03-26").id);
  });
  it.each(["2026-02-30", "2026-9-7", "not-a-date", "2025-02-29", "2026-13-01"])("rejects invalid calendar date %s", (day) => {
    expect(() => dailyExperiment(day)).toThrow();
  });
  it("accepts a real leap day and rejects an invalid Date", () => {
    expect(dailyExperiment("2024-02-29")).toBeDefined();
    expect(() => projectDay(new Date(NaN))).toThrow();
  });
});

describe("material ownership and offline labels", () => {
  it("does not unlock uninstalled entries", () => {
    expect(availableMaterials(entries, [])).toEqual([]);
    expect(availableMaterials(entries, [entries[0].id]).map((item) => item.kind)).toEqual(["theme"]);
  });
  it("keeps at most seven materials despite a growing feed", () => {
    expect(availableMaterials([...entries, ...entries], entries.map((item) => item.id))).toHaveLength(7);
  });
  it("supports offline labels but checks ownership again after rollback", () => {
    const cached = availableMaterials(entries, [entries[0].id]);
    expect(availableMaterials([], [entries[0].id], cached)).toEqual(cached);
    expect(availableMaterials([], [], cached)).toEqual([]);
  });
  it("prefers live labels without mutating the feed or cache", () => {
    const cached = [{ kind: "theme" as const, id: entries[0].id, headline: "old" }];
    const snapshot = JSON.stringify({ entries, cached });
    expect(availableMaterials(entries, [entries[0].id], cached)[0].headline).toBe(entries[0].headline);
    expect(JSON.stringify({ entries, cached })).toBe(snapshot);
  });
  it("rejects corrupt material cache and bounds stored labels", () => {
    const disk = storage(); disk.setItem(MATERIAL_CACHE_KEY, "not json");
    expect(loadMaterialCache(disk)).toEqual([]);
    const materials = availableMaterials(entries, entries.map((entry) => entry.id));
    saveMaterialCache(disk, [...materials, ...materials]);
    expect(loadMaterialCache(disk)).toHaveLength(7);
    disk.setItem(MATERIAL_CACHE_KEY, JSON.stringify([{ kind: "__proto__", id: "x", headline: "x" }]));
    expect(loadMaterialCache(disk)).toEqual([]);
  });
});

describe("bounded, portable, non-authoritative notebook", () => {
  it("deduplicates repeated experiments", () => {
    const book = discover(emptyNotebook(), EXPERIMENTS[0].id);
    expect(discover(book, EXPERIMENTS[0].id).discoveries).toHaveLength(1);
    expect(emptyNotebook().discoveries).toEqual([]);
  });
  it("round-trips every discovery well under the file limit", () => {
    const book = { ...emptyNotebook(), discoveries: EXPERIMENTS.map((recipe) => recipe.id) };
    const text = serializeNotebook(book);
    expect(new TextEncoder().encode(text).length).toBeLessThan(MAX_NOTEBOOK_BYTES);
    expect(parseNotebook(text).discoveries).toHaveLength(84);
  });
  it("merges import as a union instead of replacing existing progress", () => {
    const one = discover(emptyNotebook(), EXPERIMENTS[0].id);
    const two = discover(emptyNotebook(), EXPERIMENTS[1].id);
    expect(mergeNotebooks(one, two, one).discoveries).toHaveLength(2);
  });
  it.each(["null", "{}", "[]", "broken", JSON.stringify({ ...emptyNotebook(), version: 2 }), JSON.stringify({ ...emptyNotebook(), discoveries: ["untrusted"] }), JSON.stringify({ ...emptyNotebook(), discoveries: [123] })])("rejects malformed or future-format notebook %s", (text) => {
    expect(() => parseNotebook(text)).toThrow();
  });
  it("rejects oversized unicode input by bytes, not just character count", () => {
    expect(() => parseNotebook(JSON.stringify({ ...emptyNotebook(), extra: "字".repeat(12_000) }))).toThrow();
  });
  it("drops injected fields and never treats an import as installed material", () => {
    const parsed = parseNotebook(JSON.stringify({ ...emptyNotebook(), installedIds: ["fake"], materials: entries, integrity: { signature: "fake" } }));
    expect(parsed).toEqual(emptyNotebook());
    expect(availableMaterials([], [])).toEqual([]);
  });
  it("starts clean when storage is absent", () => {
    expect(loadNotebook(storage())).toEqual(emptyNotebook());
  });
  it("merges a stale tab's progress with the latest persisted notebook", () => {
    const disk = storage();
    saveNotebook(disk, discover(emptyNotebook(), EXPERIMENTS[0].id));
    saveNotebook(disk, discover(emptyNotebook(), EXPERIMENTS[1].id));
    expect(loadNotebook(disk).discoveries).toHaveLength(2);
    expect([...disk.values.keys()]).toEqual([NOTEBOOK_KEY]);
  });
  it("never overwrites corrupted storage", () => {
    const disk = storage(); disk.setItem(NOTEBOOK_KEY, "recover me");
    expect(() => saveNotebook(disk, emptyNotebook())).toThrow();
    expect(disk.getItem(NOTEBOOK_KEY)).toBe("recover me");
  });
  it("surfaces quota failures without modifying the old value", () => {
    const disk = storage(); saveNotebook(disk, emptyNotebook());
    const old = disk.getItem(NOTEBOOK_KEY);
    disk.setItem = () => { throw new Error("QuotaExceededError"); };
    expect(() => saveNotebook(disk, discover(emptyNotebook(), EXPERIMENTS[0].id))).toThrow("QuotaExceededError");
    expect(disk.getItem(NOTEBOOK_KEY)).toBe(old);
  });
});

describe("long-lived archive windows", () => {
  it("renders only 24 entries even for a ten-thousand-update archive", () => {
    const source = Array.from({ length: 10_000 }, (_, i) => i);
    expect(paginate(source, 1).items).toHaveLength(24);
    expect(paginate(source, 2).items[0]).toBe(24);
    expect(paginate(source, 999).end).toBe(10_000);
    expect(source).toHaveLength(10_000);
  });
  it("clamps pages after a search shrinks the result", () => {
    expect(paginate(["one"], 80)).toMatchObject({ page: 1, pages: 1, start: 1, end: 1 });
    expect(paginate([], 80)).toMatchObject({ page: 1, pages: 1, start: 0, end: 0 });
    expect(paginate([1, 2], NaN).page).toBe(1);
  });
  it("rejects unsafe page sizes", () => {
    for (const size of [0, -1, Infinity, 101, 1.5]) expect(() => paginate([], 1, size)).toThrow();
  });
});
