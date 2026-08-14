export const UPDATE_KINDS = [
  "theme",
  "message",
  "collectible",
  "ritual",
  "companion",
  "constellation",
  "button-personality",
] as const;

export type UpdateKind = (typeof UPDATE_KINDS)[number];
export type UpdateChannel = "daily" | "weird" | "experimental" | "core";

export interface UpdateReason {
  headline: string;
  detail: string;
  mood: string;
  absurdity: number;
}

export interface UpdateGenerator {
  mode: "deterministic" | "agent" | "human" | "reserve";
  recipe: string;
  seed: string;
}

export interface CapsuleIntegrity {
  algorithm: "ed25519";
  keyId: string;
  payloadSha256: string;
  signature: string;
}

export interface UpdateCapsule {
  specVersion: 1;
  id: string;
  sequence: number;
  coreRequirement: string;
  publishedAt: string;
  plannedFor: string;
  channel: UpdateChannel;
  kind: UpdateKind;
  reason: UpdateReason;
  changes: string[];
  expectedEffects: string[];
  payload: Record<string, unknown>;
  generator: UpdateGenerator;
  rollback: {
    strategy: "snapshot";
  };
  integrity: CapsuleIntegrity;
}

export interface FeedEntry {
  id: string;
  sequence: number;
  publishedAt: string;
  plannedFor: string;
  channel: UpdateChannel;
  kind: UpdateKind;
  headline: string;
  mood: string;
  absurdity: number;
  path: string;
  payloadSha256: string;
  recipe: string;
  seed: string;
}

export interface FeedIndex {
  specVersion: 1;
  generatedAt: string;
  latest: string;
  total: number;
  entries: FeedEntry[];
}

export interface InstalledUpdate {
  id: string;
  installedAt: string;
  snapshot: WorldState;
}

export interface WorldState {
  schemaVersion: 1;
  installedIds: string[];
  palette: {
    background: string;
    surface: string;
    accent: string;
    glow: string;
  };
  banner: string;
  messages: Array<{ id: string; text: string }>;
  collectibles: Array<{ id: string; name: string; glyph: string; note: string }>;
  rituals: Array<{ id: string; instruction: string; reward: string }>;
  companion: {
    name: string;
    mood: string;
    phrase: string;
    glyph: string;
  };
  stars: Array<{ id: string; x: number; y: number; size: number; label: string }>;
  button: {
    label: string;
    temperament: "calm" | "shy" | "dramatic" | "bouncy";
  };
  stats: {
    updatesInstalled: number;
    lastInstalledAt: string | null;
  };
}

export interface LocalArchive {
  state: WorldState;
  history: InstalledUpdate[];
  autoInstall: boolean;
}
