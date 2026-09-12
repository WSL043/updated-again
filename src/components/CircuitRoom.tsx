import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { CIRCUIT_SIZES, createCircuit, fullBoard, MAX_CIRCUIT_MOVES, neighbors, newSession, restoreSession, sessionBoard, solveCircuit, type CircuitSize } from "../core/circuit";
import { projectDay } from "../core/patch-playground";
import "./circuit-room.css";

export function CircuitRoom() {
  const [day, setDay] = useState(projectDay);
  const [size, setSize] = useState<CircuitSize>(4);
  const [practice, setPractice] = useState<string | null>(null);
  useEffect(() => {
    if (window.location.hash === "#play") document.getElementById("play")?.scrollIntoView?.({ block: "start" });
    const tick = () => setDay(projectDay());
    const timer = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); };
  }, []);
  return <section className="circuit-room" id="play" aria-labelledby="circuit-heading">
    <header className="circuit-heading"><div><p className="circuit-kicker">PLAY / 01 · 不用安装，直接动手</p><h2 id="circuit-heading">补丁接线室<span>把今天，重新点亮。</span></h2></div><p>一次按下，自己和上下左右一起翻转。<br />让所有接点亮起来，就算修好了这个小世界。</p></header>
    <div className="circuit-toolbar"><div className="circuit-tabs" aria-label="关卡大小">{CIRCUIT_SIZES.map((value) => <button key={value} aria-pressed={size === value} onClick={() => setSize(value)}>{value} × {value}<small>{value === 3 ? "热身" : value === 4 ? "动脑" : "挑战"}</small></button>)}</div><div className="circuit-modes"><button aria-pressed={!practice} onClick={() => setPractice(null)}>每日同题</button><button aria-pressed={!!practice} onClick={() => setPractice(`practice-${crypto.randomUUID()}`)}>{practice ? "再来一局 ↗" : "自由练习 ↗"}</button></div></div>
    <CircuitGame key={`${practice ?? day}:${size}`} seed={practice ?? day} day={day} size={size} daily={!practice} />
  </section>;
}

