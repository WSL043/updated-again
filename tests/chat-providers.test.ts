import { describe, expect, it } from "vitest";
import { askLegacyBrain } from "../src/chat/legacy";
import { findCommunityReply, prepareCommunityCorpusForTest } from "../src/chat/community";
import { extractPuterText, usagePercent } from "../src/chat/puter";

describe("version ghost engines", () => {
  it("extracts string and block Puter responses", () => {
    expect(extractPuterText({ message: { content: "又更了" } })).toBe("又更了");
    expect(extractPuterText({ message: { content: [{ type: "text", text: "先更" }, { type: "text", text: "再说" }] } })).toBe("先更再说");
  });

  it("answers from the local pre-generative brain", async () => {
    const answer = await askLegacyBrain("test-user", "为什么每天更新", "当前 12 更");
    expect(answer).toMatch(/玩法|真实变化|空版本/);
  });

  it("keeps a name in the local chat session", async () => {
    await askLegacyBrain("memory-user", "我叫小明", "当前 12 更");
    expect(await askLegacyBrain("memory-user", "我叫什么", "当前 12 更")).toContain("小明");
  });

  it("keeps common relationship questions in the project voice", async () => {
    expect(await askLegacyBrain("social-user", "你喜欢我吗", "当前 12 更")).toMatch(/喜欢|站你这边/);
    expect(await askLegacyBrain("social-user", "我很难过", "当前 12 更")).toMatch(/我在|发生了什么/);
    expect(await askLegacyBrain("project-paraphrase", "为啥每天都要更新呢", "当前 12 更")).toMatch(
      /玩法|真实变化|空版本/,
    );
  });

  it("retrieves an exact or close community reply", () => {
    const corpus = prepareCommunityCorpusForTest([
      ["你喜欢什么电影？", "我最近在翻旧电影。"],
      ["去上海哪里玩？", "可以先去外滩走走。"],
    ]);
    expect(findCommunityReply(corpus, "你喜欢什么电影")).toBe("我最近在翻旧电影。");
    expect(findCommunityReply(corpus, "上海哪里玩")).toBe("可以先去外滩走走。");
  });

  it("matches common Chinese paraphrases", () => {
    const corpus = prepareCommunityCorpusForTest([
      ["你爱我吗？", "我对你有一份机器人的信任和友谊。"],
      ["为什么每天更新？", "因为今天到了。"],
    ]);
    expect(findCommunityReply(corpus, "你喜欢我吗")).toContain("信任和友谊");
    expect(findCommunityReply(corpus, "为啥每天都要更新呢")).toBe("因为今天到了。");
  });

  it("reports Puter allowance as a bounded percentage", () => {
    expect(usagePercent({ allowance: 1000, remaining: 610 })).toBe(61);
    expect(usagePercent({ allowance: 0, remaining: 0 })).toBeNull();
  });
});
