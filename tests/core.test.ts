import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CAPABILITY_LIST, installCapsule, rollbackLatest } from "../src/capabilities";
import { canonicalize } from "../src/core/canonical";
import { DEFAULT_ARCHIVE } from "../src/core/state";
import type { UpdateCapsule, UpdateKind } from "../src/core/types";
import { verifyCapsule } from "../src/core/signature";

function capsule(kind: UpdateKind, payload: Record<string, unknown>): UpdateCapsule {
  return {
    specVersion: 1,
    id: `test-${kind}`,
    sequence: 1,
    coreRequirement: ">=0.1.0-beta.1",
    publishedAt: "2026-08-14T00:00:00Z",
    plannedFor: "2026-08-14",
    channel: "daily",
    kind,
    reason: { headline: "test", detail: "test", mood: "test", absurdity: 1 },
    changes: ["real change"],
    expectedEffects: ["visible effect"],
    payload,
    generator: { mode: "human", recipe: "test", seed: "test" },
    rollback: { strategy: "snapshot" },
    integrity: { algorithm: "ed25519", keyId: "test", payloadSha256: "test", signature: "test" },
  };
}

const samples: Record<UpdateKind, Record<string, unknown>> = {
  theme: { background: "#000", surface: "#111", accent: "#fff", glow: "#f0f", banner: "changed" },
  message: { text: "a new sentence" },
  collectible: { id: "relic", name: "Relic", glyph: "*", note: "A real collectible" },
  ritual: { instruction: "Click once", reward: "Nothing useful" },
  companion: { name: "Patch", mood: "awake", phrase: "I changed", glyph: "o" },
  constellation: { x: 20, y: 30, size: 7, label: "test star" },
  "button-personality": { label: "Changed button", temperament: "bouncy" },
};

describe("canonical JSON", () => {
  it("is stable across object key order", () => {
    expect(canonicalize({ z: 1, a: { d: 2, b: 3 } })).toBe(canonicalize({ a: { b: 3, d: 2 }, z: 1 }));
  });
});

describe("capability registry", () => {
  it("has a working consumer for every declared update type", () => {
    expect(CAPABILITY_LIST.map((item) => item.kind).sort()).toEqual(Object.keys(samples).sort());
    for (const [kind, payload] of Object.entries(samples)) {
      const next = installCapsule(structuredClone(DEFAULT_ARCHIVE), capsule(kind as UpdateKind, payload));
      expect(next.state.installedIds).toContain(`test-${kind}`);
      expect(next.state.stats.updatesInstalled).toBe(1);
      expect(next.history).toHaveLength(1);
    }
  });

  it("restores the exact pre-update snapshot", () => {
    const initial = structuredClone(DEFAULT_ARCHIVE);
    const updated = installCapsule(initial, capsule("message", samples.message));
    expect(rollbackLatest(updated).state).toEqual(DEFAULT_ARCHIVE.state);
  });

  it("is idempotent for an already installed capsule", () => {
    const first = installCapsule(structuredClone(DEFAULT_ARCHIVE), capsule("message", samples.message));
    expect(installCapsule(first, capsule("message", samples.message))).toBe(first);
  });
});

describe("published feed", () => {
  it("contains a verifiable, non-empty first update", async () => {
    const feed = JSON.parse(await readFile(resolve("public/feed/index.json"), "utf8"));
    const published = JSON.parse(await readFile(resolve("public", feed.entries[0].path), "utf8"));
    const env = await readFile(resolve(".env.production"), "utf8");
    const publicKey = env.match(/^VITE_CAPSULE_PUBLIC_KEY=(.+)$/m)?.[1] ?? "";
    expect(await verifyCapsule(published, publicKey)).toBe(true);
    expect(published.changes.length).toBeGreaterThan(0);
    expect(published.expectedEffects.length).toBeGreaterThan(0);
  });
});
