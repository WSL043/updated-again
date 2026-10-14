import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CircuitRoom } from "../src/components/CircuitRoom";
import { createCircuit, solveCircuit } from "../src/core/circuit";
import { CHOICE_KEY, recordKey, weeklyPuzzles } from "../src/core/circuit-challenges";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: Root;
const render = () => act(() => root.render(createElement(CircuitRoom)));
const buttons = () => Array.from(host.querySelectorAll<HTMLButtonElement>(".circuit-cell"));
const click = (text: string) => act(() => {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent?.includes(text));
  if (!button) throw new Error(`Missing ${text}`);
  button.click();
});
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-12T04:00:00Z")); localStorage.clear();
  window.history.replaceState(null, "", "/");
  host = document.createElement("div"); document.body.append(host); root = createRoot(host); render();
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers(); });
it("plays without capsules, undoes moves, and restores a reload", () => {
  const before = buttons().map((button) => button.getAttribute("aria-pressed"));
  act(() => buttons()[0].click());
  const changed = buttons().map((button) => button.getAttribute("aria-pressed"));
  expect(changed).not.toEqual(before);
  act(() => root.unmount()); root = createRoot(host); render();
  expect(buttons().map((button) => button.getAttribute("aria-pressed"))).toEqual(changed);
  click("撤销"); expect(buttons().map((button) => button.getAttribute("aria-pressed"))).toEqual(before);
});
it("wins through real moves, locks the completed board, and can restart", () => {
  for (const cell of solveCircuit(createCircuit("2026-09-12", 4), 4)!) act(() => buttons()[cell].click());
  expect(host.textContent).toContain("刚刚好，一步没多");
  expect(buttons().every((button) => button.getAttribute("aria-pressed") === "true")).toBe(true);
  act(() => buttons()[0].click()); expect(host.textContent).toContain("刚刚好，一步没多");
  click("重开"); expect(host.textContent).not.toContain("刚刚好，一步没多");
});
it("marks hint-assisted play and supports keyboard navigation", () => {
  click("给我一步提示"); expect(host.textContent).toContain("使用过提示");
  expect(host.querySelectorAll('[data-hint="true"]')).toHaveLength(1);
  act(() => { buttons()[0].focus(); buttons()[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })); });
  expect(document.activeElement).toBe(buttons()[1]);
});
it("retains each size's progress and changes the daily puzzle at Shanghai midnight", () => {
  act(() => buttons()[0].click()); click("3 × 3"); expect(buttons()).toHaveLength(9);
  click("4 × 4"); expect(host.querySelector(".circuit-score strong")?.textContent).toBe("01步");
  act(() => { vi.setSystemTime(new Date("2026-09-12T16:00:01Z")); window.dispatchEvent(new Event("focus")); });
  expect(host.textContent).toContain("2026-09-13");
  expect(host.querySelector(".circuit-score strong")?.textContent).toBe("00步");
});
it("can keep playing when storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  act(() => buttons()[0].click()); expect(host.querySelector('[role="alert"]')?.textContent).toContain("没有保存成功");
  expect(host.querySelector(".circuit-score strong")?.textContent).toBe("01步");
});
it("restores a practice seed, size, and moves after a full reload", () => {
  click("5 × 5"); click("自由练习");
  act(() => buttons()[8].click());
  const before = buttons().map((button) => button.getAttribute("aria-pressed"));
  act(() => root.unmount()); root = createRoot(host); render();
  expect(buttons()).toHaveLength(25);
  expect(buttons().map((button) => button.getAttribute("aria-pressed"))).toEqual(before);
  expect(host.textContent).toContain("再来一局");
  expect(host.querySelector(".circuit-score strong")?.textContent).toBe("01步");
});

const reload = () => { act(() => root.unmount()); root = createRoot(host); render(); };
const setDate = (value: string) => act(() => {
  const input = host.querySelector<HTMLInputElement>('input[type="date"]')!;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
});
const moves = () => host.querySelector(".circuit-score strong")?.textContent;

