import { useState } from "react";
import { circuitCardSvg, circuitCardText, type CircuitCard } from "../core/circuit-card";

export function CircuitScoreCard({ card, filename }: { card: CircuitCard; filename: string }) {
  const [message, setMessage] = useState("");
  const [fallback, setFallback] = useState("");
  const copy = async () => {
    const text = circuitCardText(card);
    try { await navigator.clipboard.writeText(text); setFallback(""); setMessage("成绩卡片已复制，链接可以打开同一道题。"); }
    catch { setFallback(text); setMessage("可以在下方手动复制成绩。"); }
  };
  const download = async () => {
    let sourceUrl: string | undefined;
    try {
      sourceUrl = URL.createObjectURL(new Blob([circuitCardSvg(card)], { type: "image/svg+xml;charset=utf-8" }));
      const image = new Image();
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("图片未能生成")); image.src = sourceUrl!; });
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("图片画布不可用");
      context.drawImage(image, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片编码失败")), "image/png"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `${filename}.png`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
      setMessage("PNG 成绩卡已生成，请查看浏览器下载。");
    } catch { setMessage("图片下载未能开始，可以先复制文字成绩。"); }
    finally { if (sourceUrl) URL.revokeObjectURL(sourceUrl); }
  };
  return <section className="circuit-card" aria-label={card.title}>
    <div className="circuit-card-preview"><p className="circuit-kicker">YOUR LITTLE VICTORY / 本机成绩</p><h3>{card.title}</h3><p>{card.subtitle}</p><strong>{card.score}</strong><p>{card.detail}</p>{card.notes.map((note) => <p className="circuit-card-note" key={note}>{note}</p>)}</div>
    <div className="circuit-card-actions"><button onClick={() => void copy()}>复制通关卡片 ↗</button><button onClick={() => void download()}>下载成绩卡图片 ↓</button></div>
    {message && <p role="status">{message}</p>}
    {fallback && <textarea aria-label="通关卡片文字" readOnly value={fallback} onFocus={(event) => event.target.select()} />}
  </section>;
}
