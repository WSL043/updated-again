import { useMemo, useRef, useState } from "react";
import { askVersionGhost, type GhostProvider, type GhostTurn } from "../chat/providers";

const STARTERS = ["给下一更想个荒唐理由", "为什么更新会让人开心？", "今天的版本活着吗？"];
const PROVIDER_LABEL: Record<GhostProvider, string> = {
  puter: "Puter 云端免费额度",
  chrome: "Chrome 本机 AI",
  local: "离线规则脑",
};

export function VersionGhost({ context }: { context: string }) {
  const [messages, setMessages] = useState<GhostTurn[]>([
    { role: "assistant", content: "我是版本幽灵。云端能用就借云端的脑子，不能用就靠浏览器，全部失灵我也会在本地继续胡说。" },
  ]);
  const [provider, setProvider] = useState<GhostProvider>("local");
  const [attempted, setAttempted] = useState<GhostProvider[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const transcript = useRef<HTMLDivElement>(null);

  const routeLabel = useMemo(() => attempted.length
    ? attempted.map((name) => name === provider ? PROVIDER_LABEL[name] : `${PROVIDER_LABEL[name]} ×`).join(" → ")
    : "自动路由待命", [attempted, provider]);

  const submit = async (raw: string) => {
    const content = raw.trim().slice(0, 600);
    if (!content || busy) return;
    const next = [...messages, { role: "user", content } satisfies GhostTurn];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await askVersionGhost(next, context);
      setProvider(reply.provider);
      setAttempted(reply.attempted);
      setMessages((current) => [...current, { role: "assistant", content: reply.content }]);
    } finally {
      setBusy(false);
      window.setTimeout(() => transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" }), 0);
    }
  };

  return (
    <section className="ghost-console" aria-labelledby="ghost-title">
      <header className="ghost-console__header">
        <div><span className={`ghost-signal ghost-signal--${busy ? "busy" : provider}`} /><div><p>FREE BRAIN ROUTER / 03</p><h2 id="ghost-title">版本幽灵聊天室</h2></div></div>
        <span className="ghost-console__route" title={routeLabel}>{routeLabel}</span>
      </header>
      <div className="ghost-console__transcript" ref={transcript} aria-live="polite">
        {messages.map((message, index) => (
          <article key={`${message.role}-${index}`} className={`ghost-message ghost-message--${message.role}`}>
            <span>{message.role === "user" ? "YOU" : "GHOST"}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {busy && <article className="ghost-message ghost-message--assistant ghost-message--typing"><span>ROUTER</span><p>正在敲几台免费的门<span aria-hidden="true">…</span></p></article>}
      </div>
      <div className="ghost-console__starters" aria-label="快捷问题">
        {STARTERS.map((starter) => <button key={starter} type="button" disabled={busy} onClick={() => void submit(starter)}>{starter}</button>)}
      </div>
      <form className="ghost-console__form" onSubmit={(event) => { event.preventDefault(); void submit(input); }}>
        <label htmlFor="ghost-input">发一张聊天纸条</label>
        <div><textarea id="ghost-input" rows={2} maxLength={600} value={input} onChange={(event) => setInput(event.target.value)} placeholder="不选模型，能回答的先回答……" /><button type="submit" disabled={busy || !input.trim()}>发送 ↗</button></div>
      </form>
      <footer>不保存密钥。Puter 可能要求登录并使用用户自己的免费额度；Chrome AI 可用时在设备本地运行；最后永远有离线回复。</footer>
    </section>
  );
}
