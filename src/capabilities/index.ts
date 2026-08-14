import { cloneWorld } from "../core/state";
import type { LocalArchive, UpdateCapsule, UpdateKind, WorldState } from "../core/types";

export interface CapabilityDefinition {
  kind: UpdateKind;
  label: string;
  description: string;
  apply: (state: WorldState, capsule: UpdateCapsule) => WorldState;
}

function requiredString(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Payload field ${key} must be a non-empty string.`);
  }
  return value;
}

function requiredNumber(payload: Record<string, unknown>, key: string): number {
  const value = payload[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Payload field ${key} must be a finite number.`);
  }
  return value;
}

function applyTheme(state: WorldState, capsule: UpdateCapsule): WorldState {
  const next = cloneWorld(state);
  const { payload } = capsule;
  next.palette = {
    background: requiredString(payload, "background"),
    surface: requiredString(payload, "surface"),
    accent: requiredString(payload, "accent"),
    glow: requiredString(payload, "glow"),
  };
  next.banner = requiredString(payload, "banner");
  return next;
}

function applyMessage(state: WorldState, capsule: UpdateCapsule): WorldState {
  const next = cloneWorld(state);
  const text = requiredString(capsule.payload, "text");
  next.messages = [{ id: capsule.id, text }, ...next.messages].slice(0, 30);
  next.banner = text;
  return next;
}

function applyCollectible(state: WorldState, capsule: UpdateCapsule): WorldState {
  const next = cloneWorld(state);
  const collectible = {
    id: requiredString(capsule.payload, "id"),
    name: requiredString(capsule.payload, "name"),
    glyph: requiredString(capsule.payload, "glyph"),
    note: requiredString(capsule.payload, "note"),
  };
  if (next.collectibles.some((item) => item.id === collectible.id)) {
    throw new Error(`Collectible ${collectible.id} is already installed.`);
  }
  next.collectibles = [collectible, ...next.collectibles];
  next.banner = `收藏品「${collectible.name}」已住进版本博物馆。`;
  return next;
}

function applyRitual(state: WorldState, capsule: UpdateCapsule): WorldState {
  const next = cloneWorld(state);
  next.rituals = [
    {
      id: capsule.id,
      instruction: requiredString(capsule.payload, "instruction"),
      reward: requiredString(capsule.payload, "reward"),
    },
    ...next.rituals,
  ].slice(0, 12);
  next.banner = "今天的软件希望你完成一件没有必要的小事。";
  return next;
}

function applyCompanion(state: WorldState, capsule: UpdateCapsule): WorldState {
  const next = cloneWorld(state);
  next.companion = {
    name: requiredString(capsule.payload, "name"),
    mood: requiredString(capsule.payload, "mood"),
    phrase: requiredString(capsule.payload, "phrase"),
    glyph: requiredString(capsule.payload, "glyph"),
  };
  next.banner = `${next.companion.name}今天的状态是：${next.companion.mood}`;
  return next;
}

function applyConstellation(state: WorldState, capsule: UpdateCapsule): WorldState {
  const next = cloneWorld(state);
  next.stars = [
    ...next.stars,
    {
      id: capsule.id,
      x: Math.min(96, Math.max(4, requiredNumber(capsule.payload, "x"))),
      y: Math.min(90, Math.max(6, requiredNumber(capsule.payload, "y"))),
      size: Math.min(14, Math.max(3, requiredNumber(capsule.payload, "size"))),
      label: requiredString(capsule.payload, "label"),
    },
  ].slice(-60);
  next.banner = "天上多了一颗只为这次更新存在的星。";
  return next;
}

function applyButtonPersonality(state: WorldState, capsule: UpdateCapsule): WorldState {
  const next = cloneWorld(state);
  const temperament = requiredString(capsule.payload, "temperament");
  if (!(["calm", "shy", "dramatic", "bouncy"] as string[]).includes(temperament)) {
    throw new Error(`Unknown button temperament: ${temperament}`);
  }
  next.button = {
    label: requiredString(capsule.payload, "label"),
    temperament: temperament as WorldState["button"]["temperament"],
  };
  next.banner = "按钮刚刚提交了一份性格变更申请。";
  return next;
}

const definitions: CapabilityDefinition[] = [
  { kind: "theme", label: "世界换肤", description: "改变调色板、光晕和首页宣言。", apply: applyTheme },
  { kind: "message", label: "一句话更新", description: "增加一条会被永久归档的文案。", apply: applyMessage },
  { kind: "collectible", label: "版本收藏品", description: "向版本博物馆投放一件唯一物品。", apply: applyCollectible },
  { kind: "ritual", label: "无用小仪式", description: "给今天增加一项荒唐但温和的任务。", apply: applyRitual },
  { kind: "companion", label: "补丁团子", description: "改变常驻伙伴的心情、台词和样子。", apply: applyCompanion },
  { kind: "constellation", label: "版本星图", description: "为这次更新在天空钉上一颗星。", apply: applyConstellation },
  {
    kind: "button-personality",
    label: "按钮人格",
    description: "让更新按钮暂时拥有一种新性格。",
    apply: applyButtonPersonality,
  },
];

export const CAPABILITIES = new Map(definitions.map((definition) => [definition.kind, definition]));
export const CAPABILITY_LIST = definitions;

export function installCapsule(archive: LocalArchive, capsule: UpdateCapsule): LocalArchive {
  if (archive.state.installedIds.includes(capsule.id)) return archive;

  const definition = CAPABILITIES.get(capsule.kind);
  if (!definition) throw new Error(`Unsupported update kind: ${capsule.kind}`);

  const snapshot = cloneWorld(archive.state);
  const nextState = definition.apply(archive.state, capsule);
  const installedAt = new Date().toISOString();
  nextState.installedIds = [...nextState.installedIds, capsule.id];
  nextState.stats = {
    updatesInstalled: nextState.stats.updatesInstalled + 1,
    lastInstalledAt: installedAt,
  };

  return {
    ...archive,
    state: nextState,
    history: [{ id: capsule.id, installedAt, snapshot }, ...archive.history].slice(
      0,
      100,
    ),
  };
}

export function rollbackLatest(archive: LocalArchive): LocalArchive {
  const [latest, ...remaining] = archive.history;
  if (!latest) return archive;
  return {
    ...archive,
    state: latest.snapshot,
    history: remaining,
  };
}
