import { useId, useMemo, useRef, useState } from "react";
import { askHorde } from "../chat/horde";
import { askPuter, connectPuter, type PuterUsage, usagePercent } from "../chat/puter";
import type { ChatTurn } from "../chat/types";

const STARTERS = ["给我一个更新理由", "为什么每天更新", "Remotion 是干嘛的"];
type BrainMode = "legacy" | "horde" | "puter";

async function askLocalBrain(userId: string, prompt: string, context: string) {
  const { askLegacyBrain } = await import("../chat/legacy");
  return askLegacyBrain(userId, prompt, context);
}

export function VersionGhost({ context }: { context: string }) {
  const userId = useId();
  const [messages, setMessages] = useState<ChatTurn[]>([
    { role: "assistant", content: "你好。这里默认在本机处理，不会把聊天内容发到外部服务。" },
  ]);
  const [mode, setMode] = useState<BrainMode>("legacy");
  const [usage, setUsage] = useState<PuterUsage | null>(null);
  const [cloudNotice, setCloudNotice] = useState("本地不会上传消息。匿名云端无需登录，但会把消息交给社区工作节点。");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const transcript = useRef<HTMLDivElement>(null);
  const remaining = useMemo(() => usagePercent(usage), [usage]);

  const activatePuter = async () => {
    if (busy) return;
    setBusy(true);
    setCloudNotice("正在按你的选择连接 Puter……");
    try {
      const nextUsage = await connectPuter();
      setUsage(nextUsage);
      setMode("puter");
      setCloudNotice(nextUsage
        ? `已连接。当前账户月度资源约剩 ${usagePercent(nextUsage)}%；每条消息消耗取决于实际模型。`
        : "已连接。Puter 没有返回可展示的额度比例，但调用仍由你的账户承担。");
    } catch (error) {
      setMode("legacy");
      setCloudNotice(error instanceof Error ? `${error.message} 已切回本地规则。` : "连接失败，已切回本地规则。");
    } finally {
      setBusy(false);
    }
  };

  const activateHorde = () => {
    if (busy) return;
    setMode("horde");
    setCloudNotice("已选择匿名云端。无需登录；繁忙、失败或超时会自动回到本地。");
  };

  const submit = async (raw: string) => {
    const content = raw.trim().slice(0, 600);
    if (!content || busy) return;
    const next = [...messages, { role: "user", content } satisfies ChatTurn];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      if (mode === "puter") {
        const reply = await askPuter(next, context);
        setUsage(reply.usage);
        setMessages((current) => [...current, { role: "assistant", content: reply.content }]);
      } else if (mode === "horde") {
        const reply = await askHorde(next, context);
        setCloudNotice("本条由一个空闲的社区模型回答；下次可能会换一个。");
        setMessages((current) => [...current, { role: "assistant", content: reply.content }]);
      } else {
        const reply = await askLocalBrain(userId, content, context);
        setMessages((current) => [...current, { role: "assistant", content: reply }]);
      }
    } catch (error) {
      const reply = await askLocalBrain(userId, content, context);
      setMode("legacy");
      setCloudNotice(error instanceof Error ? `${error.message} 已自动回到本地。` : "云端没有回答，已自动回到本地。");
      setMessages((current) => [...current, { role: "assistant", content: reply }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" }), 0);
    }
  };

  return (
    <section className="ghost-console" aria-labelledby="ghost-title">
      <header className="ghost-console__header">
        <div>
          <span className={`ghost-signal ghost-signal--${busy ? "busy" : mode}`} />
          <div><p>LOCAL CHAT / OPTIONAL CLOUD</p><h2 id="ghost-title">版本聊天室</h2></div>
        </div>
        <span className="ghost-console__route">{mode === "legacy" ? "本地 · RiveScript" : mode === "horde" ? "匿名云端 · AI Horde" : `Puter 云端${remaining === null ? "" : ` · 剩 ${remaining}%`}`}</span>
      </header>

      <div className="ghost-console__transcript" ref={transcript} aria-live="polite">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`ghost-message ghost-message--${message.role}`}>
            <span>{message.role === "user" ? "你" : "幽灵"}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {busy && (
          <article className="ghost-message ghost-message--assistant ghost-message--typing">
            <span>状态</span><p>{mode === "legacy" ? "正在本机找回答" : mode === "horde" ? "正在等一个空闲的社区节点" : "正在等待 Puter 回信"}<span aria-hidden="true">…</span></p>
          </article>
        )}
      </div>

      <div className="ghost-console__starters" aria-label="快捷问题">
        {STARTERS.map((starter) => (
          <button key={starter} type="button" disabled={busy} onClick={() => void submit(starter)}>{starter}</button>
        ))}
      </div>

      <form className="ghost-console__form" onSubmit={(event) => { event.preventDefault(); void submit(input); }}>
        <label htmlFor="ghost-input">输入一句话</label>
        <div>
          <textarea id="ghost-input" rows={2} maxLength={600} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              void submit(input);
            }
          }} placeholder={mode === "legacy" ? "输入一句话；Enter 发送，Shift+Enter 换行" : mode === "horde" ? "这条消息会发送给社区节点；Enter 发送" : "这条消息会发送给 Puter；Enter 发送"} />
          <button type="submit" disabled={busy || !input.trim()}>发送</button>
        </div>
      </form>

      <div className="ghost-console__engines">
        <button type="button" className={mode === "legacy" ? "active" : ""} onClick={() => setMode("legacy")} disabled={busy}>
          <strong>本地对话</strong><span>规则 + 41 万条语料</span>
        </button>
        <button type="button" className={mode === "horde" ? "active" : ""} onClick={activateHorde} disabled={busy}>
          <strong>匿名云端</strong><span>无需登录 · 失败回本地</span>
        </button>
        <button type="button" className={mode === "puter" ? "active" : ""} onClick={() => void activatePuter()} disabled={busy}>
          <strong>连接 Puter</strong><span>登录后使用你自己的月度额度</span>
        </button>
      </div>
      <footer role="status">{cloudNotice}</footer>
    </section>
  );
}
