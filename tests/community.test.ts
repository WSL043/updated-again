import { describe, expect, it } from "vitest";
import { communityPayload, extractIssueFields, normalizeCommunityIdea } from "../scripts/community-lib.mjs";

const body = `### 为什么今天要更新？

因为星期四需要一个新按钮。

### 它会真正改变什么？

按钮会学会郑重地说你好。

### 最接近的类型

button-personality

### 用户后悔时怎么恢复？

回到上一张快照。`;

describe("community idea autopilot", () => {
  it("extracts issue-form sections without treating markdown as code", () => {
    expect(extractIssueFields(body)).toMatchObject({ kind: "button-personality", change: "按钮会学会郑重地说你好。" });
  });

  it("normalizes and bounds public text", () => {
    const idea = normalizeCommunityIdea({ number: 42, title: "[update idea] 星期四按钮", body, user: { login: "friend" } });
    expect(idea).toMatchObject({ number: 42, kind: "button-personality", headline: "星期四按钮" });
    expect(communityPayload(idea, 22, "2026-08-27")).toMatchObject({ label: "星期四按钮" });
  });

  it("downgrades unknown core requests to a safe message capsule", () => {
    const idea = normalizeCommunityIdea({ number: 9, title: "[update idea] 新权限", body: body.replace("button-personality", "需要新的 Core 能力"), user: { login: "friend" } });
    expect(idea.kind).toBe("message");
    expect(communityPayload(idea, 23, "2026-08-27")).toHaveProperty("text");
  });

  it("materializes every existing capability without executable input", () => {
    for (const kind of ["theme", "message", "collectible", "ritual", "companion", "constellation", "button-personality"]) {
      const idea = normalizeCommunityIdea({ number: 10, title: "[update idea] 社区测试", body: body.replace("button-personality", kind), user: { login: "friend" } });
      expect(communityPayload(idea, 24, "2026-08-27")).toBeTypeOf("object");
    }
  });
});