function CircuitGame({ seed, day, size, daily }: { seed: string; day: string; size: CircuitSize; daily: boolean }) {
  const key = `updated-again:circuit:v1:${daily ? "daily" : "practice"}:${size}`;
  const [initial] = useState(() => {
    try { return { session: restoreSession(localStorage.getItem(key), seed, size), warning: "" }; }
    catch { return { session: newSession(seed, size), warning: "旧接线存档无法读取。这局仍能玩，原存档会保留。" }; }
  });
  const [session, setSession] = useState(initial.session);
  const [warning, setWarning] = useState(initial.warning);
  const [hint, setHint] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [share, setShare] = useState("");
  const cells = useRef<(HTMLButtonElement | null)[]>([]);
  const start = useMemo(() => createCircuit(seed, size), [seed, size]);
  const board = useMemo(() => sessionBoard(session), [session]);
  const target = fullBoard(size);
  const won = board === target;
  const optimum = useMemo(() => solveCircuit(start, size)!.length, [start, size]);
  const lit = Array.from({ length: size * size }, (_, cell) => !!(board & (1 << cell))).filter(Boolean).length;
  const affected = hover === null ? [] : neighbors(size, hover);
  const save = (next: typeof session) => {
    setSession(next);
    if (initial.warning) return;
    try { localStorage.setItem(key, JSON.stringify(next)); setWarning(""); }
    catch { setWarning("本机没有保存成功，刷新会丢失这局；仍然可以继续玩。"); }
  };
  const tap = (cell: number) => {
    if (won || session.presses.length >= MAX_CIRCUIT_MOVES) return;
    save({ ...session, presses: [...session.presses, cell] });
    setHint(null); setShare(""); setMessage("");
  };
  const showHint = () => {
    const path = solveCircuit(board, size);
    if (!path?.length) return;
    setHint(path[0]); save({ ...session, assisted: true });
    setMessage(`试试第 ${Math.floor(path[0] / size) + 1} 行、第 ${path[0] % size + 1} 列。当前局面最少还需 ${path.length} 步。`);
  };
  const copy = async () => {
    const text = `又更了 · 补丁接线室\n${daily ? day : "自由练习"} / ${size}×${size}\n${session.presses.length} 步全部点亮 · ${session.assisted ? "借了一点提示" : "独立完成"}\n理论最少 ${optimum} 步\nhttps://wsl043.github.io/updated-again/#play`;
    try { await navigator.clipboard.writeText(text); setMessage("成绩卡片已复制。"); }
    catch { setShare(text); setMessage("可以在下方手动复制成绩。"); }
  };
  return <div className="circuit-layout">
    <div className="circuit-machine" data-won={won}>
      <div className="circuit-machine-top"><span><i />{won ? "全部接通" : "等待接通"}</span><span>{daily ? day : "自由练习"} / {size * size} NODES</span></div>
      <div className="circuit-board" style={{ "--circuit-size": size } as CSSProperties} role="group" aria-label={`${size} 乘 ${size} 接线盘`} onMouseLeave={() => setHover(null)}>
        {Array.from({ length: size * size }, (_, cell) => <button key={cell} ref={(element) => { cells.current[cell] = element; }} type="button" className="circuit-cell" data-on={!!(board & (1 << cell))} data-affected={affected.includes(cell)} data-hint={hint === cell} aria-label={`第 ${Math.floor(cell / size) + 1} 行第 ${cell % size + 1} 列，${board & (1 << cell) ? "亮" : "暗"}${hint === cell ? "，建议按这里" : ""}`} aria-pressed={!!(board & (1 << cell))} aria-disabled={won} onClick={() => tap(cell)} onMouseEnter={() => setHover(cell)} onFocus={() => setHover(cell)} onBlur={() => setHover(null)} onKeyDown={(event) => {
          const row = Math.floor(cell / size), col = cell % size;
          const next = event.key === "ArrowRight" ? row * size + (col + 1) % size : event.key === "ArrowLeft" ? row * size + (col + size - 1) % size : event.key === "ArrowDown" ? ((row + 1) % size) * size + col : event.key === "ArrowUp" ? ((row + size - 1) % size) * size + col : null;
          if (next !== null) { event.preventDefault(); cells.current[next]?.focus(); }
        }}><span className="circuit-node" aria-hidden="true">{board & (1 << cell) ? "✦" : "·"}</span><small aria-hidden="true">{String(cell + 1).padStart(2, "0")}</small></button>)}
      </div>
      <div className="circuit-machine-bottom"><span>{String(lit).padStart(2, "0")} / {size * size} 已点亮</span><span>{won ? "SIGNAL RESTORED ↗" : "CLICK / FLIP / REPEAT"}</span></div>
    </div>
    <aside className="circuit-console">
      <div className="circuit-score"><p>这局走了</p><strong>{String(session.presses.length).padStart(2, "0")}<small>步</small></strong><span>这道题最少 {optimum} 步 · {session.assisted ? "使用过提示" : "还没借提示"}</span></div>
      <div className="circuit-feedback" role="status" aria-live="polite">{won ? <><h3>{session.presses.length === optimum ? "刚刚好，一步没多。" : "接通了！今天亮了一点。"}</h3><p>{session.assisted ? "借来的灵感也算灵感。下一局再试试独立完成。" : "这一局，靠你自己接通了。"}</p></> : <><h3>{message ? "一点接线灵感" : "有时候，要先关掉一盏灯。"}</h3><p>{message || "亮灯也可以按。浅色边框会提前告诉你，这一按会影响哪些接点。"}</p></>}</div>
      <div className="circuit-actions">{won ? <button className="circuit-primary" onClick={() => void copy()}>复制通关卡片 ↗</button> : <button className="circuit-primary" onClick={showHint}>给我一步提示 ↗</button>}<button disabled={!session.presses.length} onClick={() => { save({ ...session, presses: session.presses.slice(0, -1) }); setHint(null); setShare(""); setMessage("退回一步，换个方向想。"); }}>撤销上一步</button><button disabled={!session.presses.length && !session.assisted} onClick={() => { save(newSession(seed, size)); setHint(null); setShare(""); setMessage("同一张接线图，再来一次。"); }}>重开这道题</button></div>
      {won && message && <p role="status">{message}</p>}
      {session.presses.length >= MAX_CIRCUIT_MOVES && <p role="status">这局的笔记写满了。可以撤销或重开。</p>}
      {warning && <p role="alert">{warning}</p>}
      {share && <textarea aria-label="通关卡片文字" readOnly value={share} onFocus={(event) => event.target.select()} />}
      <p className="circuit-footnote">每日题按上海日期更换，同一天同尺寸大家同题。自动留在本机；没有倒计时，也没有失败惩罚。键盘方向键选格，空格或回车操作。</p>
      <details className="circuit-explainer"><summary>提示真的会解题吗？</summary><p>会。程序枚举第一行的按法，再逐行消去暗灯；最多检查 32 种候选，选出步数最少的解。每道题从全亮状态反向打乱，所以一定能解开。</p><a href="https://github.com/WSL043/updated-again/blob/main/src/core/circuit.ts" target="_blank" rel="noreferrer">看看解题算法 ↗</a></details>
    </aside>
  </div>;
}
