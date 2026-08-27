import { describe, expect, it } from "vitest";
import { extractPuterText, localGhostReply } from "../src/chat/providers";

describe("version ghost providers", () => {
  it("extracts string and block Puter responses", () => {
    expect(extractPuterText({ message: { content: "又更了" } })).toBe("又更了");
    expect(extractPuterText({ message: { content: [{ type: "text", text: "先更" }, { type: "text", text: "再说" }] } })).toBe("先更再说");
  });

  it("always returns a useful local fallback", () => {
    expect(localGhostReply("给我一个更新点子", "今天已更新")).toContain("点子");
    expect(localGhostReply("你好", "今天已更新")).toContain("版本幽灵");
  });
});
