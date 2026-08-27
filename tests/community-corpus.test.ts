import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { COMMUNITY_PAIR_COUNT } from "../src/chat/community";

describe("community chat corpus", () => {
  it("ships the pinned multilingual corpus", () => {
    const data = JSON.parse(gunzipSync(readFileSync("public/chat/community-v1.json.gz")).toString("utf8")) as {
      pairs: Array<[string, string]>;
      sources: string[];
      version: number;
    };
    expect(data.version).toBe(1);
    expect(data.sources).toHaveLength(2);
    expect(data.pairs).toHaveLength(COMMUNITY_PAIR_COUNT);
    expect(data.pairs.some(([prompt]) => prompt === "What is AI?")).toBe(true);
    expect(data.pairs.some(([prompt]) => prompt === "你好")).toBe(true);
  });
});
