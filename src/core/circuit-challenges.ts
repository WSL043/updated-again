import { CIRCUIT_SIZES, fullBoard, restoreSession, sessionBoard, type CircuitSession, type CircuitSize } from "./circuit";

export const CIRCUIT_LAUNCH = "2026-08-14";
export const CHOICE_KEY = "updated-again:circuit-choice:v2";
export type CircuitMode = "today" | "history" | "weekly" | "practice";
export interface CircuitChoice { mode: CircuitMode; size: CircuitSize; day: string; week: string; round: number; practice: string | null }
export interface CircuitPuzzle { seed: string; size: CircuitSize; title: string; subtitle: string; mode: CircuitMode; day: string; round?: number; week?: string }
export interface CircuitRecord { version: 1; best: CircuitSession; solo: CircuitSession | null }
type CircuitStorage = Pick<Storage, "getItem" | "setItem">;

export function validDay(day: unknown): day is string {
  if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const date = new Date(`${day}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === day;
}
export function shiftCircuitDay(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
export function weekStart(day: string): string {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return shiftCircuitDay(day, -((weekday + 6) % 7));
}
export const defaultChoice = (today: string): CircuitChoice => ({ mode: "today", size: 4, day: today, week: weekStart(today), round: 0, practice: null });
export function validateChoice(value: unknown, today: string): CircuitChoice {
  if (!value || typeof value !== "object") throw new Error("无法读取关卡选择");
  const choice = value as CircuitChoice;
  if (!["today", "history", "weekly", "practice"].includes(choice.mode) || !CIRCUIT_SIZES.includes(choice.size) ||
    !validDay(choice.day) || !validDay(choice.week) || weekStart(choice.week) !== choice.week ||
    !Number.isInteger(choice.round) || choice.round < 0 || choice.round > 6 ||
    (choice.practice !== null && (typeof choice.practice !== "string" || !/^practice-[a-f0-9-]{36}$/.test(choice.practice))) ||
    (choice.mode === "practice" && !choice.practice)) throw new Error("无法读取关卡选择");
  return { ...choice, day: choice.day < CIRCUIT_LAUNCH || choice.day > today ? today : choice.day,
    week: choice.week < weekStart(CIRCUIT_LAUNCH) || choice.week > weekStart(today) ? weekStart(today) : choice.week };
}

const WEEK_SIZES: readonly CircuitSize[] = [3, 3, 4, 4, 4, 5, 5];
export function weeklyPuzzles(week: string): CircuitPuzzle[] {
  if (!validDay(week) || weekStart(week) !== week) throw new Error("挑战周必须从星期一开始");
  return WEEK_SIZES.map((size, round) => ({ seed: `weekly-v1:${week}:${round + 1}`, size, mode: "weekly", day: week, week, round,
    title: `第 ${round + 1} 关`, subtitle: `${week} 当周 · ${size}×${size}` }));
}
export function selectedPuzzle(choice: CircuitChoice, today: string): CircuitPuzzle {
  if (choice.mode === "weekly") return weeklyPuzzles(choice.week)[choice.round];
  if (choice.mode === "practice") return { seed: choice.practice!, size: choice.size, mode: "practice", day: today, title: "自由练习", subtitle: "一张新的接线图" };
  const day = choice.mode === "today" ? today : choice.day;
  return { seed: day, size: choice.size, mode: choice.mode, day, title: choice.mode === "today" ? "每日同题" : "历史每日题", subtitle: `${day} · ${choice.size}×${choice.size}` };
}
export const sessionKey = (puzzle: CircuitPuzzle) => `updated-again:circuit:v2:${puzzle.size}:${puzzle.seed}`;
export const recordKey = (puzzle: CircuitPuzzle) => `updated-again:circuit-record:v1:${puzzle.size}:${puzzle.seed}`;

/** Old single-slot daily/practice saves remain untouched. Only matching seeds migrate. */
export function loadCircuitSession(storage: CircuitStorage, puzzle: CircuitPuzzle): CircuitSession {
  const current = storage.getItem(sessionKey(puzzle));
  if (current !== null) {
    if (current.length > 20_000) throw new Error("接线存档过大");
    const saved = JSON.parse(current) as CircuitSession;
    if (!saved || saved.seed !== puzzle.seed || saved.size !== puzzle.size) throw new Error("接线存档与关卡不一致");
    return restoreSession(current, puzzle.seed, puzzle.size);
  }
  const oldKey = `updated-again:circuit:v1:${puzzle.mode === "practice" ? "practice" : "daily"}:${puzzle.size}`;
  return restoreSession(puzzle.mode === "weekly" ? null : storage.getItem(oldKey), puzzle.seed, puzzle.size);
}
function checkedWin(value: unknown, puzzle: CircuitPuzzle): CircuitSession {
  if (!value || typeof value !== "object" || (value as CircuitSession).seed !== puzzle.seed || (value as CircuitSession).size !== puzzle.size) throw new Error("成绩不属于这道题");
  const session = restoreSession(JSON.stringify(value), puzzle.seed, puzzle.size);
  if (sessionBoard(session) !== fullBoard(puzzle.size)) throw new Error("成绩未完成接线");
  return session;
}
export function loadCircuitRecord(storage: CircuitStorage, puzzle: CircuitPuzzle): CircuitRecord | null {
  const text = storage.getItem(recordKey(puzzle));
  if (text === null) return null;
  if (text.length > 40_000) throw new Error("成绩数据过大");
  const data = JSON.parse(text) as CircuitRecord;
  if (!data || data.version !== 1) throw new Error("无法读取这个成绩版本");
  const best = checkedWin(data.best, puzzle);
  const solo = data.solo === null ? null : checkedWin(data.solo, puzzle);
  if (solo?.assisted || (!best.assisted && !solo) || (solo && best.presses.length > solo.presses.length)) throw new Error("成绩状态不一致");
  return { version: 1, best, solo };
}
export function saveCircuitWin(storage: CircuitStorage, puzzle: CircuitPuzzle, session: CircuitSession): CircuitRecord {
  const win = checkedWin(session, puzzle);
  const previous = loadCircuitRecord(storage, puzzle);
  const better = (old: CircuitSession | null, next: CircuitSession) => !old || next.presses.length < old.presses.length || (next.presses.length === old.presses.length && old.assisted && !next.assisted) ? next : old;
  const record: CircuitRecord = { version: 1, best: better(previous?.best ?? null, win), solo: win.assisted ? previous?.solo ?? null : better(previous?.solo ?? null, win) };
  const text = JSON.stringify(record);
  if (storage.getItem(recordKey(puzzle)) !== text) storage.setItem(recordKey(puzzle), text);
  return record;
}

export function puzzleLink(puzzle: CircuitPuzzle): string {
  const params = new URLSearchParams({ mode: puzzle.mode, size: String(puzzle.size) });
  if (puzzle.mode === "weekly") { params.set("week", puzzle.week!); params.set("round", String(puzzle.round! + 1)); }
  else if (puzzle.mode === "practice") params.set("seed", puzzle.seed);
  else { params.set("mode", "history"); params.set("day", puzzle.day); }
  return `https://wsl043.github.io/updated-again/#play?${params}`;
}
export function choiceFromHash(hash: string, today: string): CircuitChoice | null {
  if (!hash.startsWith("#play?")) return null;
  const params = new URLSearchParams(hash.slice(6));
  const base = defaultChoice(today);
  const size = Number(params.get("size"));
  if (!CIRCUIT_SIZES.includes(size as CircuitSize)) return null;
  const mode = params.get("mode");
  if (mode === "history") {
    const day = params.get("day");
    if (!validDay(day) || day < CIRCUIT_LAUNCH || day > today) return null;
    return { ...base, mode, day, size: size as CircuitSize };
  }
  if (mode === "weekly") {
    const week = params.get("week"), round = Number(params.get("round"));
    if (!validDay(week) || weekStart(week) !== week || week < weekStart(CIRCUIT_LAUNCH) || week > weekStart(today) || !Number.isInteger(round) || round < 1 || round > 7) return null;
    return { ...base, mode, week, round: round - 1 };
  }
  if (mode === "practice" && /^practice-[a-f0-9-]{36}$/.test(params.get("seed") ?? "")) return { ...base, mode, size: size as CircuitSize, practice: params.get("seed") };
  return null;
}
