import { beforeEach, describe, expect, it } from "vitest";
import { createCircuit, fullBoard, sessionBoard, solveCircuit, type CircuitSession } from "../src/core/circuit";
import { CHOICE_KEY, choiceFromHash, defaultChoice, loadCircuitRecord, loadCircuitSession, puzzleLink, recordKey, saveCircuitWin, selectedPuzzle, sessionKey, validDay, validateChoice, weeklyPuzzles, weekStart, type CircuitPuzzle } from "../src/core/circuit-challenges";
import { circuitCardSvg, circuitCardText } from "../src/core/circuit-card";
import { loadArchive } from "../src/core/storage";

const today = "2026-10-14";
const puzzle = selectedPuzzle(defaultChoice(today), today);
const win = (item = puzzle, assisted = false, extra = false): CircuitSession => ({ seed: item.seed, size: item.size, presses: [...(extra ? [0, 0] : []), ...solveCircuit(createCircuit(item.seed, item.size), item.size)!], assisted });
beforeEach(() => localStorage.clear());

describe("history and weekly challenge protocol", () => {
  it("keeps original daily seeds and isolates dates, sizes, practice and weekly progress", () => {
    const history = selectedPuzzle({ ...defaultChoice(today), mode: "history", day: "2026-10-13" }, today);
    const sameDay = selectedPuzzle({ ...defaultChoice(today), mode: "history" }, today);
    expect(sameDay.seed).toBe(puzzle.seed);
    expect(sessionKey(sameDay)).toBe(sessionKey(puzzle));
    const weekly = weeklyPuzzles(weekStart(today));
    const all = [puzzle, history, ...weekly, { ...puzzle, size: 3 as const }, { ...puzzle, seed: "practice-00000000-0000-0000-0000-000000000000" }];
    expect(new Set(all.map(sessionKey)).size).toBe(all.length);
    for (const item of all) localStorage.setItem(sessionKey(item), JSON.stringify({ seed: item.seed, size: item.size, presses: [0], assisted: false }));
    for (const item of all) expect(loadCircuitSession(localStorage, item).presses).toEqual([0]);
  });

  it("migrates matching old saves without altering the original or moving a wrong date", () => {
    const oldKey = "updated-again:circuit:v1:daily:4";
    const text = JSON.stringify(win()); localStorage.setItem(oldKey, text);
    expect(loadCircuitSession(localStorage, puzzle)).toEqual(win());
    expect(loadCircuitSession(localStorage, { ...puzzle, seed: "2026-10-13" }).presses).toEqual([]);
    expect(localStorage.getItem(oldKey)).toBe(text);
    localStorage.setItem(sessionKey(puzzle), JSON.stringify({ ...win(), seed: "wrong" }));
    expect(() => loadCircuitSession(localStorage, puzzle)).toThrow(/不一致/);
  });

  it("uses Monday boundaries through year changes and leap days", () => {
    expect(weekStart("2026-01-01")).toBe("2025-12-29");
    expect(weekStart("2026-10-18")).toBe("2026-10-12");
    expect(weekStart("2026-10-19")).toBe("2026-10-19");
    expect(validDay("2024-02-29")).toBe(true);
    expect(validDay("2026-02-29")).toBe(false);
    expect(validDay("2026-02-30")).toBe(false);
    expect(validDay("not-a-day")).toBe(false);
  });

  it("provides seven reproducible, nontrivial reachable puzzles every week", () => {
    for (let offset = 0; offset < 28; offset++) {
      const date = new Date(Date.UTC(2026, 0, 5 + offset * 7)).toISOString().slice(0, 10);
      const weekly = weeklyPuzzles(date);
      expect(weekly.map((item) => item.size)).toEqual([3, 3, 4, 4, 4, 5, 5]);
      expect(new Set(weekly.map((item) => item.seed)).size).toBe(7);
      for (const item of weekly) {
        expect(sessionBoard(win(item))).toBe(fullBoard(item.size));
        expect(win(item).presses.length).toBeGreaterThanOrEqual(item.size);
      }
      expect(weeklyPuzzles(date)).toEqual(weekly);
    }
    expect(() => weeklyPuzzles("2026-10-14")).toThrow();
  });

  it("roundtrips shared dates, weekly rounds and practice seeds and rejects invalid or future links", () => {
    const items: CircuitPuzzle[] = [puzzle, ...weeklyPuzzles(weekStart(today)), { ...puzzle, mode: "practice", seed: "practice-00000000-0000-0000-0000-000000000000" }];
    for (const item of items) {
      const choice = choiceFromHash(new URL(puzzleLink(item)).hash, today)!;
      expect(selectedPuzzle(choice, today).seed).toBe(item.seed);
      expect(selectedPuzzle(choice, today).size).toBe(item.size);
    }
    for (const hash of ["#archive", "#play?mode=history&size=4&day=2026-10-15", "#play?mode=history&size=4&day=2026-02-30", "#play?mode=history&size=9&day=2026-10-14", "#play?mode=weekly&size=3&week=2026-10-12&round=0", "#play?mode=weekly&size=3&week=2026-10-19&round=1"]) expect(choiceFromHash(hash, today)).toBeNull();
    expect(validateChoice({ ...defaultChoice(today), day: "2030-01-01" }, today).day).toBe(today);
    expect(() => validateChoice({ ...defaultChoice(today), round: 9 }, today)).toThrow();
    expect(CHOICE_KEY).toContain(":v2");
  });
});

