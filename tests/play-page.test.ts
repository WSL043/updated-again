import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { PlayPage } from "../src/pages/PlayPage";
import type { UpdateStation } from "../src/hooks/useUpdateStation";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let host: HTMLDivElement, root: Root;
const station = { feed: { entries: [] }, archive: { state: { installedIds: [] } } } as unknown as UpdateStation;
beforeEach(() => {
  localStorage.clear(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-14T04:00:00Z"));
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers(); });

it("shows one toy at a time and restores the circuit after switching toys", () => {
  const render = (toy: "circuit" | "mix") => act(() => root.render(createElement(PlayPage, { station, toy })));
  render("circuit");
  expect(host.querySelectorAll(".circuit-room")).toHaveLength(1);
  expect(host.querySelectorAll(".patch-playground, .today-hero, .conversation-section")).toHaveLength(0);
  act(() => host.querySelector<HTMLButtonElement>(".circuit-cell")!.click());
  render("mix");
  expect(host.querySelectorAll(".patch-playground")).toHaveLength(1);
  expect(host.querySelectorAll(".circuit-room")).toHaveLength(0);
  render("circuit");
  expect(host.querySelector(".circuit-score strong")?.textContent).toBe("01步");
  expect(host.querySelectorAll("h1")).toHaveLength(1);
});
