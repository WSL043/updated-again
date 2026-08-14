import type { LocalArchive, WorldState } from "./types";

export const DEFAULT_WORLD: WorldState = {
  schemaVersion: 1,
  installedIds: [],
  palette: {
    background: "#11101d",
    surface: "#1d1933",
    accent: "#ffcf57",
    glow: "#ff7a90",
  },
  banner: "等待第一次莫名其妙但确实存在的更新。",
  messages: [],
  collectibles: [],
  rituals: [],
  companion: {
    name: "补丁团子",
    mood: "待机",
    phrase: "我还没有被更新过。",
    glyph: "◉",
  },
  stars: [],
  button: {
    label: "检查今天有没有又更",
    temperament: "calm",
  },
  stats: {
    updatesInstalled: 0,
    lastInstalledAt: null,
  },
};

export const DEFAULT_ARCHIVE: LocalArchive = {
  state: DEFAULT_WORLD,
  history: [],
  autoInstall: false,
};

export function cloneWorld(state: WorldState): WorldState {
  return structuredClone(state);
}
