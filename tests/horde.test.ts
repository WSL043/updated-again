import { describe, expect, it, vi } from "vitest";
import { askHorde, buildHordePrompt } from "../src/chat/horde";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

describe("AI Horde anonymous chat", () => {
  it("builds a compact multilingual chat prompt", () => {
    const prompt = buildHordePrompt([
      { role: "user", content: "你是谁？" },
      { role: "assistant", content: "我是版本幽灵。" },
    ], "当前 21 更");
    expect(prompt).toContain("Reply briefly and naturally in Chinese");
    expect(prompt).toContain("Assistant: 我是版本幽灵。");
    expect(prompt.endsWith("Assistant:")).toBe(true);
  });

  it("submits, polls and returns the worker model", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ id: "job-1" }))
      .mockResolvedValueOnce(json({ done: false }))
      .mockResolvedValueOnce(json({
        done: true,
        generations: [{ text: " Assistant: 今天也更新了。", model: "community/test", state: "ok" }],
      }));
    const result = await askHorde([{ role: "user", content: "今天更新了吗？" }], "当前 21 更", {
      fetcher,
      pollMs: 0,
      sleep: async () => undefined,
      timeoutMs: 2_000,
    });
    expect(result).toEqual({ content: "今天也更新了。", model: "community/test" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("cancels a timed-out task so the UI can fall back locally", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ id: "job-2" }))
      .mockResolvedValueOnce(json({ ok: true }));
    await expect(askHorde([{ role: "user", content: "还在吗？" }], "当前 21 更", {
      fetcher,
      timeoutMs: 0,
    })).rejects.toThrow("排队太久");
    expect(fetcher).toHaveBeenLastCalledWith(
      "https://aihorde.net/api/v2/generate/text/status/job-2",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("rejects broken worker output so the UI can fall back locally", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ id: "job-3" }))
      .mockResolvedValueOnce(json({
        done: true,
        generations: [{ text: "助手。 [Start a new conversation]", model: "community/test", state: "ok" }],
      }))
      .mockResolvedValueOnce(json({ ok: true }));
    await expect(askHorde([{ role: "user", content: "你是谁？" }], "当前 21 更", {
      fetcher,
      pollMs: 0,
      sleep: async () => undefined,
      timeoutMs: 2_000,
    })).rejects.toThrow("回答不可用");
  });
});