it("keeps today's progress when browsing history, dates and sizes, including a reload", () => {
  act(() => buttons()[0].click());
  click("历史每日题"); setDate("2026-09-10");
  expect(host.querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe("2026-09-10");
  expect(moves()).toBe("00步");
  act(() => buttons()[1].click()); act(() => buttons()[2].click());
  setDate("2026-09-11"); act(() => buttons()[3].click());
  setDate("2026-09-10"); expect(moves()).toBe("02步");
  reload(); expect(moves()).toBe("02步");
  click("3 × 3"); expect(moves()).toBe("00步");
  click("4 × 4"); expect(moves()).toBe("02步");
  click("每日同题"); expect(moves()).toBe("01步");
});

it("completes all seven weekly rounds through real moves, preserves bests after restart and week switching", () => {
  click("每周挑战");
  const weekly = weeklyPuzzles("2026-09-07");
  for (const [index, item] of weekly.entries()) {
    for (const cell of solveCircuit(createCircuit(item.seed, item.size), item.size)!) act(() => buttons()[cell].click());
    expect(host.querySelectorAll(".circuit-week-rounds button")[index].textContent).toContain("独立完成");
    if (index < 6) click("接着挑战下一关");
  }
  expect(host.querySelector(".circuit-week-card")?.textContent).toContain("7 / 7 关");
  expect(host.querySelector(".circuit-week-total")?.textContent).toContain("7 关独立完成");
  reload(); expect(host.querySelector(".circuit-week-card")?.textContent).toContain("7 / 7 关");
  click("重开"); expect(moves()).toBe("00步");
  expect(host.querySelector(".circuit-week-card")?.textContent).toContain("7 / 7 关");
  click("上一周"); expect(host.querySelector(".circuit-week-total strong")?.textContent).toBe("0 / 7");
  click("回到本周"); expect(host.querySelector(".circuit-week-total strong")?.textContent).toBe("7 / 7");
});

it("distinguishes assisted results, preserves damaged data and still allows play", () => {
  click("每周挑战"); const item = weeklyPuzzles("2026-09-07")[0];
  click("给我一步提示");
  for (const cell of solveCircuit(createCircuit(item.seed, item.size), item.size)!) act(() => buttons()[cell].click());
  expect(host.querySelector(".circuit-week-total")?.textContent).toContain("0 关独立完成");
  expect(host.querySelector(".circuit-week-rounds button")?.textContent).toContain("借助提示");
  expect(host.querySelector(".circuit-card-preview")?.textContent).toContain("借了一点提示");
  localStorage.setItem(recordKey(item), "broken"); reload();
  expect(host.textContent).toContain("旧成绩无法读取");
  expect(localStorage.getItem(recordKey(item))).toBe("broken");
  click("重开"); act(() => buttons()[0].click()); expect(moves()).toBe("01步");
});

it("opens a shared historical puzzle, then remembers manual selection instead of reopening the old link", () => {
  window.history.replaceState(null, "", "/#play?mode=history&size=3&day=2026-09-01"); reload();
  expect(buttons()).toHaveLength(9);
  expect(host.querySelector<HTMLInputElement>('input[type="date"]')?.value).toBe("2026-09-01");
  click("每日同题"); expect(window.location.hash).toBe("#play");
  reload(); expect(host.querySelector('input[type="date"]')).toBeNull();
  expect(JSON.parse(localStorage.getItem(CHOICE_KEY)!).mode).toBe("today");
});

it("switches to a new daily at midnight without destroying yesterday's moves or the prior week", () => {
  act(() => buttons()[0].click());
  act(() => { vi.setSystemTime(new Date("2026-09-12T16:00:01Z")); window.dispatchEvent(new Event("focus")); });
  expect(moves()).toBe("00步");
  click("历史每日题"); setDate("2026-09-12"); expect(moves()).toBe("01步");
  click("每周挑战"); act(() => buttons()[0].click());
  act(() => { vi.setSystemTime(new Date("2026-09-13T16:00:01Z")); window.dispatchEvent(new Event("focus")); });
  expect(moves()).toBe("01步");
  click("回到本周"); expect(moves()).toBe("00步");
  click("上一周"); expect(moves()).toBe("01步");
});

it("offers a manual share fallback when clipboard access fails", async () => {
  for (const cell of solveCircuit(createCircuit("2026-09-12", 4), 4)!) act(() => buttons()[cell].click());
  await act(async () => {
    const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent?.includes("复制通关卡片"))!;
    button.click();
  });
  expect(host.querySelector<HTMLTextAreaElement>("textarea")?.value).toContain("day=2026-09-12");
  expect(host.textContent).toContain("手动复制成绩");
});
