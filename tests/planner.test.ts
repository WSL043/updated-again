import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("daily release planner", () => {
  it("always publishes in forced dry-run mode and exposes an auditable plan", () => {
    const result = spawnSync(process.execPath, ["scripts/run-daily-update.mjs", "--dry-run", "--force"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        UPDATE_DATE: "2030-01-02",
        UPDATE_SLOT: "2",
      },
    });
    expect(result.status, result.stderr).toBe(0);
    const plan = JSON.parse(result.stdout);
    expect(plan.date).toBe("2030-01-02");
    expect(plan.plan.target).toBeGreaterThanOrEqual(1);
    expect(plan.wouldPublish.length).toBeGreaterThanOrEqual(1);
  });
});
