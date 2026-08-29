import { describe, expect, it } from "vitest";
import { contrastRatio, createStyleGenome } from "../src/core/style-genome";

describe("daily visual genome", () => {
  it("is reproducible for the same date and capsule", () => {
    const input = { date: "2026-08-29", updateSeed: "capsule-a", kind: "theme" as const, sequence: 23 };
    expect(createStyleGenome(input)).toEqual(createStyleGenome(input));
  });

  it("changes its base traits on another day", () => {
    const first = createStyleGenome({ date: "2026-08-29" });
    const second = createStyleGenome({ date: "2026-08-30" });
    expect([first.colors, first.composition, first.geometry, first.texture]).not.toEqual([
      second.colors,
      second.composition,
      second.geometry,
      second.texture,
    ]);
  });

  it("keeps generated reading and focus colors accessible", () => {
    for (let day = 1; day <= 31; day += 1) {
      const genome = createStyleGenome({ date: `2026-08-${String(day).padStart(2, "0")}`, updateSeed: `seed-${day}` });
      expect(contrastRatio(genome.colors.ink, genome.colors.paper)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(genome.colors.muted, genome.colors.paper)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(genome.colors.signal, genome.colors.ink)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio(genome.colors.accent, genome.colors.paper)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
