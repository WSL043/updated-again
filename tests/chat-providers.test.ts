import { describe, expect, it } from "vitest";
import { askLegacyBrain } from "../src/chat/legacy";
import { extractPuterText, usagePercent } from "../src/chat/puter";

describe("version ghost engines", () => {
  it("extracts string and block Puter responses", () => {
    expect(extractPuterText({ message: { content: "又更了" } })).toBe("又更了");
    expect(extractPuterText({ message: { content: [{ type: "text", text: "先更" }, { type: "text", text: "再说" }] } })).toBe("先更再说");
  });

  it("answers from the local pre-generative brain", async () => {
    const answer = await askLegacyBrain("test-user", "为什么每天更新", "当前 12 更");
    expect(answer).toMatch(/心跳|媒介|期待/);
  });

  it("keeps a name in the local chat session", async () => {
    await askLegacyBrain("memory-user", "我叫小明", "当前 12 更");
    expect(await askLegacyBrain("memory-user", "我叫什么", "当前 12 更")).toContain("小明");
  });

  it("reports Puter allowance as a bounded percentage", () => {
    expect(usagePercent({ allowance: 1000, remaining: 610 })).toBe(61);
    expect(usagePercent({ allowance: 0, remaining: 0 })).toBeNull();
  });
});
