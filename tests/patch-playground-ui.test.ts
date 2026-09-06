import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PatchPlayground } from "../src/components/PatchPlayground";
import { EXPERIMENTS, MATERIAL_KINDS } from "../src/core/patch-playground";
import { discover, emptyNotebook, loadNotebook, NOTEBOOK_KEY, serializeNotebook } from "../src/core/play-notebook";
import type { FeedEntry } from "../src/core/types";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const entries: FeedEntry[] = MATERIAL_KINDS.map((kind, index) => ({ id: `ui-${index}`, kind, headline: `已安装 ${kind}`, sequence: index + 1, publishedAt: "2026-09-07T00:00:00Z", plannedFor: "2026-09-07", channel: "daily", mood: "好奇", absurdity: 60, path: "unused", payloadSha256: "unused", recipe: "unused", seed: "unused" }));
let host: HTMLDivElement;
let root: Root;
function render(ids = entries.map((entry) => entry.id), feed = entries) {
  act(() => root.render(createElement(PatchPlayground, { entries: feed, installedIds: ids })));
}
function click(text: string) {
  const button = Array.from(host.querySelectorAll("button")).find((item) => item.textContent?.includes(text));
  if (!button) throw new Error(`Missing button: ${text}`);
  act(() => button.click());
}
beforeEach(() => { localStorage.clear(); host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe("playground browser interaction", () => {
  it("shows an honest empty state before any signed installation", () => {
    render([]);
    expect(host.textContent).toContain("还差第一份材料");
    expect(host.querySelector("#mix-material-0")).toBeNull();
  });
  it("can revisit an imported discovery without granting materials", () => {
    localStorage.setItem(NOTEBOOK_KEY, serializeNotebook(discover(emptyNotebook(), EXPERIMENTS[0].id)));
    render([]); click("摇一摇");
    expect(host.querySelector(".playground-stage h3")?.textContent).toBe(EXPERIMENTS[0].name);
    expect(host.querySelector("#mix-material-0")).toBeNull();
  });
  it("allows a single installed material to mix with a copy of itself", () => {
    render([entries[0].id]); click("混一下");
    expect(loadNotebook(localStorage).discoveries).toEqual(["theme+theme:shake"]);
  });
  it("records the selected experiment once, not once per click", () => {
    render(); click("混一下"); click("混一下");
    expect(loadNotebook(localStorage).discoveries).toEqual(["theme+message:shake"]);
    expect(host.textContent).toContain("重复实验不增加收集数");
  });
  it("offers unexplored recipes without awarding them before mixing", () => {
    render(); click("给我一个没试过的组合");
    expect(loadNotebook(localStorage).discoveries).toHaveLength(0);
    click("混一下");
    expect(loadNotebook(localStorage).discoveries).toHaveLength(1);
  });
  it("removes rolled-back ingredients but keeps the personal notebook", () => {
    render(); click("混一下"); render([]);
    expect(host.querySelector("#mix-material-0")).toBeNull();
    expect(loadNotebook(localStorage).discoveries).toHaveLength(1);
  });
  it("can reopen offline using cached labels and existing installed IDs", () => {
    render(); act(() => root.unmount()); root = createRoot(host);
    render(entries.map((entry) => entry.id), []); click("混一下");
    expect(loadNotebook(localStorage).discoveries).toHaveLength(1);
  });
  it("keeps playing but warns when localStorage cannot save", () => {
    render(); vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    click("混一下");
    expect(host.querySelector('[role="alert"]')?.textContent).toContain("本地保存失败");
    expect(host.textContent).toContain("会脸红的标点");
  });
  it("merges discoveries received from another tab", () => {
    render(); click("混一下");
    const text = serializeNotebook(discover(emptyNotebook(), EXPERIMENTS[0].id));
    localStorage.setItem(NOTEBOOK_KEY, text);
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: NOTEBOOK_KEY, newValue: text })));
    expect(loadNotebook(localStorage).discoveries).toHaveLength(2);
  });
  it("respects a deliberate clear from another tab", () => {
    render(); click("混一下"); localStorage.removeItem(NOTEBOOK_KEY);
    act(() => window.dispatchEvent(new StorageEvent("storage", { key: NOTEBOOK_KEY, newValue: null })));
    expect(host.querySelector("progress")?.value).toBe(0);
  });
  it("refreshes the daily clue at midnight without a page reload", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-06T15:59:59Z"));
    render(); expect(host.querySelector("time")?.textContent).toBe("2026-09-06");
    click("再给一点提示");
    act(() => { vi.advanceTimersByTime(60_000); });
    expect(host.querySelector("time")?.textContent).toBe("2026-09-07");
    expect(host.textContent).toContain("再给一点提示 0/3");
  });
});