describe("verified local results and portable cards", () => {
  it("preserves independent bests separately from faster assisted runs and never worsens a record", () => {
    const slowSolo = win(puzzle, false, true), fastAssisted = win(puzzle, true);
    saveCircuitWin(localStorage, puzzle, slowSolo);
    let result = saveCircuitWin(localStorage, puzzle, fastAssisted);
    expect(result.best).toEqual(fastAssisted); expect(result.solo).toEqual(slowSolo);
    result = saveCircuitWin(localStorage, puzzle, win(puzzle, true, true));
    expect(result.best).toEqual(fastAssisted);
    result = saveCircuitWin(localStorage, puzzle, win());
    expect(result.best.assisted).toBe(false);
    expect(result.solo).toEqual(win());
    expect(loadCircuitRecord(localStorage, puzzle)).toEqual(result);
  });

  it("rejects false wins, wrong seeds, illegal moves and corrupted records without overwriting them", () => {
    expect(() => saveCircuitWin(localStorage, puzzle, { ...win(), presses: [] })).toThrow();
    expect(() => saveCircuitWin(localStorage, puzzle, { ...win(), seed: "wrong" })).toThrow();
    expect(() => saveCircuitWin(localStorage, puzzle, { ...win(), presses: [999] })).toThrow();
    const text = "damaged record"; localStorage.setItem(recordKey(puzzle), text);
    expect(() => saveCircuitWin(localStorage, puzzle, win())).toThrow();
    expect(localStorage.getItem(recordKey(puzzle))).toBe(text);
  });

  it("exports escaped standalone SVGs and preserves the exact replay link in text", () => {
    const card = { title: '<script>alert("bad")</script>', subtitle: "2026-10-14 · 4×4", score: "4 步", detail: "独立 & 最优", notes: ["接通了"], url: puzzleLink(puzzle) };
    const svg = circuitCardSvg(card);
    expect(svg).not.toContain("<script>"); expect(svg).toContain("&lt;script&gt;");
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
    expect(parsed.documentElement.getAttribute("height")).toBe("454");
    expect(parsed.querySelectorAll("script, image, foreignObject")).toHaveLength(0);
    expect(circuitCardText(card)).toContain(card.url);
  });

  it("keeps the app mountable when browser storage is denied", () => {
    const unavailable = { getItem: () => { throw new Error("blocked"); } };
    const original = Object.getOwnPropertyDescriptor(window, "localStorage")!;
    Object.defineProperty(window, "localStorage", { configurable: true, value: unavailable });
    try { expect(loadArchive().state.schemaVersion).toBe(1); }
    finally { Object.defineProperty(window, "localStorage", original); }
  });
});
