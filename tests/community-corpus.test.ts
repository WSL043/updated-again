import { readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { COMMUNITY_PAIR_COUNT } from "../src/chat/community";

describe("community chat corpus", () => {
  it("ships pinned language shards", () => {
    const manifest = JSON.parse(readFileSync("public/chat/community-v2/manifest.json", "utf8")) as {
      totalPairs: number;
      version: number;
      shards: Record<string, { path: string; pairCount: number }>;
    };
    expect(manifest.version).toBe(2);
    expect(manifest.totalPairs).toBe(COMMUNITY_PAIR_COUNT);
    expect(Object.keys(manifest.shards)).toEqual(["zh", "en", "de", "it", "other"]);

    let counted = 0;
    for (const shard of Object.values(manifest.shards)) {
      const data = JSON.parse(gunzipSync(readFileSync(`public/${shard.path}`)).toString("utf8")) as {
        pairs: Array<[string, string]>;
        sources: string[];
        version: number;
      };
      expect(data.version).toBe(2);
      expect(data.sources).toHaveLength(3);
      expect(data.pairs).toHaveLength(shard.pairCount);
      expect(statSync(`public/${shard.path}`).size).toBeLessThan(5_000_000);
      counted += data.pairs.length;
    }
    expect(counted).toBe(COMMUNITY_PAIR_COUNT);
  });
});
