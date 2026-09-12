import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CircuitRoom } from "../src/components/CircuitRoom";
import { createCircuit, solveCircuit } from "../src/core/circuit";

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
